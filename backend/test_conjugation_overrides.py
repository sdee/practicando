#!/usr/bin/env python3
"""Test script to verify conjugation override system for fixing conjugator library bugs."""

import sys
sys.path.append('.')

from utils import extract_conjugation_from_response, CONJUGATION_CORRECTIONS
from spanishconjugator import Conjugator

def test_conjugation_overrides():
    """Test that conjugation overrides correctly fix known conjugator library bugs."""
    c = Conjugator()
    
    # Test each override in the CONJUGATION_CORRECTIONS dictionary
    for (verb, tense, mood, pronoun), expected_correction in CONJUGATION_CORRECTIONS.items():
        # Get the raw (incorrect) result from the conjugator
        raw_result = c.conjugate(verb, tense, mood, pronoun)
        print(f"Raw conjugator result for {verb} + {pronoun}: {raw_result}")
        
        # Apply our correction system
        corrected_result = extract_conjugation_from_response(
            raw_result, pronoun, mood, verb, tense
        )
        print(f"After override: {corrected_result}")
        
        # Verify the correction was applied
        assert corrected_result == expected_correction, \
            f"Override failed for {verb}+{pronoun}: expected '{expected_correction}', got '{corrected_result}'"
        
        print(f"✅ Override working for {verb} + {pronoun} = {corrected_result}")
    
    print(f"✅ All {len(CONJUGATION_CORRECTIONS)} conjugation overrides are working correctly!")

def test_non_override_verbs_unaffected():
    """Test that verbs without overrides are not affected by the correction system."""
    c = Conjugator()
    
    test_cases = [
        ('tener', 'present', 'indicative', 'yo', 'tengo'),
        ('hacer', 'present', 'indicative', 'yo', 'hago'),
        ('venir', 'present', 'indicative', 'yo', 'vengo'),
        ('salir', 'present', 'indicative', 'yo', 'salgo'),
    ]
    
    for verb, tense, mood, pronoun, expected in test_cases:
        # Verify this verb is not in our overrides (so we're testing the normal path)
        correction_key = (verb, tense, mood, pronoun)
        assert correction_key not in CONJUGATION_CORRECTIONS, \
            f"Test case {verb}+{pronoun} is in overrides - choose a different test case"
        
        raw_result = c.conjugate(verb, tense, mood, pronoun)
        corrected_result = extract_conjugation_from_response(
            raw_result, pronoun, mood, verb, tense
        )
        print(f"{verb} + {pronoun} = {corrected_result} (expected: {expected})")
        assert corrected_result == expected, f"Expected {expected}, got {corrected_result}"
    
    print("✅ Non-override verbs are unaffected by the correction system.")

if __name__ == "__main__":
    print("Testing conjugation override system...")
    print(f"Found {len(CONJUGATION_CORRECTIONS)} conjugation overrides configured.")
    test_conjugation_overrides()
    test_non_override_verbs_unaffected()
    print("🎉 All conjugation override tests passed!")
