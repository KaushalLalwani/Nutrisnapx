from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from datetime import datetime
from bson import ObjectId
from PIL import Image
import io

from app.core.security import get_current_user
from app.services.cloudinary import upload_image
from app.services.gemini import analyze_with_gemini
from app.db.mongo import posts_collection, likes_collection, comments_collection
from app.models.schemas import CommunityPostCreate, CommentCreate
from app.utils.helpers import safe_json
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/community", tags=["Community"])
@router.post("/post")
async def create_post(
    image: UploadFile = File(...),
    caption: str = Form(...),
    nutrition: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Validate image
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images allowed")

    pil = Image.open(io.BytesIO(await image.read())).convert("RGB")

    # Use provided nutrition or perform AI analysis
    if nutrition:
        try:
            import json
            nutrition_data = json.loads(nutrition)
        except:
            # Fallback to AI analysis if provided nutrition is invalid
            analysis = analyze_with_gemini(pil)
            nutrition_data = analysis.get("total_nutrition", {})
    else:
        # AI nutrition analysis
        analysis = analyze_with_gemini(pil)
        nutrition_data = analysis.get("total_nutrition", {})

    # Upload image
    image_url = upload_image(pil)

    post = {
        "author_id": str(current_user["_id"]),
        "author_email": current_user["email"],
        "image_url": image_url,
        "caption": caption,
        "nutrition": nutrition_data,
        "likes_count": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    result = posts_collection.insert_one(post)

    return {"message": "Post created successfully", "post_id": str(result.inserted_id)}
from fastapi import Query

@router.get("/feed")
def get_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    search: str | None = None,
):
    skip = (page - 1) * limit

    query = {}
    if search:
        query = {"$text": {"$search": search}}

    posts = list(
        posts_collection.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    # Convert ObjectId to string for JSON response
    for post in posts:
        post["_id"] = str(post["_id"])

    total = posts_collection.count_documents(query)

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "has_more": skip + limit < total,
        "posts": posts,
    }

@router.post("/like/{post_id}")
def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        post_oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    exists = likes_collection.find_one(
        {"post_id": post_oid, "user_id": str(current_user["_id"])}
    )

    if exists:
        likes_collection.delete_one({"_id": exists["_id"]})
        posts_collection.update_one(
            {"_id": post_oid}, {"$inc": {"likes_count": -1}}
        )
        return {"liked": False}

    likes_collection.insert_one(
        {"post_id": post_oid, "user_id": str(current_user["_id"])}
    )
    posts_collection.update_one(
        {"_id": post_oid}, {"$inc": {"likes_count": 1}}
    )
    return {"liked": True}

@router.post("/comment/{post_id}")
def comment_post(
    post_id: str,
    data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        post_oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    comment = {
        "post_id": post_oid,
        "user_id": str(current_user["_id"]),
        "user_email": current_user["email"],
        "comment": data.comment,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = comments_collection.insert_one(comment)
    return {
        "message": "Comment added",
        "comment_id": str(result.inserted_id)
    }

@router.get("/comments/{post_id}")
def get_comments(post_id: str):
    try:
        post_oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    comments = list(
        comments_collection.find({"post_id": post_oid})
        .sort("created_at", 1)
    )

    # Convert ObjectId to string for JSON response
    for comment in comments:
        comment["_id"] = str(comment["_id"])
        comment["post_id"] = str(comment["post_id"])

    return JSONResponse(
        content=safe_json({
            "count": len(comments),
            "comments": comments
        })
    )

@router.delete("/comment/{comment_id}")
def delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        comment_oid = ObjectId(comment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid comment ID")

    comment = comments_collection.find_one({"_id": comment_oid})
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Can only delete your own comments")
    
    comments_collection.delete_one({"_id": comment_oid})
    return {"message": "Comment deleted"}

