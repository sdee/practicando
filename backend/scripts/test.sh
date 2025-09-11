#!/bin/bash
echo "🧪 Starting TEST server (with fake data)"

# Load test environment if it exists
if [ -f ".env.test" ]; then
    export $(grep -v '^#' .env.test | xargs)
    echo "📋 Loaded .env.test configuration"
else
    # Fallback to basic settings
    export DATABASE_MODE=test
    export ENVIRONMENT=test
    export DEBUG=true
fi

echo "📁 Database mode: $DATABASE_MODE"
uv run python -m uvicorn main:app --reload --port 8000
