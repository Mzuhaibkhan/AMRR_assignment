from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import traceback

import models, schemas, crud
from database import engine, get_db, upgrade_db
from send_emails import send_deadline_reminders
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Run migrations and setup tables
models.Base.metadata.create_all(bind=engine)
upgrade_db()

app = FastAPI(title="Task Management API")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    
    # Development/Testing/Mock Bypass Mode
    if not client_id or token.startswith("mock-") or "@" in token:
        email = token if "@" in token else "mock_user@example.com"
        return {"email": email}

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        return {"email": idinfo["email"]}
    except ValueError as e:
        # Fallback to check if token is a valid email for development purposes
        if "@" in token:
            return {"email": token}
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

@app.on_event("startup")
async def startup_message():
    print("\n✨ Task Management App is running!")
    print("👉 Open in browser: http://localhost:8000\n")
    import asyncio
    asyncio.create_task(keep_alive())

async def keep_alive():
    import asyncio
    import urllib.request
    render_url = os.environ.get("RENDER_EXTERNAL_URL")  # Correct environment variable name
    if not render_url:
        print("  RENDER_EXTERNAL_URL not set, keep-alive disabled (local dev).")
        return
    ping_url = f"{render_url}/api/tasks"
    while True:
        await asyncio.sleep(600)  # 10 minutes
        try:
            # Use mock auth for keep alive ping to avoid 401
            req = urllib.request.Request(ping_url)
            req.add_header("Authorization", "Bearer mock-keepalive@example.com")
            urllib.request.urlopen(req, timeout=10)
            print(f"🏓 Keep-alive ping sent to {ping_url}")
        except Exception as e:
            print(f"⚠️  Keep-alive ping failed: {e}")

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
def read_tasks(root_only: bool = True, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch tasks. By default, returns only root tasks (with their subtasks nested)."""
    return crud.get_tasks(db, user_email=current_user["email"], root_only=root_only)

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        return crud.create_task(db=db, task=task, user_email=current_user["email"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/tasks/{task_id}", response_model=schemas.TaskWithSubtasks)
def read_task(task_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_task = crud.get_task(db, task_id=task_id, user_email=current_user["email"])
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_task = crud.update_task(db, task_id, task, user_email=current_user["email"])
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    success = crud.delete_task(db, task_id, user_email=current_user["email"])
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "Task deleted"}

@app.put("/api/tasks/bulk/update", response_model=List[schemas.Task])
def bulk_update_tasks(update_data: schemas.BulkTaskUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return crud.bulk_update_tasks(db, update_data, user_email=current_user["email"])

@app.post("/api/tasks/bulk/delete")
def bulk_delete_tasks(delete_data: schemas.BulkTaskDelete, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    success = crud.bulk_delete_tasks(db, delete_data, user_email=current_user["email"])
    if not success:
        raise HTTPException(status_code=400, detail="Bulk delete failed")
    return {"detail": "Tasks deleted"}

@app.post("/api/tasks/send-reminders")
def trigger_send_reminders(authorization: str = Header(None)):
    cron_secret = os.environ.get("CRON_SECRET")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="CRON_SECRET is not configured on the server")
    
    expected_auth = f"Bearer {cron_secret}"
    if not authorization or authorization != expected_auth:
        raise HTTPException(status_code=401, detail="Unauthorized cron trigger secret")
    
    try:
        send_deadline_reminders()
        return {"detail": "Reminder emails process completed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email reminders: {str(e)}")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
