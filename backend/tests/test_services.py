import pytest
from unittest.mock import Mock, patch
from services import QuestionService
from spanishconjugator import Conjugator


@pytest.fixture
def mock_conjugator():
    """Mock conjugator with predictable responses"""
    conjugator = Mock()
    return conjugator


@pytest.fixture
def question_service(mock_conjugator):
    """Create a QuestionService with mocked conjugator"""
    return QuestionService(mock_conjugator)


@pytest.fixture
def real_conjugator():
    """Real conjugator for actual conjugation tests"""
    return Conjugator()


@pytest.fixture
def real_question_service(real_conjugator):
    """Create a QuestionService with real conjugator for verb tests"""
    return QuestionService(real_conjugator)


class TestQuestionService:
    """Test the QuestionService class"""
    
    def test_generate_questions_basic(self, question_service, mock_conjugator):
        """Test basic question generation"""
        # Mock the conjugator to return a simple response
        mock_conjugator.conjugate.return_value = "hablo"
        
        with patch('services.extract_conjugation_from_response', return_value="hablo"):
            questions = question_service.generate_questions(
                pronouns=["yo"],
                tenses=["present"], 
                moods=["indicative"],
                limit=1
            )
        
        assert len(questions) == 1
        assert questions[0]["pronoun"] == "yo"
        assert questions[0]["tense"] == "present"
        assert questions[0]["mood"] == "indicative"
        assert questions[0]["answer"] == "hablo"
        assert questions[0]["verb"] in question_service.default_verbs
    
    def test_generate_questions_custom_verbs(self, question_service, mock_conjugator):
        """Test question generation with custom verbs"""
        custom_verbs = ["ser", "estar"]
        mock_conjugator.conjugate.return_value = "soy"
        
        with patch('services.extract_conjugation_from_response', return_value="soy"):
            questions = question_service.generate_questions(
                pronouns=["yo"],
                tenses=["present"],
                moods=["indicative"], 
                limit=1,
                verbs=custom_verbs
            )
        
        assert questions[0]["verb"] in custom_verbs
    
    def test_generate_questions_multiple_options(self, question_service, mock_conjugator):
        """Test that random selection works with multiple options"""
        pronouns = ["yo", "tu", "el"]
        tenses = ["present", "preterite"]
        moods = ["indicative", "subjunctive"]
        
        mock_conjugator.conjugate.return_value = "test_answer"
        
        with patch('services.extract_conjugation_from_response', return_value="test_answer"):
            questions = question_service.generate_questions(
                pronouns=pronouns,
                tenses=tenses,
                moods=moods,
                limit=10
            )
        
        assert len(questions) == 10
        
        # Verify all questions have valid values from the provided lists
        for question in questions:
            assert question["pronoun"] in pronouns
            assert question["tense"] in tenses  
            assert question["mood"] in moods
            assert question["verb"] in question_service.default_verbs
            assert question["answer"] == "test_answer"
    
    def test_generate_questions_empty_lists(self, question_service):
        """Test behavior with empty parameter lists"""
        with pytest.raises(IndexError):
            question_service.generate_questions(
                pronouns=[],
                tenses=["present"],
                moods=["indicative"],
                limit=1
            )
    
    def test_generate_questions_zero_limit(self, question_service):
        """Test with zero limit"""
        questions = question_service.generate_questions(
            pronouns=["yo"],
            tenses=["present"],
            moods=["indicative"],
            limit=0
        )
        
        assert questions == []
    
    def test_regular_verb_conjugations(self, real_question_service):
        """Test conjugations for regular -ar, -er, and -ir verbs"""
        test_cases = [
            # Regular -ar verbs
            {"verb": "hablar", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "hablo"},
            {"verb": "caminar", "pronoun": "tu", "tense": "present", "mood": "indicative", "expected": "caminas"},
            
            # Regular -er verbs  
            {"verb": "comer", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "como"},
            {"verb": "beber", "pronoun": "ella", "tense": "present", "mood": "indicative", "expected": "bebe"},
            
            # Regular -ir verbs
            {"verb": "vivir", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "vivo"},
            {"verb": "escribir", "pronoun": "nosotros", "tense": "present", "mood": "indicative", "expected": "escribimos"},
        ]
        
        for case in test_cases:
            # Use the actual conjugator and extraction logic
            result = real_question_service._get_conjugation(
                case["verb"], 
                case["tense"], 
                case["mood"], 
                case["pronoun"]
            )
            
            assert result == case["expected"], f"Failed for {case['verb']} with {case['pronoun']}: expected {case['expected']}, got {result}"
    
    def test_irregular_verb_conjugations(self, real_question_service):
        """Test conjugations for common irregular verbs"""
        irregular_cases = [
            {"verb": "ser", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "soy"},
            {"verb": "ser", "pronoun": "tu", "tense": "present", "mood": "indicative", "expected": "eres"},
            
            {"verb": "estar", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "estoy"},
            {"verb": "estar", "pronoun": "ella", "tense": "present", "mood": "indicative", "expected": "está"},
            
            {"verb": "ir", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "voy"},
            {"verb": "ir", "pronoun": "ellos", "tense": "present", "mood": "indicative", "expected": "van"},
        ]
        
        for case in irregular_cases:
            # Use the actual conjugator and extraction logic
            result = real_question_service._get_conjugation(
                case["verb"], 
                case["tense"], 
                case["mood"], 
                case["pronoun"]
            )
            
            assert result == case["expected"], f"Failed for irregular verb {case['verb']} with {case['pronoun']}: expected {case['expected']}, got {result}"
    
    def test_irregular_verb_conjugations(self, real_question_service):
        """Test conjugations for common irregular verbs"""
        irregular_cases = [
            {"verb": "ser", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "soy"},
            {"verb": "ser", "pronoun": "tu", "tense": "present", "mood": "indicative", "expected": "eres"},
            
            {"verb": "estar", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "estoy"},
            {"verb": "estar", "pronoun": "ella", "tense": "present", "mood": "indicative", "expected": "está"},
            
            {"verb": "ir", "pronoun": "yo", "tense": "present", "mood": "indicative", "expected": "voy"},
            {"verb": "ir", "pronoun": "ellos", "tense": "present", "mood": "indicative", "expected": "van"},
        ]
        
        for case in irregular_cases:
            # Use the actual conjugator and extraction logic
            result = real_question_service._get_conjugation(
                case["verb"], 
                case["tense"], 
                case["mood"], 
                case["pronoun"]
            )
            
            assert result == case["expected"], f"Failed for irregular verb {case['verb']} with {case['pronoun']}: expected {case['expected']}, got {result}"
