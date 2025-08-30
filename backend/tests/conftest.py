"""
Shared pytest configuration and fixtures.
"""

import pytest
import sys
import os

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
