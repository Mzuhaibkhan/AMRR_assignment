from sqlalchemy.orm import Session
import models, schemas
from typing import List

def get_tasks(db: Session, root_only: bool = True):
    if root_only:
        return db.query(models.Task).filter(models.Task.parent_id == None).all()
    return db.query(models.Task).all()

def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()

def create_task(db: Session, task: schemas.TaskCreate):
    db_task = models.Task(
        title=task.title,
        description=task.description,
        links=task.links,
        status=task.status,
        parent_id=task.parent_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task: schemas.TaskUpdate):
    db_task = get_task(db, task_id)
    if db_task:
        update_data = task.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

def bulk_update_tasks(db: Session, update_data: schemas.BulkTaskUpdate):
    tasks = db.query(models.Task).filter(models.Task.id.in_(update_data.task_ids)).all()
    for task in tasks:
        task.status = update_data.status
    db.commit()
    return tasks

def bulk_delete_tasks(db: Session, delete_data: schemas.BulkTaskDelete):
    tasks_to_delete = db.query(models.Task).filter(models.Task.id.in_(delete_data.task_ids)).all()
    for task in tasks_to_delete:
        db.delete(task)
    db.commit()
    return True
