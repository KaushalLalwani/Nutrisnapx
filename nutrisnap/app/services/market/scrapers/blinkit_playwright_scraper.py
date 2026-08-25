"""
blinkit_playwright_scraper.py
------------------------------
Fetches Blinkit search results for ANY address — fully automated, no
manual "open a browser and set your address once" step.

HOW LOCATION RESOLUTION WORKS (this is the piece that was missing)
--------------------------------------------------------------------
Blinkit's web app resolves a delivery address the same way you saw in
DevTools when you typed "sharda nagar" into its location box:

  1. GET /location/autoSuggest?query=<text>&lat=<lat>&lng=<lon>&session_token=<uuid>
         -> list of place candidates (place_id, title, description, lat/lng)
  2. GET /location/info?place_id=<id>&title=<title>&description=<desc>
         &is_pin_moved=false&session_token=<same uuid>
         -> this is the call that actually PICKS the address. Blinkit's
            response Set-Cookie headers on this call are what carry the
            merchant/city/serviceability context for every request after it.

Both calls are made with `context.request` (Playwright's APIRequestContext)
instead of `requests`, because they need to run *inside* the same
browser context as the eventual search call — cookies set by a
Set-Cookie header on a `context.request` call land in that context's
cookie jar automatically, exactly like they would if a real page had
made the request. That's the whole trick: we never touch a page UI,
we just replay the two XHRs the site itself makes, in the same
context, then the search call after them is "logged in" to that
address for free.

CONCURRENCY / DEPLOY NOTE
--------------------------
The previous version used `launch_persistent_context(profile_dir, ...)`
— a single on-disk Chrome profile. Playwright locks a persistent
profile directory to one OS process at a time, so two concurrent
requests on a deployed server would either serialize behind each
other or crash on the profile lock. This version launches a plain
(non-persistent) browser and gives every call its own fresh
`browser.new_context(...)` + its own `session_token` (a fresh uuid4,
same as the site does per "location session"), so concurrent requests
never touch each other's state. The browser process itself can be
launched once and reused (pass in `playwright`/`browser`), only the
context is per-call.

NO FILTERING
------------
This module (and BlinkitScraper._parse_response it hands off to)
returns every product card the response contains, unfiltered. This is
for a comparison app — narrowing "tomato" down to "raw tomato only"
would throw away data a comparison app should show. Do that kind of
filtering, if ever, in the frontend/normalize layer, not here.

SETUP
-----
    pip install playwright
    playwright install chromium

USAGE (fully automated — no manual browser step)
---------------------------------------------------
    python blinkit_playwright_scraper.py --query "tomato" \
        --lat 26.4499 --lon 80.3319 --address "Sharda Nagar, Kanpur"

If --address is omitted, pass --lat/--lon only and the site's
autoSuggest is queried with an empty text + your lat/lng bias, which
Blinkit resolves to a "current location" style pin — works, but a
real address string gives a more precise merchant match.

NOTE ON RATE / ToS: these are undocumented, internal endpoints, not a
published API. Keep volume reasonable and treat this as a personal/
research tool — check Blinkit's current ToS yourself before running
this at any real scale.
"""

from __future__ import annotations

import argparse
import os
import uuid
from copy import deepcopy
from typing import Optional
import urllib.parse
from playwright.sync_api import Browser, BrowserContext, Page, Playwright, sync_playwright
from playwright_stealth import Stealth
from blinkit_scraper import BlinkitScraper, save_csv

BASE_URL = "https://blinkit.com"
AUTOSUGGEST_URL = f"{BASE_URL}/location/autoSuggest"
LOCATION_INFO_URL = f"{BASE_URL}/location/info"
SEARCH_URL = f"{BASE_URL}/v1/layout/search"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

COMMON_HEADERS = {
    "Accept": "application/json",
    "app_client": "consumer_web",
    "platform": "web",
    "x-requested-with": "XMLHttpRequest",
}


class LocationResolutionError(RuntimeError):
    pass


def _new_context(browser: Browser, lat: float, lon: float) -> BrowserContext:
    return browser.new_context(
        geolocation={"latitude": lat, "longitude": lon},
        permissions=["geolocation"],
        locale="en-IN",
        user_agent=USER_AGENT,
        extra_http_headers=COMMON_HEADERS,
    )


import json

def resolve_blinkit_location(
    page: Page,
    lat: float,
    lon: float,
    address: str = "",
    session_token: Optional[str] = None,
) -> dict:
    session_token = session_token or str(uuid.uuid4())

    # Ensure spaces are encoded as %20 instead of +, which some APIs prefer
    params = urllib.parse.urlencode(
        {"query": address, "lat": lat, "lng": lon, "session_token": session_token},
        quote_via=urllib.parse.quote
    )
    suggest_url = f"{AUTOSUGGEST_URL}?{params}"
    
    # 1. Safely inject headers as strict JSON, adding lat/lon explicitly
    headers_dict = {
        **COMMON_HEADERS, 
        "lat": str(lat), 
        "lon": str(lon)
    }
    headers_js = json.dumps(headers_dict)
    
    try:
        suggest_data = page.evaluate(f"""async () => {{
            const res = await fetch("{suggest_url}", {{
                headers: {headers_js}
            }});
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        }}""")
    except Exception as e:
        raise LocationResolutionError(f"autoSuggest failed ({e}) for address={address!r}")

    # --- UPDATED JSON PARSING ---
    # Blinkit moved suggestions inside "ui_data"
    candidates = (
        suggest_data.get("ui_data", {}).get("suggestions")
        or suggest_data.get("suggestions")
        or suggest_data.get("data")
        or suggest_data.get("results")
        or []
    )
    
    if not candidates:
        print(f"\n--- DEBUG: RAW BLINKIT RESPONSE ---")
        print(json.dumps(suggest_data, indent=2))
        print(f"-----------------------------------\n")
        raise LocationResolutionError("no autoSuggest candidates found. See debug output above.")
        
    best = candidates[0]
    
    # Extract place_id (now inside "meta")
    meta = best.get("meta", {})
    place_id = meta.get("place_id") or best.get("place_id") or best.get("id")
    
    # Extract title (now inside "title" -> "text")
    title_obj = best.get("title", {})
    title = (title_obj.get("text") if isinstance(title_obj, dict) else title_obj) or best.get("name") or address
    
    # Extract description (now inside "subtitle" -> "text")
    subtitle_obj = best.get("subtitle", {})
    description = (subtitle_obj.get("text") if isinstance(subtitle_obj, dict) else subtitle_obj) or best.get("description") or best.get("address") or ""
    # ----------------------------

    info_params = urllib.parse.urlencode({
        "place_id": place_id,
        "title": title,
        "description": description,
        "is_pin_moved": "false",
        "session_token": session_token,
    }, quote_via=urllib.parse.quote)
    info_url = f"{LOCATION_INFO_URL}?{info_params}"
    
    try:
        info_resp = page.evaluate(f"""async () => {{
            const res = await fetch("{info_url}", {{
                headers: {headers_js}
            }});
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        }}""")
    except Exception as e:
        raise LocationResolutionError(f"location/info failed ({e}) for place_id={place_id!r}")

    return {
        "place_id": place_id,
        "title": title,
        "description": description,
        "session_token": session_token,
        "info_response": info_resp,
    }
import json

def _raw_search(page: Page, query: str, offset: int = 0, limit: int = 12, lat: float = 0.0, lon: float = 0.0) -> Optional[dict]:
    params = urllib.parse.urlencode({
        "offset": offset,
        "limit": limit,
        "actual_query": query,
        "q": query,
        "search_type": "type_to_search",
        "search_method": "basic",
        "tab_position": 0,
    })
    search_url = f"{SEARCH_URL}?{params}"
    
    # Include lat/lon headers, as Blinkit expects them on search requests
    headers_dict = {
        **COMMON_HEADERS, 
        "Content-Type": "application/json",
        "lat": str(lat),
        "lon": str(lon)
    }
    headers_js = json.dumps(headers_dict)
    
    try:
        return page.evaluate(f"""async () => {{
            const res = await fetch("{search_url}", {{
                method: "POST",
                headers: {headers_js},
                body: "{{}}"
            }});
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        }}""")
    except Exception as e:
        # Print the exact error instead of failing silently
        print(f"\n--- DEBUG: _raw_search failed for query '{query}': {e} ---\n")
        return None
def _merge_search_pages(pages: list[dict]) -> dict:
    """Keep one response shape while appending cards from paginated calls."""
    if not pages:
        return {}
    merged = deepcopy(pages[0])
    snippets = merged.setdefault("response", {}).setdefault("snippets", [])
    for page in pages[1:]:
        snippets.extend((page.get("response") or {}).get("snippets", []))
    return merged


def fetch_search_json_batch(
    queries: list[str],
    lat: float,
    lon: float,
    address: str = "",
    headless: bool = True,
    playwright: Optional[Playwright] = None,
    browser: Optional[Browser] = None,
) -> dict[str, Optional[dict]]:
    """Resolves `address` (any location, anywhere) into a live Blinkit
    delivery session, then fetches search results for every query in
    that same session. Returns {query: raw_search_json_or_None}.

    A fresh, non-persistent context + session_token is created per call
    so this is safe to run concurrently (e.g. from several FastAPI
    request handlers at once) — nothing here is shared/global state.

    Pass an already-running `playwright`/`browser` to reuse one browser
    process across many calls instead of paying launch cost every time;
    otherwise one is spun up and torn down here.
    """
    results: dict[str, Optional[dict]] = {}
    owns_playwright = playwright is None

    pw_cm = sync_playwright() if owns_playwright else None
    pw = pw_cm.__enter__() if pw_cm else playwright
    owns_browser = browser is None
    b = browser or pw.chromium.launch(headless=headless)

    try:
        context = _new_context(b, lat, lon)
        try:
            stealth = Stealth()
            stealth.apply_stealth_sync(context)
            
            page = context.new_page()
            page.goto("https://blinkit.com", wait_until="domcontentloaded")
            page.wait_for_timeout(100)  # Let Cloudflare clear the browser
            
            # Pass PAGE instead of CONTEXT
            resolve_blinkit_location(page, lat, lon, address=address)

            max_pages = max(1, int(os.getenv("BLINKIT_MAX_PAGES", "8")))
            page_size = max(1, int(os.getenv("BLINKIT_PAGE_SIZE", "12")))
            # 4. Loop through queries and fetch results using page.evaluate
            for query in queries:
                try:
                    pages = []
                    seen_product_ids = set()
                    for page_number in range(max_pages):
                        page_data = _raw_search(page, query, offset=page_number * page_size, limit=page_size, lat=lat, lon=lon)
                        
                        if not page_data:
                            print(f"\n--- DEBUG: _raw_search returned empty data for page {page_number} ---")
                            break
                        
                        pages.append(page_data)
                        page_cards = list(BlinkitScraper._card_candidates(page_data))
                        
                        # If no cards are found, print a snippet of the raw JSON to see what changed
                        if not page_cards and page_number == 0:
                            print(f"\n--- DEBUG: RAW SEARCH RESPONSE (First 2000 characters) ---")
                            print(json.dumps(page_data, indent=2)[:2000])
                            print(f"----------------------------------------------------------\n")
                        
                        new_ids = {
                            str(card.get("product_id"))
                            for card in page_cards
                            if card.get("product_id") is not None
                        } - seen_product_ids
                        
                        seen_product_ids.update(new_ids)
                        
                        if not new_ids or len(page_cards) < page_size:
                            break
                            
                    results[query] = _merge_search_pages(pages) if pages else None
                    
                except Exception as e:
                    # Print the previously hidden exception
                    print(f"\n--- DEBUG: CRITICAL EXCEPTION IN SEARCH LOOP ---")
                    import traceback
                    traceback.print_exc()
                    print(f"------------------------------------------------\n")
                    results[query] = None
        finally:
            context.close()
    finally:
        if owns_browser:
            b.close()
        if pw_cm:
            pw_cm.__exit__(None, None, None)

    return results


def fetch_search_json(
    query: str,
    lat: float,
    lon: float,
    address: str = "",
    headless: bool = True,
) -> Optional[dict]:
    return fetch_search_json_batch([query], lat, lon, address=address, headless=headless).get(query)


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Blinkit search for any address — fully automated location resolution"
    )
    parser.add_argument("--query", required=True)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--address", default="", help='e.g. "Sharda Nagar, Kanpur"')
    parser.add_argument("--out", default="blinkit_results.csv")
    parser.add_argument("--show-browser", action="store_true")
    args = parser.parse_args()

    data = fetch_search_json(
        args.query,
        args.lat,
        args.lon,
        address=args.address,
        headless=not args.show_browser,
    )
    if not data:
        print(
            "No search response captured. Double-check --address resolves on "
            "blinkit.com manually, or rerun with --show-browser to watch it happen."
        )
        return

    scraper = BlinkitScraper(lat=args.lat, lon=args.lon)
    products = scraper._parse_response(data)
    print(f"Found {len(products)} products for '{args.query}'")
    save_csv(products, args.out)
    print(f"Saved to {args.out}")


if __name__ == "__main__":
    main()
