#!/bin/bash

MODE=${1:-learn}
echo "🔄 Resetting $MODE database..."

case $MODE in
  "test")
    rm -f test_app.db
    echo "🗑️  Removed test_app.db"
    export DATABASE_MODE=test
    uv run python -c "from db import get_engine; from models import Base; Base.metadata.create_all(bind=get_engine())"
    uv run python generate_test_data.py
    echo "✅ Test database reset with fake data"
    ;;
  "learn")
    rm -f app.db
    echo "🗑️  Removed app.db"
    export DATABASE_MODE=learn
    uv run python -c "from db import get_engine; from models import Base; Base.metadata.create_all(bind=get_engine())"
    echo "✅ Learning database reset (clean)"
    ;;
  "dev")
    rm -f dev_app.db
    echo "🗑️  Removed dev_app.db"
    export DATABASE_MODE=dev
    uv run python -c "from db import get_engine; from models import Base; Base.metadata.create_all(bind=get_engine())"
    echo "✅ Development database reset (clean)"
    ;;
  *)
    echo "Usage: ./scripts/reset-db.sh [learn|test|dev]"
    echo ""
    echo "Available modes:"
    echo "  learn - Learning/development database (app.db) - default"
    echo "  test  - Test database with fake data (test_app.db)"
    echo "  dev   - Development database (dev_app.db)"
    exit 1
    ;;
esac
