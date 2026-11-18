from spanishconjugator import Conjugator
from conjugate import CORRECTIONS, conjugate

c = Conjugator()


def test_corrections_applied():
    for (verb, tense, mood, pronoun), expected in CORRECTIONS.items():
        assert conjugate(c, verb, tense, mood, pronoun) == expected


def test_uncorrected_forms():
    assert conjugate(c, "tener", "present", "indicative", "yo") == "tengo"
    assert conjugate(c, "hacer", "present", "indicative", "yo") == "hago"
