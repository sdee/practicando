"""
Basic API endpoint tests using FastAPI TestClient.
These are integration tests that test the full request/response cycle.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from main import app
from services import QuestionService
from dependencies import get_question_service
from db import get_db


@pytest.fixture
def mock_question_service():
    """Mock question service with predictable responses"""
    service = Mock(spec=QuestionService)
    service.generate_questions.return_value = [
        {
            "pronoun": "yo",
            "tense": "present",
            "mood": "indicative", 
            "verb": "hablar",
            "answer": "hablo"
        }
    ]
    return service


@pytest.fixture
def client(mock_question_service):
    """Create a test client for the FastAPI app with mocked dependencies"""
    # Mock the dependencies
    def mock_get_db():
        return Mock()
    
    def mock_get_question_service():
        return mock_question_service
    
    # Override dependencies
    app.dependency_overrides[get_db] = mock_get_db
    app.dependency_overrides[get_question_service] = mock_get_question_service
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up dependency overrides
    app.dependency_overrides = {}


class TestQuestionsAPI:
    """Test the /questions endpoint"""
    
    def test_get_questions_default_params(self, client, mock_question_service):
        """Test GET /questions with default parameters"""
        response = client.get("/api/questions/")
        
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) == 1
        assert data["questions"][0]["pronoun"] == "yo"
        assert data["questions"][0]["answer"] == "hablo"
        
        # Verify service was called with defaults (now includes verb_class)
        mock_question_service.generate_questions.assert_called_once_with(
            pronouns=["yo", "tu"], 
            tenses=["present"], 
            moods=["indicative"], 
            limit=1,
            verb_class="top20"
        )
    
    def test_get_questions_custom_params(self, client, mock_question_service):
        """Test GET /questions with custom parameters"""
        response = client.get("/api/questions/?pronoun=el&tense=preterite&mood=subjunctive&limit=3")
        
        assert response.status_code == 200
        mock_question_service.generate_questions.assert_called_once_with(
            pronouns=["el"], 
            tenses=["preterite"], 
            moods=["subjunctive"], 
            limit=3,
            verb_class="top20"
        )
    
    def test_get_questions_invalid_pronoun(self, client):
        """Test validation error for invalid pronoun"""
        response = client.get("/api/questions/?pronoun=invalid_pronoun")
        
        assert response.status_code == 422
        data = response.json()
        assert "Validation failed" in data["detail"]["message"]
        assert "Invalid value 'invalid_pronoun'" in str(data["detail"]["errors"])
    
    def test_get_questions_invalid_tense(self, client):
        """Test validation error for invalid tense"""
        response = client.get("/api/questions/?tense=invalid_tense")
        
        assert response.status_code == 422
        data = response.json()
        assert "Invalid value 'invalid_tense'" in str(data["detail"]["errors"])
    
    def test_get_questions_invalid_limit(self, client):
        """Test validation error for invalid limit"""
        response = client.get("/api/questions/?limit=0")
        
        assert response.status_code == 422
        
        response = client.get("/api/questions/?limit=101")
        
        assert response.status_code == 422
    
    def test_get_questions_multiple_values(self, client, mock_question_service):
        """Test with multiple values for each parameter"""
        response = client.get("/api/questions/?pronoun=yo&pronoun=tu&tense=present&tense=preterite")
        
        assert response.status_code == 200
        mock_question_service.generate_questions.assert_called_once_with(
            pronouns=["yo", "tu"], 
            tenses=["present", "preterite"], 
            moods=["indicative"], 
            limit=1,
            verb_class="top20"
        )
