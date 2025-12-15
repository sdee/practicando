#!/bin/bash
echo "🔧 Starting DEV server (dev DB) + Frontend"

# Resolve script directory (handles symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE"
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"

# Project paths (script is at project root)
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend-nextjs"
ENV_FILE="$BACKEND_DIR/.env.dev"

# Load dev environment if it exists, otherwise set sensible defaults
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    echo "📋 Loaded .env.dev configuration from: $ENV_FILE"
else
    export DATABASE_MODE=dev
    export ENVIRONMENT=development
    export DEBUG=true
    echo "⚠️  .env.dev not found at: $ENV_FILE, using fallback settings"
fi

echo "📁 Database mode: $DATABASE_MODE"

echo ""
echo "🎮 Starting Full Stack Application:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend App: http://localhost:3000"
echo "   API docs: http://localhost:8000/docs"
echo "   Press Ctrl+C to stop both servers"
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server..."
cd "$BACKEND_DIR" || { echo "❌ Cannot cd to backend dir: $BACKEND_DIR"; exit 1; }
uv run python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 3

# Start frontend
echo "⚛️  Starting frontend server..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR" || { echo "❌ Cannot cd to frontend dir: $FRONTEND_DIR"; exit 1; }
    npm run dev &
    FRONTEND_PID=$!
else
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    echo "Available directories in project root:"
    ls -la "$PROJECT_ROOT"
    exit 1
fi

# Wait for both
wait





