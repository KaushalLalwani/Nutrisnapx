from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from app.db.mongo import users_collection

router = APIRouter(tags=["Auth"])


class UserAuth(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register_user(data: UserAuth):
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(data.password)
    users_collection.insert_one(
        {
            "email": data.email,
            "password": hashed_password,
            "created": datetime.utcnow().isoformat(),
        }
    )

    return {"message": "✅ User registered successfully"}


@router.post("/login")
async def login_user(data: UserAuth):
    user = users_collection.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": data.email})
    return {"access_token": token, "token_type": "bearer"}
