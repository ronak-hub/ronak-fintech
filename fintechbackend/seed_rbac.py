"""Seed script to ensure RBAC defaults and create an admin user for local development."""
import os
from database_new import engine, create_db_and_tables
from sqlmodel import Session, select
from models import User
from auth import hash_password
from config import settings


def seed_admin(username: str, password: str):
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            print(f"Admin user '{username}' already exists. Ensuring role is 'admin'.")
            existing.role = 'admin'
            session.add(existing)
            session.commit()
            return

        admin = User(
            username=username,
            hashed_password=hash_password(password),
            monthly_income=0.0,
            rent=0.0,
            current_bank_balance=0.0,
            role='admin'
        )
        session.add(admin)
        session.commit()
        print(f"Admin user '{username}' created.")


def set_defaults():
    # Ensure existing users have default role
    create_db_and_tables()
    # For SQLite, if the `role` column is missing, add it via ALTER TABLE
    with engine.connect() as conn:
        res = conn.exec_driver_sql("PRAGMA table_info('user')")
        columns = [r[1] for r in res.fetchall()]
        if 'role' not in columns:
            print("Applying migration: adding 'role' column to user table")
            conn.exec_driver_sql("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user'")
        if 'email' not in columns:
            print("Applying migration: adding 'email' column to user table")
            conn.exec_driver_sql("ALTER TABLE user ADD COLUMN email TEXT")
            conn.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON user (email)")

    with Session(engine) as session:
        users = session.exec(select(User)).all()
        for u in users:
            if not getattr(u, 'role', None):
                u.role = 'user'
                session.add(u)
        session.commit()
    print("Default roles applied to existing users.")


if __name__ == '__main__':
    admin_user = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_pass = os.environ.get('ADMIN_PASSWORD', 'adminpass')
    set_defaults()
    seed_admin(admin_user, admin_pass)
