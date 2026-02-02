from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.routes import auth, analyze, history
from app.routes import goals
from app.routes import summary
from app.db.mongo import mongo_client

app = FastAPI(
    title="NutriSnap AI Backend",
    version="4.0"
)

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Routes ----
app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(goals.router)
app.include_router(summary.router)
from app.routes import community
app.include_router(community.router)
from app.routes import profile
app.include_router(profile.router)

# ---- Health Check Endpoint (for UptimeRobot) ----
@app.get("/healthz")
async def health_check():
    """
    Health check endpoint for UptimeRobot to keep app awake on Render free tier.
    Checks MongoDB connection status.
    """
    try:
        # Test MongoDB connection
        mongo_client.admin.command("ping")
        db_status = True
    except Exception as e:
        db_status = False
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "disconnected",
            "error": str(e)
        }, 500

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected",
        "uptime": "Render Free Tier - Active"
    }



