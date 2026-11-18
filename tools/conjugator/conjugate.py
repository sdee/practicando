"""Conjugation authority: spanishconjugator + our corrections.

Moved out of the old FastAPI backend. Runs at build-data time only (never in the app):
`npm run conjugations` -> public/data/*.json. Add fixes to CORRECTIONS, rerun, commit the JSON.
"""
from spanishconjugator import Conjugator

PRONOUNS = ["yo", "tu", "el", "ella", "usted", "nosotros", "vosotros", "ellos", "ustedes"]
TENSES = ["present", "imperfect", "preterite", "future", "present_perfect",
          "past_anterior", "future_perfect", "conditional_simple"]
MOODS = ["conditional", "imperative", "indicative", "subjunctive"]

# The library wants usted/ustedes for subjunctive.
SUBJUNCTIVE_MAP = {"el": "usted", "ella": "usted", "ellos": "ustedes"}
# Indicative responses are dicts keyed by grouped pronouns.
INDICATIVE_KEY = {"el": "el/ella/usted", "ella": "el/ella/usted", "usted": "el/ella/usted",
                  "ellos": "ellos/ellas/ustedes", "ustedes": "ellos/ellas/ustedes"}

# (verb, tense, mood, pronoun) -> correct form, for known library bugs.
CORRECTIONS = {
    ("poner", "present", "indicative", "yo"): "pongo",
    ("poder", "future", "indicative", "yo"): "podré",
}


def _fix_encoding(s):
    try:  # the library returns UTF-8 mangled through latin1
        return s.encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return s


def extract(response, pronoun, mood, verb, tense):
    key = (verb, tense, mood, pronoun)
    if key in CORRECTIONS:
        return CORRECTIONS[key]
    if response is None:
        return None
    if isinstance(response, dict):
        result = response.get(INDICATIVE_KEY.get(pronoun, pronoun))
    else:
        result = response
    return _fix_encoding(result) if isinstance(result, str) else result


def conjugate(c: Conjugator, verb, tense, mood, pronoun):
    """One form, or None when the library has none / returns junk."""
    lib_pronoun = SUBJUNCTIVE_MAP.get(pronoun, pronoun) if mood == "subjunctive" else pronoun
    try:
        answer = extract(c.conjugate(verb, tense, mood, lib_pronoun), pronoun, mood, verb, tense)
    except Exception:
        return None
    return answer if isinstance(answer, str) and len(answer.strip()) > 1 else None
