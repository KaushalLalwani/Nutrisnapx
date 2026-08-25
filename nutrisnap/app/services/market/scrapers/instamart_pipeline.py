"""
instamart_pipeline.py

Location -> store/pod ID -> Instamart search API -> pagination -> product normalization
-> Redis snapshot -> price/stock comparison.

This uses the JSON endpoints observed in the browser Network tab.
It deliberately does NOT use Playwright/Selenium, BeautifulSoup, or page scrolling.

Install:
    pip install requests redis

Redis:
    docker run --name instamart-redis -p 6379:6379 -d redis:7

Example:
    python instamart_pipeline.py --query "coca cola" \
        --address "Sharda Nagar, Kanpur, Uttar Pradesh, India" \
        --lat 26.4861403 --lng 80.2857005

If you already know lat/lng, those are enough for the location request.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import quote_plus

import requests

try:
    import redis
except ImportError:
    redis = None


BASE_URL = "https://instamart.in"

LOCATION_URL = f"{BASE_URL}/api/instamart/home/select-location/v2"
SEARCH_URL = f"{BASE_URL}/api/instamart/search/v2"

DEFAULT_ADDRESS = "Sharda Nagar, Kanpur, Uttar Pradesh, India"
DEFAULT_LAT = 26.4861403
DEFAULT_LNG = 80.28570049999999

# The Network request you captured used layoutId=4987.
# Keep it configurable because this value can change.
DEFAULT_LAYOUT_ID = "4987"

DEFAULT_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": f"{BASE_URL}/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
}

logger = logging.getLogger("instamart")


@dataclass
class Location:
    address: str
    lat: float
    lng: float
    address_id: str = ""
    annotation: str = ""
    client_id: str = "INSTAMART-APP"


@dataclass
class Product:
    store_id: str
    query: str

    product_id: str
    parent_product_id: str

    sku_id: str
    spin_id: str

    name: str
    brand: str
    quantity: str

    mrp: Optional[float]
    offer_price: Optional[float]
    discount_text: str

    in_stock: bool
    is_avail: bool
    slot_available: bool

    allowed_quantity: Optional[int]

    category: str
    subcategory: str
    super_category: str

    weight_grams: Optional[float]
    unit_level_price: str

    pod_id: str
    image_id: str

    scraped_at: str


# ---------------------------------------------------------------------------
# Generic JSON helpers
# ---------------------------------------------------------------------------

def walk_json(value: Any) -> Iterable[Any]:
    """Yield every dict/list node recursively."""
    yield value

    if isinstance(value, dict):
        for child in value.values():
            yield from walk_json(child)

    elif isinstance(value, list):
        for child in value:
            yield from walk_json(child)


def find_first_value(obj: Any, key: str, default: Any = None) -> Any:
    """Find the first occurrence of key anywhere in a nested JSON object."""
    for node in walk_json(obj):
        if isinstance(node, dict) and key in node:
            return node[key]
    return default


def find_all_dicts_with_key(obj: Any, key: str) -> List[Dict[str, Any]]:
    result = []

    for node in walk_json(obj):
        if isinstance(node, dict) and key in node:
            result.append(node)

    return result


def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def money_from_obj(price_obj: Any) -> Optional[float]:
    """
    Instamart prices in the captured response look like:

        {
            "currencyCode": "INR",
            "units": "65",
            "nanos": 0
        }

    Return the full numeric value.
    """
    if not isinstance(price_obj, dict):
        return None

    units = price_obj.get("units")
    nanos = price_obj.get("nanos", 0)

    if units is None:
        return None

    try:
        return float(Decimal(str(units)) + Decimal(str(nanos)) / Decimal("1000000000"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

class InstamartClient:
    def __init__(
        self,
        timeout: int = 30,
        retries: int = 3,
        sleep_between_requests: float = 1.0,
    ):
        self.timeout = timeout
        self.retries = retries
        self.sleep_between_requests = sleep_between_requests

        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        last_error = None

        for attempt in range(1, self.retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json_body,
                    timeout=self.timeout,
                )

                logger.debug(
                    "%s %s -> %s",
                    method,
                    response.url,
                    response.status_code,
                )

                if response.status_code == 429:
                    wait = min(30, 2 ** attempt)
                    logger.warning(
                        "Rate limited (429). Waiting %ss before retry.",
                        wait,
                    )
                    time.sleep(wait)
                    continue

                if response.status_code in (401, 403):
                    raise RuntimeError(
                        f"Instamart rejected the request: HTTP "
                        f"{response.status_code}. "
                        "Do not try to bypass the protection; inspect the "
                        "current API/request contract instead."
                    )

                response.raise_for_status()

                try:
                    return response.json()
                except ValueError as exc:
                    raise RuntimeError(
                        "Instamart returned a non-JSON response."
                    ) from exc

            except (requests.RequestException, RuntimeError) as exc:
                last_error = exc

                if attempt == self.retries:
                    break

                wait = min(10, attempt * 2)
                logger.warning(
                    "Request failed (%s). Retrying in %ss...",
                    exc,
                    wait,
                )
                time.sleep(wait)

        raise RuntimeError(
            f"Request failed after {self.retries} attempts: {last_error}"
        )

    # -----------------------------------------------------------------------
    # Location -> pod/store
    # -----------------------------------------------------------------------

    def select_location(self, location: Location) -> Dict[str, Any]:
        """
        Calls the location endpoint using the exact nested payload shape
        captured in DevTools.
        """
        payload = {
            "data": {
                "lat": location.lat,
                "lng": location.lng,
                "address": location.address,
                "addressId": location.address_id,
                "annotation": location.annotation or location.address,
                "clientId": location.client_id,
            }
        }

        logger.info(
            "Setting location: %s (lat=%s, lng=%s)",
            location.address,
            location.lat,
            location.lng,
        )

        return self._request(
            "POST",
            LOCATION_URL,
            json_body=payload,
        )

    def resolve_store_id(
        self,
        location: Location,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Extract podId from the location response.

        The response shape can change, so this searches recursively for
        podDetails/podDetailsList/podId rather than depending on one deeply
        nested path.
        """
        response = self.select_location(location)

        serviceability = find_first_value(
            response,
            "serviceabilityStatus",
            None,
        )

        serviceability_type = find_first_value(
            response,
            "serviceabilityType",
            None,
        )

        # NOTE: these two were being logged but never actually checked —
        # that's why searches were "succeeding" (and returning products)
        # at addresses Instamart doesn't actually deliver to: whatever
        # podId the response happened to contain (often a nearest/default
        # store) was accepted as valid regardless of serviceability.
        serviceable_flag = find_first_value(response, "isServiceable", None)
        if serviceable_flag is None:
            serviceable_flag = find_first_value(response, "serviceable", None)

        logger.info(
            "Serviceability: status=%s type=%s isServiceable=%s",
            serviceability,
            serviceability_type,
            serviceable_flag,
        )

        if serviceable_flag is False:
            raise RuntimeError(
                "Instamart is not serviceable at this location "
                f"(isServiceable=false, status={serviceability!r}, type={serviceability_type!r})."
            )

        if isinstance(serviceability, str) and serviceability.strip() and serviceability.strip().upper() != "SERVICEABLE":
            raise RuntimeError(
                "Instamart is not serviceable at this location "
                f"(serviceabilityStatus={serviceability!r}, type={serviceability_type!r})."
            )

        # If neither field was present at all, the response shape may have
        # changed rather than the location genuinely being serviceable — we
        # proceed (matching prior behaviour) but log it loudly so it's
        # visible in output instead of silently trusting an unverified pod.
        if serviceability is None and serviceable_flag is None:
            logger.warning(
                "Could not find a serviceability field in Instamart's location "
                "response at all — proceeding with whatever podId is found, but "
                "this can't be verified as actually serviceable. If you keep "
                "seeing Instamart results at addresses it shouldn't cover, this "
                "response shape has likely changed; inspect it directly."
            )

        pod_id = None

        # Prefer podDetails -> podId.
        for node in walk_json(response):
            if isinstance(node, dict):
                pod_details = node.get("podDetails")

                if isinstance(pod_details, dict):
                    candidate = pod_details.get("podId")

                    if candidate:
                        pod_id = str(candidate)
                        break

        # Fallback: search podDetailsList.
        if not pod_id:
            for node in walk_json(response):
                if isinstance(node, dict):
                    pod_list = node.get("podDetailsList")

                    if isinstance(pod_list, list):
                        for pod in pod_list:
                            if isinstance(pod, dict) and pod.get("podId"):
                                pod_id = str(pod["podId"])
                                break

                        if pod_id:
                            break

        # Last fallback: first podId anywhere.
        if not pod_id:
            candidate = find_first_value(response, "podId", None)
            if candidate:
                pod_id = str(candidate)

        if not pod_id:
            # Save the response because this is the most useful debugging
            # artifact if Instamart changes its location response.
            debug_file = "instamart_location_response.json"

            with open(debug_file, "w", encoding="utf-8") as f:
                json.dump(response, f, indent=2, ensure_ascii=False)

            raise RuntimeError(
                "Could not find podId/storeId in the location response. "
                f"Full response saved to {debug_file}."
            )

        logger.info("Resolved storeId/podId = %s", pod_id)

        return pod_id, response

    # -----------------------------------------------------------------------
    # Search API
    # -----------------------------------------------------------------------

    def search_page(
        self,
        query: str,
        store_id: str,
        offset: int | str = 0,
        *,
        layout_id: str = DEFAULT_LAYOUT_ID,
        sort_attribute: str = "",
        facets: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:

        """
        Search endpoint observed in the browser:

        POST /api/instamart/search/v2

        Query parameters captured:
            offset
            ageConsent
            layoutId
            voiceSearchTrackingId
            storeId
            primaryStoreId
            secondaryStoreId

        Request payload captured:
            facets
            is_pre_search_tag
            page_type
            query
            search_results_offset
            sortAttribute
        """

        params = {
            "offset": str(offset),
            "ageConsent": "false",
            "layoutId": str(layout_id),
            "voiceSearchTrackingId": "",
            "storeId": str(store_id),
            "primaryStoreId": str(store_id),
            "secondaryStoreId": "",
        }

        payload = {
            "facets": facets or [],
            "sortAttribute": sort_attribute,
            "query": query,
            "search_results_offset": str(offset),
            "page_type": "INSTAMART_AUTO_SUGGEST_PAGE",
            "is_pre_search_tag": False,
        }

        logger.info(
            "Searching query=%r storeId=%s offset=%s",
            query,
            store_id,
            offset,
        )

        response = self._request(
            "POST",
            SEARCH_URL,
            params=params,
            json_body=payload,
        )

        if self.sleep_between_requests > 0:
            time.sleep(self.sleep_between_requests)

        return response

    # -----------------------------------------------------------------------
    # Product extraction
    # -----------------------------------------------------------------------

    @staticmethod
    def extract_items(response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Locate product collection items without depending on one exact card
        nesting level.

        The captured response contains:

            GridWidget
              -> gridElements
                -> infoWithStyle
                  -> items
                    -> displayName
                    -> variations
        """

        items: List[Dict[str, Any]] = []
        seen_objects = set()

        for node in walk_json(response):
            if not isinstance(node, dict):
                continue

            candidate = node.get("items")

            if not isinstance(candidate, list):
                continue

            for item in candidate:
                if not isinstance(item, dict):
                    continue

                # Product cards have these fields. This prevents unrelated
                # "items" arrays from being treated as products.
                if not (
                    "displayName" in item
                    and (
                        "variations" in item
                        or "productId" in item
                        or "brand" in item
                    )
                ):
                    continue

                object_id = id(item)

                if object_id not in seen_objects:
                    seen_objects.add(object_id)
                    items.append(item)

        return items

    @staticmethod
    def variation_to_product(
        item: Dict[str, Any],
        variation: Dict[str, Any],
        query: str,
        store_id: str,
    ) -> Product:

        price = variation.get("price") or {}

        offer_applied = price.get("offerApplied") or {}

        inventory = variation.get("inventory") or {}
        slot_info = variation.get("slotInfo") or {}
        cart_limit = variation.get("cartAllowedQuantity") or {}

        images = variation.get("imageIds") or []

        image_id = str(images[0]) if images else ""

        in_stock = bool(
            inventory.get(
                "inStock",
                item.get("inStock", False),
            )
        )

        is_avail = bool(
            variation.get(
                "isAvail",
                item.get("isAvail", False),
            )
        )

        slot_available = bool(
            slot_info.get(
                "isAvail",
                is_avail,
            )
        )

        timestamp = datetime.now(timezone.utc).isoformat()

        return Product(
            store_id=str(store_id),
            query=query,

            product_id=str(item.get("productId") or ""),
            parent_product_id=str(item.get("parentProductId") or ""),

            sku_id=str(variation.get("skuId") or ""),
            spin_id=str(variation.get("spinId") or ""),

            name=str(
                variation.get("displayName")
                or item.get("displayName")
                or ""
            ),
            brand=str(
                variation.get("brandName")
                or item.get("brand")
                or ""
            ),
            quantity=str(
                variation.get("quantityDescription")
                or ""
            ),

            mrp=money_from_obj(price.get("mrp")),
            offer_price=money_from_obj(price.get("offerPrice")),
            discount_text=str(
                offer_applied.get("listingDescription") or ""
            ),

            in_stock=in_stock,
            is_avail=is_avail,
            slot_available=slot_available,

            allowed_quantity=safe_int(
                cart_limit.get("allowedQuantity")
            ),

            category=str(
                variation.get("category") or ""
            ),
            subcategory=str(
                variation.get("subCategoryType") or ""
            ),
            super_category=str(
                variation.get("superCategory") or ""
            ),

            weight_grams=safe_float(
                variation.get("weightInGrams")
            ),
            unit_level_price=str(
                variation.get("unitLevelPrice") or ""
            ),

            pod_id=str(
                variation.get("podId")
                or store_id
            ),
            image_id=image_id,

            scraped_at=timestamp,
        )

    @classmethod
    def normalize_products(
        cls,
        response: Dict[str, Any],
        query: str,
        store_id: str,
    ) -> List[Product]:

        products: List[Product] = []
        seen_keys = set()

        for item in cls.extract_items(response):
            variations = item.get("variations") or []

            if not isinstance(variations, list):
                continue

            for variation in variations:
                if not isinstance(variation, dict):
                    continue

                sku_id = str(variation.get("skuId") or "")
                product_id = str(item.get("productId") or "")

                # skuId is the best comparison key because different
                # pack sizes can have different prices/stock.
                unique_key = (
                    sku_id
                    or f"{product_id}|"
                    f"{variation.get('quantityDescription', '')}"
                )

                if unique_key in seen_keys:
                    continue

                seen_keys.add(unique_key)

                products.append(
                    cls.variation_to_product(
                        item=item,
                        variation=variation,
                        query=query,
                        store_id=store_id,
                    )
                )

        return products

    # -----------------------------------------------------------------------
    # Pagination
    # -----------------------------------------------------------------------

    def search_all(
        self,
        query: str,
        store_id: str,
        *,
        max_pages: int = 20,
        layout_id: str = DEFAULT_LAYOUT_ID,
    ) -> List[Product]:

        all_products: List[Product] = []
        seen_skus = set()
        seen_offsets = set()

        offset: str | int = 0

        for page_number in range(1, max_pages + 1):

            offset_key = str(offset)

            if offset_key in seen_offsets:
                logger.warning(
                    "Pagination stopped: offset %s repeated.",
                    offset_key,
                )
                break

            seen_offsets.add(offset_key)

            response = self.search_page(
                query=query,
                store_id=store_id,
                offset=offset,
                layout_id=layout_id,
            )

            products = self.normalize_products(
                response=response,
                query=query,
                store_id=store_id,
            )

            new_count = 0

            for product in products:
                key = product.sku_id or (
                    f"{product.product_id}|{product.quantity}"
                )

                if key not in seen_skus:
                    seen_skus.add(key)
                    all_products.append(product)
                    new_count += 1

            page_offset = None

            data = response.get("data")

            if isinstance(data, dict):
                page_offset = data.get("pageOffset")

            next_offset = None

            if isinstance(page_offset, dict):
                next_offset = page_offset.get("nextOffset")

            logger.info(
                "Page %s: %s products (%s new), nextOffset=%r",
                page_number,
                len(products),
                new_count,
                next_offset,
            )

            # No products normally means there is nothing else useful to
            # collect.
            if not products:
                break

            # API-provided pagination is preferred.
            if next_offset not in (None, ""):
                if str(next_offset) == offset_key:
                    break

                offset = str(next_offset)
                continue

            # Fallback if pageOffset disappears in a future API version.
            # Do not blindly make endless requests.
            if new_count == 0:
                break

            # The observed API currently uses pageOffset. If it stops
            # returning it, try numeric offset + 1 once per page.
            try:
                offset = int(offset) + 1
            except (TypeError, ValueError):
                break

        return all_products


# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------

class RedisStore:
    def __init__(self, redis_url: str):
        if redis is None:
            raise RuntimeError(
                "redis package is not installed. "
                "Run: pip install redis"
            )

        self.client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
        )

        self.client.ping()

    @staticmethod
    def normalize_query(query: str) -> str:
        return re.sub(r"\s+", " ", query.strip().lower())

    def snapshot_key(self, store_id: str, query: str) -> str:
        q = self.normalize_query(query)
        return f"instamart:snapshot:{store_id}:{q}"

    def product_key(self, store_id: str, sku_id: str) -> str:
        return f"instamart:product:{store_id}:{sku_id}"

    def save_snapshot(
        self,
        store_id: str,
        query: str,
        products: List[Product],
    ) -> Optional[List[Dict[str, Any]]]:

        key = self.snapshot_key(store_id, query)

        old_raw = self.client.get(key)

        old_products = None

        if old_raw:
            try:
                old_products = json.loads(old_raw)
            except json.JSONDecodeError:
                logger.warning(
                    "Existing Redis snapshot is invalid JSON; replacing it."
                )

        current = [asdict(product) for product in products]

        # Store the complete search snapshot.
        self.client.set(
            key,
            json.dumps(
                current,
                ensure_ascii=False,
                separators=(",", ":"),
            ),
        )

        # Also store each variation independently for easy comparison/query.
        pipe = self.client.pipeline()

        for product in products:
            if not product.sku_id:
                continue

            pkey = self.product_key(
                store_id,
                product.sku_id,
            )

            data = asdict(product)

            # Redis hashes store strings.
            data = {
                k: json.dumps(v, ensure_ascii=False)
                if isinstance(v, (dict, list))
                else "" if v is None
                else str(v)
                for k, v in data.items()
            }

            pipe.hset(pkey, mapping=data)

        pipe.execute()

        return old_products

    @staticmethod
    def index_products(
        products: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Dict[str, Any]]:

        if not products:
            return {}

        result = {}

        for product in products:
            key = (
                product.get("sku_id")
                or product.get("product_id")
                or f"{product.get('name')}|{product.get('quantity')}"
            )

            result[str(key)] = product

        return result

    def compare_and_save(
        self,
        store_id: str,
        query: str,
        products: List[Product],
    ) -> Dict[str, List[Dict[str, Any]]]:

        # Read old snapshot before saving current one.
        key = self.snapshot_key(store_id, query)

        old_raw = self.client.get(key)

        old_products = []

        if old_raw:
            try:
                old_products = json.loads(old_raw)
            except json.JSONDecodeError:
                pass

        old_index = self.index_products(old_products)

        current_products = [asdict(p) for p in products]
        current_index = self.index_products(current_products)

        changes = {
            "new": [],
            "removed": [],
            "price_changed": [],
            "stock_changed": [],
        }

        for key_id, current in current_index.items():

            old = old_index.get(key_id)

            if old is None:
                changes["new"].append(current)
                continue

            old_price = old.get("offer_price")
            new_price = current.get("offer_price")

            if old_price != new_price:
                changes["price_changed"].append(
                    {
                        "sku_id": key_id,
                        "name": current.get("name"),
                        "quantity": current.get("quantity"),
                        "old_price": old_price,
                        "new_price": new_price,
                    }
                )

            old_stock = bool(old.get("in_stock"))
            new_stock = bool(current.get("in_stock"))

            if old_stock != new_stock:
                changes["stock_changed"].append(
                    {
                        "sku_id": key_id,
                        "name": current.get("name"),
                        "quantity": current.get("quantity"),
                        "old_stock": old_stock,
                        "new_stock": new_stock,
                    }
                )

        for key_id, old in old_index.items():
            if key_id not in current_index:
                changes["removed"].append(old)

        # Save current snapshot after comparison.
        self.save_snapshot(
            store_id=store_id,
            query=query,
            products=products,
        )

        return changes


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def print_products(products: List[Product]) -> None:
    print()
    print("=" * 100)
    print(f"PRODUCTS: {len(products)}")
    print("=" * 100)

    for i, p in enumerate(products, start=1):
        stock = "IN STOCK" if p.in_stock else "OUT OF STOCK"

        print(
            f"{i:03d}. {p.name} | "
            f"{p.quantity} | "
            f"₹{p.offer_price if p.offer_price is not None else '-'} | "
            f"MRP ₹{p.mrp if p.mrp is not None else '-'} | "
            f"{p.discount_text or '-'} | "
            f"{stock} | "
            f"SKU={p.sku_id}"
        )


def print_changes(changes: Dict[str, List[Dict[str, Any]]]) -> None:
    print()
    print("=" * 100)
    print("REDIS COMPARISON")
    print("=" * 100)

    for change_type, rows in changes.items():
        print(f"\n{change_type.upper()}: {len(rows)}")

        for row in rows[:20]:
            if change_type == "price_changed":
                print(
                    f"  {row.get('name')} "
                    f"({row.get('quantity')}): "
                    f"₹{row.get('old_price')} -> ₹{row.get('new_price')}"
                )

            elif change_type == "stock_changed":
                print(
                    f"  {row.get('name')} "
                    f"({row.get('quantity')}): "
                    f"{row.get('old_stock')} -> {row.get('new_stock')}"
                )

            else:
                print(
                    f"  {row.get('name')} "
                    f"({row.get('quantity')})"
                )

        if len(rows) > 20:
            print(f"  ... and {len(rows) - 20} more")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Instamart location -> store -> search -> Redis pipeline"
    )

    parser.add_argument(
        "--query",
        default="coca cola",
        help="Product/search query.",
    )

    parser.add_argument(
        "--address",
        default=DEFAULT_ADDRESS,
        help="Address sent to select-location/v2.",
    )

    parser.add_argument(
        "--lat",
        type=float,
        default=DEFAULT_LAT,
        help="Latitude.",
    )

    parser.add_argument(
        "--lng",
        type=float,
        default=DEFAULT_LNG,
        help="Longitude.",
    )

    parser.add_argument(
        "--address-id",
        default="",
        help="Optional addressId.",
    )

    parser.add_argument(
        "--layout-id",
        default=DEFAULT_LAYOUT_ID,
        help="layoutId captured from the search request.",
    )

    parser.add_argument(
        "--max-pages",
        type=int,
        default=20,
        help="Maximum number of API pages.",
    )

    parser.add_argument(
        "--redis-url",
        default=os.getenv(
            "REDIS_URL",
            "redis://localhost:6379/0",
        ),
        help="Redis connection URL.",
    )

    parser.add_argument(
        "--no-redis",
        action="store_true",
        help="Do not use Redis; only fetch and print products.",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between search requests in seconds.",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging.",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )

    location = Location(
        address=args.address,
        lat=args.lat,
        lng=args.lng,
        address_id=args.address_id,
        annotation=args.address,
    )

    client = InstamartClient(
        sleep_between_requests=args.delay,
    )

    try:
        # ---------------------------------------------------------------
        # 1. LOCATION -> STORE ID
        # ---------------------------------------------------------------
        store_id, location_response = client.resolve_store_id(
            location
        )

        # Save location response for debugging/auditing.
        with open(
            "instamart_location_response.json",
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(
                location_response,
                f,
                indent=2,
                ensure_ascii=False,
            )

        # ---------------------------------------------------------------
        # 2. STORE ID -> SEARCH -> PAGINATION
        # ---------------------------------------------------------------
        products = client.search_all(
            query=args.query,
            store_id=store_id,
            max_pages=args.max_pages,
            layout_id=args.layout_id,
        )

        # ---------------------------------------------------------------
        # 3. REDIS
        # ---------------------------------------------------------------
        if not args.no_redis:
            store = RedisStore(args.redis_url)

            changes = store.compare_and_save(
                store_id=store_id,
                query=args.query,
                products=products,
            )

            print_changes(changes)

        # ---------------------------------------------------------------
        # 4. CONSOLE OUTPUT
        # ---------------------------------------------------------------
        print_products(products)

        # ---------------------------------------------------------------
        # 5. SAVE LOCAL JSON TOO
        # ---------------------------------------------------------------
        output = {
            "location": asdict(location),
            "store_id": store_id,
            "query": args.query,
            "count": len(products),
            "products": [asdict(p) for p in products],
        }

        filename = (
            "instamart_"
            + re.sub(r"[^a-zA-Z0-9]+", "_", args.query.strip())
            + "_"
            + store_id
            + ".json"
        )

        with open(
            filename,
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(
                output,
                f,
                indent=2,
                ensure_ascii=False,
            )

        print()
        print(f"Store ID : {store_id}")
        print(f"Products : {len(products)}")
        print(f"JSON     : {filename}")

        return 0

    except KeyboardInterrupt:
        print("\nStopped by user.")
        return 130

    except Exception as exc:
        logger.exception("Pipeline failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
