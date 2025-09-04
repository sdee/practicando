from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field, validator, ValidationError
from db import get_db
from spanishconjugator import Conjugator

# Import from dependencies instead of main to avoid circular imports
from dependencies import get_conjugator, get_question_service
from services import QuestionService
from models import PronounEnum, TenseEnum, MoodEnum

router = APIRouter()

def validate_enum_lists(pronouns: List[str], tenses: List[str], moods: List[str]):
    """Validate that all values in the lists are valid enum values"""
    errors = []
    
    # Validate pronouns
    valid_pronouns = {e.value for e in PronounEnum}
    for pronoun in pronouns:
        if pronoun not in valid_pronouns:
            errors.append(f"Invalid value '{pronoun}' for pronoun. Valid values: {list(valid_pronouns)}")
    
    # Validate tenses  
    valid_tenses = {e.value for e in TenseEnum}
    for tense in tenses:
        if tense not in valid_tenses:
            errors.append(f"Invalid value '{tense}' for tense. Valid values: {list(valid_tenses)}")
            
    # Validate moods
    valid_moods = {e.value for e in MoodEnum}  
    for mood in moods:
        if mood not in valid_moods:
            errors.append(f"Invalid value '{mood}' for mood. Valid values: {list(valid_moods)}")
    
    return errors

class FilterParams(BaseModel):
    pronoun: List[str] = Field(default=["yo", "tu"], description="Filter by pronouns (yo, tu, usted, etc.)")
    tense: List[str] = Field(default=["present"], description="Filter by tenses")
    mood: List[str] = Field(default=["indicative"], description="Filter by moods")
    limit: int = Field(1, ge=1, le=100, description="Number of questions to return")

@router.get("/")
def get_questions(
    pronoun: List[str] = Query(default=["yo", "tu"], description="Filter by pronouns (yo, tu, usted, etc.)", alias="pronoun"),
    tense: List[str] = Query(default=["present"], description="Filter by tenses", alias="tense"), 
    mood: List[str] = Query(default=["indicative"], description="Filter by moods", alias="mood"),
    limit: int = Query(default=1, ge=1, le=100, description="Number of questions to return"),
    verb_class: str = Query(default="top20", description="Verb class to use (e.g., 'top10', 'top20', 'top50')"),
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Get questions with random combinations of pronouns, tenses, and moods"""
    
    # Validate enum values first
    validation_errors = validate_enum_lists(pronoun, tense, mood)
    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Validation failed",
                "errors": validation_errors
            }
        )
    
    # Create FilterParams object from the query parameters with validation error handling
    try:
        filters = FilterParams(
            pronoun=pronoun,
            tense=tense,
            mood=mood,
            limit=limit
        )
    except ValidationError as e:
        error_details = []
        for error in e.errors():
            field = error['loc'][-1] if error['loc'] else 'unknown'
            message = error['msg']
            error_details.append(f"{field}: {message}")
        
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Validation failed",
                "errors": error_details
            }
        )
    
    # Use the service to generate questions
    try:
        questions = question_service.generate_questions(
            pronouns=filters.pronoun,
            tenses=filters.tense,
            moods=filters.mood,
            limit=filters.limit,
            verb_class=verb_class
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": str(e)
            }
        )
    
    return {
        "questions": questions
    }


@router.get("/verb-sets/{verb_class}")
def get_verb_set(
    verb_class: str,
    question_service: QuestionService = Depends(get_question_service)
):
    """
    Get all verbs in a specific verb set, sorted alphabetically.
    
    Args:
        verb_class: Verb class like "top10", "top20", etc.
        question_service: Question service instance
        
    Returns:
        Dictionary with verb class info and list of verbs (sorted alphabetically)
    """
    try:
        verbs = question_service.get_verbs_by_class(verb_class)
        
        # Sort verbs alphabetically
        verbs_sorted = sorted(verbs)
        
        return {
            "verb_class": verb_class,
            "count": len(verbs_sorted),
            "verbs": verbs_sorted
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get verb set: {str(e)}"
        )
