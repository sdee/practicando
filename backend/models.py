from sqlalchemy import Column, Integer, String, Enum
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

# Question model
class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True)
    pronoun = Column(String, nullable=False)  # yo, tu, usted, nosotros, vosotros, ustedes
    tense = Column(Enum(TenseEnum), nullable=False)
    answer = Column(String, nullable=False)
    verb = Column(String, nullable=False)
    mood = Column(Enum(MoodEnum), nullable=False)
