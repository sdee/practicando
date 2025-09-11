#!/bin/bash
echo "📚 Starting LEARNING server (clean data) + Frontend"

# Get the directory where this script is located (resolve symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"

BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env.learn"

# Load learn environment if it exists
if [ -f "$ENV_FILE" ]; then
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # turn off automatic export
    echo "📋 Loaded .env.learn configuration from: $ENV_FILE"
else
    # Fallback to basic settings
    export DATABASE_MODE=learn
    export ENVIRONMENT=development
    export DEBUG=true
    echo "⚠️  .env.learn not found at: $ENV_FILE, using fallback settings"
fi

echo "📁 Database mode: $DATABASE_MODE"

# Validate database
echo "🔍 Validating database..."
cd "$BACKEND_DIR"
DATABASE_MODE=$DATABASE_MODE uv run python scripts/validate_db.py

echo ""
echo "🎮 Starting Full Stack Application:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend App: http://localhost:3000"
echo "   API docs: http://localhost:8000/docs"
echo "   Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "🔧 Starting backend server..."
cd "$BACKEND_DIR"
uv run python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "⚛️  Starting frontend server..."

# Use already calculated paths
FRONTEND_DIR="$PROJECT_ROOT/frontend-nextjs"

echo "📁 Frontend dir: $FRONTEND_DIR"

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    echo "✅ Changed to frontend directory: $(pwd)"
    npm run dev &
    FRONTEND_PID=$!
else
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    echo "Available directories in project root:"
    ls -la "$PROJECT_ROOT"
    exit 1
fi

# Wait for both processes
wait
