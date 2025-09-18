from services import VerbService
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from dependencies import get_verb_service

router = APIRouter(prefix="/verbs", tags=["verbs"])

@router.get("/{verb}/conjugations")
def get_conjugations(verb: str, db: Session = Depends(get_db), verb_service: VerbService = Depends(get_verb_service)):
    return verb_service.get_conjugations(verb)