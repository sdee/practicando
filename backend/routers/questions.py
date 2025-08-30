from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field, validator, ValidationError
from db import get_db
from spanishconjugator import Conjugator
import random

# Import from dependencies instead of main to avoid circular imports
from dependencies import get_conjugator
from models import TenseEnum, MoodEnum, PronounEnum
from utils import validate_enum_value, normalize_pronoun, extract_conjugation_from_response

router = APIRouter()

class FilterParams(BaseModel):
    pronoun: List[str] = Field(default=["yo", "tu"], description="Filter by pronouns (yo, tu, usted, etc.)")
    tense: List[str] = Field(default=["present"], description="Filter by tenses")
    mood: List[str] = Field(default=["indicative"], description="Filter by moods")
    limit: int = Field(1, ge=1, le=100, description="Number of questions to return")
    
    @validator('pronoun')
    def validate_pronouns(cls, v):
        for pronoun in v:
            validate_enum_value(PronounEnum, pronoun)
        return v
    
    @validator('tense')
    def validate_tenses(cls, v):
        for tense in v:
            validate_enum_value(TenseEnum, tense)
        return v
    
    @validator('mood')
    def validate_moods(cls, v):
        for mood in v:
            validate_enum_value(MoodEnum, mood)
        return v

@router.get("/")
def get_questions(
    pronoun: List[str] = Query(default=["yo", "tu"], description="Filter by pronouns (yo, tu, usted, etc.)", alias="pronoun"),
    tense: List[str] = Query(default=["present"], description="Filter by tenses", alias="tense"), 
    mood: List[str] = Query(default=["indicative"], description="Filter by moods", alias="mood"),
    limit: int = Query(default=1, ge=1, le=100, description="Number of questions to return"),
    db: Session = Depends(get_db),
    conjugator: Conjugator = Depends(get_conjugator)
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
        # Extract validation errors and return as HTTP 422 with clear error messages
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
    
    # Create random combinations for the number specified in limit
    questions = []
    for _ in range(filters.limit):
        pronoun_choice, tense_choice, mood_choice, verb = random.choice(filters.pronoun), random.choice(filters.tense), random.choice(filters.mood), random.choice(['hablar', 'ir', 'comer', 'caminar'])
        # Normalize pronoun for conjugator (special handling for subjunctive mood)
        normalized_pronoun = normalize_pronoun(pronoun_choice, mood_choice)
        # Get conjugation response
        conjugation_response = conjugator.conjugate(verb, tense_choice, mood_choice, normalized_pronoun)
        # Extract the correct conjugation based on mood and pronoun
        answer = extract_conjugation_from_response(conjugation_response, pronoun_choice, mood_choice)
        questions.append({'pronoun': pronoun_choice, 'tense': tense_choice, 'answer': answer, 'verb': verb, 'mood': mood_choice})
    return {
        "questions": questions
    }
