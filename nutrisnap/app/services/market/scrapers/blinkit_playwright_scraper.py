import os
import json
import urllib.parse
from typing import Optional
from scrapfly import ScrapflyClient, ScrapeConfig
from blinkit_scraper import BlinkitScraper, save_csv

# Initialize Scrapfly using your environment variable
scrapfly = ScrapflyClient(key=os.environ.get("SCRAPFLY_KEY", "YOUR_API_KEY"))

COMMON_HEADERS = {
    "Accept": "application/json",
    "app_client": "consumer_web",
    "platform": "web",
}

def fetch_search_json_batch(
    queries: list[str],
    lat: float,
    lon: float,
    address: str = "",
    **kwargs
) -> dict[str, Optional[dict]]:
    """
    Replaces Playwright browser automation with Scrapfly's managed API.
    Routes POST requests directly to Blinkit's layout/search endpoint
    using Indian residential proxies and Anti-Scraping Protection (ASP).
    """
    results: dict[str, Optional[dict]] = {}

    headers = {
        **COMMON_HEADERS,
        "Content-Type": "application/json",
        "lat": str(lat),
        "lon": str(lon)
    }

    for query in queries:
        params = urllib.parse.urlencode({
            "offset": 0,
            "limit": 12,
            "actual_query": query,
            "q": query,
            "search_type": "type_to_search",
            "search_method": "basic",
            "tab_position": 0,
        })
        search_url = f"https://blinkit.com/v1/layout/search?{params}"

        try:
            # Scrapfly handles the Cloudflare WAF and proxy rotation automatically
            api_result = scrapfly.scrape(ScrapeConfig(
                url=search_url,
                method="POST",
                headers=headers,
                body="{}",
                country="IN",       # Force Indian IP
                asp=True,           # Bypass Cloudflare bot protection
            ))
            
            results[query] = json.loads(api_result.content)
        
        except Exception as e:
            print(f"Scrapfly search failed for {query}: {e}")
            results[query] = None

    return results

def fetch_search_json(query: str, lat: float, lon: float, address: str = "", **kwargs) -> Optional[dict]:
    return fetch_search_json_batch([query], lat, lon, address=address).get(query)