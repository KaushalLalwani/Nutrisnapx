"""
Both scrapers already return their own product dicts (Blinkit's
Product dataclass, Instamart's Product dataclass) — this module maps
both onto one common shape the API and frontend can treat identically,
and picks the best in-stock match per platform for a searched item.

Matching runs two layers:
  1. resolve_match() tries the LLM (llm_match.py) first, if configured
  2. falls back to best_match(), a weighted fuzzy scorer combining
     token overlap, sequence similarity, brand mention, and pack-size
     awareness — considerably more than a single SequenceMatcher ratio.
"""

from __future__ import annotations

import os
import re
from urllib.parse import quote
from difflib import SequenceMatcher
from typing import Optional

import llm_match

# Common shape every platform's raw product dict gets mapped into:
#   name, brand, quantity, price, mrp, in_stock, image_url, id, platform

_STOPWORDS = {"pack", "of", "combo", "piece", "pieces", "the", "with", "and", "a", "an"}

_UNIT_PATTERNS = [
    (re.compile(r"(\d+(?:\.\d+)?)\s*kg\b"), "weight", 1.0),
    (re.compile(r"(\d+(?:\.\d+)?)\s*g(?:m|ram)?\b"), "weight", 0.001),
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:l|litre|liter)\b"), "volume", 1.0),
    (re.compile(r"(\d+(?:\.\d+)?)\s*ml\b"), "volume", 0.001),
    (re.compile(r"(\d+)\s*(?:pcs|pc|pieces|piece)\b"), "count", 1.0),
]
_COMBO_PATTERN = re.compile(r"(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(ml|l|g|kg)\b")


def _clean_name(name: str) -> str:
    """Lowercase, strip punctuation and pack-size/unit noise so two
    listings of "the same thing" from different platforms compare
    more like text than like two unrelated strings."""
    name = name.lower()
    name = re.sub(r"[₹()%,\-–.]", " ", name)
    name = re.sub(r"\b\d+(\.\d+)?\s?(ml|l|g|kg|pcs|pack|pc|x)\b", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _tokens(name: str) -> set:
    return {t for t in _clean_name(name).split() if t and t not in _STOPWORDS}


def token_overlap(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def parse_quantity(text: Optional[str]) -> Optional[tuple]:
    """Returns (category, value_in_base_unit) — base unit is litres for
    volume, kg for weight, pieces for count — or None if unparseable.
    Handles combo packs like "2 x 750 ml" as total volume."""
    if not text:
        return None
    t = text.lower()

    combo = _COMBO_PATTERN.search(t)
    if combo:
        count, amount, unit = float(combo.group(1)), float(combo.group(2)), combo.group(3)
        base = {"ml": 0.001, "l": 1.0, "g": 0.001, "kg": 1.0}[unit]
        category = "volume" if unit in ("ml", "l") else "weight"
        return category, count * amount * base

    for pattern, category, base in _UNIT_PATTERNS:
        m = pattern.search(t)
        if m:
            return category, float(m.group(1)) * base
    return None


def quantity_similarity(a_text: Optional[str], b_text: Optional[str]) -> float:
    a, b = parse_quantity(a_text), parse_quantity(b_text)
    if not a or not b or a[0] != b[0] or a[1] == 0 or b[1] == 0:
        return 0.0
    lo, hi = sorted([a[1], b[1]])
    return lo / hi


def compute_unit_price(product: dict) -> Optional[dict]:
    """Price per base unit (₹/L, ₹/kg, ₹/pc) so a user can fairly
    compare listings even when the two platforms' pack sizes differ."""
    q = parse_quantity(product.get("quantity"))
    price = product.get("price")
    if not q or price is None or q[1] == 0:
        return None
    category, base_value = q
    label = {"volume": "₹/L", "weight": "₹/kg", "count": "₹/pc"}[category]
    return {"value": round(price / base_value, 2), "label": label}


def from_blinkit(raw: dict) -> dict:
    return {
        "platform": "blinkit",
        "id": raw.get("product_id"),
        "name": raw.get("name") or "",
        "brand": raw.get("brand"),
        "quantity": raw.get("variant"),
        "price": raw.get("price"),
        "mrp": raw.get("mrp"),
        "in_stock": bool(raw.get("in_stock", True)),
        "image_url": raw.get("image_url"),
        "rating": raw.get("rating"),
        "eta_minutes": raw.get("eta_minutes"),
    }


def from_instamart(raw: dict) -> dict:
    image_id = str(raw.get("image_id") or raw.get("image_url") or "").strip()
    
    # Directly build the standard Swiggy CDN URL
    if image_id.startswith("http"):
        image_url = image_id
    elif image_id:
        image_url = f"https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_252,h_298/{image_id}"
    else:
        image_url = None

    return {
        "platform": "instamart",
        "id": raw.get("sku_id") or raw.get("product_id"),
        "name": raw.get("name") or "",
        "brand": raw.get("brand"),
        "quantity": raw.get("quantity"),
        "price": raw.get("offer_price") if raw.get("offer_price") is not None else raw.get("mrp"),
        "mrp": raw.get("mrp"),
        "in_stock": bool(raw.get("in_stock", True)) and bool(raw.get("is_avail", True)),
        "image_url": image_url,
        "rating": None,
        "eta_minutes": None,
    }

NORMALIZERS = {"blinkit": from_blinkit, "instamart": from_instamart}


def normalize_platform_results(platform: str, search_result: dict) -> dict:
    """search_result is the {"available", "products", "error"} dict an
    adapter's search_batch() returns for one query on one platform."""
    normalizer = NORMALIZERS[platform]
    return {
        **search_result,
        "products": [normalizer(p) for p in search_result["products"]],
    }


def _score(searched_term: str, candidate: dict) -> float:
    name_tok = token_overlap(searched_term, candidate["name"])
    name_seq = SequenceMatcher(None, _clean_name(searched_term), _clean_name(candidate["name"])).ratio()
    brand = candidate.get("brand")
    brand_bonus = 1.0 if brand and brand.lower() in searched_term.lower() else 0.0
    return 0.55 * name_tok + 0.30 * name_seq + 0.15 * brand_bonus


MIN_MATCH_SCORE = 0.22  # below this, treat as "not actually found" rather than forcing a bad match


def best_match(searched_term: str, candidates: list[dict]) -> Optional[dict]:
    """Weighted fuzzy match: token overlap + sequence similarity + a
    brand-mention bonus, then prefers in-stock and cheaper as
    tiebreakers. Used as the fallback when the LLM matcher isn't
    configured or doesn't return a confident pick."""
    if not candidates:
        return None

    scored = [
        (c.get("in_stock", True), _score(searched_term, c), -(c.get("price") or float("inf")), c)
        for c in candidates
    ]
    scored.sort(key=lambda t: (not t[0], -t[1], -t[2]))
    in_stock, score, _, candidate = scored[0]
    if score < MIN_MATCH_SCORE:
        return None
    match = dict(candidate)
    match["match_score"] = round(score, 3)
    match["matched_by"] = "fuzzy"
    match["unit_price"] = compute_unit_price(match)
    return match


def resolve_match(searched_term: str, candidates: list[dict]) -> Optional[dict]:
    """Try the LLM matcher first (if GOOGLE_API_KEY is set); fall back
    to the fuzzy scorer if it's unavailable or unconfident."""
    if not candidates:
        return None
    if os.getenv("GOOGLE_API_KEY"):
        llm_result = llm_match.llm_best_match(searched_term, candidates)
        if llm_result:
            llm_result["unit_price"] = compute_unit_price(llm_result)
            return llm_result
    return best_match(searched_term, candidates)


# ---------------------------------------------------------------------------
# Multi-product grouping — every scraped, actually-relevant product shown as
# its own row (matched across platforms where possible), instead of
# collapsing a whole search down to one picked winner per platform. This is
# the buyhatke-style "search results" view.
# ---------------------------------------------------------------------------

RELEVANCE_MIN = 0.12  # below this, a scraped product isn't about the query at all — drop it as noise
GROUP_MATCH_SCORE = 0.5  # above this, two products from different platforms are "the same thing"


def _pair_score(a: dict, b: dict) -> float:
    """How likely two *products* (not a query and a product) are the same
    real-world item across platforms — same idea as _score() but also
    weighs pack-size agreement, since that's a strong same-product signal
    between two listings (less useful for a loose query string)."""
    name_tok = token_overlap(a["name"], b["name"])
    name_seq = SequenceMatcher(None, _clean_name(a["name"]), _clean_name(b["name"])).ratio()
    a_brand, b_brand = (a.get("brand") or "").strip().lower(), (b.get("brand") or "").strip().lower()
    if a_brand and b_brand:
        brand_bonus = 1.0 if a_brand == b_brand else 0.0
    else:
        brand_bonus = 1.0 if (a_brand and a_brand in b["name"].lower()) or (b_brand and b_brand in a["name"].lower()) else 0.0
    qty_sim = quantity_similarity(a.get("quantity"), b.get("quantity"))
    return 0.40 * name_tok + 0.25 * name_seq + 0.15 * brand_bonus + 0.20 * qty_sim


def _manual_group_pairs(blinkit_products: list[dict], instamart_products: list[dict]) -> list[dict]:
    """Greedy highest-score-first bipartite matching, then every leftover
    item on either side becomes its own single-platform row. This is the
    "do it manually, buyhatke-style" fallback when the LLM grouper isn't
    configured or doesn't return a usable result."""
    scored_pairs = [
        (_pair_score(b, i), bi, ii)
        for bi, b in enumerate(blinkit_products)
        for ii, i in enumerate(instamart_products)
    ]
    scored_pairs.sort(key=lambda t: -t[0])

    used_b: set = set()
    used_i: set = set()
    groups = []
    for score, bi, ii in scored_pairs:
        if score < GROUP_MATCH_SCORE or bi in used_b or ii in used_i:
            continue
        used_b.add(bi)
        used_i.add(ii)
        groups.append({"blinkit": blinkit_products[bi], "instamart": instamart_products[ii]})

    for bi, b in enumerate(blinkit_products):
        if bi not in used_b:
            groups.append({"blinkit": b, "instamart": None})
    for ii, i in enumerate(instamart_products):
        if ii not in used_i:
            groups.append({"blinkit": None, "instamart": i})
    return groups


def group_products(searched_term: str, blinkit_products: list[dict], instamart_products: list[dict]) -> list[dict]:
    """Every scraped product actually relevant to the search, one row per
    real-world product, matched across both platforms where possible.

    Tries sending the whole result set to the LLM for grouping in one call
    (llm_match.llm_group_products) first; falls back to the manual
    pairwise fuzzy grouper if GOOGLE_API_KEY isn't set or the LLM call
    doesn't return a usable result — same degrade-gracefully pattern as
    resolve_match(), just at the batch/grouping level instead of
    per-item-pick level.
    """
    b_relevant = [p for p in blinkit_products if _score(searched_term, p) >= RELEVANCE_MIN]
    i_relevant = [p for p in instamart_products if _score(searched_term, p) >= RELEVANCE_MIN]

    raw_groups = None
    matched_by = "fuzzy"
    if os.getenv("GOOGLE_API_KEY") and (b_relevant or i_relevant):
        llm_pairs = llm_match.llm_group_products(searched_term, b_relevant, i_relevant)
        if llm_pairs is not None:
            used_b, used_i = set(), set()
            raw_groups = []
            for pair in llm_pairs:
                bi, ii = pair.get("blinkit"), pair.get("instamart")
                b = b_relevant[bi] if bi is not None else None
                i = i_relevant[ii] if ii is not None else None
                if bi is not None:
                    used_b.add(bi)
                if ii is not None:
                    used_i.add(ii)
                raw_groups.append({"blinkit": b, "instamart": i})
            for bi, b in enumerate(b_relevant):
                if bi not in used_b:
                    raw_groups.append({"blinkit": b, "instamart": None})
            for ii, i in enumerate(i_relevant):
                if ii not in used_i:
                    raw_groups.append({"blinkit": None, "instamart": i})
            matched_by = "llm"

    if raw_groups is None:
        raw_groups = _manual_group_pairs(b_relevant, i_relevant)

    out = []
    for g in raw_groups:
        b, i = g["blinkit"], g["instamart"]
        if b:
            b = {**b, "unit_price": compute_unit_price(b)}
        if i:
            i = {**i, "unit_price": compute_unit_price(i)}
        display = b or i
        candidates = [
            (p["price"], platform)
            for p, platform in ((b, "blinkit"), (i, "instamart"))
            if p and p.get("in_stock") and p.get("price") is not None
        ]
        cheapest = min(candidates)[1] if candidates else None
        relevance = max(_score(searched_term, b) if b else 0.0, _score(searched_term, i) if i else 0.0)
        out.append(
            {
                "name": display["name"],
                "brand": display.get("brand"),
                "quantity": display.get("quantity"),
                "image_url": (b or {}).get("image_url") or (i or {}).get("image_url"),
                "blinkit": b,
                "instamart": i,
                "cheapest_platform": cheapest,
                "matched_by": matched_by,
                "_relevance": relevance,
            }
        )

    out.sort(key=lambda g: (g["blinkit"] is None or g["instamart"] is None, -g["_relevance"]))
    for g in out:
        g.pop("_relevance", None)
    return out
