#!/usr/bin/env python3
"""
Realistic Spanish Conjugation Test Data Generator

Generates realistic practice data focusing on indicative mood with:
- Common Spanish verbs with proper conjugations
- Realistic user activity patterns over 3 months
- Varied practice intensity and accuracy
- Focus on indicative tenses
"""

import random
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from faker import Faker

# Add the current directory to Python path to import our models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from models import Base, Verb, Round, Guess, TenseEnum, MoodEnum, PronounEnum
from db import get_engine

fake = Faker()

# Spanish verbs with their translations and frequency weights
SPANISH_VERBS = {
    # Most common verbs (higher weight)
    'ser': {'definition': 'to be (permanent)', 'weight': 10},
    'estar': {'definition': 'to be (temporary)', 'weight': 10},
    'tener': {'definition': 'to have', 'weight': 9},
    'hacer': {'definition': 'to do/make', 'weight': 9},
    'poder': {'definition': 'to be able to', 'weight': 8},
    'decir': {'definition': 'to say/tell', 'weight': 8},
    'ir': {'definition': 'to go', 'weight': 8},
    'ver': {'definition': 'to see', 'weight': 7},
    'dar': {'definition': 'to give', 'weight': 7},
    'saber': {'definition': 'to know (facts)', 'weight': 7},
    'querer': {'definition': 'to want/love', 'weight': 6},
    'llegar': {'definition': 'to arrive', 'weight': 6},
    'pasar': {'definition': 'to pass/happen', 'weight': 6},
    'deber': {'definition': 'to owe/should', 'weight': 5},
    'poner': {'definition': 'to put/place', 'weight': 5},
    
    # Common verbs (medium weight)
    'parecer': {'definition': 'to seem/appear', 'weight': 4},
    'quedar': {'definition': 'to remain/stay', 'weight': 4},
    'creer': {'definition': 'to believe', 'weight': 4},
    'hablar': {'definition': 'to speak', 'weight': 4},
    'llevar': {'definition': 'to carry/wear', 'weight': 4},
    'dejar': {'definition': 'to leave/let', 'weight': 4},
    'seguir': {'definition': 'to follow/continue', 'weight': 3},
    'encontrar': {'definition': 'to find', 'weight': 3},
    'llamar': {'definition': 'to call', 'weight': 3},
    'venir': {'definition': 'to come', 'weight': 3},
    'pensar': {'definition': 'to think', 'weight': 3},
    'salir': {'definition': 'to go out/leave', 'weight': 3},
    'volver': {'definition': 'to return', 'weight': 3},
    'tomar': {'definition': 'to take/drink', 'weight': 3},
    'conocer': {'definition': 'to know/meet', 'weight': 3},
    
    # Less common verbs (lower weight)
    'trabajar': {'definition': 'to work', 'weight': 2},
    'vivir': {'definition': 'to live', 'weight': 2},
    'morir': {'definition': 'to die', 'weight': 2},
    'abrir': {'definition': 'to open', 'weight': 2},
    'escribir': {'definition': 'to write', 'weight': 2},
    'leer': {'definition': 'to read', 'weight': 2},
    'sentir': {'definition': 'to feel', 'weight': 2},
    'perder': {'definition': 'to lose', 'weight': 2},
    'cambiar': {'definition': 'to change', 'weight': 2},
    'empezar': {'definition': 'to begin', 'weight': 2}
}

# Indicative tenses with their practice frequency weights
INDICATIVE_TENSES = {
    TenseEnum.present: {'weight': 40, 'accuracy_base': 85},  # Most practiced, highest accuracy
    TenseEnum.preterite: {'weight': 25, 'accuracy_base': 70},  # Common, medium difficulty  
    TenseEnum.imperfect: {'weight': 20, 'accuracy_base': 80},  # Less common, easier
    TenseEnum.future: {'weight': 10, 'accuracy_base': 75},  # Moderate practice
    TenseEnum.present_perfect: {'weight': 3, 'accuracy_base': 65},  # Less practiced, harder
    TenseEnum.conditional_simple: {'weight': 1, 'accuracy_base': 60},  # Rarely practiced
    TenseEnum.future_perfect: {'weight': 0.5, 'accuracy_base': 55},  # Very rare
    TenseEnum.past_anterior: {'weight': 0.5, 'accuracy_base': 50}  # Very rare, hardest
}

# Pronoun practice frequency (realistic usage patterns)
PRONOUN_WEIGHTS = {
    PronounEnum.yo: 30,  # Most practiced (1st person)
    PronounEnum.tu: 25,  # Very common (informal 2nd person)
    PronounEnum.el: 15,  # Common (3rd person masculine)
    PronounEnum.ella: 12,  # Common (3rd person feminine)
    PronounEnum.nosotros: 8,  # Less common (1st person plural)
    PronounEnum.ellos: 5,  # Less common (3rd person plural)
    PronounEnum.usted: 3,  # Formal, less practiced
    PronounEnum.ustedes: 2,  # Formal plural, less practiced
    PronounEnum.vosotros: 0.1  # Spain only, very rare in practice
}

def create_verbs(session) -> Dict[str, int]:
    """Create verb records and return mapping of infinitive -> id"""
    print("Creating Spanish verbs...")
    verb_ids = {}
    
    for infinitive, data in SPANISH_VERBS.items():
        verb = Verb(
            infinitive=infinitive,
            definition=data['definition']
        )
        session.add(verb)
        session.flush()  # Get the ID
        verb_ids[infinitive] = verb.id
    
    session.commit()
    print(f"Created {len(verb_ids)} verbs")
    return verb_ids

def generate_practice_schedule(start_date: datetime, end_date: datetime) -> List[Tuple[datetime, int]]:
    """Generate realistic practice schedule with varying number of rounds per day"""
    schedule = []
    current_date = start_date
    
    while current_date <= end_date:
        # Determine number of rounds for this day (0-6)
        # Weight towards 1-3 rounds per day, with occasional heavy days
        round_weights = {
            0: 20,  # 20% chance of no practice
            1: 35,  # Most common - single session
            2: 25,  # Common - morning + evening
            3: 12,  # Occasional - spread throughout day
            4: 5,   # Rare - very motivated day
            5: 2,   # Very rare - intensive practice
            6: 1    # Extremely rare - marathon day
        }
        
        num_rounds = weighted_choice(round_weights)
        
        if num_rounds == 0:
            current_date += timedelta(days=1)
            continue
        
        # Weekend practice tends to have fewer but longer rounds
        if current_date.weekday() >= 5:  # Weekend
            if num_rounds > 3:
                num_rounds = max(1, num_rounds - 2)  # Reduce rounds on weekends
        
        # Generate rounds for this day
        for round_num in range(num_rounds):
            # Distribute rounds throughout the day
            if num_rounds == 1:
                # Single round - prefer evening
                practice_hour = random.choices([8, 9, 17, 18, 19, 20, 21], 
                                             weights=[5, 5, 15, 25, 25, 20, 5])[0]
            elif num_rounds == 2:
                # Two rounds - morning and evening
                practice_hour = 9 if round_num == 0 else random.choice([18, 19, 20])
            else:
                # Multiple rounds - spread throughout day
                hours = [8, 11, 14, 17, 19, 21]
                practice_hour = hours[min(round_num, len(hours) - 1)]
            
            # Questions per round (5-25, with most rounds being 10-15 questions)
            questions_weights = {
                5: 5, 6: 5, 7: 8, 8: 10, 9: 12, 10: 15,
                11: 12, 12: 12, 13: 10, 14: 8, 15: 8,
                16: 5, 17: 3, 18: 2, 19: 2, 20: 2, 
                21: 1, 22: 1, 23: 1, 24: 1, 25: 1
            }
            num_questions = weighted_choice(questions_weights)
            
            # Add some random minutes to avoid exact hour scheduling
            practice_time = current_date.replace(
                hour=practice_hour,
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )
            
            # Add small time offset for multiple rounds same day
            practice_time += timedelta(minutes=round_num * random.randint(10, 30))
            
            schedule.append((practice_time, num_questions))
        
        current_date += timedelta(days=1)
    
    return schedule

def weighted_choice(choices_weights: Dict) -> any:
    """Make a weighted random choice from a dictionary of choices and weights"""
    choices = list(choices_weights.keys())
    weights = list(choices_weights.values())
    return random.choices(choices, weights=weights)[0]

def generate_conjugation(verb: str, pronoun: PronounEnum, tense: TenseEnum) -> Tuple[str, bool]:
    """
    Generate a conjugation and determine if the user got it right.
    This is a simplified version - in reality you'd have proper conjugation rules.
    """
    # Simplified conjugations for demo purposes
    # In a real app, you'd have comprehensive conjugation rules
    
    conjugations = {
        ('ser', PronounEnum.yo, TenseEnum.present): 'soy',
        ('ser', PronounEnum.tu, TenseEnum.present): 'eres', 
        ('ser', PronounEnum.el, TenseEnum.present): 'es',
        ('ser', PronounEnum.ella, TenseEnum.present): 'es',
        ('estar', PronounEnum.yo, TenseEnum.present): 'estoy',
        ('estar', PronounEnum.tu, TenseEnum.present): 'estás',
        ('tener', PronounEnum.yo, TenseEnum.present): 'tengo',
        ('tener', PronounEnum.tu, TenseEnum.present): 'tienes',
        # Add more as needed...
    }
    
    key = (verb, pronoun, tense)
    if key in conjugations:
        correct_answer = conjugations[key]
    else:
        # Generic fallback for demo
        correct_answer = f"{verb}_conjugated_{pronoun.value}_{tense.value}"
    
    # Determine accuracy based on tense difficulty
    accuracy_base = INDICATIVE_TENSES[tense]['accuracy_base']
    # Add some verb-specific variation
    verb_difficulty_modifier = random.uniform(-10, 10)
    final_accuracy = max(30, min(95, accuracy_base + verb_difficulty_modifier))
    
    is_correct = random.random() * 100 < final_accuracy
    
    if is_correct:
        user_answer = correct_answer
    else:
        # Generate a plausible wrong answer
        user_answer = correct_answer + "_wrong"
    
    return correct_answer, is_correct, user_answer

def create_practice_session(session, verb_ids: Dict[str, int], 
                          practice_time: datetime, num_questions: int) -> None:
    """Create a practice round with questions"""
    
    # Create round
    round_obj = Round(
        user_id=1,  # Single user for now
        started_at=practice_time,
        ended_at=practice_time + timedelta(minutes=random.randint(5, 30)),
        num_questions=num_questions,
        filters={"mood": ["indicative"]}  # Focus on indicative
    )
    session.add(round_obj)
    session.flush()
    
    correct_answers = 0
    
    # Generate questions for this round
    for i in range(num_questions):
        # Select verb (weighted by frequency)
        verb_name = weighted_choice({k: v['weight'] for k, v in SPANISH_VERBS.items()})
        verb_id = verb_ids[verb_name]
        
        # Select tense (weighted by practice frequency)
        tense = weighted_choice({k: v['weight'] for k, v in INDICATIVE_TENSES.items()})
        
        # Select pronoun (weighted by usage)
        pronoun = weighted_choice(PRONOUN_WEIGHTS)
        
        # Generate conjugation and accuracy
        correct_answer, is_correct, user_answer = generate_conjugation(verb_name, pronoun, tense)
        
        if is_correct:
            correct_answers += 1
        
        # Question timestamp within the round
        question_time = practice_time + timedelta(seconds=i * random.randint(10, 60))
        
        # Create guess record
        guess = Guess(
            user_id=1,
            round_id=round_obj.id,
            verb_id=verb_id,
            pronoun=pronoun,
            tense=tense,
            mood=MoodEnum.indicative,
            user_answer=user_answer if random.random() > 0.05 else None,  # 5% unanswered
            correct_answer=correct_answer,
            is_correct=is_correct,
            created_at=question_time
        )
        session.add(guess)
    
    # Update round with correct answers
    round_obj.num_correct_answers = correct_answers
    session.commit()

def generate_test_data(months_back: int = 3):
    """Generate realistic test data for the specified time period"""
    
    # Database setup
    engine = get_engine()
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Clear existing data
        print("Clearing existing data...")
        session.query(Guess).delete()
        session.query(Round).delete() 
        session.query(Verb).delete()
        session.commit()
        
        # Create verbs
        verb_ids = create_verbs(session)
        
        # Generate practice schedule
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months_back * 30)
        
        print(f"Generating practice schedule from {start_date.date()} to {end_date.date()}...")
        schedule = generate_practice_schedule(start_date, end_date)
        
        # Create practice sessions (now individual rounds)
        print(f"Creating {len(schedule)} practice rounds...")
        total_questions = 0
        
        for i, (practice_time, num_questions) in enumerate(schedule):
            create_practice_session(session, verb_ids, practice_time, num_questions)
            total_questions += num_questions
            
            if (i + 1) % 20 == 0:  # Progress indicator every 20 rounds
                print(f"  Created {i + 1}/{len(schedule)} rounds...")
        
        print(f"\n✅ Test data generation complete!")
        print(f"📊 Generated:")
        print(f"   - {len(SPANISH_VERBS)} Spanish verbs")
        print(f"   - {len(schedule)} practice rounds (0-6 per day)")
        print(f"   - {total_questions} total questions")
        print(f"   - Data spans {months_back} months")
        print(f"   - Focus: Indicative mood")
        
    except Exception as e:
        print(f"❌ Error generating test data: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("🇪🇸 Spanish Conjugation Test Data Generator")
    print("=" * 50)
    generate_test_data(months_back=3)
