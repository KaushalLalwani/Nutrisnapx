"""
Uses Gemini to pick the genuinely-correct product among a platform's
search results for a query — brand, pack size, and "is this actually
the same product" reasoning that plain string similarity misses (e.g.
"Amul Gold 500ml" vs "Amul Gold Full Cream Milk Pouch 500 ml" are the
same product; "Amul Gold 500ml" vs "Amul Taaza 500ml" are not, even
though they share most tokens).

This is a refinement layer: if GOOGLE_API_KEY isn't set, the SDK isn't
installed, or the call fails for any reason, it returns None and the
caller (normalize.resolve_match) falls back to the fuzzy matcher —
matching never hard-depends on the LLM being available.
"""

from __future__ import annotations

import json
import os
from typing import Optional

_model = None
_tried_init = False


def _client():
    global _model, _tried_init
    if _tried_init:
        return _model
    _tried_init = True
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        _model = None
    return _model


def llm_best_match(searched_term: str, candidates: list[dict]) -> Optional[dict]:
    model = _client()
    if not model or not candidates:
        return None

    listing = "\n".join(
        f"{i}. name: {c['name']} | brand: {c.get('brand') or '—'} | "
        f"pack: {c.get('quantity') or '—'} | price: ₹{c.get('price')}"
        for i, c in enumerate(candidates)
    )
    prompt = (
        f'A shopper on a grocery app searched for "{searched_term}".\n'
        f"Candidate listings from the search results:\n{listing}\n\n"
        "Pick the single listing that is genuinely the product the shopper meant — "
        "same product and brand, a reasonable pack size for a casual search "
        "(don't reject a match just because the pack size wasn't specified in the search). "
        'Reply with ONLY minified JSON: {"index": <int or null>, "reason": "<one short phrase>"}. '
        "Use null for index if none of the listings are actually that product."
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0, "max_output_tokens": 100},
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        idx = parsed.get("index")
        if idx is None or not isinstance(idx, int) or not (0 <= idx < len(candidates)):
            return None
        match = dict(candidates[idx])
        match["match_reason"] = parsed.get("reason")
        match["matched_by"] = "llm"
        return match
    except Exception:
        return None


def llm_group_products(
    query: str, blinkit_products: list[dict], instamart_products: list[dict]
) -> Optional[list[dict]]:
    """Sends BOTH platforms' full scraped listing for a query to Gemini in
    one call and asks it to group same-product listings across platforms —
    the "show every scraped product, not just one pick" view (à la
    buyhatke), where each row is one real-world product with whichever
    platforms carry it. This is a normalization/grouping task, not a
    single-best-pick task, so it's a separate prompt from llm_best_match.

    Returns a list of {"blinkit": <int index or None>, "instamart": <int
    index or None>} pairs, or None if the LLM isn't configured/available or
    the call fails for any reason — callers should fall back to the manual
    fuzzy grouper (normalize.group_products' non-LLM path) in that case,
    same degrade-gracefully pattern as llm_best_match.
    """
    model = _client()
    if not model or (not blinkit_products and not instamart_products):
        return None

    def _listing(products: list[dict]) -> str:
        if not products:
            return "(none)"
        return "\n".join(
            f"{i}. {p['name']} | brand: {p.get('brand') or '—'} | "
            f"pack: {p.get('quantity') or '—'} | price: ₹{p.get('price')}"
            for i, p in enumerate(products)
        )

    prompt = (
        f'A shopper searched "{query}" on a grocery price-comparison app that scrapes '
        "both Blinkit and Instamart.\n\n"
        f"Blinkit results:\n{_listing(blinkit_products)}\n\n"
        f"Instamart results:\n{_listing(instamart_products)}\n\n"
        "Group these into rows the way a price-comparison site would: every listing that is "
        "genuinely the same real-world product (same brand + item, pack size may differ across "
        "platforms) becomes one row referencing its index on each platform where it appears; a "
        "listing with no equivalent on the other platform becomes its own row with the other "
        "platform's index set to null. EVERY index from both lists must appear in exactly one "
        "row — don't drop or duplicate any.\n"
        'Reply with ONLY minified JSON: {"groups": [{"blinkit": <int|null>, "instamart": <int|null>}, ...]}'
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0, "max_output_tokens": 2048},
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        groups = parsed.get("groups")
        if not isinstance(groups, list):
            return None

        cleaned = []
        for g in groups:
            if not isinstance(g, dict):
                continue
            bi, ii = g.get("blinkit"), g.get("instamart")
            bi = bi if isinstance(bi, int) and 0 <= bi < len(blinkit_products) else None
            ii = ii if isinstance(ii, int) and 0 <= ii < len(instamart_products) else None
            if bi is None and ii is None:
                continue
            cleaned.append({"blinkit": bi, "instamart": ii})
        return cleaned if cleaned else None
    except Exception:
        return None
