from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from db import get_db
from services import QuestionService, create_round_service
from dependencies import get_question_service

router = APIRouter(prefix="/rounds", tags=["rounds"])

class CreateRoundRequest(BaseModel):
    filters: dict = Field(description="Filter object with pronouns, tenses, and moods lists")
    num_questions: int = Field(default=12, ge=1, le=50, description="Number of questions in the round")
    user_id: Optional[int] = Field(default=None, description="User ID for multi-user support")

class RoundResponse(BaseModel):
    round: dict
    guesses: Optional[List[dict]] = None

class TransitionResponse(BaseModel):
    completed_round: dict
    new_round: dict
    guesses: List[dict]
    transition_reason: str

class SubmitGuessRequest(BaseModel):
    guess_id: int = Field(description="ID of the guess to update")
    user_answer: str = Field(description="User's submitted answer")
    is_correct: bool = Field(description="Whether the answer is correct")

class GuessResponse(BaseModel):
    guess: dict

@router.post("", response_model=RoundResponse)
def create_round(
    request: CreateRoundRequest,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Create a new round with pre-generated guesses"""
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Create the round
        result = round_service.create_round(
            filters=request.filters,
            num_questions=request.num_questions,
            user_id=request.user_id
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.put("/{round_id}/complete", response_model=RoundResponse)
def complete_round(
    round_id: int,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Complete a round by setting ended_at and calculating correct answers"""
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Complete the round
        result = round_service.complete_round(round_id)
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/active", response_model=RoundResponse)
def get_active_round(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Get the currently active (incomplete) round"""
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Get active round
        result = round_service.get_active_round(user_id=user_id)
        if not result:
            raise HTTPException(status_code=404, detail="No active round found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/{round_id}", response_model=RoundResponse)
def get_round(
    round_id: int,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Get a specific round with its guesses"""
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Get the round
        result = round_service.get_round(round_id)
        if not result:
            raise HTTPException(status_code=404, detail="Round not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/{round_id}/transition", response_model=TransitionResponse)
def transition_round(
    round_id: int,
    request: CreateRoundRequest,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """
    Complete the current round and create a new round with different filters.
    This is used when filters are changed mid-round.
    """
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Transition to new round
        result = round_service.transition_to_new_round(
            current_round_id=round_id,
            new_filters=request.filters,
            num_questions=request.num_questions,
            user_id=request.user_id
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.put("/guesses/{guess_id}", response_model=GuessResponse)
def submit_guess(
    guess_id: int,
    request: SubmitGuessRequest,
    db: Session = Depends(get_db),
    question_service: QuestionService = Depends(get_question_service)
):
    """Submit a user's answer for a guess"""
    try:
        # Create round service
        round_service = create_round_service(question_service, db)
        
        # Update the guess
        updated_guess = round_service.update_guess(
            guess_id=guess_id,
            user_answer=request.user_answer,
            is_correct=request.is_correct
        )
        
        return {"guess": updated_guess}
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
