from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from db import get_db
from models import Guess, MoodEnum, TenseEnum, PronounEnum, Verb

router = APIRouter(prefix="/metrics", tags=["metrics"])


class CoverageMetadata(BaseModel):
    total_questions: int
    unique_bins: int
    mood_filter: Optional[List[str]] = None
    date_range: Optional[Dict[str, str]] = None


class CoverageBin(BaseModel):
    pronoun: str
    tense: str
    mood: str
    question_count: int


class CoverageResponse(BaseModel):
    metadata: CoverageMetadata
    bins: List[CoverageBin]


@router.get("/coverage", response_model=CoverageResponse)
async def get_coverage_metrics(
    db: Session = Depends(get_db),
    mood: Optional[List[str]] = Query(None, description="Filter by specific mood(s)"),
    user_id: Optional[int] = Query(None, description="Filter by user (optional)"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    min_questions: int = Query(1, description="Only include bins with at least N questions")
):
    """
    Get question coverage metrics binned by pronoun/tense combinations.
    
    Returns the distribution of questions across different pronoun/tense/mood combinations,
    helping identify practice patterns and gaps in coverage.
    """
    
    # Start with base query  
    query = db.query(
        Guess.pronoun,
        Guess.tense, 
        Guess.mood,
        func.count(Guess.id).label('question_count')
    ).join(Verb, Guess.verb_id == Verb.id)
    
    # Apply filters
    if mood:
        try:
            mood_enums = [MoodEnum(m) for m in mood]
            query = query.filter(Guess.mood.in_(mood_enums))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid mood in list: {mood}")
    
    if user_id:
        query = query.filter(Guess.user_id == user_id)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Guess.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Guess.created_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    # Group by pronoun, tense, mood
    query = query.group_by(Guess.pronoun, Guess.tense, Guess.mood)
    
    # Apply minimum questions filter
    query = query.having(func.count(Guess.id) >= min_questions)
    
    # Order by question count descending
    query = query.order_by(func.count(Guess.id).desc())
    
    results = query.all()
    
    # Calculate metadata
    total_questions = sum(row.question_count for row in results)
    unique_bins = len(results)
    
    # Process bins
    bins = []
    for row in results:
        bins.append(CoverageBin(
            pronoun=row.pronoun.value,
            tense=row.tense.value,
            mood=row.mood.value,
            question_count=row.question_count
        ))
    
    # Build metadata
    metadata = CoverageMetadata(
        total_questions=total_questions,
        unique_bins=unique_bins,
        mood_filter=mood if mood else None
    )
    
    if start_date or end_date:
        metadata.date_range = {}
        if start_date:
            metadata.date_range["start_date"] = start_date
        if end_date:
            metadata.date_range["end_date"] = end_date
    
    return CoverageResponse(
        metadata=metadata,
        bins=bins
    )
