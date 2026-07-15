from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import TaskStatus, TaskPriority

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    links: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.PENDING
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    parent_id: Optional[str] = None
    deadline: Optional[datetime] = None
    user_email: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    deadline: Optional[datetime] = None

class BulkTaskUpdate(BaseModel):
    task_ids: List[str]
    status: TaskStatus

class BulkTaskDelete(BaseModel):
    task_ids: List[str]

class Task(TaskBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskWithSubtasks(Task):
    subtasks: List['Task'] = []
    
    class Config:
        from_attributes = True

class UserSettings(BaseModel):
    wants_reminders: bool = True
