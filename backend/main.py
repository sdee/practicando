from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import psycopg2

from db import get_db, get_engine
from models import Base
from spanishconjugator import Conjugator
from dependencies import set_conjugator

# Import routers
from routers import questions, rounds

app = FastAPI()

# Create tables and initialize services on startup
@app.on_event("startup")
def startup_event():
    # Create database tables
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    
    # Initialize conjugator
    conjugator = Conjugator()
    set_conjugator(conjugator)

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(rounds.router, prefix="/api", tags=["rounds"])


class HealthResponse(BaseModel):
    status: str
    db: str


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
def health_check():
    db_status = "ok"
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"), connect_timeout=2)
        conn.close()
    except Exception:
        db_status = "error"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "db": db_status},
        )
    return {"status": "ok", "db": db_status}


@app.get("/api/greet")
def greet():
    return {"message": "Hello from FastAPI!"}


# Serve React static files if present
if os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")