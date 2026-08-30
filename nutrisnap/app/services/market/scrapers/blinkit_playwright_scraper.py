import os
import json
import urllib.parse
from copy import deepcopy
from typing import Optional
from scrapfly import ScrapflyClient, ScrapeConfig
from blinkit_scraper import BlinkitScraper

scrapfly = ScrapflyClient(key=os.environ.get("SCRAPFLY_KEY", "YOUR_API_KEY"))

COMMON_HEADERS = {
    "Accept": "application/json",
    "app_client": "consumer_web",
    "platform": "web",
}

def _merge_search_pages(pages: list[dict]) -> dict:
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
    **kwargs
) -> dict[str, Optional[dict]]:
    results: dict[str, Optional[dict]] = {}
    max_pages = max(1, int(os.getenv("BLINKIT_MAX_PAGES", "2"))) # Keep default low (e.g., 2 pages)
    page_size = 12

    headers = {
        **COMMON_HEADERS,
        "Content-Type": "application/json",
        "lat": str(lat),
        "lon": str(lon)
    }

    for query in queries:
        pages = []
        seen_product_ids = set()

        for page_number in range(max_pages):
            params = urllib.parse.urlencode({
                "offset": page_number * page_size,
                "limit": page_size,
                "actual_query": query,
                "q": query,
                "search_type": "type_to_search",
                "search_method": "basic",
                "tab_position": 0,
            })
            search_url = f"https://blinkit.com/v1/layout/search?{params}"

            try:
                api_result = scrapfly.scrape(ScrapeConfig(
                    url=search_url,
                    method="POST",
                    headers=headers,
                    body="{}",
                    country="IN",
                    asp=True,
                ))
                page_data = json.loads(api_result.content)
                pages.append(page_data)

                # Check if new products exist on this page
                page_cards = list(BlinkitScraper._card_candidates(page_data))
                new_ids = {
                    str(card.get("product_id"))
                    for card in page_cards
                    if card.get("product_id") is not None
                } - seen_product_ids

                seen_product_ids.update(new_ids)

                # Break early if no new items or reached the last page
                if not new_ids or len(page_cards) < page_size:
                    break

            except Exception as e:
                print(f"Scrapfly search failed for {query} (page {page_number}): {e}")
                break

        results[query] = _merge_search_pages(pages) if pages else None

    return results

def fetch_search_json(query: str, lat: float, lon: float, address: str = "", **kwargs) -> Optional[dict]:
    return fetch_search_json_batch([query], lat, lon, address=address).get(query)