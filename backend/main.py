from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

import models, schemas, crud
from database import engine, get_db

# Create the database tables automatically
# In a real-world scenario, you might want to use Alembic for migrations
models.Base.metadata.create_all(bind=engine)

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
import traceback

app = FastAPI(title="Task Management API")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"message": str(exc), "traceback": traceback.format_exc()})

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/tasks", response_model=List[schemas.TaskWithSubtasks])
def read_tasks(root_only: bool = True, db: Session = Depends(get_db)):
    """Fetch tasks. By default, returns only root tasks (with their subtasks nested)."""
    return crud.get_tasks(db, root_only=root_only)

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db=db, task=task)

@app.get("/api/tasks/{task_id}", response_model=schemas.TaskWithSubtasks)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = crud.update_task(db, task_id, task)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "Task deleted"}

@app.put("/api/tasks/bulk/update", response_model=List[schemas.Task])
def bulk_update_tasks(update_data: schemas.BulkTaskUpdate, db: Session = Depends(get_db)):
    return crud.bulk_update_tasks(db, update_data)

@app.post("/api/tasks/bulk/delete")
def bulk_delete_tasks(delete_data: schemas.BulkTaskDelete, db: Session = Depends(get_db)):
    success = crud.bulk_delete_tasks(db, delete_data)
    if not success:
        raise HTTPException(status_code=400, detail="Bulk delete failed")
    return {"detail": "Tasks deleted"}

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
