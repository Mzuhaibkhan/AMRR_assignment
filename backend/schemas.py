from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import TaskStatus

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    links: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.PENDING
    parent_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None

class BulkTaskUpdate(BaseModel):
    task_ids: List[int]
    status: TaskStatus

class BulkTaskDelete(BaseModel):
    task_ids: List[int]

class Task(TaskBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskWithSubtasks(Task):
    subtasks: List[Task] = []
    
    class Config:
        from_attributes = True
