from enum import Enum
from typing import Optional, Any, Annotated, List
from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel, BeforeValidator
from datetime import datetime , date

# --- 1. ENUMS & VALIDATORS ---
class Category(str, Enum):
    FOOD = "Food & Dining"
    SHOPPING = "Shopping"
    TRANSPORT = "Transport & Fuel"
    BILLS = "Bills & Utilities"
    ENTERTAINMENT = "Entertainment"
    INVESTMENT = "Investment"
    TRANSFER = "Personal Transfer"
    OTHER = "Other"

def validate_category(v: Any) -> str:
    if isinstance(v, Category):
        return v.value
    return str(v)

# --- 2. DATABASE TABLES (SQLModel) ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: Optional[str] = Field(default=None, index=True, unique=True)
    hashed_password: str 
    destiny_summary: Optional[str] = "SYSTEM INITIALIZING: Run diagnostic scan to map trajectory timeline profiles."
    
    # Role-Based Access Control (RBAC)
    # Default role for newly created identities is `user`. Admins can be promoted manually.
    role: str = Field(default="user")
    
    # Financial Profile (Fixed Obligations)
    monthly_income: float = Field(default=0.0)
    rent: float = Field(default=0.0)
    emis: float = Field(default=0.0)
    insurance: float = Field(default=0.0)
    target_savings_rate: float = Field(default=0.30) # Default 30%
    current_bank_balance: float = Field(default=0.0) # To calculate Lazy Cash loss
    # User's primary target/goal
    primary_goal: Optional[str] = Field(default="Financial Freedom")
    goal_amount: float = Field(default=50000000)
    
    # Relationships
    transactions: List["Transaction"] = Relationship(back_populates="user")
    goals: List["Goal"] = Relationship(back_populates="user")

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float
    merchant: str
    bank_name: str
    category: str
    is_personal_transfer: bool
    timestamp: datetime = Field(default_factory=datetime.now)
    is_recurring: bool = Field(default=False) # For subscription detection
    
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="transactions")

class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    goal_name: str 
    target_amount: float
    years: int
    required_sip: float
    timestamp: datetime = Field(default_factory=datetime.now)
    
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="goals")

# --- 3. API MODELS (Pydantic) ---

class TransactionAI(BaseModel):
    amount: float
    merchant: str
    bank_name: str
    category: Annotated[str, BeforeValidator(validate_category)]
    is_personal_transfer: bool

class SMSInput(BaseModel):
    text: str
    bank_name: Optional[str] = "Detected Core"

class PlanInput(BaseModel):
    income: float = Field(ge=0)
    goal_amount: float = Field(ge=0)
    years: int = Field(gt=0, le=100)
    goal_name: str = Field(min_length=1, max_length=120)

class ProfileUpdate(BaseModel):
    monthly_income: float = Field(ge=0)
    fixed_expenses: float = Field(ge=0)
    bank_balance: float = Field(ge=0)
    target_savings_rate: float = Field(ge=0, le=1)
    primary_goal: str = Field(min_length=1, max_length=120)
    goal_amount: float = Field(ge=0)
    savings_amount: Optional[float] = Field(default=None, ge=0)
    expenses: Optional[List[dict]] = None
    wizard_step: Optional[int] = None

class UserProfileSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    payload: str = Field(default="{}")
    updated_at: datetime = Field(default_factory=datetime.now)

class DailySnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    snapshot_date: date = Field(default_factory=date.today) 
    expected_limit: float
    actual_spent: float = 0.0
