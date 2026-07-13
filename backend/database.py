from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./task_db.sqlite3"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def upgrade_db():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if 'tasks' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('tasks')]
        with engine.begin() as conn:
            if 'user_email' not in columns:
                print("Adding user_email column to tasks table...")
                conn.execute(text("ALTER TABLE tasks ADD COLUMN user_email VARCHAR"))
            if 'deadline' not in columns:
                print("Adding deadline column to tasks table...")
                conn.execute(text("ALTER TABLE tasks ADD COLUMN deadline DATETIME"))
