from sqlalchemy.orm import Session
import models, schemas
from typing import List

def get_tasks(db: Session, user_email: str, root_only: bool = True):
    query = db.query(models.Task).filter(models.Task.user_email == user_email)
    if root_only:
        query = query.filter(models.Task.parent_id == None)
    return query.all()

def get_task(db: Session, task_id: int, user_email: str):
    return db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_email == user_email).first()

def create_task(db: Session, task: schemas.TaskCreate, user_email: str):
    if task.parent_id:
        parent = db.query(models.Task).filter(models.Task.id == task.parent_id, models.Task.user_email == user_email).first()
        if not parent:
            raise ValueError("Parent task not found or does not belong to current user")

    db_task = models.Task(
        title=task.title,
        description=task.description,
        links=task.links,
        status=task.status,
        parent_id=task.parent_id,
        deadline=task.deadline,
        user_email=user_email
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task: schemas.TaskUpdate, user_email: str):
    db_task = get_task(db, task_id, user_email)
    if db_task:
        update_data = task.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int, user_email: str):
    db_task = get_task(db, task_id, user_email)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

def bulk_update_tasks(db: Session, update_data: schemas.BulkTaskUpdate, user_email: str):
    tasks = db.query(models.Task).filter(
        models.Task.id.in_(update_data.task_ids),
        models.Task.user_email == user_email
    ).all()
    for task in tasks:
        task.status = update_data.status
    db.commit()
    return tasks

def bulk_delete_tasks(db: Session, delete_data: schemas.BulkTaskDelete, user_email: str):
    tasks_to_delete = db.query(models.Task).filter(
        models.Task.id.in_(delete_data.task_ids),
        models.Task.user_email == user_email
    ).all()
    for task in tasks_to_delete:
        db.delete(task)
    db.commit()
    return True
