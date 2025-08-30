from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from db import get_db
from spanishconjugator import Conjugator
import random

# Import from dependencies instead of main to avoid circular imports
from dependencies import get_conjugator

router = APIRouter()

class FilterParams(BaseModel):
    pronouns: List[str] = Field(default=["yo", "tu"], description="Filter by pronouns (yo, tu, usted, etc.)")
    tenses: List[str] = Field(default=["present"], description="Filter by tenses")
    moods: List[str] = Field(default=["indicative"], description="Filter by moods")
    limit: int = Field(1, ge=1, le=100, description="Number of questions to return")

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
    
    # Create FilterParams object from the query parameters
    filters = FilterParams(
        pronouns=pronoun,
        tenses=tense,
        moods=mood,
        limit=limit
    )
    
    # Create random combinations for the number specified in limit
    questions = []
    for _ in range(filters.limit):
        pronoun, tense, mood, verb = random.choice(filters.pronouns), random.choice(filters.tenses), random.choice(filters.moods), random.choice(['hablar', 'ir', 'comer', 'caminar'])
        answer = conjugator.conjugate(verb, tense, mood, pronoun)
        questions.append({'pronoun': pronoun, 'tense': tense, 'answer': answer, 'verb': verb, 'mood': mood})
    return {
        "questions": questions
    }
