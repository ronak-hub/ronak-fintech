import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def setup_database():
    """
    Connects to PostgreSQL as an admin, creates the database and user if they don't exist.
    """
    try:
        # Admin connection to the default 'postgres' database
        conn = psycopg2.connect(
            dbname="postgres",
            user=os.getenv("POSTGRES_ADMIN_USER", "postgres"),
            password=os.getenv("POSTGRES_ADMIN_PASSWORD", "postgres"),
            host="localhost" # Assuming DB is on localhost for setup
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print("✅ Connected to PostgreSQL as admin user.")

        # Get target DB and user details from environment
        db_name = os.getenv("POSTGRES_DB", "vaultic_db")
        db_user = os.getenv("POSTGRES_USER", "vaultic_user")
        db_password = os.getenv("POSTGRES_PASSWORD", "vaultic_pass")

        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
        if not cursor.fetchone():
            print(f"Database '{db_name}' not found. Creating...")
            cursor.execute(f"CREATE DATABASE {db_name};")
            print(f"Database '{db_name}' created successfully.")
        else:
            print(f"Database '{db_name}' already exists.")

        # Check if user exists
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s;", (db_user,))
        if not cursor.fetchone():
            print(f"User '{db_user}' not found. Creating...")
            cursor.execute(f"CREATE USER {db_user} WITH PASSWORD %s;", (db_password,))
            print(f"User '{db_user}' created successfully.")
        else:
            print(f"User '{db_user}' already exists.")

        # Grant privileges to the user on the database
        print(f"Granting privileges on database '{db_name}' to user '{db_user}'...")
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};")
        print("Privileges granted successfully.")

    except psycopg2.OperationalError as e:
        print(f"❌ ERROR: Could not connect to PostgreSQL. Is the server running?", file=sys.stderr)
        print(f"Details: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
        print("DB setup script finished.")

if __name__ == "__main__":
    print("--- Starting Database Setup ---")
    setup_database()
    print("--- Database Setup Complete ---")