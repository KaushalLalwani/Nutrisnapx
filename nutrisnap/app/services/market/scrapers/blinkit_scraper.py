"""
blinkit_scraper.py
-------------------
Queries Blinkit's internal search + ETA endpoints (the same ones the
blinkit.com web app calls — as seen in DevTools) and normalizes the
response into a flat list of Product records you can save to CSV and
compare against other quick-commerce platforms (Instamart, Zepto, etc.).

HOW THIS WORKS
--------------
Endpoint 1 — search (POST):
    https://blinkit.com/v1/layout/search
    Returns nested "snippets" -> product_card_snippet_type_2 cards.

Endpoint 2 — eta (GET):
    https://blinkit.com/v1/consumerweb/eta
    Returns eta_map_v2[merchant_id][eta_identifier] -> {eta, asset_id}
    Used to attach a live ETA to each product's merchant.

IMPORTANT — READ BEFORE RUNNING
--------------------------------
* These are undocumented, internal endpoints, not a published/public
  API. They can change shape or start rejecting automated traffic
  (the responses show Cloudflare headers) at any time, and Blinkit's
  Terms of Service most likely prohibit automated scraping. Treat
  this as a personal/research tool: keep request volume low (see
  DEFAULT_DELAY), don't run it continuously or at scale, and check
  the current ToS yourself before doing anything beyond that.
* The endpoints need a live session: cookies from a browser that has
  already set a delivery location, plus lat/lon. To get them:
    1. Open blinkit.com in Chrome and set your delivery address.
    2. DevTools -> Network -> search for anything.
    3. Click the `search?...` request -> Headers tab -> copy the
       full "Cookie" request header value.
    4. Paste it into COOKIE_STRING below (or pass --cookie-file).
* If search() starts returning empty snippets, your cookies expired —
  repeat the steps above.
"""

from __future__ import annotations

import argparse
import csv
import time
from dataclasses import dataclass, asdict
from difflib import SequenceMatcher
from typing import Optional

import requests

# --------------------------------------------------------------------------
# Config — fill in from your own browser session (see notes above)
# --------------------------------------------------------------------------
COOKIE_STRING = ""  # only needed if you call BlinkitScraper.search()/get_eta() directly (raw requests path);
                     # the market app itself doesn't use this — it fetches via the Playwright path instead,
                     # and only reuses this file's response-parsing methods.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
DEFAULT_DELAY = 1.5  # seconds between requests — keep this polite


@dataclass
class Product:
    platform: str
    product_id: str
    name: str
    brand: Optional[str]
    variant: Optional[str]
    price: Optional[float]
    mrp: Optional[float]
    in_stock: bool
    inventory: Optional[int]
    rating: Optional[float]
    rating_count: Optional[str]
    eta_minutes: Optional[int]
    merchant_id: Optional[str]
    image_url: Optional[str]


class PlatformScraper:
    """Common interface so other platforms can be added alongside
    Blinkit and compared with the same downstream code. Capture each
    platform's search endpoint from DevTools the same way, then give
    it a `search(query)` that returns a list[Product]."""

    platform_name = "generic"

    def search(self, query: str, **kwargs) -> list[Product]:
        raise NotImplementedError


def _money(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    cleaned = text.replace("₹", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


class BlinkitScraper(PlatformScraper):
    platform_name = "blinkit"

    SEARCH_URL = "https://blinkit.com/v1/layout/search"
    ETA_URL = "https://blinkit.com/v1/consumerweb/eta"

    def __init__(self, lat: float, lon: float, cookie_string: str = COOKIE_STRING):
        self.lat = lat
        self.lon = lon
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "lat": str(lat),
                "lon": str(lon),
            }
        )
        if cookie_string:
            self.session.headers["Cookie"] = cookie_string

    # -- ETA -----------------------------------------------------------
    def get_eta(self, merchant_id: str, eta_identifier: str) -> Optional[int]:
        resp = self.session.get(self.ETA_URL, params={"lat": self.lat, "lon": self.lon})
        resp.raise_for_status()
        data = resp.json()
        try:
            return data["update_eta_action"]["update_eta"]["eta_map_v2"][merchant_id][
                eta_identifier
            ]["eta"]
        except KeyError:
            return None

    # -- search ----------------------------------------------------------
    def _raw_search(self, query: str, offset: int = 0, limit: int = 12) -> dict:
        params = {
            "offset": offset,
            "limit": limit,
            "actual_query": query,
            "q": query,
            "search_type": "auto_suggest",
            "search_method": "basic",
            "tab_position": 0,
        }
        resp = self.session.post(self.SEARCH_URL, params=params, json={})
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def _card_candidates(data: dict):
        """Walk the *entire* response tree and yield every dict that
        looks like a product card, regardless of which widget_type it's
        wrapped in.

        The old version only matched widget_type == "product_card_snippet_type_2",
        which is actually the *sponsored/ad* card type in Blinkit's
        search response — that's why only one or two results were ever
        showing up (only the ad slots matched). Search result grids,
        "people also bought" rails, and variant lists all use their own
        widget_type strings that change over time, so instead of
        hardcoding one, this looks for the *shape* of a product card
        (a dict with a product_id plus a name/price field next to it)
        anywhere in the tree — the same defensive approach
        instamart_pipeline.py already uses via walk_json/find_first_value.
        """
        if isinstance(data, dict):
            pid = data.get("product_id")
            if pid is not None and (
                "normal_price" in data or "display_name" in data or "name" in data
            ):
                yield data
            for value in data.values():
                yield from BlinkitScraper._card_candidates(value)
        elif isinstance(data, list):
            for item in data:
                yield from BlinkitScraper._card_candidates(item)

    @staticmethod
    def _text(value) -> Optional[str]:
        """Blinkit sometimes ships a field as a styled {"text": "..."}
        object and sometimes as a plain string (e.g. inside atc_action's
        cart_item) depending on where in the tree it appears — accept both."""
        if isinstance(value, dict):
            return value.get("text")
        if isinstance(value, str):
            return value
        return None

    @classmethod
    def _price_value(cls, node: dict, styled_key: str, raw_key: Optional[str] = None) -> Optional[float]:
        val = node.get(styled_key)
        if isinstance(val, dict):
            return _money(val.get("text"))
        if isinstance(val, (int, float)):
            return float(val)
        if raw_key:
            raw = node.get(raw_key)
            if isinstance(raw, (int, float)):
                return float(raw)
        return None

    @classmethod
    def _parse_card(cls, node: dict) -> Optional[Product]:
        name = cls._text(node.get("display_name")) or cls._text(node.get("name")) or cls._text(
            node.get("product_name")
        )
        if not name:
            return None
        rating_bar = ((node.get("rating") or {}).get("bar")) or {}
        rating_title = rating_bar.get("title")
        return Product(
            platform="blinkit",
            product_id=str(node.get("product_id", "")),
            name=name,
            brand=cls._text(node.get("brand_name")) or node.get("brand"),
            variant=cls._text(node.get("variant")) or node.get("unit"),
            price=cls._price_value(node, "normal_price", raw_key="price"),
            mrp=cls._price_value(node, "mrp", raw_key="mrp"),
            in_stock=not node.get("is_sold_out", False),
            inventory=node.get("inventory"),
            rating=rating_bar.get("value"),
            rating_count=cls._text(rating_title),
            eta_minutes=None,  # call get_eta(merchant_id, eta_identifier) if you need this live
            merchant_id=node.get("merchant_id") or (node.get("meta") or {}).get("merchant_id"),
            image_url=(node.get("image") or {}).get("url") or node.get("image_url"),
        )

    def _parse_response(self, data: dict) -> list[Product]:
        products: list[Product] = []
        seen_ids: set[str] = set()
        for node in self._card_candidates(data):
            pid = str(node.get("product_id", ""))
            if not pid or pid in seen_ids:
                continue  # a product's own card, its cart_item payload, and its
                # recommendation-rail echo all carry the same product_id —
                # first occurrence wins, the rest are the same product restated
            product = self._parse_card(node)
            if product:
                seen_ids.add(pid)
                products.append(product)
        return products

    def search(self, query: str, max_pages: int = 3, delay: float = DEFAULT_DELAY) -> list[Product]:
        all_products: list[Product] = []
        seen_ids: set[str] = set()
        offset = 0
        for page in range(max_pages):
            data = self._raw_search(query, offset=offset)
            page_products = self._parse_response(data)
            if not page_products:
                break
            for p in page_products:
                if p.product_id not in seen_ids:
                    seen_ids.add(p.product_id)
                    all_products.append(p)
            if len(data.get("response", {}).get("snippets", [])) < 12:
                break  # last page
            offset += 12
            if page < max_pages - 1:
                time.sleep(delay)
        return all_products


# --------------------------------------------------------------------------
# Cross-platform comparison helpers
# --------------------------------------------------------------------------
def compare(results: dict[str, list[Product]], threshold: float = 0.55) -> list[dict]:
    """Naive fuzzy-match products with similar names across platforms
    and line them up so you can eyeball price differences.
    `results` is e.g. {"blinkit": [...], "instamart": [...]}"""
    platforms = list(results.keys())
    if not platforms:
        return []
    base_platform, base_products = platforms[0], results[platforms[0]]
    rows = []
    for base_p in base_products:
        row = {f"{base_platform}_name": base_p.name, f"{base_platform}_price": base_p.price}
        for other in platforms[1:]:
            best, best_score = None, 0.0
            for cand in results[other]:
                score = SequenceMatcher(None, base_p.name.lower(), cand.name.lower()).ratio()
                if score > best_score:
                    best, best_score = cand, score
            if best and best_score >= threshold:
                row[f"{other}_name"] = best.name
                row[f"{other}_price"] = best.price
            else:
                row[f"{other}_name"] = None
                row[f"{other}_price"] = None
        rows.append(row)
    return rows


def save_csv(products: list[Product], path: str) -> None:
    if not products:
        print("No products to save.")
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(asdict(products[0]).keys()))
        writer.writeheader()
        for p in products:
            writer.writerow(asdict(p))


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Scrape Blinkit search results for a query")
    parser.add_argument("--query", required=True, help="Search term, e.g. 'coca-cola'")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--pages", type=int, default=3, help="Max result pages to fetch")
    parser.add_argument("--cookie-file", help="Path to a text file containing the Cookie header value")
    parser.add_argument("--out", default="blinkit_results.csv")
    args = parser.parse_args()

    cookie_string = COOKIE_STRING
    if args.cookie_file:
        with open(args.cookie_file, "r", encoding="utf-8") as f:
            cookie_string = f.read().strip()

    scraper = BlinkitScraper(lat=args.lat, lon=args.lon, cookie_string=cookie_string)
    products = scraper.search(args.query, max_pages=args.pages)
    print(f"Found {len(products)} products for '{args.query}'")
    save_csv(products, args.out)
    print(f"Saved to {args.out}")


if __name__ == "__main__":
    main()
