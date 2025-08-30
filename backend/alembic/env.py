from logging.config import fileConfig
import logging
import sys
import os
import traceback
import time

from sqlalchemy import engine_from_config, pool, text
from alembic import context

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alembic.env")

# Add your project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import db
from models import Base

# Alembic Config object
config = context.config

# Override connection string with our db module
try:
    db_url = db._db_url()
    masked_url = db_url.split('@')[0].split(':')[0] + ":****@" + db_url.split('@')[1]
    logger.info(f"Using database URL: {masked_url}")
    config.set_main_option("sqlalchemy.url", db_url)
except Exception as e:
    logger.error(f"Error setting up database URL: {e}")
    traceback.print_exc()
    raise

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata to your models metadata
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def check_db_state(connection, label=""):
    """Check database state"""
    try:
        logger.info(f"--- Database state {label} ---")
        
        # Check tables
        result = connection.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public'
        """))
        tables = [row[0] for row in result]
        logger.info(f"Tables: {tables}")
        
        # Check alembic_version
        if 'alembic_version' in tables:
            result = connection.execute(text("SELECT * FROM alembic_version"))
            versions = [row[0] for row in result]
            logger.info(f"Alembic version: {versions}")
        
        # Test permissions
        try:
            logger.info("Testing database permissions...")
            connection.execute(text("CREATE TABLE IF NOT EXISTS _alembic_test_permissions (id INT)"))
            connection.execute(text("DROP TABLE IF EXISTS _alembic_test_permissions"))
            logger.info("Permission test passed: Can create and drop tables")
        except Exception as e:
            logger.error(f"Permission test failed: {e}")
            
    except Exception as e:
        logger.warning(f"Error checking database state: {e}")

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    retries = 3
    
    for attempt in range(retries):
        try:
            # Use our engine directly to ensure proper connection
            engine = db.get_engine()
            
            # Create a new connection with AUTOCOMMIT enabled
            # This is the key change to ensure transactions are committed properly
            with engine.execution_options(isolation_level="AUTOCOMMIT").connect() as connection:
                # Check DB state before migrations
                check_db_state(connection, "BEFORE migrations")
                
                # Configure context with connection
                context.configure(
                    connection=connection,
                    target_metadata=target_metadata,
                    # Use transaction_per_migration for isolated changes
                    transaction_per_migration=True
                )

                try:
                    # Run migrations with additional error tracking
                    start_time = time.time()
                    logger.info("Starting migration execution")
                    
                    with context.begin_transaction():
                        context.run_migrations()
                    
                    # Explicit commit after migrations
                    connection.execute(text("COMMIT"))
                    
                    duration = time.time() - start_time
                    logger.info(f"Migrations completed successfully in {duration:.2f} seconds")
                except Exception as e:
                    logger.error(f"Error during migrations: {e}")
                    traceback.print_exc()
                    # Try to commit what succeeded so far
                    try:
                        connection.execute(text("COMMIT"))
                        logger.info("Committed successful migrations")
                    except:
                        pass
                    raise
                
                # Check DB state after migrations
                check_db_state(connection, "AFTER migrations")
                
                # Verify if migrations worked by checking for specific tables
                result = connection.execute(text("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema='public' AND table_name IN ('questions')
                """))
                
                table_count = result.scalar()
                if table_count < 1:
                    logger.warning(f"Expected tables not found after migrations! Found {table_count}/1 tables.")
                    logger.warning("Check your migration files to ensure they contain the proper CREATE TABLE statements.")
                else:
                    logger.info(f"Successfully verified {table_count} expected tables exist")
                    
                # Success, break out of retry loop
                return
                
        except Exception as e:
            logger.error(f"Migration attempt {attempt+1}/{retries} failed: {e}")
            traceback.print_exc()
            
            if attempt < retries - 1:
                wait_time = (attempt + 1) * 2  # Exponential backoff
                logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logger.error("All migration attempts failed!")
                raise

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
