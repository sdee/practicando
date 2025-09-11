#!/usr/bin/env python3
"""
Realistic Spanish Conjugation Test Data Generator (script-friendly)
"""
import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Tuple

# Ensure backend package is importable
backend_path = Path(__file__).parent.parent  # scripts -> backend
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import sessionmaker
from models import Base, Verb, Round, Guess, TenseEnum, MoodEnum, PronounEnum
from db import get_engine, get_sessionmaker


SPANISH_VERBS: Dict[str, Dict[str, object]] = {
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

INDICATIVE_TENSES: Dict[TenseEnum, Dict[str, float]] = {
    TenseEnum.present: {'weight': 40, 'accuracy_base': 85},
    TenseEnum.preterite: {'weight': 25, 'accuracy_base': 70},
    TenseEnum.imperfect: {'weight': 20, 'accuracy_base': 80},
    TenseEnum.future: {'weight': 10, 'accuracy_base': 75},
    TenseEnum.present_perfect: {'weight': 3, 'accuracy_base': 65},
    TenseEnum.conditional_simple: {'weight': 1, 'accuracy_base': 60},
    TenseEnum.future_perfect: {'weight': 0.5, 'accuracy_base': 55},
    TenseEnum.past_anterior: {'weight': 0.5, 'accuracy_base': 50}
}

PRONOUN_WEIGHTS: Dict[PronounEnum, float] = {
    PronounEnum.yo: 30,
    PronounEnum.tu: 25,
    PronounEnum.el: 15,
    PronounEnum.ella: 12,
    PronounEnum.nosotros: 8,
    PronounEnum.ellos: 5,
    PronounEnum.usted: 3,
    PronounEnum.ustedes: 2,
    PronounEnum.vosotros: 0.1
}


def weighted_choice(choices_weights: Dict) -> any:
    choices = list(choices_weights.keys())
    weights = list(choices_weights.values())
    return random.choices(choices, weights=weights)[0]


def create_verbs(session) -> Dict[str, int]:
    print("Creating Spanish verbs...")
    verb_ids: Dict[str, int] = {}
    for infinitive, data in SPANISH_VERBS.items():
        verb = Verb(infinitive=infinitive, definition=data['definition'])
        session.add(verb)
        session.flush()
        verb_ids[infinitive] = verb.id
    session.commit()
    print(f"Created {len(verb_ids)} verbs")
    return verb_ids


def generate_practice_schedule(start_date: datetime, end_date: datetime) -> List[Tuple[datetime, int]]:
    schedule: List[Tuple[datetime, int]] = []
    current_date = start_date
    while current_date <= end_date:
        round_weights = {0: 20, 1: 35, 2: 25, 3: 12, 4: 5, 5: 2, 6: 1}
        num_rounds = weighted_choice(round_weights)
        if num_rounds == 0:
            current_date += timedelta(days=1)
            continue
        if current_date.weekday() >= 5 and num_rounds > 3:
            num_rounds = max(1, num_rounds - 2)
        for round_num in range(num_rounds):
            if num_rounds == 1:
                practice_hour = random.choices([8, 9, 17, 18, 19, 20, 21], weights=[5, 5, 15, 25, 25, 20, 5])[0]
            elif num_rounds == 2:
                practice_hour = 9 if round_num == 0 else random.choice([18, 19, 20])
            else:
                hours = [8, 11, 14, 17, 19, 21]
                practice_hour = hours[min(round_num, len(hours) - 1)]
            questions_weights = {5: 5, 6: 5, 7: 8, 8: 10, 9: 12, 10: 15, 11: 12, 12: 12, 13: 10, 14: 8, 15: 8, 16: 5, 17: 3, 18: 2, 19: 2, 20: 2, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1}
            num_questions = weighted_choice(questions_weights)
            practice_time = current_date.replace(hour=practice_hour, minute=random.randint(0, 59), second=random.randint(0, 59))
            practice_time += timedelta(minutes=round_num * random.randint(10, 30))
            schedule.append((practice_time, num_questions))
        current_date += timedelta(days=1)
    return schedule


def generate_conjugation(verb: str, pronoun: PronounEnum, tense: TenseEnum) -> Tuple[str, bool]:
    from services import QuestionService
    from spanishconjugator import Conjugator
    SessionLocal = get_sessionmaker()
    db = SessionLocal()
    try:
        conjugator = Conjugator()
        service = QuestionService(conjugator, db)
        correct_answer = service._get_conjugation(verb, tense.value, "indicative", pronoun.value)
        if not correct_answer or len(correct_answer.strip()) < 2:
            print(f"⚠️  Skipping {verb}/{pronoun.value}/{tense.value} - conjugation failed")
            db.close()
            return None, False
    except Exception as e:
        print(f"❌ Error generating conjugation for {verb}/{pronoun.value}/{tense.value}: {e}")
        db.close()
        return None, False
    finally:
        db.close()
    accuracy_base = INDICATIVE_TENSES[tense]['accuracy_base']
    verb_difficulty_modifier = random.uniform(-10, 10)
    final_accuracy = max(30, min(95, accuracy_base + verb_difficulty_modifier))
    is_correct = random.random() * 100 < final_accuracy
    return correct_answer, is_correct


def create_practice_session(session, verb_ids: Dict[str, int], practice_time: datetime, num_questions: int) -> None:
    round_obj = Round(
        user_id=1,
        started_at=practice_time,
        ended_at=practice_time + timedelta(minutes=random.randint(5, 30)),
        num_questions=num_questions,
        filters={"mood": ["indicative"]}
    )
    session.add(round_obj)
    session.flush()
    correct_answers = 0
    for i in range(num_questions):
        verb_name = weighted_choice({k: v['weight'] for k, v in SPANISH_VERBS.items()})
        verb_id = verb_ids[verb_name]
        tense = weighted_choice({k: v['weight'] for k, v in INDICATIVE_TENSES.items()})
        pronoun = weighted_choice(PRONOUN_WEIGHTS)
        conjugation_result = generate_conjugation(verb_name, pronoun, tense)
        if conjugation_result[0] is None:
            continue
        correct_answer, is_correct = conjugation_result
        if is_correct:
            user_answer = correct_answer
            correct_answers += 1
        else:
            if len(correct_answer) > 3:
                wrong_endings = ['o', 'as', 'a', 'amos', 'an', 'es', 'e']
                user_answer = correct_answer[:-2] + random.choice(wrong_endings)
            else:
                user_answer = correct_answer + "x"
        question_time = practice_time + timedelta(seconds=i * random.randint(10, 60))
        guess = Guess(
            user_id=1,
            round_id=round_obj.id,
            verb_id=verb_id,
            pronoun=pronoun,
            tense=tense,
            mood=MoodEnum.indicative,
            user_answer=user_answer if random.random() > 0.05 else None,
            correct_answer=correct_answer,
            is_correct=is_correct,
            created_at=question_time
        )
        session.add(guess)
    round_obj.num_correct_answers = correct_answers
    session.commit()


def generate_test_data(months_back: int = 3):
    engine = get_engine()
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        print("Clearing existing data...")
        session.query(Guess).delete()
        session.query(Round).delete()
        session.query(Verb).delete()
        session.commit()
        verb_ids = create_verbs(session)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months_back * 30)
        print(f"Generating practice schedule from {start_date.date()} to {end_date.date()}...")
        schedule = generate_practice_schedule(start_date, end_date)
        print(f"Creating {len(schedule)} practice rounds...")
        total_questions = 0
        for i, (practice_time, num_questions) in enumerate(schedule):
            create_practice_session(session, verb_ids, practice_time, num_questions)
            total_questions += num_questions
            if (i + 1) % 20 == 0:
                print(f"  Created {i + 1}/{len(schedule)} rounds...")

        # Ensure there's an active round (no ended_at) with unanswered questions
        active_num_questions = 10
        now = datetime.now()
        active_round = Round(
            user_id=1,
            started_at=now,
            ended_at=None,
            num_questions=active_num_questions,
            filters={"mood": ["indicative"]}
        )
        session.add(active_round)
        session.flush()

        for i in range(active_num_questions):
            verb_name = weighted_choice({k: v['weight'] for k, v in SPANISH_VERBS.items()})
            verb_id = verb_ids[verb_name]
            tense = weighted_choice({k: v['weight'] for k, v in INDICATIVE_TENSES.items()})
            pronoun = weighted_choice(PRONOUN_WEIGHTS)
            # Generate correct answer so we have the target, but leave user_answer/is_correct null
            conjugation_result = generate_conjugation(verb_name, pronoun, tense)
            if conjugation_result[0] is None:
                continue
            correct_answer, _ = conjugation_result
            guess = Guess(
                user_id=1,
                round_id=active_round.id,
                verb_id=verb_id,
                pronoun=pronoun,
                tense=tense,
                mood=MoodEnum.indicative,
                user_answer=None,
                correct_answer=correct_answer,
                is_correct=None,
                created_at=now
            )
            session.add(guess)
        session.commit()
        print("Created 1 active round with unanswered questions")
        print(f"\n✅ Test data generation complete!")
        print(f"📊 Generated:")
        print(f"   - {len(SPANISH_VERBS)} Spanish verbs")
        print(f"   - {len(schedule)} practice rounds (0-6 per day)")
        print(f"   - {total_questions} total questions (completed rounds)")
        print(f"   - Data spans {months_back} months")
        print(f"   - Focus: Indicative mood")
    except Exception as e:
        print(f"❌ Error generating test data: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def main():
    environment = os.getenv('ENVIRONMENT', os.getenv('ENV', 'development')).lower()
    if environment in ['production', 'prod']:
        print("🚨 ERROR: Cannot run test data generation in production environment!")
        print("   Set ENVIRONMENT='development' or ENV='development' to override")
        return 1
    if os.getenv('RDS_HOSTNAME') or os.getenv('AWS_REGION'):
        print("🚨 ERROR: AWS environment detected - test data generation is disabled!")
        print("   This appears to be a production deployment.")
        return 1
    print("🇪🇸 Spanish Conjugation Test Data Generator")
    print(f"📍 Environment: {environment}")
    print("=" * 50)
    months_back = int(os.getenv('TEST_DATA_MONTHS_BACK', '3'))
    generate_test_data(months_back=months_back)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


