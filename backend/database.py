from pymongo import MongoClient, ASCENDING
import os

MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
client = MongoClient(MONGODB_URL)
db = client.get_database("orbit_tasks")

# For backwards compatibility with cron scripts/dependencies calling SessionLocal()
def SessionLocal():
    return db

# Dependency for FastAPI
def get_db():
    yield db

def upgrade_db():
    """Initializes MongoDB indexes for tasks and user settings collections."""
    print("Initializing MongoDB indexes...")
    try:
        # Create indexes on tasks collection
        db.tasks.create_index([("user_email", ASCENDING)])
        db.tasks.create_index([("parent_id", ASCENDING)])
        
        # Create unique index on user_settings collection
        db.user_settings.create_index([("email", ASCENDING)], unique=True)
        print("MongoDB indexes created successfully.")
    except Exception as e:
        print(f"Failed to create MongoDB indexes: {e}")
