from fastapi import HTTPException
from spanishconjugator import Conjugator

def get_conjugator() -> Conjugator:
    """Get conjugator instance from app state"""
    # This will be set during app startup
    if not hasattr(get_conjugator, '_conjugator'):
        raise HTTPException(status_code=500, detail="Conjugator not initialized")
    return get_conjugator._conjugator

def set_conjugator(conjugator: Conjugator):
    """Set the conjugator instance (called from main.py on startup)"""
    get_conjugator._conjugator = conjugator
