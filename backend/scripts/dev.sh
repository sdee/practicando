#!/bin/bash
echo "🔧 Starting DEVELOPMENT server + Frontend"
export DATABASE_MODE=dev
export ENVIRONMENT=development
export DEBUG=true
echo "📁 Database: dev_app.db"

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

# Start backend in background (run from backend directory)
echo "🔧 Starting backend server..."
(cd backend && uv run python -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background (run from frontend directory)
echo "⚛️  Starting frontend server..."
(cd frontend-nextjs && npm run dev) &
FRONTEND_PID=$!

# Wait for both processes
wait
