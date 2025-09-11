#!/bin/bash

echo "🔧 Setting up environment files for Spanish Conjugation App"

# Copy example environment file if .env doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "📝 Please edit .env with your database credentials"
    else
        echo "❌ .env.example not found"
    fi
else
    echo "📋 .env already exists"
fi

# Create mode-specific environment files if they don't exist
for mode in test learn; do
    if [ ! -f ".env.$mode" ]; then
        if [ -f ".env.$mode.example" ]; then
            cp ".env.$mode.example" ".env.$mode"
            echo "✅ Created .env.$mode from .env.$mode.example"
        else
            cat > ".env.$mode" << EOF
# $mode environment configuration
DATABASE_MODE=$mode
ENVIRONMENT=$([ "$mode" = "learn" ] && echo "development" || echo "test")
DEBUG=true

# Database URL for $mode mode
# Edit this with your actual database credentials
$(echo "${mode^^}_DATABASE_URL")=postgresql+asyncpg://postgres:password@localhost:5432/practicando_$mode
EOF
            echo "✅ Created .env.$mode"
        fi
    else
        echo "📋 .env.$mode already exists"
    fi
done

echo ""
echo "🎯 Next steps:"
echo "1. Edit .env files with your actual database credentials"
echo "2. Create PostgreSQL databases (if using PostgreSQL):"
echo "   CREATE DATABASE practicando_test;"
echo "   CREATE DATABASE practicando_learn;"
echo "3. Run: ./scripts/learn.sh (or test.sh)"
