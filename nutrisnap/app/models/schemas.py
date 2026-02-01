from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional


# ---------- Auth ----------
class UserAuth(BaseModel):
    email: EmailStr
    password: str


# ---------- Nutrition ----------
class Nutrition(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float


class FoodItem(BaseModel):
    name: str
    confidence: float
    estimated_weight_g: float
    nutrition_per_portion: Nutrition


class MealAnalysis(BaseModel):
    items: List[FoodItem]
    total_nutrition: Nutrition


class AIAdvice(BaseModel):
    summary: str
    advice: str
    rating: float


# ---------- Response ----------
class AnalyzeResponse(BaseModel):
    analysis: MealAnalysis
    image_url: str
    meal_id: str  # MongoDB _id for meal logging confirmation

from pydantic import BaseModel
from typing import Optional

class NutritionGoals(BaseModel):
    daily_calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class CommunityPostCreate(BaseModel):
    caption: str


class CommentCreate(BaseModel):
    text: str
