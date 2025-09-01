from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field, validator, ValidationError
from db import get_db
from spanishconjugator import Conjugator

# Import from dependencies instead of main to avoid circular imports
from dependencies import get_conjugator, get_question_service
from services import QuestionService

router = APIRouter()

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
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Get questions with random combinations of pronouns, tenses, and moods"""
    
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
    questions = question_service.generate_questions(
        pronouns=filters.pronoun,
        tenses=filters.tense,
        moods=filters.mood,
        limit=filters.limit
    )
    
    return {
        "questions": questions
    }
