import os
import io
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from pymongo import MongoClient
from bson import json_util, ObjectId
import cloudinary
import cloudinary.uploader



# -----------------------------------------------------------
# Load environment variables
# -----------------------------------------------------------
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# -----------------------------------------------------------
# Configure Gemini + MongoDB
# -----------------------------------------------------------
genai.configure(api_key=GOOGLE_API_KEY)
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["nutrisnap"]
users_collection = db["users"]
meals_collection = db["meals"]

# -----------------------------------------------------------
# Security (JWT + Password)
# -----------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
def get_password_hash(password):
    # Ensure password is <= 72 bytes and encoded correctly
    password = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(password)


def verify_password(plain, hashed):
    plain = plain.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

# -----------------------------------------------------------
# Helpers
# -----------------------------------------------------------
def convert_objectid(data):
    if isinstance(data, list):
        return [convert_objectid(i) for i in data]
    elif isinstance(data, dict):
        return {k: convert_objectid(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

def safe_json(data):
    return json.loads(json_util.dumps(data))

# -----------------------------------------------------------
# Gemini Model Detection
# -----------------------------------------------------------
def get_latest_flash_model():
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods and "flash" in m.name:
            return m.name
    return "gemini-2.5-flash"

MODEL = get_latest_flash_model()
print(f"✅ Using Gemini model: {MODEL}")

app = FastAPI(title="NutriSnap AI Backend", version="4.0")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specific: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------
# Auth Routes
# -----------------------------------------------------------
# @app.post("/register")
# def register_user(email: str = Form(...), password: str = Form(...)):
#     if users_collection.find_one({"email": email}):
#         raise HTTPException(status_code=400, detail="User already exists")
#     hashed_pw = get_password_hash(password)
#     users_collection.insert_one({"email": email, "password": hashed_pw, "created": datetime.utcnow().isoformat()})
#     return {"message": "✅ User registered successfully"}

# @app.post("/login")
# def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     user = users_collection.find_one({"email": form_data.username})
#     if not user or not verify_password(form_data.password, user["password"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")
#     token = create_access_token({"sub": user["email"]})
#     return {"access_token": token, "token_type": "bearer"}
from pydantic import BaseModel

class UserAuth(BaseModel):
    email: str
    password: str

@app.post("/register")
async def register_user(data: UserAuth):
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(data.password)
    users_collection.insert_one({
        "email": data.email,
        "password": hashed_password,
        "created": datetime.utcnow().isoformat()
    })
    return {"message": "✅ User registered successfully"}

@app.post("/login")
async def login_user(data: UserAuth):
    user = users_collection.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": data.email})
    return {"access_token": token, "token_type": "bearer"}

# -----------------------------------------------------------
# AI Core Functions
# -----------------------------------------------------------
def _read_image(upload: UploadFile) -> Image.Image:
    data = upload.file.read()
    return Image.open(io.BytesIO(data)).convert("RGB")

def _force_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(line for line in text.splitlines() if not line.strip().startswith("```"))
    try:
        return json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end+1])
        raise ValueError("Could not parse Gemini JSON output")

def analyze_with_gemini(image: Image.Image, cuisine_hint: Optional[str] = None) -> Dict[str, Any]:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    prompt = f"""
You are a world-class AI nutritionist and food recognition expert.
The user has uploaded a photo of their meal.

Identify ALL distinct food items visible on the plate and give the following for each:

- `name`: generic name (e.g., "plain rice", "dal", "roti", "grilled chicken", "salad")
- `confidence`: confidence level (0–1)
- `estimated_weight_g`: approximate weight in grams
- `nutrition_per_portion`: estimated nutrition for that portion (calories, protein, carbs, fat, fiber, sugar, sodium)

ALSO, provide a `"total_nutrition"` object summing all items together.

Example Output JSON (no markdown, no commentary):
{{
  "items": [
    {{
      "name": "chicken biryani",
      "confidence": 0.97,
      "estimated_weight_g": 350,
      "nutrition_per_portion": {{
        "calories": 650,
        "protein": 35,
        "carbs": 60,
        "fat": 25,
        "fiber": 4,
        "sugar": 3,
        "sodium": 750
      }}
    }}
  ],
  "total_nutrition": {{
    "calories": 650,
    "protein": 35,
    "carbs": 60,
    "fat": 25,
    "fiber": 4,
    "sugar": 3,
    "sodium": 750
  }}
}}

If multiple foods are present (like rice + curry + roti + salad),
list them all clearly and compute accurate total nutrition.

Be concise, factual, and return **valid JSON only**, nothing else.
Cuisine hint: {cuisine_hint or "general / Indian"}.
"""
    model = genai.GenerativeModel(MODEL)
    response = model.generate_content(
        contents=[
            {"role": "user", "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": buf.getvalue()}}
            ]}
        ],
        request_options={"timeout": 90}
    )
    return _force_json(response.text or "")

def get_nutrition_advice(nutrition_data: dict) -> Dict[str, str]:
    model = genai.GenerativeModel(MODEL)
    prompt = f"""
You are an AI health and nutrition coach.
The following is a JSON summary of a meal's nutritional data:

{json.dumps(nutrition_data, indent=2)}

Please analyze it and respond in **strict JSON** with this format:

{{
  "summary": "short analysis of whether the meal is balanced, high/low in any nutrient",
  "advice": "one-sentence improvement suggestion for next meal",
  "rating": "float 1.0–5.0 representing overall healthiness"
}}
    """
    res = model.generate_content(prompt)
    return _force_json(res.text or "{}")

# -----------------------------------------------------------
# Main Routes (Authorized)
# -----------------------------------------------------------
@app.post("/analyze")
async def analyze_food(
    image: UploadFile = File(...),
    cuisine_hint: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Read image
    pil = _read_image(image)

    # Gemini analysis
    nutrition_data = analyze_with_gemini(pil, cuisine_hint)
    ai_advice = get_nutrition_advice(nutrition_data.get("total_nutrition", {}))

    # Convert PIL image to buffer for Cloudinary
    buf = io.BytesIO()
    pil.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    # Upload to Cloudinary (SAFE METHOD)
    upload_result = cloudinary.uploader.upload(
        buf,
        folder="nutrisnap_meals",
        resource_type="image"
    )

    image_url = upload_result.get("secure_url")

    # Save meal to MongoDB
    meal_doc = {
        "user_id": str(current_user["_id"]),
        "email": current_user["email"],
        "image_url": image_url,
        "analysis": nutrition_data,
        "ai_advice": ai_advice,
        "timestamp": datetime.utcnow().isoformat()
    }
    meals_collection.insert_one(meal_doc)

    return JSONResponse(
        content=convert_objectid({
            "analysis": nutrition_data,
            "ai_advice": ai_advice,
            "image_url": image_url
        })
    )


@app.get("/history")
def get_user_history(current_user: dict = Depends(get_current_user)):
    meals = list(meals_collection.find({"user_id": str(current_user["_id"])}).sort("timestamp", -1).limit(5))
    return JSONResponse(content=safe_json({"count": len(meals), "meals": meals}))

@app.get("/health")
def health():
    try:
        # lightweight ping to MongoDB
        mongo_client.admin.command("ping")
        db_status = True
    except Exception:
        db_status = False

    return {
        "ok": True,
        "model": MODEL,
        "db_connected": db_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=3001)
