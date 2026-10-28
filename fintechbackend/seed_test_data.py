"""Seed test data for dashboard testing"""
import os
from datetime import datetime, timedelta
from database_new import engine, create_db_and_tables
from sqlmodel import Session, select
from models import User, Transaction, Goal, Category
from auth import hash_password


def seed_test_user():
    create_db_and_tables()
    with Session(engine) as session:
        # Check if test user exists
        existing = session.exec(select(User).where(User.username == "testuser")).first()
        if existing:
            print(f"Test user 'testuser' already exists.")
            return

        # Create test user with financial profile
        test_user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=hash_password("testpassword123"),
            monthly_income=100000.0,  # ₹100k monthly income
            rent=20000.0,  # ₹20k rent
            emis=15000.0,  # ₹15k EMI
            insurance=5000.0,  # ₹5k insurance
            target_savings_rate=0.35,  # 35% savings target
            current_bank_balance=500000.0,  # ₹5L liquid balance
            role='user'
        )
        session.add(test_user)
        session.flush()  # Get the user ID

        # Add sample transactions
        transactions = [
            Transaction(
                user_id=test_user.id,
                amount=2500.0,
                merchant="Starbucks Coffee",
                bank_name="HDFC Bank",
                category="Food & Dining",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=5)
            ),
            Transaction(
                user_id=test_user.id,
                amount=5000.0,
                merchant="Amazon Shopping",
                bank_name="HDFC Bank",
                category="Shopping",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=4)
            ),
            Transaction(
                user_id=test_user.id,
                amount=1200.0,
                merchant="Uber Ride",
                bank_name="Axis Bank",
                category="Transport & Fuel",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=3)
            ),
            Transaction(
                user_id=test_user.id,
                amount=3000.0,
                merchant="Netflix Subscription",
                bank_name="HDFC Bank",
                category="Entertainment",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=2)
            ),
            Transaction(
                user_id=test_user.id,
                amount=8000.0,
                merchant="Electricity Bill",
                bank_name="ICICI Bank",
                category="Bills & Utilities",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=1)
            ),
            Transaction(
                user_id=test_user.id,
                amount=3500.0,
                merchant="Zomato Food",
                bank_name="HDFC Bank",
                category="Food & Dining",
                is_personal_transfer=False,
                timestamp=datetime.now()
            ),
            Transaction(
                user_id=test_user.id,
                amount=20000.0,
                merchant="Mutual Fund SIP",
                bank_name="HDFC Bank",
                category="Investment",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=6)
            ),
            Transaction(
                user_id=test_user.id,
                amount=10000.0,
                merchant="Yoga Classes",
                bank_name="Axis Bank",
                category="Entertainment",
                is_personal_transfer=False,
                timestamp=datetime.now() - timedelta(days=7)
            ),
        ]

        for tx in transactions:
            session.add(tx)

        # Add sample goals
        goals = [
            Goal(
                user_id=test_user.id,
                goal_name="Emergency Fund",
                target_amount=500000.0,
                years=2,
                required_sip=20833.0  # ₹500k / 24 months
            ),
            Goal(
                user_id=test_user.id,
                goal_name="Home Purchase",
                target_amount=2500000.0,
                years=5,
                required_sip=41666.0  # ₹2.5M / 60 months
            ),
            Goal(
                user_id=test_user.id,
                goal_name="Vacation Europe",
                target_amount=800000.0,
                years=1,
                required_sip=66666.0  # ₹800k / 12 months
            ),
        ]

        for goal in goals:
            session.add(goal)

        session.commit()
        print(f"✅ Test user 'testuser' created with financial data!")
        print(f"   - Monthly Income: ₹100,000")
        print(f"   - Fixed Expenses: ₹40,000")
        print(f"   - Bank Balance: ₹500,000")
        print(f"   - Added 8 sample transactions")
        print(f"   - Added 3 sample goals")


if __name__ == "__main__":
    seed_test_user()
