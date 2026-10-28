"""
Data migration script: SQLite → PostgreSQL
Exports all data from SQLite database and imports into PostgreSQL with validation.
"""

import logging
from sqlmodel import Session, select, create_engine
from sqlalchemy import text
from datetime import datetime
from models import User, Transaction, Goal, DailySnapshot
from config import settings
import os
import argparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def create_source_engine(source_db_path: str):
    """Create engine for source SQLite database."""
    sqlite_url = f"sqlite:///{os.path.abspath(source_db_path)}"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})


def create_target_engine(target_db_url: str):
    """Create engine for target PostgreSQL database."""
    if not target_db_url.startswith(("postgresql://", "postgresql+psycopg2://")):
        raise ValueError("Target database must be PostgreSQL URL")
    
    return create_engine(
        target_db_url,
        poolclass=None,
        echo=False,
        connect_args={"connect_timeout": 10}
    )


def validate_migration(source_engine, target_engine):
    """Validate data integrity post-migration."""
    with Session(source_engine) as source_session:
        source_user_count = source_session.exec(select(User)).all().__len__()
        source_tx_count = source_session.exec(select(Transaction)).all().__len__()
        source_goal_count = source_session.exec(select(Goal)).all().__len__()
    
    with Session(target_engine) as target_session:
        target_user_count = target_session.exec(select(User)).all().__len__()
        target_tx_count = target_session.exec(select(Transaction)).all().__len__()
        target_goal_count = target_session.exec(select(Goal)).all().__len__()
    
    migration_status = {
        "Users": (source_user_count, target_user_count),
        "Transactions": (source_tx_count, target_tx_count),
        "Goals": (source_goal_count, target_goal_count)
    }
    
    all_valid = True
    for entity, (source_count, target_count) in migration_status.items():
        match = "✅" if source_count == target_count else "❌"
        logger.info(f"{match} {entity}: {source_count} → {target_count}")
        if source_count != target_count:
            all_valid = False
    
    return all_valid


def migrate_data(source_engine, target_engine):
    """Migrate data from source SQLite to target PostgreSQL."""
    logger.info("=" * 60)
    logger.info("VAULTIC DATA MIGRATION: SQLite → PostgreSQL")
    logger.info("=" * 60)
    
    try:
        # Create tables in target database
        logger.info("Creating schema in target database...")
        from sqlmodel import SQLModel
        SQLModel.metadata.create_all(target_engine)
        logger.info("✅ Schema created")
        
        # Read from source
        logger.info("Reading data from source database...")
        with Session(source_engine) as source_session:
            users = source_session.exec(select(User)).all()
            transactions = source_session.exec(select(Transaction)).all()
            goals = source_session.exec(select(Goal)).all()
            snapshots = source_session.exec(select(DailySnapshot)).all()
        
        logger.info(f"Read {len(users)} users, {len(transactions)} transactions, {len(goals)} goals")
        
        # Write to target
        logger.info("Writing data to target database...")
        with Session(target_engine) as target_session:
            for user in users:
                target_session.add(user)
            for tx in transactions:
                target_session.add(tx)
            for goal in goals:
                target_session.add(goal)
            for snapshot in snapshots:
                target_session.add(snapshot)
            
            target_session.commit()
            logger.info("✅ Data written successfully")
        
        # Validate
        logger.info("\nValidating migration integrity...")
        if validate_migration(source_engine, target_engine):
            logger.info("✅ MIGRATION SUCCESSFUL: All data verified")
            return True
        else:
            logger.error("❌ MIGRATION FAILED: Data count mismatch detected")
            return False
        
    except Exception as e:
        logger.error(f"❌ Migration error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Migrate Vaultic data from SQLite to PostgreSQL")
    parser.add_argument("--source", default="./finova_core.db", help="Source SQLite database path")
    parser.add_argument("--target", required=True, help="Target PostgreSQL connection URL")
    parser.add_argument("--validate-only", action="store_true", help="Only validate without migrating")
    
    args = parser.parse_args()
    
    # Validate source exists
    if not os.path.exists(args.source):
        logger.error(f"❌ Source database not found: {args.source}")
        return False
    
    try:
        source_engine = create_source_engine(args.source)
        target_engine = create_target_engine(args.target)
        
        if args.validate_only:
            logger.info("Running validation only...")
            validate_migration(source_engine, target_engine)
        else:
            migrate_data(source_engine, target_engine)
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        return False


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
