"""
Service layer for business logic.
Contains reusable functions that can be used across different routers/endpoints.
"""

from typing import List, Dict, Any
from spanishconjugator import Conjugator
import random

from utils import normalize_pronoun, extract_conjugation_from_response


class QuestionService:
    """Service for generating questions"""
    
    def __init__(self, conjugator: Conjugator):
        self.conjugator = conjugator
        self.default_verbs = ['hablar', 'caminar', 'estudiar', 'trabajar']  # Use regular verbs for now
        # Irregular verbs that have issues with subjunctive mood in the conjugator library
        self.problematic_verbs = ['ir', 'ser', 'estar', 'tener', 'hacer', 'venir']
    
    def generate_questions(
        self,
        pronouns: List[str],
        tenses: List[str], 
        moods: List[str],
        limit: int,
        verbs: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate random conjugation questions based on the provided filters.
        
        Args:
            pronouns: List of pronouns to choose from
            tenses: List of tenses to choose from  
            moods: List of moods to choose from
            limit: Number of questions to generate
            verbs: Optional list of verbs, defaults to standard verbs
            
        Returns:
            List of question dictionaries with pronoun, tense, mood, verb, and answer
        """
        if verbs is None:
            verbs = self.default_verbs
            
        questions = []
        max_attempts = limit * 3  # Try up to 3x the limit to account for failures
        attempts = 0
        
        while len(questions) < limit and attempts < max_attempts:
            attempts += 1
            
            # Random selections
            pronoun_choice = random.choice(pronouns)
            tense_choice = random.choice(tenses)
            mood_choice = random.choice(moods)
            verb_choice = random.choice(verbs)
            
            # Generate conjugation
            answer = self._get_conjugation(
                verb_choice, 
                tense_choice, 
                mood_choice, 
                pronoun_choice
            )
            
            # Only add question if conjugation was successful
            if answer and len(answer.strip()) > 0:
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
            answer = extract_conjugation_from_response(conjugation_response, pronoun, mood)
            
            # Validate the answer - if it's too short, it's probably a conjugator bug
            if answer and len(answer) < 3:
                print(f"Warning: Suspiciously short conjugation for {verb}/{tense}/{mood}/{pronoun}: '{answer}'")
                return None
                
            return answer
            
        except Exception as e:
            print(f"Error conjugating {verb}/{tense}/{mood}/{pronoun}: {e}")
            return None


# Convenience functions for dependency injection
def create_question_service(conjugator: Conjugator) -> QuestionService:
    """Factory function to create a QuestionService instance"""
    return QuestionService(conjugator)