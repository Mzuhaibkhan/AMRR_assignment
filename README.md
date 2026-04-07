# ✨ Orbit Tasks — Task Management Application
A full-stack Task Management application built with **FastAPI**, **React (TypeScript)**, and **SQLite**. Supports creating, editing, and deleting tasks, adding subtasks, attaching reference links, and performing bulk actions on multiple tasks simultaneously.


## 🛠️ Tech Stack
| Layer    | Technology                     |
| -------- | ------------------------------ |
| Frontend | React, TypeScript, Vite        |
| Backend  | FastAPI, SQLAlchemy, Pydantic  |
| Database | SQLite                         |
| Styling  | Vanilla CSS (Dark Mode)        |
| Icons    | Lucide React                   |

There are two ways to run this application: **using Docker** (recommended) or **running the backend and frontend separately**.

---

### Option 1: Docker (Recommended)

This is the simplest way to run the entire application with a single command.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

#### 1. Build the Docker image

```bash
docker build -t task-management-app .
```

#### 2. Run the container

```bash
docker run -p 8000:8000 task-management-app
```

#### 3. Open in browser

```
http://localhost:8000
```

> Both the frontend and backend are served from a single container on port **8000**.

---

### Option 2: Run Backend & Frontend Separately

Use this method for local development with hot-reloading.

#### Backend

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```

The API will be running at **http://127.0.0.1:8000**  
API docs (Swagger UI) available at **http://127.0.0.1:8000/docs**

#### Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be running at **http://localhost:5173**

> **Note:** When running separately, the frontend is configured to proxy API requests to `http://localhost:8000`. Make sure the backend is running first.

## 📁 Project Structure
AMRR_assignment/
├── backend/
│   ├── main.py            # FastAPI application & routes
│   ├── models.py          # SQLAlchemy database models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── crud.py            # Database CRUD operations
│   ├── database.py        # Database engine & session config
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── api.ts         # API client (Axios)
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── index.css      # Global styles (dark theme)
│   │   └── main.tsx       # React entry point
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
├── Dockerfile             # Multi-stage Docker build
├── .dockerignore          # Docker ignore rules
└── README.md              # This file
```

## 🔌 API Endpoints

| Method   | Endpoint                  | Description                    |
| -------- | ------------------------- | ------------------------------ |
| `GET`    | `/api/tasks`              | List all root tasks (with subtasks) |
| `POST`   | `/api/tasks`              | Create a new task              |
| `GET`    | `/api/tasks/{id}`         | Get a single task by ID        |
| `PUT`    | `/api/tasks/{id}`         | Update a task                  |
| `DELETE` | `/api/tasks/{id}`         | Delete a task                  |
| `PUT`    | `/api/tasks/bulk/update`  | Bulk update task statuses      |
| `POST`   | `/api/tasks/bulk/delete`  | Bulk delete tasks              |

---

> The app includes a built-in keep-alive mechanism that prevents Render's free tier from putting the service to sleep.

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
