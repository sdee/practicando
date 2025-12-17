#!/bin/bash
echo "🧪 Starting TEST server (with fake data) + Frontend"

# Get script directory and calculate paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend-nextjs"

# Load test environment if it exists
cd "$BACKEND_DIR"
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

echo ""
echo "🎮 Starting Full Stack Application:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend App: http://localhost:3000"
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
(cd "$BACKEND_DIR" && uv run python -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "⚛️  Starting frontend server..."
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

# Wait for both processes
wait
