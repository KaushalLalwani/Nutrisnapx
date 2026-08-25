"""
Wraps the Blinkit scraper behind the same shape instamart_adapter.py
returns, so main.py doesn't need to know the two platforms work
completely differently under the hood (browser automation vs. plain
HTTP). Every query gets a result dict — even on total failure — so one
platform being down never blocks the other from answering.
"""

from __future__ import annotations

import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scrapers"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from blinkit_scraper import BlinkitScraper  # noqa: E402
from blinkit_playwright_scraper import fetch_search_json_batch  # noqa: E402

import geocode  # noqa: E402

PLATFORM = "blinkit"


def _resolve_address_text(address: str, lat: float, lon: float) -> str:
    """Blinkit's autoSuggest wants a text query, same as its own search
    box. If the caller (frontend) only gave lat/lon — no typed address —
    reverse-geocode it once via the free Nominatim lookup already used
    for /api/geocode/reverse, so autoSuggest still has something to
    match against instead of an empty string."""
    if address and address.strip():
        return address.strip()
    try:
        reverse = geocode.reverse_geocode(lat, lon)
        return reverse or ""
    except Exception:
        return ""


def search_batch(
    queries: list[str],
    lat: float,
    lon: float,
    address: str = "",
    headless: bool = True,
) -> dict[str, dict]:
    """Returns {query: {"available": bool, "products": [dict, ...], "error": str | None}}"""
    parser = BlinkitScraper(lat=lat, lon=lon)  # used only for its parsing method, no network calls
    address_text = _resolve_address_text(address, lat, lon)

    try:
        raw = fetch_search_json_batch(queries, lat, lon, address=address_text, headless=headless)
    except Exception as exc:  # location couldn't be resolved, browser failed to launch, network down, etc.
        error = f"blinkit unreachable or location not serviceable: {exc}"
        return {q: {"available": False, "products": [], "error": error} for q in queries}

    out: dict[str, dict] = {}
    for q in queries:
        data = raw.get(q)
        if not data:
            out[q] = {
                "available": False,
                "products": [],
                "error": "no response captured for this query — Blinkit may not deliver "
                "to this location, or blocked this session",
            }
            continue
        try:
            products = parser._parse_response(data)
            out[q] = {"available": True, "products": [asdict(p) for p in products], "error": None}
        except Exception as exc:
            out[q] = {"available": False, "products": [], "error": f"could not parse response: {exc}"}

    return out
