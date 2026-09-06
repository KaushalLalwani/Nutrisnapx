import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.core.security import get_current_user
from app.db.mongo import goals_collection, meals_collection

router = APIRouter(prefix="/api/chat", tags=["Assistant"])
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ---------------------------------------------------------
# 1. Pydantic Schemas for Requests & Function Calling Tools
# ---------------------------------------------------------
class GroceryItem(BaseModel):
    name: str = Field(description="Name of grocery item (e.g. 'paneer', 'toor dal', 'eggs')")
    quantity: str = Field(description="Quantity needed (e.g. '500g', '6 eggs', '1 packet')")

class BasketRecommendation(BaseModel):
    plan_name: str = Field(description="Title of the recommended meal plan or recipe")
    items: List[GroceryItem] = Field(description="List of ingredients needed")
    explanation: str = Field(description="Reasoning based on user goals and macros")

class NutritionGoalsUpdate(BaseModel):
    daily_calories: int = Field(description="Target daily calorie intake")
    protein_g: int = Field(description="Target protein in grams")
    carbs_g: int = Field(description="Target carbohydrates in grams")
    fat_g: int = Field(description="Target fats in grams")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# ---------------------------------------------------------
# 2. Python Tool Functions Exposed to Gemini
# ---------------------------------------------------------
def generate_smart_basket(plan_name: str, items: List[dict], explanation: str) -> dict:
    """Generates an actionable grocery basket for the user to buy via Blinkit/Instamart."""
    return {"plan_name": plan_name, "items": items, "explanation": explanation}

def update_nutrition_goals(daily_calories: int, protein_g: int, carbs_g: int, fat_g: int) -> dict:
    """Updates the user's daily calorie and macronutrient targets in their profile."""
    return {
        "daily_calories": daily_calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g
    }

# ---------------------------------------------------------
# 3. Main Conversational Endpoint
# ---------------------------------------------------------
@router.post("/")
async def conversational_assistant(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id_str = str(current_user["_id"])

    # Fetch current goals from MongoDB
    user_goals = goals_collection.find_one({"user_id": user_id_str}, {"_id": 0})
    if not user_goals:
        user_goals = {"daily_calories": 2000, "protein_g": 100, "carbs_g": 250, "fat_g": 70}

    # Fetch today's logged meals to compute remaining macros
    today_prefix = datetime.utcnow().strftime("%Y-%m-%d")
    recent_meals = list(meals_collection.find({
        "user_id": user_id_str,
        "created_at": {"$regex": f"^{today_prefix}"}
    }))
    
    consumed_cal = sum(m.get("analysis", {}).get("total_nutrition", {}).get("calories", 0) for m in recent_meals)
    consumed_pro = sum(m.get("analysis", {}).get("total_nutrition", {}).get("protein", 0) for m in recent_meals)
    consumed_carb = sum(m.get("analysis", {}).get("total_nutrition", {}).get("carbs", 0) for m in recent_meals)
    consumed_fat = sum(m.get("analysis", {}).get("total_nutrition", {}).get("fat", 0) for m in recent_meals)

    # Build context-aware prompt instructions
    system_instruction = f"""
You are the NutriSnap AI nutrition assistant and meal planner.
The user is logged in. Here is their live profile data:

Current Targets:
- Calories: {user_goals.get('daily_calories')} kcal
- Protein: {user_goals.get('protein_g')}g
- Carbs: {user_goals.get('carbs_g')}g
- Fat: {user_goals.get('fat_g')}g

Today's Consumed Intake:
- Calories: {round(consumed_cal)} kcal
- Protein: {round(consumed_pro)}g
- Carbs: {round(consumed_carb)}g
- Fat: {round(consumed_fat)}g

Capabilities & Guidelines:
1. If the user asks for a meal plan, recipe, or food suggestions, tailor it to their remaining macros and call the `generate_smart_basket` tool with the ingredients.
2. If the user requests to update, increase, decrease, or set new nutrition/macro/calorie goals, use the `update_nutrition_goals` tool.
3. Maintain an encouraging and precise tone. If the user asks general nutrition questions or inquires about food logging, answer clearly in conversational text.
"""

    history = [
        types.Content(role="user" if msg.role == "user" else "model", parts=[types.Part.from_text(text=msg.content)]) 
        for msg in req.messages[:-1]
    ]
    user_prompt = req.messages[-1].content if req.messages else ""

    try:
        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.6,
                tools=[generate_smart_basket, update_nutrition_goals],
            ),
            history=history
        )
        
        response = chat.send_message(user_prompt)

        # Handle tool execution
        if response.function_calls:
            fc = response.function_calls[0]
            args = fc.args

            # Tool 1: Update Goals in DB
            if fc.name == "update_nutrition_goals":
                now = datetime.utcnow().isoformat()
                goals_collection.update_one(
                    {"user_id": user_id_str},
                    {
                        "$set": {
                            "daily_calories": int(args["daily_calories"]),
                            "protein_g": int(args["protein_g"]),
                            "carbs_g": int(args["carbs_g"]),
                            "fat_g": int(args["fat_g"]),
                            "updated_at": now
                        },
                        "$setOnInsert": {
                            "created_at": now,
                            "user_id": user_id_str
                        }
                    },
                    upsert=True
                )
                return {
                    "type": "goals_updated",
                    "goals": args,
                    "text": f"I've updated your daily targets to {args['daily_calories']} kcal ({args['protein_g']}g protein, {args['carbs_g']}g carbs, {args['fat_g']}g fat)."
                }

            # Tool 2: Generate Basket Payload
            if fc.name == "generate_smart_basket":
                return {
                    "type": "basket_recommendation",
                    "payload": args,
                    "text": args.get("explanation", "Here is your suggested meal plan and grocery basket.")
                }

        # Standard conversational text response
        return {
            "type": "text",
            "text": response.text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")