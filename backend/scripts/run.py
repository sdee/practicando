#!/usr/bin/env python3
"""
Spanish Conjugation App Launcher
Supports multiple database modes and configurations
"""
import os
import sys
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description='Run Spanish Conjugation App')
    parser.add_argument(
        'mode', 
        nargs='?',
        choices=['test', 'learn', 'dev'],
        default='learn',
        help='Database mode to use (default: learn)'
    )
    parser.add_argument(
        '--port', 
        type=int, 
        default=8000,
        help='Port to run server on (default: 8000)'
    )
    parser.add_argument(
        '--db-url',
        help='Direct database URL (overrides mode)'
    )
    parser.add_argument(
        '--reset',
        action='store_true',
        help='Reset database before starting'
    )
    parser.add_argument(
        '--no-reload',
        action='store_true',
        help='Disable auto-reload'
    )
    parser.add_argument(
        '--generate-test-data',
        action='store_true',
        help='Generate test data after reset (only for test mode)'
    )
    
    args = parser.parse_args()
    
    # Set environment variables based on mode
    mode_configs = {
        'test': {
            'DATABASE_MODE': 'test', 
            'ENVIRONMENT': 'test',
            'DEBUG': 'true'
        },
        'learn': {
            'DATABASE_MODE': 'learn',
            'ENVIRONMENT': 'development', 
            'DEBUG': 'true'
        },
        'dev': {
            'DATABASE_MODE': 'dev',
            'ENVIRONMENT': 'development',
            'DEBUG': 'true'
        }
    }
    
    config = mode_configs[args.mode]
    
    # Set environment variables
    for key, value in config.items():
        os.environ[key] = value
    
    # Override with direct database URL if provided
    if args.db_url:
        os.environ['DATABASE_URL'] = args.db_url
        print(f"🗄️  Using direct database URL: {args.db_url}")
    else:
        print(f"🗄️  Database mode: {args.mode}")
    
    # Reset database if requested
    if args.reset:
        print("🔄 Resetting database...")
        db_files = {
            'test': 'test_app.db',
            'learn': 'app.db',
            'dev': 'dev_app.db'
        }
        
        db_file = db_files[args.mode]
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"🗑️  Removed {db_file}")
        
        # Initialize database
        subprocess.run([
            sys.executable, '-c',
            'from db import get_engine; from models import Base; Base.metadata.create_all(bind=get_engine())'
        ])
        
        # Generate test data if requested and in test mode
        if args.generate_test_data and args.mode == 'test':
            print("🧪 Generating test data...")
            subprocess.run([sys.executable, 'generate_test_data.py'])
    
    print(f"🚀 Starting {args.mode.upper()} server on port {args.port}")
    
    # Build uvicorn command
    cmd = [
        'uv', 'run', 'python', '-m', 'uvicorn',
        'main:app',
        '--port', str(args.port)
    ]
    
    if not args.no_reload:
        cmd.append('--reload')
    
    # Start server
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
