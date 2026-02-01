import io
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from PIL import Image

from app.core.security import get_current_user
from app.services.gemini import analyze_with_gemini
from app.services.cloudinary import upload_image
from app.db.mongo import meals_collection
from app.models.schemas import AnalyzeResponse

router = APIRouter(tags=["Analyze"])


# 🔹 Helper to normalize nutrition keys
def normalize_nutrition(n: dict) -> dict:
    return {
        "calories": n.get("calories", 0),
        "protein": n.get("protein_g", 0),
        "carbs": n.get("carbs_g", 0),
        "fat": n.get("fat_g", 0),
        "fiber": n.get("fiber_g", 0),
        "sugar": n.get("sugar_g", 0),
        "sodium": n.get("sodium_mg", 0),
    }


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_food(
    image: UploadFile = File(...),
    cuisine_hint: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    # Validate image
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Read image
    pil = Image.open(io.BytesIO(await image.read())).convert("RGB")

    # 🔹 AI analysis (raw)
    raw_analysis = analyze_with_gemini(pil, cuisine_hint)

    # 🔹 Normalize items
    items = []
    for item in raw_analysis.get("items", []):
        items.append({
            "name": item.get("name"),
            "confidence": item.get("confidence", 0.9),
            "estimated_weight_g": item.get("estimated_weight_g", 0),
            "nutrition_per_portion": normalize_nutrition(
                item.get("nutrition_per_portion", {})
            ),
        })
    # 🔹 Normalize totals
    total_nutrition = normalize_nutrition(
        raw_analysis.get("total_nutrition", {})
    )
    normalized_analysis = {
        "items": items,
        "total_nutrition": total_nutrition,
    }

    # Upload image
    image_url = upload_image(pil)

    # Get current UTC timestamp
    now_utc = datetime.now(timezone.utc)
    meal_date = now_utc.date().isoformat()  # YYYY-MM-DD format

    # Save to MongoDB with timestamp and date fields
    meal_doc = {
        "user_id": str(current_user["_id"]),
        "email": current_user["email"],
        "image_url": image_url,
        "analysis": normalized_analysis,
        "timestamp": now_utc.isoformat(),  # ISO 8601 for sorting
        "meal_date": meal_date,             # YYYY-MM-DD for day-based queries
        "meal_type": None,                  # breakfast/lunch/dinner/snack (user selects)
        "portion_multiplier": 1.0,          # For scaling nutrition
        "status": "pending",                # pending/confirmed/archived
    }
    result = meals_collection.insert_one(meal_doc)

    # Return analysis + inserted meal ID for reference
    return {
        "analysis": normalized_analysis,
        "image_url": image_url,
        "meal_id": str(result.inserted_id),  # New: return meal ID for logging confirmation
    }
