from fastapi import HTTPException
from spanishconjugator import Conjugator
from services import QuestionService, create_question_service

def get_conjugator() -> Conjugator:
    """Get conjugator instance from app state"""
    # This will be set during app startup
    if not hasattr(get_conjugator, '_conjugator'):
        raise HTTPException(status_code=500, detail="Conjugator not initialized")
    return get_conjugator._conjugator

def set_conjugator(conjugator: Conjugator):
    """Set the conjugator instance (called from main.py on startup)"""
    get_conjugator._conjugator = conjugator

def get_question_service() -> QuestionService:
    """Get question service instance with conjugator dependency"""
    conjugator = get_conjugator()
    return create_question_service(conjugator)
