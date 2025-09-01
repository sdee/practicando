from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text, func, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

# Enums for the Question model
class TenseEnum(enum.Enum):
    present = "present"
    imperfect = "imperfect"
    preterite = "preterite"
    future = "future"
    present_perfect = "present_perfect"
    past_anterior = "past_anterior"
    future_perfect = "future_perfect"
    conditional_simple = "conditional_simple"

class MoodEnum(enum.Enum):
    conditional = "conditional"
    imperative = "imperative"
    indicative = "indicative"
    subjunctive = "subjunctive"

class PronounEnum(enum.Enum):
    yo = "yo"
    tu = "tu"
    el = "el"
    ellos = "ellos"
    ella = "ella"
    usted = "usted"
    nosotros = "nosotros"
    vosotros = "vosotros"
    ustedes = "ustedes"

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
    pronoun = Column(Enum(PronounEnum), nullable=False)
    tense = Column(Enum(TenseEnum), nullable=False)
    mood = Column(Enum(MoodEnum), nullable=False)
    
    # User response
    user_answer = Column(String(100), nullable=True)
    correct_answer = Column(String(100), nullable=False)
    is_correct = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    round = relationship("Round", back_populates="guesses")
    verb = relationship("Verb", back_populates="guesses")
