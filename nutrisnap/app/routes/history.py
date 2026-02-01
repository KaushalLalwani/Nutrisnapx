from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from bson import ObjectId
from bson import json_util
import json
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.mongo import meals_collection, mongo_client
from app.services.gemini import MODEL
from app.utils.helpers import safe_json


# Request model for meal confirmation
class MealConfirmation(BaseModel):
    meal_date: str  # YYYY-MM-DD format
    meal_type: str  # breakfast/lunch/dinner/snack
    portion_multiplier: float = 1.0  # For portion scaling


# Request model for manual meal entry
class ManualMealEntry(BaseModel):
    food_name: str  # e.g., "Grilled Chicken with Rice"
    portion_grams: float  # e.g., 200
    meal_type: str  # breakfast/lunch/dinner/snack
    meal_date: str  # YYYY-MM-DD format
    calories: float = 0  # Optional: user-estimated calories
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0


router = APIRouter(tags=["History"])




@router.get("/history")
def get_user_history(
    limit: int = 5,
    current_user: dict = Depends(get_current_user),
):
    meals = list(
        meals_collection.find({
            "user_id": str(current_user["_id"]),
            "status": {"$ne": "archived"}  # Exclude archived meals
        })
        .sort("timestamp", -1)
        .limit(limit)
    )

    return JSONResponse(
        content=safe_json(
            {
                "count": len(meals),
                "meals": meals,
            }
        )
    )


@router.get("/pending-meals")
def get_pending_meals(
    current_user: dict = Depends(get_current_user),
):
    """Get meals pending confirmation (status='pending')"""
    meals = list(
        meals_collection.find({
            "user_id": str(current_user["_id"]),
            "status": "pending"
        })
        .sort("timestamp", -1)
    )

    return JSONResponse(
        content=safe_json(
            {
                "count": len(meals),
                "meals": meals,
            }
        )
    )

@router.post("/meal/{meal_id}/confirm")
def confirm_meal_logging(
    meal_id: str,
    confirmation: MealConfirmation,
    current_user: dict = Depends(get_current_user),
):
    """Confirm meal logging with date, meal type, and portion multiplier"""
    try:
        # Verify meal exists and belongs to user
        meal = meals_collection.find_one({
            "_id": ObjectId(meal_id),
            "user_id": str(current_user["_id"])
        })
        
        if not meal:
            raise HTTPException(status_code=404, detail="Meal not found")
        
        # Update meal with confirmation details
        meals_collection.update_one(
            {"_id": ObjectId(meal_id)},
            {"$set": {
                "meal_date": confirmation.meal_date,
                "meal_type": confirmation.meal_type,
                "portion_multiplier": confirmation.portion_multiplier,
                "status": "confirmed",
                "confirmed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        return {"message": "Meal logged successfully", "meal_id": meal_id}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/meal/{meal_id}/discard")
def discard_meal(
    meal_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark meal as archived (soft delete)"""
    try:
        result = meals_collection.update_one(
            {
                "_id": ObjectId(meal_id),
                "user_id": str(current_user["_id"])
            },
            {"$set": {"status": "archived"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Meal not found")
        
        return {"message": "Meal discarded"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/meal/manual/add")
def add_manual_meal(
    entry: ManualMealEntry,
    current_user: dict = Depends(get_current_user),
):
    """Log a meal manually without image analysis"""
    try:
        now_utc = datetime.now(timezone.utc)
        
        meal_doc = {
            "user_id": str(current_user["_id"]),
            "email": current_user["email"],
            "image_url": None,  # No image for manual entry
            "analysis": {
                "items": [
                    {
                        "name": entry.food_name,
                        "estimated_weight_g": entry.portion_grams,
                        "confidence": 1.0,
                        "nutrition_per_portion": {
                            "calories": entry.calories,
                            "protein": entry.protein_g,
                            "carbs": entry.carbs_g,
                            "fat": entry.fat_g,
                            "fiber": 0,
                            "sugar": 0,
                            "sodium": 0,
                        }
                    }
                ],
                "total_nutrition": {
                    "calories": entry.calories,
                    "protein": entry.protein_g,
                    "carbs": entry.carbs_g,
                    "fat": entry.fat_g,
                    "fiber": 0,
                    "sugar": 0,
                    "sodium": 0,
                }
            },
            "timestamp": now_utc.isoformat(),
            "meal_date": entry.meal_date,
            "meal_type": entry.meal_type,
            "portion_multiplier": 1.0,
            "status": "confirmed",  # Manual entries are auto-confirmed
            "confirmed_at": now_utc.isoformat(),
            "is_manual": True,  # Flag to indicate manual entry
        }
        
        result = meals_collection.insert_one(meal_doc)
        
        return {
            "message": "Meal added successfully",
            "meal_id": str(result.inserted_id),
            "meal": safe_json(meal_doc)
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/health")
def health():
    try:
        mongo_client.admin.command("ping")
        db_status = True
    except Exception:
        db_status = False

    return {
        "ok": True,
        "model": MODEL,
        "db_connected": db_status,
    }
