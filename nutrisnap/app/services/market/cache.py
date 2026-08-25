"""
Two-tier cache for scraped search results, keyed by (platform, query,
rounded location).

Redis is the fast path with its own TTL doing the expiry for us.
Mongo is the durable backstop — if Redis restarts/evicts, we still
avoid a re-scrape as long as the Mongo doc's scraped_at is under
TTL_SECONDS old; a hit there re-populates Redis with however much of
the 2h window is left.

Both stores are optional at runtime: if Redis or Mongo isn't
reachable, lookups/stores just no-op (return None / do nothing)
rather than failing the request — a cache being down should degrade
to "always scrape," never to an error.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Optional

TTL_SECONDS = 2 * 60 * 60  # 2 hours

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MARKET_MONGO_DB", "market_cache")

_redis_client = None
_mongo_coll = None


def _redis():
    global _redis_client
    if _redis_client is None:
        import redis  # imported lazily so the module still loads if redis isn't installed yet

        _redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    return _redis_client


def _mongo():
    global _mongo_coll
    if _mongo_coll is None:
        from pymongo import MongoClient

        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        _mongo_coll = client[MONGO_DB]["search_results"]
        _mongo_coll.create_index("cache_key", unique=True)
    return _mongo_coll


def _round_coord(v: float) -> float:
    return round(v, 3)  # ~110m grid — near-enough locations share a cache entry


def make_key(platform: str, query: str, lat: float, lon: float) -> str:
    raw = f"{platform}:{query.strip().lower()}:{_round_coord(lat)}:{_round_coord(lon)}"
    return hashlib.sha1(raw.encode()).hexdigest()


def lookup(platform: str, query: str, lat: float, lon: float) -> Optional[dict]:
    """Returns the cached {"available", "products", "error", ...} dict
    if there's a fresh (< 2h) entry, else None."""
    key = make_key(platform, query, lat, lon)

    try:
        cached = _redis().get(key)
        if cached:
            data = json.loads(cached)
            data["cached"] = True
            return data
    except Exception:
        pass  # redis unreachable — fall through to mongo

    try:
        doc = _mongo().find_one({"cache_key": key})
        if doc and (time.time() - doc["scraped_at"]) < TTL_SECONDS:
            result = dict(doc["result"])
            result["cached"] = True
            result["scraped_at"] = doc["scraped_at"]
            remaining = TTL_SECONDS - int(time.time() - doc["scraped_at"])
            try:
                _redis().setex(key, max(remaining, 1), json.dumps(result))
            except Exception:
                pass
            return result
    except Exception:
        pass  # mongo unreachable too — caller will scrape fresh

    return None


def store(platform: str, query: str, lat: float, lon: float, result: dict) -> None:
    key = make_key(platform, query, lat, lon)
    scraped_at = time.time()
    payload = {**result, "scraped_at": scraped_at}

    try:
        _mongo().update_one(
            {"cache_key": key},
            {
                "$set": {
                    "cache_key": key,
                    "platform": platform,
                    "query": query,
                    "lat": lat,
                    "lon": lon,
                    "result": result,
                    "scraped_at": scraped_at,
                }
            },
            upsert=True,
        )
    except Exception:
        pass

    try:
        _redis().setex(key, TTL_SECONDS, json.dumps(payload))
    except Exception:
        pass
