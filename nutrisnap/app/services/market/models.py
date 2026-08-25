from typing import Optional

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float
    lon: float
    address: str = Field(
        default="",
        description="Free-text address — required for Instamart's location endpoint, "
        "optional for Blinkit which only needs lat/lon.",
    )


class BasketRequest(Location):
    items: list[str]


class SearchRequest(Location):
    query: str
