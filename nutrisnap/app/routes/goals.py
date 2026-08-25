from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from app.core.security import get_current_user
from app.db.mongo import goals_collection
from app.models.schemas import NutritionGoals

router = APIRouter(tags=["Goals"])
@router.post("/goals")
def set_nutrition_goals(
    goals: NutritionGoals,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.utcnow().isoformat()

    goals_collection.update_one(
        {"user_id": str(current_user["_id"])},
        {
            "$set": {
                "daily_calories": goals.daily_calories,
                "protein_g": goals.protein_g,
                "carbs_g": goals.carbs_g,
                "fat_g": goals.fat_g,
                "updated_at": now
            },
            "$setOnInsert": {
                "created_at": now,
                "user_id": str(current_user["_id"])
            }
        },
        upsert=True
    )

    return {"message": "Nutrition goals saved successfully"}
@router.get("/goals")
def get_nutrition_goals(
    current_user: dict = Depends(get_current_user)
):
    goals = goals_collection.find_one(
        {"user_id": str(current_user["_id"])},
        {"_id": 0}
    )

    if not goals:
        # sensible defaults (optional)
        return {
            "daily_calories": 2000,
            "protein_g": 100,
            "carbs_g": 250,
            "fat_g": 70
        }

    return goals
