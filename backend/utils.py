"""Utility functions for validation and TubeLex data parsing"""

import csv
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from spanishconjugator import Conjugator  # Add this import (adjust module name if needed)

def validate_enum_value(enum_class, value):
    """
    Validates if the given value exists in the provided enum class.
    
    :param enum_class: The Enum class to validate against.
    :param value: The value to validate.
    :return: True if valid, raises ValueError otherwise.
    """
    if value not in enum_class._value2member_map_:
        raise ValueError(f"Invalid value '{value}' for {enum_class.__name__}. Allowed values are: {list(enum_class._value2member_map_.keys())}")
    return True

# Pronoun mapping for conjugator compatibility
PRONOUN_CONJUGATOR_MAP = {
    "yo": "yo",
    "tu": "tu",  # No accent - conjugator expects "tu"
    "el": "el",  # No accent - but may need special handling
    "ella": "ella",
    "usted": "usted",
    "nosotros": "nosotros",
    "vosotros": "vosotros", 
    "ellos": "ellos",
    "ustedes": "ustedes"
}

# Special mapping for subjunctive mood where el/ella -> usted, ellos -> ustedes
SUBJUNCTIVE_PRONOUN_MAP = {
    "yo": "yo",
    "tu": "tu",
    "el": "usted",  # el maps to usted for subjunctive
    "ella": "usted",  # ella maps to usted for subjunctive
    "usted": "usted",
    "nosotros": "nosotros",
    "vosotros": "vosotros",
    "ellos": "ustedes",  # ellos maps to ustedes for subjunctive
    "ustedes": "ustedes"
}

# Mapping for extracting from indicative dict response
INDICATIVE_PRONOUN_KEY_MAP = {
    "yo": "yo",
    "tu": "tu", 
    "el": "el/ella/usted",
    "ella": "el/ella/usted",
    "usted": "el/ella/usted",
    "nosotros": "nosotros",
    "vosotros": "vosotros",
    "ellos": "ellos/ellas/ustedes",
    "ustedes": "ellos/ellas/ustedes"
}

# Manual corrections for known bugs in the spanishconjugator library
# To add more corrections, add entries in the format:
# (verb, tense, mood, pronoun): 'correct_conjugation'
CONJUGATION_CORRECTIONS = {
    # Key: (verb, tense, mood, pronoun) -> corrected_form
    ('poner', 'present', 'indicative', 'yo'): 'pongo',
    ('poder', 'future', 'indicative', 'yo'): 'podré'
    # Add more corrections here as they are discovered:
    # ('verb', 'tense', 'mood', 'pronoun'): 'correct_form',
}

def normalize_pronoun(pronoun, mood="indicative"):
    """
    Convert pronoun to the form expected by the conjugator.
    Special handling for subjunctive mood where el/ella -> usted
    """
    if mood == "subjunctive":
        return SUBJUNCTIVE_PRONOUN_MAP.get(pronoun, pronoun)
    else:
        return PRONOUN_CONJUGATOR_MAP.get(pronoun, pronoun)

def extract_conjugation_from_response(response, pronoun, mood, verb=None, tense=None):
    """
    Extract the correct conjugation from the conjugator response.
    Handles both dict responses (indicative) and string responses (subjunctive)
    Also applies manual corrections for known conjugator bugs.
    """
    if response is None:
        return None
    
    # Check for manual corrections first (if verb and tense provided)
    if verb and tense:
        correction_key = (verb, tense, mood, pronoun)
        if correction_key in CONJUGATION_CORRECTIONS:
            return CONJUGATION_CORRECTIONS[correction_key]
        
    # If it's a dictionary (indicative mood), extract the right conjugation
    if isinstance(response, dict):
        key = INDICATIVE_PRONOUN_KEY_MAP.get(pronoun, pronoun)
        result = response.get(key)
    else:
        # If it's a string, return as-is (subjunctive mood)
        result = response
    
    # Fix encoding issues (conjugator returns mangled UTF-8)
    if isinstance(result, str):
        try:
            # The conjugator appears to return UTF-8 encoded as latin1
            # Try to fix by encoding as latin1 then decoding as utf-8
            fixed_result = result.encode('latin1').decode('utf-8')
            return fixed_result
        except (UnicodeDecodeError, UnicodeEncodeError):
            # If encoding fix fails, return original
            return result
    
    return result


def parse_tubelex_verbs_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses the TubeLlex verbs TSV file and returns infinitive, rank, and count. 
    Data sourced from the Tubelex corpus of multi-lingual YouTube subtitles (https://github.com/naist-nlp/tubelex).
    
    Args:
        file_path: Path to the TSV file containing verb frequency data
        
    Returns:
        List of dictionaries containing infinitive, tubelex_count, and tubelex_rank
    """
    verbs_data = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            # Skip the header line
            next(file)
            
            rank = 1  # Start ranking from 1
            
            for line in file:
                line = line.strip()
                if not line:
                    continue
                    
                # Split by tab
                parts = line.split('\t')
                if len(parts) >= 2:
                    lemm = parts[0].strip()
                    try:
                        count = int(parts[1].strip())
                    except ValueError:
                        # Skip lines where count is not a valid integer
                        continue
                    
                    verb_data = {
                        'infinitive': lemm,
                        'tubelex_count': count,
                        'tubelex_rank': rank
                    }
                    verbs_data.append(verb_data)
                    rank += 1
                    
    except FileNotFoundError:
        raise FileNotFoundError(f"TubeLex verbs file not found at: {file_path}")
    except Exception as e:
        raise Exception(f"Error parsing TubeLex verbs file: {str(e)}")
    
    return verbs_data


def populate_verbs_from_tubelex(session, file_path: str) -> Dict[str, int]:
    """
    Populate the verbs table with TubeLex data.
    
    Args:
        session: SQLAlchemy session
        file_path: Path to the TSV file
        
    Returns:
        Dictionary with statistics: {'added': count, 'updated': count, 'skipped': count}
    """
    from models import Verb  # Import here to avoid circular imports
    
    verbs_data = parse_tubelex_verbs_file(file_path)
    
    stats = {'added': 0, 'updated': 0, 'skipped': 0}
    
    for verb_data in verbs_data:
        infinitive = verb_data['infinitive']
        tubelex_count = verb_data['tubelex_count']
        tubelex_rank = verb_data['tubelex_rank']
        
        # Check if verb already exists
        existing_verb = session.query(Verb).filter(Verb.infinitive == infinitive).first()
        
        if existing_verb:
            # Update existing verb with TubeLex data
            existing_verb.tubelex_count = tubelex_count
            existing_verb.tubelex_rank = tubelex_rank
            stats['updated'] += 1
        else:
            # Create new verb with TubeLex data
            new_verb = Verb(
                infinitive=infinitive,
                tubelex_count=tubelex_count,
                tubelex_rank=tubelex_rank
            )
            session.add(new_verb)
            stats['added'] += 1
    
    try:
        session.commit()
        print(f"Successfully processed {len(verbs_data)} verbs from TubeLex data")
        print(f"Added: {stats['added']}, Updated: {stats['updated']}, Skipped: {stats['skipped']}")
    except Exception as e:
        session.rollback()
        raise Exception(f"Error saving TubeLex data to database: {str(e)}")
    
    return stats


def is_verb_regular_for_tense(verb: str, tense: str, pronoun: str, mood: str, answer: str, conjugator: Conjugator):
    base_verbs = {'ar': 'hablar', 'er': 'comer', 'ir': 'vivir'}
    conjugator: Conjugator

    ending = verb[-2:]
    base = base_verbs[ending]

    normalized_pronoun = normalize_pronoun(pronoun, mood)
    conjugation_response = conjugator.conjugate(base, tense, mood, normalized_pronoun)
    conjugated_base = extract_conjugation_from_response(conjugation_response, normalized_pronoun, mood, base, tense)

    if base in conjugated_base: # cases where entire infinitive is used
        base_stem = base
        stem = verb
    else:
        base_stem = base[:-2]
        stem = verb[:-2]
    
    regular_ending = conjugated_base.removeprefix(base_stem)
    regular_conjugation = stem+regular_ending
    
    conjugation_response = conjugator.conjugate(verb, tense, mood, normalized_pronoun)
    conjugated_verb = extract_conjugation_from_response(conjugation_response, normalized_pronoun, mood, verb, tense)
    print("REGULAR", regular_conjugation)
    print("CONJUGATED VERB", conjugated_verb)
    print(conjugated_verb == regular_conjugation) 
    return conjugated_verb == regular_conjugation