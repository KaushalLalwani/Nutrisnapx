from fastapi import APIRouter, Depends
from app.db.mongo import posts_collection, likes_collection, users_collection
from app.core.security import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile using JWT token"""
    email = current_user.get("email")
    user_id = str(current_user.get("_id", email))
    
    total_posts = posts_collection.count_documents(
        {"author_id": user_id}
    )

    total_likes = sum(
        post.get("likes_count", 0)
        for post in posts_collection.find(
            {"author_id": user_id},
            {"likes_count": 1}
        )
    )

    return {
        "email": email,
        "display_name": current_user.get("display_name", email.split("@")[0]),
        "bio": current_user.get("bio", ""),
        "total_posts": total_posts,
        "total_likes": total_likes,
        "created_at": current_user.get("created"),
    }

@router.get("/me/posts")
def get_my_posts(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 10,
):
    """Get current user's posts using JWT token"""
    user_id = str(current_user.get("_id", current_user.get("email")))
    skip = (page - 1) * limit

    posts = list(
        posts_collection.find(
            {"author_id": user_id},
            {"_id": 0}
        )
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total = posts_collection.count_documents(
        {"author_id": user_id}
    )

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "posts": posts,
    }

@router.get("/{user_id}")
def get_profile(user_id: str):
    total_posts = posts_collection.count_documents(
        {"author_id": user_id}
    )

    total_likes = sum(
        post.get("likes_count", 0)
        for post in posts_collection.find(
            {"author_id": user_id},
            {"likes_count": 1}
        )
    )

    return {
        "user_id": user_id,
        "total_posts": total_posts,
        "total_likes": total_likes,
    }
@router.get("/{user_id}/posts")
def get_user_posts(
    user_id: str,
    page: int = 1,
    limit: int = 10,
):
    skip = (page - 1) * limit

    posts = list(
        posts_collection.find(
            {"author_id": user_id},
            {"_id": 0}
        )
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total = posts_collection.count_documents(
        {"author_id": user_id}
    )

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "posts": posts,
    }
