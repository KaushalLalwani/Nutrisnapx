from fastapi import APIRouter, Depends
from datetime import datetime, date
from typing import Optional

from app.core.security import get_current_user
from app.db.mongo import meals_collection, goals_collection

router = APIRouter(tags=["Summary"])
@router.get("/summary")
def daily_summary(
    summary_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Parse date
    if summary_date:
        day = datetime.fromisoformat(summary_date).date()
    else:
        day = date.today()

    start = datetime.combine(day, datetime.min.time())
    end = datetime.combine(day, datetime.max.time())

    # Fetch meals of the day
    meals = list(
        meals_collection.find(
            {
                "user_id": str(current_user["_id"]),
                "timestamp": {
                    "$gte": start.isoformat(),
                    "$lte": end.isoformat(),
                },
            }
        )
    )

    # Aggregate nutrition
    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
    }

    for meal in meals:
        nutrition = meal["analysis"]["total_nutrition"]
        totals["calories"] += nutrition.get("calories", 0)
        totals["protein"] += nutrition.get("protein", 0)
        totals["carbs"] += nutrition.get("carbs", 0)
        totals["fat"] += nutrition.get("fat", 0)

    # Fetch user goals
    goals = goals_collection.find_one(
        {"user_id": str(current_user["_id"])},
        {"_id": 0}
    )

    # Defaults if no goals set
    goals = goals or {
        "daily_calories": 2000,
        "protein_g": 100,
        "carbs_g": 250,
        "fat_g": 70,
    }

    # Progress calculation
    progress = {
        "calories_pct": round((totals["calories"] / goals["daily_calories"]) * 100, 1),
        "protein_pct": round((totals["protein"] / goals["protein_g"]) * 100, 1),
        "carbs_pct": round((totals["carbs"] / goals["carbs_g"]) * 100, 1),
        "fat_pct": round((totals["fat"] / goals["fat_g"]) * 100, 1),
    }

    return {
        "date": str(day),
        "totals": totals,
        "goals": goals,
        "progress": progress,
        "meals_count": len(meals),
    }
