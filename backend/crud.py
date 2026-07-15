from bson import ObjectId
from datetime import datetime
import models, schemas
from typing import List

def get_tasks(db, user_email: str, root_only: bool = True):
    # Fetch all tasks for this user
    cursor = db.tasks.find({"user_email": user_email})
    all_tasks = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["subtasks"] = []
        all_tasks.append(doc)
    
    # If not root_only, just return them flat
    if not root_only:
        return all_tasks
        
    # Map by id to build nested hierarchy in O(N)
    task_map = {t["id"]: t for t in all_tasks}
    root_tasks = []
    
    for t in all_tasks:
        parent_id = t.get("parent_id")
        if parent_id and parent_id in task_map:
            task_map[parent_id]["subtasks"].append(t)
        else:
            root_tasks.append(t)
            
    return root_tasks

def get_task(db, task_id: str, user_email: str):
    try:
        doc = db.tasks.find_one({"_id": ObjectId(task_id), "user_email": user_email})
        if doc:
            doc["id"] = str(doc["_id"])
            # Fetch subtasks for this specific task
            sub_cursor = db.tasks.find({"parent_id": task_id, "user_email": user_email})
            doc["subtasks"] = []
            for sub in sub_cursor:
                sub["id"] = str(sub["_id"])
                doc["subtasks"].append(sub)
            return doc
    except Exception:
        pass
    return None

def create_task(db, task: schemas.TaskCreate, user_email: str):
    if task.parent_id:
        try:
            parent = db.tasks.find_one({"_id": ObjectId(task.parent_id), "user_email": user_email})
            if not parent:
                raise ValueError("Parent task not found or does not belong to current user")
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError("Invalid parent task ID format")

    task_dict = {
        "title": task.title,
        "description": task.description,
        "links": task.links,
        "status": task.status.value if hasattr(task.status, 'value') else task.status,
        "priority": task.priority.value if hasattr(task.priority, 'value') else task.priority,
        "parent_id": task.parent_id,
        "deadline": task.deadline,
        "user_email": user_email,
        "created_at": datetime.utcnow()
    }
    result = db.tasks.insert_one(task_dict)
    task_dict["id"] = str(result.inserted_id)
    task_dict["subtasks"] = []
    return task_dict

def update_task(db, task_id: str, task: schemas.TaskUpdate, user_email: str):
    try:
        update_data = task.model_dump(exclude_unset=True)
        if not update_data:
            return get_task(db, task_id, user_email)
            
        # Standardize enums
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
        if "priority" in update_data and update_data["priority"]:
            update_data["priority"] = update_data["priority"].value if hasattr(update_data["priority"], 'value') else update_data["priority"]
            
        result = db.tasks.update_one(
            {"_id": ObjectId(task_id), "user_email": user_email},
            {"$set": update_data}
        )
        if result.matched_count > 0:
            return get_task(db, task_id, user_email)
    except Exception:
        pass
    return None

def delete_task(db, task_id: str, user_email: str):
    try:
        task = db.tasks.find_one({"_id": ObjectId(task_id), "user_email": user_email})
        if task:
            # Cascading delete: delete all subtasks of this task
            db.tasks.delete_many({"parent_id": task_id, "user_email": user_email})
            # Delete the task itself
            db.tasks.delete_one({"_id": ObjectId(task_id), "user_email": user_email})
            return True
    except Exception:
        pass
    return False

def bulk_update_tasks(db, update_data: schemas.BulkTaskUpdate, user_email: str):
    try:
        object_ids = [ObjectId(tid) for tid in update_data.task_ids]
        status = update_data.status.value if hasattr(update_data.status, 'value') else update_data.status
        db.tasks.update_many(
            {"_id": {"$in": object_ids}, "user_email": user_email},
            {"$set": {"status": status}}
        )
        cursor = db.tasks.find({"_id": {"$in": object_ids}, "user_email": user_email})
        tasks = []
        for doc in cursor:
            doc["id"] = str(doc["_id"])
            tasks.append(doc)
        return tasks
    except Exception:
        return []

def bulk_delete_tasks(db, delete_data: schemas.BulkTaskDelete, user_email: str):
    try:
        object_ids = [ObjectId(tid) for tid in delete_data.task_ids]
        task_ids_str = [str(tid) for tid in object_ids]
        # Cascading delete for subtasks of all bulk deleted tasks
        db.tasks.delete_many({"parent_id": {"$in": task_ids_str}, "user_email": user_email})
        # Delete main tasks
        db.tasks.delete_many({"_id": {"$in": object_ids}, "user_email": user_email})
        return True
    except Exception:
        return False

# User Settings CRUD
def get_user_settings(db, email: str):
    settings = db.user_settings.find_one({"email": email})
    if not settings:
        settings = {"email": email, "wants_reminders": True}
        db.user_settings.insert_one(settings)
    if "_id" in settings:
        del settings["_id"]
    return settings

def update_user_settings(db, email: str, settings: schemas.UserSettings):
    db.user_settings.update_one(
        {"email": email},
        {"$set": {"wants_reminders": settings.wants_reminders}},
        upsert=True
    )
    return get_user_settings(db, email)
