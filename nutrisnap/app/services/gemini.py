# # import io
# import json
# from typing import Optional, Dict, Any
# from PIL import Image
# import google.generativeai as genai

# from app.core.config import GOOGLE_API_KEY

# # Configure Gemini
# genai.configure(api_key=GOOGLE_API_KEY)

# MODEL = "models/gemini-2.5-flash"


# def _force_json(text: str) -> dict:
#     """
#     Ensures valid JSON is extracted from Gemini output.
#     """
#     text = text.strip()

#     # Remove markdown if present
#     if text.startswith("```"):
#         text = "\n".join(
#             line for line in text.splitlines()
#             if not line.strip().startswith("```")
#         )

#     try:
#         return json.loads(text)
#     except Exception:
#         start, end = text.find("{"), text.rfind("}")
#         if start != -1 and end != -1:
#             return json.loads(text[start:end + 1])
#         raise ValueError("Could not parse Gemini JSON output")


# def analyze_with_gemini(
#     image: Image.Image,
#     cuisine_hint: Optional[str] = None
# ) -> Dict[str, Any]:
#     """
#     Analyze food image and return nutrition JSON.
#     """
#     buf = io.BytesIO()
#     image.save(buf, format="JPEG", quality=90)
#     buf.seek(0)

#     prompt = f"""
# You are a world-class AI nutritionist and food recognition expert.
# The user has uploaded a photo of their meal.

# Identify ALL distinct food items visible on the plate and give the following for each:

# - name
# - confidence (0–1)
# - estimated_weight_g
# - nutrition_per_portion (calories, protein, carbs, fat, fiber, sugar, sodium)

# Also provide total_nutrition as the sum of all items.

# Return STRICT VALID JSON only.
# Cuisine hint: {cuisine_hint or "general / Indian"}.
# """

#     model = genai.GenerativeModel(MODEL)
#     response = model.generate_content(
#         contents=[
#             {
#                 "role": "user",
#                 "parts": [
#                     {"text": prompt},
#                     {
#                         "inline_data": {
#                             "mime_type": "image/jpeg",
#                             "data": buf.getvalue()
#                         }
#                     }
#                 ],
#             }
#         ],
#         request_options={"timeout": 90},
#     )

#     return _force_json(response.text or "")
import io
import json
from typing import Optional, Dict, Any
from PIL import Image
import google.generativeai as genai

from app.core.config import GOOGLE_API_KEY

genai.configure(api_key=GOOGLE_API_KEY)

MODEL = "models/gemini-2.5-flash"


def _force_json(text: str) -> dict:
    """
    Extract valid JSON from Gemini output safely.
    """
    text = text.strip()

    # Remove markdown fences
    if text.startswith("```"):
        text = "\n".join(
            line for line in text.splitlines()
            if not line.strip().startswith("```")
        )

    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in Gemini response")

    return json.loads(text[start:end + 1])


def analyze_with_gemini(
    image: Image.Image,
    cuisine_hint: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze food image and return STRICT nutrition JSON.
    """
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    prompt = f"""
You are a professional food nutrition analysis engine.

Rules (VERY IMPORTANT):
- Return ONLY valid JSON
- DO NOT use markdown
- DO NOT omit any field
- Use EXACT field names

Schema:

{{
"items": [
{{
"name": "string",
"confidence": number,
"estimated_weight_g": number,
"nutrition_per_portion": {{
        "calories": number,
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number,
        "fiber_g": number,
        "sugar_g": number,
        "sodium_mg": number
}}
    }}
],
"total_nutrition": {{
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "sodium_mg": number
}}
}}

Analyze the meal image and fill ALL fields.
Cuisine hint: {cuisine_hint or "general"}.
"""

    model = genai.GenerativeModel(MODEL)

    response = model.generate_content(
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": buf.getvalue()
                        }
                    }
                ],
            }
        ],
        request_options={"timeout": 90},
    )

    return _force_json(response.text or "")
