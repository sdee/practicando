from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Verb(Base):
    __tablename__ = "verbs"
    
    id = Column(Integer, primary_key=True)
    infinitive = Column(String(50), unique=True, nullable=False)
    definition = Column(Text)

    guesses = relationship("Guess", back_populates="verb")

class Round(Base):
    __tablename__ = "rounds"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
    filters = Column(JSON)
    num_questions = Column(Integer, default=0)
    num_correct_answers = Column(Integer, default=0)
    
    guesses = relationship("Guess", back_populates="round")

class Guess(Base):
    """
    This model encapsulates both the dynamically question that the user sees and their eventual response. 
    """
    __tablename__ = "guesses"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)  # For mode without rounds (rounds also belongs to users)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=True)
    verb_id = Column(Integer, ForeignKey("verbs.id"))
    
    # Question parameters
    pronoun = Column(String(20), nullable=False)
    tense = Column(String(50), nullable=False)
    mood = Column(String(50), nullable=False)
    
    # User interaction
    user_answer = Column(String(100), nullable=True)
    correct_answer = Column(String(100), nullable=False)
    is_correct = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    round = relationship("Round", back_populates="guesses")
    verb = relationship("Verb", back_populates="guesses")
