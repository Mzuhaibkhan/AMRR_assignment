import os
import sys
from datetime import datetime
from bson import ObjectId

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pymongo import MongoClient
import models
import schemas
import crud

def run_tests():
    print("🚀 Starting MongoDB CRUD unit tests...")
    
    # 1. Connect to MongoDB
    mongodb_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    print(f"Connecting to MongoDB at: {mongodb_url}")
    
    try:
        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=2000)
        # Check connection
        client.server_info()
        print("✅ MongoDB connection successful.")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        print("Please ensure MongoDB is running locally before executing tests.")
        return False

    # Use a test database
    db = client.get_database("orbit_tasks_test")
    
    # Clean database before testing
    db.tasks.drop()
    db.user_settings.drop()
    
    user_email = "tester@example.com"
    
    try:
        # Test 1: User Settings CRUD
        print("\nTest 1: User Settings...")
        settings = crud.get_user_settings(db, user_email)
        assert settings["wants_reminders"] is True, "Default wants_reminders should be True"
        
        updated_settings = crud.update_user_settings(db, user_email, schemas.UserSettings(wants_reminders=False))
        assert updated_settings["wants_reminders"] is False, "wants_reminders should be updated to False"
        
        # Reset to true
        crud.update_user_settings(db, user_email, schemas.UserSettings(wants_reminders=True))
        print("✅ User settings tests passed.")
        
        # Test 2: Task Creation
        print("\nTest 2: Creating Root Task...")
        task_in = schemas.TaskCreate(
            title="Root Task",
            description="Main task description",
            status=models.TaskStatus.IN_PROGRESS,
            priority=models.TaskPriority.HIGH
        )
        task = crud.create_task(db, task_in, user_email)
        assert task["title"] == "Root Task", "Title mismatch"
        assert task["status"] == "In Progress", "Status mismatch"
        assert task["priority"] == "High", "Priority mismatch"
        assert task["parent_id"] is None, "Parent ID should be None for root"
        root_id = task["id"]
        print("✅ Root task creation passed.")
        
        # Test 3: Subtask Creation
        print("\nTest 3: Creating Subtask...")
        subtask_in = schemas.TaskCreate(
            title="Subtask 1",
            description="Child task description",
            parent_id=root_id,
            status=models.TaskStatus.PENDING,
            priority=models.TaskPriority.MEDIUM
        )
        subtask = crud.create_task(db, subtask_in, user_email)
        assert subtask["title"] == "Subtask 1", "Subtask title mismatch"
        assert subtask["parent_id"] == root_id, "Subtask parent mismatch"
        sub_id = subtask["id"]
        print("✅ Subtask creation passed.")
        
        # Test 4: Nesting Hierarchy retrieval
        print("\nTest 4: Nested Task Tree Retrieval...")
        tasks = crud.get_tasks(db, user_email, root_only=True)
        assert len(tasks) == 1, "Should return exactly 1 root task"
        assert len(tasks[0]["subtasks"]) == 1, "Root task should contain 1 subtask"
        assert tasks[0]["subtasks"][0]["id"] == sub_id, "Subtask ID mismatch in hierarchy"
        print("✅ Nested task tree retrieval passed.")
        
        # Test 5: Task Update
        print("\nTest 5: Updating Task...")
        update_in = schemas.TaskUpdate(
            title="Updated Root Task",
            status=models.TaskStatus.COMPLETED
        )
        updated = crud.update_task(db, root_id, update_in, user_email)
        assert updated["title"] == "Updated Root Task", "Update title mismatch"
        assert updated["status"] == "Completed", "Update status mismatch"
        print("✅ Task update passed.")
        
        # Test 6: Cascade Deletion
        print("\nTest 6: Cascade Deletion...")
        success = crud.delete_task(db, root_id, user_email)
        assert success is True, "Delete should return True"
        
        # Check if root is gone
        root_check = db.tasks.find_one({"_id": ObjectId(root_id)})
        assert root_check is None, "Root task should be deleted"
        
        # Check if subtask is cascadingly deleted
        sub_check = db.tasks.find_one({"_id": ObjectId(sub_id)})
        assert sub_check is None, "Subtask should be cascadingly deleted"
        print("✅ Cascade deletion passed.")
        
        print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
        return True
        
    finally:
        # Drop test database
        client.drop_database("orbit_tasks_test")
        print("\n🧹 Cleaned up test database.")

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
