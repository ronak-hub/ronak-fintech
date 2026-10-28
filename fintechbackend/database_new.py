"""
Enhanced database module supporting SQLite and PostgreSQL with connection pooling.
Integrates with Pydantic BaseSettings for secure configuration management.
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import NullPool, StaticPool, QueuePool
from sqlalchemy import event
from config import settings, is_production
import os
import logging

logger = logging.getLogger(__name__)

# --- DATABASE ENGINE CONFIGURATION ---
def get_engine():
    """
    Creates and returns appropriate database engine based on configuration.
    For PostgreSQL: Uses QueuePool with connection pooling.
    For SQLite: Uses StaticPool for development.
    """
    database_url = settings.DATABASE_URL
    
    if database_url.startswith("postgresql://") or database_url.startswith("postgresql+psycopg2://"):
        # PostgreSQL configuration with connection pooling
        logger.info("Initializing PostgreSQL connection pool...")
        engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            echo=not is_production(),  # Log SQL in development
            connect_args={"connect_timeout": 10}
        )
        
        # Health check: test connection on startup
        with engine.connect() as conn:
            logger.info("✅ PostgreSQL connection successful")
            
    else:
        # SQLite configuration for development
        logger.info("Initializing SQLite database...")
        
        # Ensure data directory exists
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = database_url.replace("sqlite:///", "")
        
        if not os.path.isabs(db_path):
            db_path = os.path.join(base_dir, db_path)
        
        engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=not is_production()
        )
        
        # Enable foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        logger.info("✅ SQLite database initialized")
    
    return engine


# Initialize engine
engine = get_engine()


def create_db_and_tables():
    """
    Initializes the database and creates all tables.
    Imports models to register them with SQLModel before table creation.
    """
    try:
        import models  # noqa: F401 - registers models
        SQLModel.metadata.create_all(engine)
        logger.info("✅ Database tables created/verified successfully")

        if engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA table_info('user')")
                columns = [row[1] for row in res.fetchall()]
                if 'role' not in columns:
                    logger.info("Applying missing role column migration...")
                    conn.exec_driver_sql("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user'")
                if 'email' not in columns:
                    logger.info("Applying missing email column migration...")
                    conn.exec_driver_sql("ALTER TABLE user ADD COLUMN email TEXT")
                    conn.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON user (email)")
                if 'primary_goal' not in columns:
                    logger.info("Applying missing primary_goal column migration...")
                    conn.exec_driver_sql("ALTER TABLE user ADD COLUMN primary_goal TEXT DEFAULT 'Financial Freedom'")
                if 'goal_amount' not in columns:
                    logger.info("Applying missing goal_amount column migration...")
                    conn.exec_driver_sql("ALTER TABLE user ADD COLUMN goal_amount REAL DEFAULT 50000000")
                conn.commit()
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise


def get_session():
    """
    Dependency function providing a database session for FastAPI routes.
    Yields session and ensures proper cleanup after request.
    """
    with Session(engine) as session:
        yield session


async def lifespan_startup():
    """Called on application startup."""
    logger.info("Starting database connection pool...")
    create_db_and_tables()


async def lifespan_shutdown():
    """Called on application shutdown."""
    logger.info("Closing database connection pool...")
    engine.dispose()


# --- MIGRATION UTILITIES ---
def get_migration_connection():
    """Returns a raw database connection for migration scripts."""
    return engine.raw_connection()


if __name__ == "__main__":
    # CLI: Initialize database if running directly
    create_db_and_tables()
    print("✅ Database initialization complete")
