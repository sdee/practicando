from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from spanishconjugator import Conjugator
from services import QuestionService, create_question_service
from db import get_db

def get_conjugator() -> Conjugator:
    """Get conjugator instance from app state"""
    # This will be set during app startup
    if not hasattr(get_conjugator, '_conjugator'):
        raise HTTPException(status_code=500, detail="Conjugator not initialized")
    return get_conjugator._conjugator

def set_conjugator(conjugator: Conjugator):
    """Set the conjugator instance (called from main.py on startup)"""
    get_conjugator._conjugator = conjugator

def get_question_service(
    conjugator: Conjugator = Depends(get_conjugator),
    db: Session = Depends(get_db)
) -> QuestionService:
    """Get question service instance with conjugator and database dependencies"""
    return create_question_service(conjugator, db)
