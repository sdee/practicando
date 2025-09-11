"""
Service layer for business logic.
Contains reusable functions that can be used across different routers/endpoints.
"""

from typing import List, Dict, Any, Optional
from spanishconjugator import Conjugator
from sqlalchemy.orm import Session
from sqlalchemy import func
import random
import re

from utils import normalize_pronoun, extract_conjugation_from_response
from models import Round, Guess, Verb


class QuestionService:
    """Service for generating questions"""
    
    def __init__(self, conjugator: Conjugator, db: Session):
        self.conjugator = conjugator
        self.db = db
    
    def get_verbs_by_class(self, verb_class: str) -> List[str]:
        """
        Get list of verb infinitives based on verb class string.
        
        Args:
            verb_class: String like "top10", "top20", etc. Eventually "tricky", etc.
            
        Returns:
            List of verb infinitives
            
        Raises:
            ValueError: If verb_class format is not supported
        """
        # Check for "top" followed by number pattern
        top_match = re.match(r'^top(\d+)$', verb_class.lower())
        
        if top_match:
            limit = int(top_match.group(1))
            
            # Get top N verbs by TubeLex rank
            verbs = (self.db.query(Verb)
                    .filter(Verb.tubelex_rank.isnot(None))
                    .order_by(Verb.tubelex_rank.asc())
                    .limit(limit)
                    .all())
            
            if not verbs:
                raise ValueError(f"No verbs found with TubeLex ranking data")
            
            return [verb.infinitive for verb in verbs]
        
        # Add other verb classes here in the future
        # elif verb_class == "tricky":
        #     return self._get_tricky_verbs()
        
        else:
            raise ValueError(
                f"Unsupported verb class: '{verb_class}'. "
                f"Supported formats: 'top<number>' (e.g., 'top10', 'top50')"
            )
    
    def generate_questions(
        self,
        pronouns: List[str],
        tenses: List[str], 
        moods: List[str],
        limit: int,
        verb_class: str = "top20"
    ) -> List[Dict[str, Any]]:
        """
        Generate random conjugation questions based on the provided filters.
        Ensures unique combinations of pronoun, verb, tense, and mood in each round.
        
        Args:
            pronouns: List of pronouns to choose from
            tenses: List of tenses to choose from  
            moods: List of moods to choose from
            limit: Number of questions to generate
            verb_class: Verb class string (e.g., "top10", "top50")
            
        Returns:
            List of question dictionaries with pronoun, tense, mood, verb, and answer
            
        Raises:
            ValueError: If verb_class is invalid or no verbs found
        """
        # Get verbs based on class
        verbs = self.get_verbs_by_class(verb_class)
        
        if not verbs:
            raise ValueError(f"No verbs available for class '{verb_class}'")
            
        questions = []
        seen_combinations = set()  # Track unique combinations
        max_attempts = limit * 5  # Increase attempts to account for duplicate avoidance
        attempts = 0
        
        while len(questions) < limit and attempts < max_attempts:
            attempts += 1
            
            # Random selections
            pronoun_choice = random.choice(pronouns)
            tense_choice = random.choice(tenses)
            mood_choice = random.choice(moods)
            verb_choice = random.choice(verbs)
            
            # Create combination key for uniqueness check
            combination = (pronoun_choice, verb_choice, tense_choice, mood_choice)
            
            # Skip if we've seen this combination before
            if combination in seen_combinations:
                continue
                
            # Generate conjugation
            answer = self._get_conjugation(
                verb_choice, 
                tense_choice, 
                mood_choice, 
                pronoun_choice
            )
            
            # Only add question if conjugation was successful
            if answer and len(answer.strip()) > 0:
                seen_combinations.add(combination)
                questions.append({
                    'pronoun': pronoun_choice,
                    'tense': tense_choice,
                    'mood': mood_choice, 
                    'verb': verb_choice,
                    'answer': answer
                })
        
        return questions
    
    def _get_conjugation(self, verb: str, tense: str, mood: str, pronoun: str) -> str:
        """
        Internal method to get conjugation for a verb with proper encoding handling.
        
        Args:
            verb: The infinitive verb
            tense: The tense 
            mood: The mood
            pronoun: The pronoun
            
        Returns:
            The conjugated verb form (or None if conjugation fails)
        """
        try:
            # Normalize pronoun for conjugator (special handling for subjunctive mood)
            normalized_pronoun = normalize_pronoun(pronoun, mood)
            
            # Get conjugation response
            conjugation_response = self.conjugator.conjugate(verb, tense, mood, normalized_pronoun)
            
            # Extract the correct conjugation based on mood and pronoun
            answer = extract_conjugation_from_response(
                conjugation_response, pronoun, mood, verb, tense
            )
            
            # Validate the answer - if it's too short, it's probably a conjugator bug
            if answer and len(answer) < 3:
                print(f"Warning: Suspiciously short conjugation for {verb}/{tense}/{mood}/{pronoun}: '{answer}'")
                return None
                
            return answer
            
        except Exception as e:
            print(f"Error conjugating {verb}/{tense}/{mood}/{pronoun}: {e}")
            return None


class RoundService:
    """Service for managing rounds and their guesses"""
    
    def __init__(self, question_service: QuestionService, db: Session):
        self.question_service = question_service
        self.db = db
    
    def create_round(
        self,
        filters: Dict[str, List[str]],
        num_questions: int = 12,
        user_id: Optional[int] = None,
        verb_class: str = "top20"
    ) -> Dict[str, Any]:
        """
        Create a new round with pre-generated guesses.
        
        Args:
            filters: Dictionary containing pronouns, tenses, and moods lists
            num_questions: Number of questions to generate (default 12)
            user_id: Optional user ID for multi-user support
            verb_class: Verb class string (e.g., "top10", "top50")
            
        Returns:
            Dictionary containing round data and all guesses
        """
        # Create the round record
        round_record = Round(
            user_id=user_id,
            started_at=func.now(),
            filters=filters,
            num_questions=num_questions,
            num_correct_answers=0,
            ended_at=None
        )
        self.db.add(round_record)
        self.db.flush()  # Get the round ID
        
        # Generate questions using existing QuestionService
        questions = self.question_service.generate_questions(
            pronouns=filters['pronouns'],
            tenses=filters['tenses'],
            moods=filters['moods'],
            limit=num_questions,
            verb_class=verb_class
        )
        
        # Check if we got enough questions
        if len(questions) < num_questions:
            self.db.rollback()
            raise ValueError(
                f"Could not generate enough questions. "
                f"Requested {num_questions}, got {len(questions)}. "
                f"Try different filters, verb class, or reduce the number of questions."
            )
        
        guesses = []
        for question in questions:
            # Get or create verb record
            verb = self._get_or_create_verb(question['verb'])
            
            # Create guess with retries for conjugation failures
            guess = self._create_guess_with_retries(
                round_id=round_record.id,
                user_id=user_id,
                verb_id=verb.id,
                question=question,
                max_retries=3
            )
            
            if guess:
                guesses.append(guess)
            else:
                # If we couldn't create the guess after retries, rollback and fail
                self.db.rollback()
                raise RuntimeError(
                    f"Failed to create guess for {question['verb']} after 3 retries. "
                    f"Conjugation service may be unavailable."
                )
        
        # Commit all changes
        self.db.commit()
        
        # Return round data with guesses
        return {
            "round": {
                "id": round_record.id,
                "started_at": round_record.started_at,
                "filters": round_record.filters,
                "num_questions": round_record.num_questions,
                "num_correct_answers": round_record.num_correct_answers,
                "status": "active"
            },
            "guesses": [
                {
                    "id": guess.id,
                    "verb": question['verb'],
                    "pronoun": guess.pronoun,
                    "tense": guess.tense, 
                    "mood": guess.mood,
                    "correct_answer": guess.correct_answer,
                    "user_answer": guess.user_answer,
                    "is_correct": guess.is_correct,
                    "skipped": guess.skipped
                }
                for guess, question in zip(guesses, questions)
            ]
        }
    
    def complete_round(self, round_id: int) -> Dict[str, Any]:
        """
        Complete a round by setting ended_at and calculating num_correct_answers.
        
        Args:
            round_id: The ID of the round to complete
            
        Returns:
            Dictionary containing updated round data
        """
        # Get the round, ensuring it exists
        round_record = self.db.query(Round).filter(Round.id == round_id).first()
        if not round_record:
            raise ValueError(f"Round with ID {round_id} not found")
        
        if round_record.ended_at is not None:
            raise ValueError(f"Round {round_id} is already completed")
        
        # Calculate number of correct answers from guesses
        num_correct = self.db.query(Guess).filter(
            Guess.round_id == round_id,
            Guess.is_correct == True
        ).count()
        
        # Update round
        round_record.ended_at = func.now()
        round_record.num_correct_answers = num_correct
        
        self.db.commit()
        
        return {
            "round": {
                "id": round_record.id,
                "started_at": round_record.started_at,
                "ended_at": round_record.ended_at,
                "filters": round_record.filters,
                "num_questions": round_record.num_questions,
                "num_correct_answers": round_record.num_correct_answers,
                "status": "completed"
            }
        }
    
    def update_guess(self, guess_id: int, user_answer: str, is_correct: bool) -> Dict[str, Any]:
        """
        Update a guess with user's answer and correctness
        
        Args:
            guess_id: The ID of the guess to update
            user_answer: The user's submitted answer
            is_correct: Whether the answer was correct
            
        Returns:
            Dictionary containing updated guess data
        """
        guess = self.db.query(Guess).filter(Guess.id == guess_id).first()
        if not guess:
            raise ValueError(f"Guess with id {guess_id} not found")
        
        # Update the guess
        guess.user_answer = user_answer
        guess.is_correct = is_correct
        guess.skipped = False
        self.db.commit()
        self.db.refresh(guess)
        
        # Return updated guess as dict
        return {
            'id': guess.id,
            'verb': guess.verb.infinitive if guess.verb else "unknown",
            'pronoun': guess.pronoun,
            'tense': guess.tense,
            'mood': guess.mood,
            'correct_answer': guess.correct_answer,
            'user_answer': guess.user_answer,
            'is_correct': guess.is_correct,
            'skipped': guess.skipped
        }
    
    def transition_to_new_round(
        self,
        current_round_id: int,
        new_filters: Dict[str, Any],
        num_questions: int = 12,
        user_id: Optional[int] = None,
        verb_class: str = "top20"
    ) -> Dict[str, Any]:
        """
        Complete the current round and create a new round with different filters.
        This is used when filters are changed mid-round.
        
        Args:
            current_round_id: ID of the current active round
            new_filters: New filter configuration for the new round
            num_questions: Number of questions for the new round
            user_id: Optional user ID
            verb_class: Verb class string (e.g., "top10", "top50")
            
        Returns:
            Dictionary containing both completed round and new round data
        """
        # Complete the current round
        completed_round = self.complete_round(current_round_id)
        
        # Create a new round with the new filters
        new_round = self.create_round(
            filters=new_filters,
            num_questions=num_questions,
            user_id=user_id,
            verb_class=verb_class
        )
        
        return {
            "completed_round": completed_round["round"],
            "new_round": new_round["round"],
            "guesses": new_round["guesses"],
            "transition_reason": "filter_change"
        }
    
    def get_active_round(self, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Get the currently active (incomplete) round for a user.
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            Round data if found, None otherwise
        """
        query = self.db.query(Round).filter(Round.ended_at.is_(None))
        
        if user_id is not None:
            query = query.filter(Round.user_id == user_id)
        
        # Get the most recent active round
        round_record = query.order_by(Round.started_at.desc()).first()
        
        if not round_record:
            return None
        
        # Get associated guesses
        guesses = self.db.query(Guess).filter(Guess.round_id == round_record.id).all()
        
        return {
            "round": {
                "id": round_record.id,
                "started_at": round_record.started_at,
                "filters": round_record.filters,
                "num_questions": round_record.num_questions,
                "num_correct_answers": round_record.num_correct_answers,
                "status": "active"
            },
            "guesses": [
                {
                    "id": guess.id,
                    "verb": guess.verb.infinitive if guess.verb else "unknown",
                    "pronoun": guess.pronoun,
                    "tense": guess.tense, 
                    "mood": guess.mood,
                    "correct_answer": guess.correct_answer,
                    "user_answer": guess.user_answer,
                    "is_correct": guess.is_correct
                }
                for guess in guesses
            ]
        }
    
    def get_round(self, round_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a specific round with its guesses
        
        Args:
            round_id: The ID of the round to get
            
        Returns:
            Round data if found, None otherwise
        """
        round_record = self.db.query(Round).filter(Round.id == round_id).first()
        
        if not round_record:
            return None
        
        # Get associated guesses
        guesses = self.db.query(Guess).filter(Guess.round_id == round_record.id).all()
        
        return {
            "round": {
                "id": round_record.id,
                "started_at": round_record.started_at,
                "ended_at": round_record.ended_at,
                "filters": round_record.filters,
                "num_questions": round_record.num_questions,
                "num_correct_answers": round_record.num_correct_answers,
                "status": "completed" if round_record.ended_at else "active"
            },
            "guesses": [
                {
                    "id": guess.id,
                    "verb": guess.verb.infinitive if guess.verb else "unknown",
                    "pronoun": guess.pronoun,
                    "tense": guess.tense, 
                    "mood": guess.mood,
                    "correct_answer": guess.correct_answer,
                    "user_answer": guess.user_answer,
                    "is_correct": guess.is_correct
                }
                for guess in guesses
            ]
        }
    
    def _get_or_create_verb(self, verb_infinitive: str) -> Verb:
        """Get existing verb or create new one without definition"""
        verb = self.db.query(Verb).filter(Verb.infinitive == verb_infinitive).first()
        if not verb:
            verb = Verb(infinitive=verb_infinitive, definition=None)
            self.db.add(verb)
            self.db.flush()  # Get the verb ID
        return verb
    
    def _create_guess_with_retries(
        self,
        round_id: int,
        user_id: Optional[int],
        verb_id: int,
        question: Dict[str, Any],
        max_retries: int = 3
    ) -> Optional[Guess]:
        """
        Create a guess with retry logic for conjugation failures.
        
        This handles cases where the conjugation service might fail temporarily
        or return invalid results. We retry up to max_retries times before giving up.
        """
        for attempt in range(max_retries):
            try:
                # Use the pre-calculated correct answer from the question (fixed bug)
                correct_answer = question.get('answer')
                
                # If no pre-calculated answer, regenerate it
                if not correct_answer:
                    correct_answer = self.question_service._get_conjugation(
                        question['verb'],
                        question['tense'], 
                        question['mood'],
                        question['pronoun']
                    )
                
                if correct_answer and len(correct_answer.strip()) > 0:
                    guess = Guess(
                        round_id=round_id,
                        user_id=user_id,
                        verb_id=verb_id,
                        pronoun=question['pronoun'],
                        tense=question['tense'],
                        mood=question['mood'],
                        correct_answer=correct_answer,
                        user_answer=None,
                        is_correct=None,
                        created_at=func.now()
                    )
                    self.db.add(guess)
                    self.db.flush()  # Get the guess ID
                    return guess
                else:
                    print(f"Attempt {attempt + 1}: Empty conjugation for {question}")
                    
            except Exception as e:
                print(f"Attempt {attempt + 1}: Error creating guess for {question}: {e}")
                
            # If we reach here, the attempt failed - continue to next retry
            if attempt < max_retries - 1:
                print(f"Retrying conjugation for {question['verb']}...")
        
        # All retries exhausted
        print(f"Failed to create guess for {question} after {max_retries} attempts")
        return None


# Convenience functions for dependency injection
def create_question_service(conjugator: Conjugator, db: Session) -> QuestionService:
    """Factory function to create a QuestionService instance"""
    return QuestionService(conjugator, db)

def create_round_service(question_service: QuestionService, db: Session) -> RoundService:
    """Factory function to create a RoundService instance"""
    return RoundService(question_service, db)
