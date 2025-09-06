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
def mock_db():
    """Mock database session with proper verb query mocking"""
    db = Mock()
    
    # Create mock verb objects  
    mock_verb1 = Mock()
    mock_verb1.infinitive = "hablar"
    mock_verb1.tubelex_rank = 1
    
    mock_verb2 = Mock() 
    mock_verb2.infinitive = "ser"
    mock_verb2.tubelex_rank = 2
    
    mock_verb3 = Mock()
    mock_verb3.infinitive = "tener"
    mock_verb3.tubelex_rank = 3
    
    # Mock the query chain for getting verbs by class
    mock_verbs = [mock_verb1, mock_verb2, mock_verb3]
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_verbs
    
    return db


@pytest.fixture
def question_service(mock_conjugator, mock_db):
    """Create a QuestionService with mocked conjugator and db"""
    return QuestionService(mock_conjugator, mock_db)


@pytest.fixture
def real_conjugator():
    """Real conjugator for actual conjugation tests"""
    return Conjugator()


@pytest.fixture
def real_question_service(real_conjugator, mock_db):
    """Create a QuestionService with real conjugator for verb tests"""
    return QuestionService(real_conjugator, mock_db)


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
        # Verb should be one of our mocked verbs from the database
        assert questions[0]["verb"] in ["hablar", "ser", "tener"]
    
    def test_generate_questions_custom_verbs(self, question_service, mock_conjugator):
        """Test question generation with different verb class"""
        mock_conjugator.conjugate.return_value = "soy"
        
        with patch('services.extract_conjugation_from_response', return_value="soy"):
            questions = question_service.generate_questions(
                pronouns=["yo"],
                tenses=["present"],
                moods=["indicative"], 
                limit=1,
                verb_class="top10"
            )
        
        assert len(questions) == 1
        assert questions[0]["answer"] == "soy" 
        # Verb should be one of our mocked verbs from the database
        assert questions[0]["verb"] in ["hablar", "ser", "tener"]
    
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
            # Verify verb is one of our mocked database verbs
            assert question["verb"] in ["hablar", "ser", "tener"]
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

    def test_generate_questions_unique_combinations(self, question_service, mock_conjugator):
        """Test that questions have unique combinations of pronoun, verb, tense, and mood"""
        mock_conjugator.conjugate.return_value = "test_answer"
        
        with patch('services.extract_conjugation_from_response', return_value="test_answer"):
            # Generate multiple questions with limited options to force potential duplicates
            questions = question_service.generate_questions(
                pronouns=["yo", "tu"],
                tenses=["present"],
                moods=["indicative"],
                limit=10  # More than the number of unique combinations available
            )
        
        # Check for uniqueness by creating a set of combinations
        combinations = set()
        for question in questions:
            combination = (question["pronoun"], question["verb"], question["tense"], question["mood"])
            assert combination not in combinations, f"Duplicate combination found: {combination}"
            combinations.add(combination)
        
        # Since we have only 2 pronouns × 3 verbs × 1 tense × 1 mood = 6 possible combinations,
        # we should get at most 6 questions
        assert len(questions) <= 6, f"Expected at most 6 unique questions, got {len(questions)}"
    
    def test_generate_questions_insufficient_combinations(self, question_service, mock_conjugator):
        """Test behavior when requesting more questions than unique combinations available"""
        mock_conjugator.conjugate.return_value = "test_answer"
        
        with patch('services.extract_conjugation_from_response', return_value="test_answer"):
            # With only 1 pronoun, 1 verb (limited by mock), 1 tense, 1 mood,
            # we can only get 3 unique combinations max (due to 3 mocked verbs)
            questions = question_service.generate_questions(
                pronouns=["yo"],
                tenses=["present"],
                moods=["indicative"],
                limit=10  # Request more than available
            )
        
        # Should get at most 3 questions (one for each of the 3 mocked verbs)
        assert len(questions) <= 3, f"Expected at most 3 unique questions, got {len(questions)}"
        
        # Verify all questions are unique
        combinations = {(q["pronoun"], q["verb"], q["tense"], q["mood"]) for q in questions}
        assert len(combinations) == len(questions), "All questions should have unique combinations"
