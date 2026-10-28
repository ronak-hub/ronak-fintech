import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from dotenv import load_dotenv

# --- ASSUMPTIONS ---
# This script assumes the following project structure and files exist:
#
# 1. fintechbackend/app/database.py:
#    - Defines 'engine' for PostgreSQL connection.
#
# 2. fintechbackend/app/models.py:
#    - Defines SQLModel classes: User, Goal, Transaction, DailySnapshot.
#    - These models must match the schema of the source SQLite database.
#
# 3. A .env file with DATABASE_URL for PostgreSQL.
#
# 4. A SQLite database file at './finova_core.db'.

# Add project root to path to allow imports from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.database import engine as pg_engine
    from app.models import User, Goal, Transaction, DailySnapshot
except ImportError as e:
    print("❌ ERROR: Could not import necessary modules from 'app'.", file=sys.stderr)
    print("Ensure 'app/database.py' and 'app/models.py' exist and are correct.", file=sys.stderr)
    print(f"Details: {e}", file=sys.stderr)
    sys.exit(1)

load_dotenv()

SQLITE_DB_PATH = "finova_core.db"
SQLITE_DB_URL = f"sqlite:///{SQLITE_DB_PATH}"

def migrate_data():
    """
    Migrates data from a SQLite database to a PostgreSQL database.
    """
    print("--- Starting Data Migration ---")

    # Check for SQLite DB
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ ERROR: SQLite database not found at '{SQLITE_DB_PATH}'", file=sys.stderr)
        sys.exit(1)

    # Create engines
    sqlite_engine = create_engine(SQLITE_DB_URL)

    # Create all tables in PostgreSQL (idempotent)
    print("Creating tables in PostgreSQL...")
    SQLModel.metadata.create_all(pg_engine)
    print("Tables created successfully (if they didn't exist).")

    # Create sessions
    SQLiteSession = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
    PostgreSQLSession = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

    sqlite_session = SQLiteSession()
    pg_session = PostgreSQLSession()

    try:
        # This order is critical to respect foreign key constraints.
        migration_map = {
            "users": (User, "id"), # Assuming 'id' is the PK for User
            "goals": (Goal, "id"),
            "transactions": (Transaction, "id"),
            "daily snapshots": (DailySnapshot, "id"),
        }

        for name, (model, pk_field) in migration_map.items():
            print(f"\nMigrating {name}...")
            items_to_migrate = sqlite_session.query(model).all()

            if not items_to_migrate:
                print(f"No {name} to migrate.")
                continue

            count = 0
            for item in items_to_migrate:
                item_data = {c.name: getattr(item, c.name) for c in item.__table__.columns}
                
                # Check if the record already exists in PostgreSQL to avoid duplicates
                if not pg_session.get(model, item_data[pk_field]):
                    pg_session.add(model(**item_data))
                    count += 1

            pg_session.commit()
            print(f"Migrated {count} new {name}.")

        print("\n✅ Data migration completed successfully!")

    except Exception as e:
        print(f"❌ An error occurred during migration: {e}", file=sys.stderr)
        print("Rolling back changes...", file=sys.stderr)
        pg_session.rollback()
        sys.exit(1)
    finally:
        sqlite_session.close()
        pg_session.close()
        print("--- Data Migration Finished ---")

if __name__ == "__main__":
    migrate_data()