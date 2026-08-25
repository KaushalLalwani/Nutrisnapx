from pymongo import MongoClient
from app.core.config import MONGO_URI



# Create Mongo client
mongo_client = MongoClient(MONGO_URI)

# Database
db = mongo_client["nutrisnap"]

# Collections
users_collection = db["users"]
meals_collection = db["meals"]
goals_collection = db["user_goals"]
posts_collection = db["community_posts"]
likes_collection = db["community_likes"]
comments_collection = db["community_comments"]
