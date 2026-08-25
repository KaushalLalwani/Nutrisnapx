"""
Wraps instamart_pipeline.py behind the same result shape as
blinkit_adapter.py. Redis is intentionally not used here — the market
app wants a live per-request comparison, not the pipeline's
snapshot-diffing feature — so this always calls the client directly
with no_redis-equivalent behaviour.
"""

from __future__ import annotations

import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scrapers"))

from instamart_pipeline import InstamartClient, Location  # noqa: E402

PLATFORM = "instamart"


def search_batch(
    queries: list[str],
    lat: float,
    lon: float,
    address: str,
    max_pages: int = 20,
    delay: float = 1.0,
) -> dict[str, dict]:
    """Returns {query: {"available": bool, "products": [dict, ...], "error": str | None}}"""
    location = Location(address=address, lat=lat, lng=lon, annotation=address)
    client = InstamartClient(sleep_between_requests=delay)

    try:
        store_id, _ = client.resolve_store_id(location)
    except Exception as exc:
        error = f"instamart location/store lookup failed: {exc}"
        return {q: {"available": False, "products": [], "error": error} for q in queries}

    out: dict[str, dict] = {}
    for q in queries:
        try:
            products = client.search_all(query=q, store_id=store_id, max_pages=max_pages)
            out[q] = {"available": True, "products": [asdict(p) for p in products], "error": None}
        except Exception as exc:
            out[q] = {"available": False, "products": [], "error": f"instamart search failed: {exc}"}

    return out
