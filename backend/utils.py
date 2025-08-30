"""Utility functions for validation"""

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

def normalize_pronoun(pronoun, mood="indicative"):
    """
    Convert pronoun to the form expected by the conjugator.
    Special handling for subjunctive mood where el/ella -> usted
    """
    if mood == "subjunctive":
        return SUBJUNCTIVE_PRONOUN_MAP.get(pronoun, pronoun)
    else:
        return PRONOUN_CONJUGATOR_MAP.get(pronoun, pronoun)

def extract_conjugation_from_response(response, pronoun, mood):
    """
    Extract the correct conjugation from the conjugator response.
    Handles both dict responses (indicative) and string responses (subjunctive)
    """
    if response is None:
        return None
        
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
