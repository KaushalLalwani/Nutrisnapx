from fastapi import APIRouter, HTTPException
import asyncio

from app.services.market import cache, categories as categories_module, geocode
from app.services.market.adapters import blinkit_adapter, instamart_adapter
from app.services.market.models import BasketRequest
from app.services.market.normalize import group_products, normalize_platform_results, resolve_match

router = APIRouter(prefix="/api", tags=["Market"])

DAILY_ESSENTIALS = categories_module.FREQUENT_ITEMS
PLATFORM_TIMEOUT_SECONDS = 90  # generous — Blinkit's browser path is the slow one


def _cached_platform_batch(platform: str, items: list[str], lat: float, lon: float, raw_batch_fn) -> dict:
    """Splits `items` into cache hits and misses, only calls the (slow)
    scraper batch function for the misses, and writes fresh results
    back to the cache — so a basket where 8/10 items were checked
    recently only actually scrapes the other 2."""
    results: dict = {}
    to_fetch = []
    for item in items:
        hit = cache.lookup(platform, item, lat, lon)
        if hit is not None:
            results[item] = hit
        else:
            to_fetch.append(item)

    if to_fetch:
        fresh = raw_batch_fn(to_fetch)
        for item in to_fetch:
            r = fresh.get(item, {"available": False, "products": [], "error": "no result returned"})
            cache.store(platform, item, lat, lon, r)
            results[item] = {**r, "cached": False}

    return results


async def _fetch_both_platforms(items: list[str], lat: float, lon: float, address: str):
    """Runs both (cache-aware) adapters concurrently in worker threads
    (both are blocking under the hood — Playwright's sync API and
    `requests`). A platform that errors or times out degrades to an
    all-unavailable dict instead of failing the whole request."""

    async def guarded(label: str, platform: str, raw_batch_fn):
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_cached_platform_batch, platform, items, lat, lon, raw_batch_fn),
                timeout=PLATFORM_TIMEOUT_SECONDS,
            )
        except Exception as exc:
            error = f"{label} timed out or crashed: {exc}"
            return {q: {"available": False, "products": [], "error": error, "cached": False} for q in items}

    blinkit_raw, instamart_raw = await asyncio.gather(
        guarded("blinkit", "blinkit", lambda qs: blinkit_adapter.search_batch(qs, lat, lon, address)),
        guarded("instamart", "instamart", lambda qs: instamart_adapter.search_batch(qs, lat, lon, address)),
    )

    blinkit_norm = {q: normalize_platform_results("blinkit", r) for q, r in blinkit_raw.items()}
    instamart_norm = {q: normalize_platform_results("instamart", r) for q, r in instamart_raw.items()}
    return blinkit_norm, instamart_norm


def _build_comparison_row(item: str, blinkit_result: dict, instamart_result: dict) -> dict:
    b_match = resolve_match(item, blinkit_result["products"]) if blinkit_result["available"] else None
    i_match = resolve_match(item, instamart_result["products"]) if instamart_result["available"] else None

    candidates = [
        (p["price"], platform)
        for p, platform in ((b_match, "blinkit"), (i_match, "instamart"))
        if p and p.get("in_stock") and p.get("price") is not None
    ]
    cheapest_platform = min(candidates)[1] if candidates else None

    return {
        "item": item,
        "blinkit": {
            "status": "ok" if blinkit_result["available"] else "unavailable",
            "error": blinkit_result["error"],
            "cached": blinkit_result.get("cached", False),
            "match": b_match,
        },
        "instamart": {
            "status": "ok" if instamart_result["available"] else "unavailable",
            "error": instamart_result["error"],
            "cached": instamart_result.get("cached", False),
            "match": i_match,
        },
        "cheapest_platform": cheapest_platform,
    }


def _summarize_basket(rows: list[dict]) -> dict:
    totals = {"blinkit": 0.0, "instamart": 0.0}
    counts = {"blinkit": 0, "instamart": 0}
    smart_total = 0.0
    smart_missing: list[str] = []

    for row in rows:
        for platform in ("blinkit", "instamart"):
            match = row[platform]["match"]
            if match and match.get("in_stock") and match.get("price") is not None:
                totals[platform] += match["price"]
                counts[platform] += 1
        if row["cheapest_platform"]:
            smart_total += row[row["cheapest_platform"]]["match"]["price"]
        else:
            smart_missing.append(row["item"])

    full_baskets = {p: round(totals[p], 2) for p in totals if counts[p] == len(rows) and len(rows) > 0}
    cheapest_full_basket = min(full_baskets, key=full_baskets.get) if full_baskets else None

    return {
        "item_count": len(rows),
        "platform_totals": {p: round(totals[p], 2) for p in totals},
        "platform_items_found": counts,
        "cheapest_full_basket_platform": cheapest_full_basket,
        "smart_basket_total": round(smart_total, 2),
        "smart_basket_missing_items": smart_missing,
    }


async def _basket_flow(items: list[str], lat: float, lon: float, address: str) -> dict:
    blinkit_norm, instamart_norm = await _fetch_both_platforms(items, lat, lon, address)
    rows = [_build_comparison_row(item, blinkit_norm[item], instamart_norm[item]) for item in items]
    return {"rows": rows, "summary": _summarize_basket(rows)}


@router.get("/search")
async def search(query: str, lat: float, lon: float, address: str = ""):
    blinkit_norm, instamart_norm = await _fetch_both_platforms([query], lat, lon, address)
    b_result, i_result = blinkit_norm[query], instamart_norm[query]
    row = _build_comparison_row(query, b_result, i_result)
    # "products" is every scraped, actually-relevant listing shown as its
    # own row (matched across platforms where possible) — the buyhatke-
    # style multi-result view. "comparison" (single best pick per
    # platform) is kept as-is since /api/basket and friends build on it.
    products = group_products(
        query,
        b_result["products"] if b_result["available"] else [],
        i_result["products"] if i_result["available"] else [],
    )
    return {
        "query": query,
        "blinkit": {**b_result},
        "instamart": {**i_result},
        "comparison": row,
        "products": products,
    }


@router.post("/basket")
async def basket(req: BasketRequest):
    items = [i.strip() for i in req.items if i.strip()]
    return await _basket_flow(items, req.lat, req.lon, req.address)


@router.get("/home")
async def home(lat: float, lon: float, address: str = ""):
    return await _basket_flow(DAILY_ESSENTIALS, lat, lon, address)


@router.get("/categories")
async def categories():
    return {
        "categories": [
            {
                "slug": c["slug"], 
                "label": c["label"], 
                "icon": c["icon"],
                "items": c.get("items", []) # Include items in the payload
            } for c in categories_module.CATEGORIES
        ]
    }


@router.get("/category/{slug}")
async def category_detail(slug: str, lat: float, lon: float, address: str = ""):
    cat = categories_module.find(slug)
    if not cat:
        raise HTTPException(status_code=404, detail="unknown category")
    result = await _basket_flow(cat["items"], lat, lon, address)
    return {"category": cat["label"], "icon": cat["icon"], **result}


@router.get("/geocode/search")
async def geocode_search(q: str):
    try:
        results = await asyncio.to_thread(geocode.search_address, q)
        return {"results": results}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"geocoding failed: {exc}")


@router.get("/geocode/reverse")
async def geocode_reverse(lat: float, lon: float):
    try:
        address = await asyncio.to_thread(geocode.reverse_geocode, lat, lon)
        return {"address": address}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"reverse geocoding failed: {exc}")


@router.get("/health")
async def health():
    return {"status": "ok"}
