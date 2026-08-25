"""
Free location search via OpenStreetMap's Nominatim, no API key needed.
Proxied through our own backend (rather than called from the browser)
so we can centralize the required User-Agent header and the 1
request/second rate limit Nominatim's usage policy asks for:
https://operations.osmfoundation.org/policies/nominatim/
"""

from __future__ import annotations

import time
from typing import Optional

import requests

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "ledger-market-app/1.0 (personal grocery price comparison project)"}

_last_call = 0.0


def _throttle():
    global _last_call
    elapsed = time.time() - _last_call
    if elapsed < 1.05:
        time.sleep(1.05 - elapsed)
    _last_call = time.time()


def search_address(query: str, limit: int = 5) -> list[dict]:
    _throttle()
    resp = requests.get(
        f"{NOMINATIM_BASE}/search",
        params={"q": query, "format": "jsonv2", "limit": limit},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    return [
        {"display_name": item["display_name"], "lat": float(item["lat"]), "lon": float(item["lon"])}
        for item in resp.json()
    ]


def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    _throttle()
    resp = requests.get(
        f"{NOMINATIM_BASE}/reverse",
        params={"lat": lat, "lon": lon, "format": "jsonv2"},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("display_name")
