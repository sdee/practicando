"""Tests for utility functions"""

import pytest
from utils import (
    validate_enum_value,
    normalize_pronoun,
    extract_conjugation_from_response,
    parse_tubelex_verbs_file,
    is_verb_regular_for_tense,
    PRONOUN_CONJUGATOR_MAP,
    SUBJUNCTIVE_PRONOUN_MAP,
    CONJUGATION_CORRECTIONS
)
from spanishconjugator import Conjugator
from enum import Enum
import tempfile
import os

# Test enum class for validation tests
class TestEnum(Enum):
    VALUE1 = "value1"
    VALUE2 = "value2"

def test_validate_enum_value():
    """Test enum value validation"""
    # Test valid values
    assert validate_enum_value(TestEnum, "value1") is True
    assert validate_enum_value(TestEnum, "value2") is True
    
    # Test invalid values
    with pytest.raises(ValueError):
        validate_enum_value(TestEnum, "invalid_value")
    with pytest.raises(ValueError):
        validate_enum_value(TestEnum, "VALUE1")  # Case sensitive

def test_normalize_pronoun():
    """Test pronoun normalization for different moods"""
    # Test indicative mood (default)
    assert normalize_pronoun("yo") == "yo"
    assert normalize_pronoun("tu") == "tu"
    assert normalize_pronoun("el") == "el"
    
    # Test subjunctive mood special cases
    assert normalize_pronoun("el", "subjunctive") == "usted"
    assert normalize_pronoun("ella", "subjunctive") == "usted"
    assert normalize_pronoun("ellos", "subjunctive") == "ustedes"
    
    # Test that other pronouns remain unchanged in subjunctive
    assert normalize_pronoun("yo", "subjunctive") == "yo"
    assert normalize_pronoun("nosotros", "subjunctive") == "nosotros"

def test_extract_conjugation_from_response():
    """Test conjugation extraction from different response types"""
    # Test dictionary response (indicative mood)
    dict_response = {"el/ella/usted": "habla"}
    assert extract_conjugation_from_response(dict_response, "el", "indicative") == "habla"
    assert extract_conjugation_from_response(dict_response, "ella", "indicative") == "habla"
    
    string_response = "hable"
    assert extract_conjugation_from_response(string_response, "el", "subjunctive") == "hable"
    
    verb, tense, mood, pronoun = 'poner', 'present', 'indicative', 'yo'
    assert extract_conjugation_from_response("pono", pronoun, mood, verb, tense) == "pongo"
    
    assert extract_conjugation_from_response(None, "el", "indicative") is None

def test_parse_tubelex_verbs_file():
    """Test parsing of TubeLex verbs file"""
    # Create a temporary test file
    test_content = """infinitive\tcount\tother_field
hablar\t1000\tsome_value
comer\t500\tother_value
vivir\t250\tmore_value"""
    
    with tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Test parsing
        result = parse_tubelex_verbs_file(temp_file_path)
        
        # Check number of verbs parsed
        assert len(result) == 3
        
        # Check structure and content of parsed data
        assert result[0] == {
            'infinitive': 'hablar',
            'tubelex_count': 1000,
            'tubelex_rank': 1
        }
        
        # Check ranking is sequential
        assert result[1]['tubelex_rank'] == 2
        assert result[2]['tubelex_rank'] == 3
        
    finally:
        # Clean up temporary file
        os.unlink(temp_file_path)
    
    # Test file not found
    with pytest.raises(FileNotFoundError):
        parse_tubelex_verbs_file("nonexistent_file.tsv")

def test_is_verb_regular_for_tense():
    """Test regular verb detection"""
    conjugator = Conjugator()
    
    # Present tense tests
    assert is_verb_regular_for_tense(
        'hablar', 'present', 'yo', 'indicative', 'hablo', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'comer', 'present', 'yo', 'indicative', 'como', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'vivir', 'present', 'yo', 'indicative', 'vivo', conjugator
    ) is True

    # 'hablar', 'comer', and 'vivir' are used as baselines within the function so we need to test other regular conjugations not using those verbs
    assert is_verb_regular_for_tense(
        'necesitar', 'present', 'yo', 'indicative', 'necesito', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'correr', 'present', 'yo', 'indicative', 'corro', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'subir', 'present', 'yo', 'indicative', 'subo', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'ser', 'present', 'yo', 'indicative', 'soy', conjugator
    ) is False
    
    assert is_verb_regular_for_tense(
        'tener', 'present', 'yo', 'indicative', 'tengo', conjugator
    ) is False
    
    # Test stem-changing verbs in present
    assert is_verb_regular_for_tense(
        'poder', 'present', 'yo', 'indicative', 'puedo', conjugator
    ) is False

    # Future tense tests - regular verbs
    assert is_verb_regular_for_tense(
        'hablar', 'future', 'yo', 'indicative', 'hablaré', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'comer', 'future', 'yo', 'indicative', 'comeré', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'vivir', 'future', 'yo', 'indicative', 'viviré', conjugator
    ) is True

    # Future tense tests - irregular verbs
    assert is_verb_regular_for_tense(
        'tener', 'future', 'yo', 'indicative', 'tendré', conjugator
    ) is False
    
    assert is_verb_regular_for_tense(
        'poder', 'future', 'yo', 'indicative', 'podré', conjugator
    ) is False
    
    assert is_verb_regular_for_tense(
        'hacer', 'future', 'yo', 'indicative', 'haré', conjugator
    ) is False

    assert is_verb_regular_for_tense(
        'hablar', 'future', 'nosotros', 'indicative', 'hablaremos', conjugator
    ) is True
    
    assert is_verb_regular_for_tense(
        'tener', 'future', 'ellos', 'indicative', 'tendrán', conjugator
    ) is False