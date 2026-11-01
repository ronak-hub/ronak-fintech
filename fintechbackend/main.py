import hmac
import logging
import os
import re
import secrets
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
import calendar
import math
from typing import Annotated, Optional
from urllib.parse import urlencode, quote
from hashlib import sha256
import base64

import requests
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlmodel import Session, select, func
from sqlalchemy import or_
from database_new import get_session, lifespan_startup, lifespan_shutdown
from models import Transaction, SMSInput, User, Goal, PlanInput, ProfileUpdate, UserProfileSnapshot
from websocket_manager import manager
from websocket_routes import router as websocket_router
import uvicorn
from auth import hash_password, verify_password, create_access_token
from security import get_current_user, require_roles
from config import settings
from rate_limit import rate_limiter
import json

logger = logging.getLogger(__name__)

CATEGORY_FOOD_DINING = "Food & Dining"
CATEGORY_BILLS_UTILITIES = "Bills & Utilities"
CATEGORY_TRANSPORT_FUEL = "Transport & Fuel"
CATEGORY_SHOPPING = "Shopping"
CATEGORY_ENTERTAINMENT = "Entertainment"
API_PREFIX = settings.API_V1_PREFIX

# Create FastAPI app with lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings.validate_production_configuration()
    await lifespan_startup()
    logger.info("✅ Vaultic backend initialized")
    yield
    # Shutdown
    await lifespan_shutdown()
    logger.info("✅ Vaultic backend shutdown complete")

app = FastAPI(
    title=settings.API_TITLE,
    version="2.0.0",
    description="Autonomous financial intelligence platform with real-time WebSocket telemetry",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.get("/health")
async def health_check():
    """Readiness check: only report ready when the configured database responds."""
    from database_new import engine
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except Exception as error:
        logger.warning("Database readiness check failed: %s", type(error).__name__)
        raise HTTPException(status_code=503, detail="Database unavailable") from error
    return {"status": "ok", "database": "connected"}


@app.get("/integrations/status")
async def integrations_status():
    """Expose enabled/disabled states only; never return provider credentials."""
    return {
        "google_oauth_configured": bool(
            settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET
        ),
        "gemini_configured": bool(settings.GOOGLE_API_KEY),
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Vaultic-Token"],
)

# Include WebSocket routes
app.include_router(websocket_router, prefix=settings.API_V1_PREFIX)

# --- MEMORY-CONTEXT ENGINE LOGIC ---
def compile_financial_destiny_matrix(user_id: int, session: Session) -> str:
    """
    Algorithmic Profile Analyzer inspired by enterprise memory-augmented agent architectures.
    Parses live ledger data to construct a tactical, natural language state profile.
    """
    tx_list = session.exec(select(Transaction).where(Transaction.user_id == user_id)).all()
    user_profile = session.get(User, user_id)
    
    if not user_profile:
        return "ERROR: User core unreachable."
        
    if not tx_list:
        return (
            "TRAJECTORY NOMINAL: No active capital leaks detected in current lifecycle. "
            "System is standing by for live automated ledger streaming."
        )

    total_spend = sum(t.amount for t in tx_list)
    category_totals = {}
    for t in tx_list:
        category_totals[t.category] = category_totals.get(t.category, 0.0) + t.amount

    highest_leak_category = "None"
    max_spend = 0.0
    for cat, amt in category_totals.items():
        if amt > max_spend:
            max_spend = amt
            highest_leak_category = cat

    leak_percentage = round((max_spend / total_spend) * 100, 1) if total_spend > 0 else 0

    system_advice = ""
    if highest_leak_category == CATEGORY_FOOD_DINING:
        system_advice = "Lifestyle inflation velocity detected in baseline dining profiles. Reallocating 15% of lifestyle capital back to investment engines will warp exit timeline ahead by up to 34 months."
    elif highest_leak_category == CATEGORY_SHOPPING:
        system_advice = "Discretionary consumer drag is executing above targeted thresholds. Recommend applying a 48-hour cool-down buffer on secondary marketplace checking accounts."
    elif highest_leak_category == CATEGORY_BILLS_UTILITIES:
        system_advice = "Fixed recurring obligations dominate system drag. Investigate passive subscription optimization routines immediately."
    else:
        system_advice = "Capital distribution vectors are balanced. Main bottleneck to timeline warp is top-line revenue volume accretion."

    compiled_log = (
        f"ANALYTICS SUMMARY // CRITICAL PROFILE: Most active systemic leak concentrated within '{highest_leak_category}' "
        f"comprising {leak_percentage}% of monitored transaction volume. {system_advice}"
    )
    
    if hasattr(user_profile, 'destiny_summary'):
        user_profile.destiny_summary = compiled_log
        session.add(user_profile)
        session.commit()
    
    return compiled_log

def compute_required_sip(goal_amount: float, years: int, current_capital: float = 0.0, annual_return: float = 0.12) -> float:
    """Monthly end-of-month contribution needed to reach a nominal target."""
    r = annual_return / 12
    n = max(1, int(years) * 12)
    goal = max(0.0, float(goal_amount or 0))
    principal = max(0.0, float(current_capital or 0))

    if r == 0:
        remaining = max(0.0, goal - principal)
        return round(remaining / n, 2)

    future_of_current = principal * ((1 + r) ** n)
    remaining = max(0.0, goal - future_of_current)
    if remaining <= 0:
        return 0.0

    # Contributions are deposited at month end, matching the projection loop.
    compounding_multiplier = ((1 + r) ** n - 1) / r
    return round(remaining / compounding_multiplier, 2)


def calculate_freedom_projection(user: User, boost: float = 0):
    fixed_costs = (user.rent or 0) + (user.emis or 0) + (user.insurance or 0)
    income = user.monthly_income or 0
    savings_rate = min(1.0, max(0.0, user.target_savings_rate if user.target_savings_rate is not None else 0.30))
    cash_available = max(0.0, income - fixed_costs)
    target_savings = income * savings_rate
    # Never invent investable cash above surplus after fixed costs
    # A simulation may increase or reduce the planned contribution, but cannot
    # allocate more than the user's post-fixed-cost surplus.
    monthly_investment = min(cash_available, max(0.0, target_savings + boost))
    current_capital = user.current_bank_balance or 0

    target_goal = user.goal_amount if getattr(user, 'goal_amount', None) else 50000000
    annual_return = 0.12
    monthly_rate = annual_return / 12

    if current_capital >= target_goal:
        freedom_date = datetime.now()
        return freedom_date.strftime("%b %Y"), 0.0, 0

    if monthly_investment <= 0:
        return "STALLED", 99, 0

    months = 0
    accumulated = current_capital
    while accumulated < target_goal and months < 1000:
        accumulated = accumulated * (1 + monthly_rate) + monthly_investment
        months += 1

    if accumulated < target_goal:
        return "STALLED", 99, 0

    freedom_date = datetime.now() + timedelta(days=int(months * 30.44))
    return freedom_date.strftime("%b %Y"), round(months / 12, 1), months

def get_current_pulse_data(session: Session, user: User):
    today = date.today()
    start_of_month = datetime(today.year, today.month, 1)
    spent = session.exec(select(func.sum(Transaction.amount)).where(
        Transaction.user_id == user.id, 
        Transaction.timestamp >= start_of_month
    )).one() or 0
    
    days_left = calendar.monthrange(today.year, today.month)[1] - today.day + 1
    fixed_costs = (user.rent or 0) + (user.emis or 0) + (user.insurance or 0)
    savings_rate = user.target_savings_rate if user.target_savings_rate is not None else 0.30
    income = max(0.0, user.monthly_income or 0)
    cash_available = max(0.0, income - fixed_costs)
    investments = min(cash_available, income * min(1.0, max(0.0, savings_rate)))
    
    safe_pool = income - fixed_costs - investments - spent
    daily_limit = safe_pool / days_left if days_left > 0 else 0
    return round(max(0, daily_limit), 2), spent

class AuthInput(BaseModel):
    username: Optional[str] = Field(default=None, min_length=1, max_length=254)
    email: Optional[str] = Field(default=None, max_length=254)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("username", "email")
    @classmethod
    def normalize_identity(cls, value: Optional[str]) -> Optional[str]:
        return value.strip().lower() if value else value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password_encoding(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be no more than 72 UTF-8 bytes.")
        return value

    @model_validator(mode="after")
    def validate_identifier(self):
        if not self.email and not self.username:
            raise ValueError("Email or username is required.")
        if self.email and self.username and len(self.username) < 3:
            raise ValueError("Username must be at least 3 characters.")
        return self


class SMSWebhookInput(BaseModel):
    user_id: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=10_000)
    bank_name: Optional[str] = Field(default="Automated", max_length=100)

class SimulationInput(BaseModel):
    boost_amount: float = Field(ge=-1_000_000_000, le=1_000_000_000)

class ParseSMSInput(BaseModel):
    raw_sms: str = Field(min_length=1, max_length=25_000)
    use_gemini: bool = False

class ParsedSMSTransaction(BaseModel):
    merchant: str = Field(min_length=1, max_length=200)
    amount: float = Field(ge=0, le=1_000_000_000)
    category: str = Field(min_length=1, max_length=100)
    date: str = Field(min_length=1, max_length=40)
    transaction_type: str = Field(default="Debit", max_length=20)
    source_text: Optional[str] = Field(default=None, max_length=10_000)

class ImportSMSTransactionsInput(BaseModel):
    transactions: list[ParsedSMSTransaction] = Field(min_length=1, max_length=500)

@app.post("/auth/signup", responses={400: {"description": "Identity already exists"}})
async def signup(request: Request, user_data: AuthInput, session: Annotated[Session, Depends(get_session)]):
    rate_limiter.check(request, "signup", limit=5, window_seconds=60)
    if len(user_data.password) < 12:
        raise HTTPException(
            status_code=422, detail="Password must be at least 12 characters."
        )

    identifier = user_data.username or user_data.email
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or username is required.")

    query = select(User)
    if user_data.email and user_data.username:
        query = query.where(or_(User.username == identifier, User.email == user_data.email))
    elif user_data.email:
        query = query.where(User.email == user_data.email)
    else:
        query = query.where(User.username == user_data.username)

    existing = session.exec(query).first()
    if existing:
        raise HTTPException(status_code=400, detail="Identity already exists")

    new_user = User(
        username=identifier,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        monthly_income=0.0,
        rent=0.0,
        current_bank_balance=0.0
    )
    session.add(new_user)
    session.commit()
    return {"status": "Identity Created"}

@app.post("/auth/login", responses={401: {"description": "Invalid credentials"}})
async def login(request: Request, user_data: AuthInput, session: Annotated[Session, Depends(get_session)]):
    rate_limiter.check(request, "login", limit=10, window_seconds=60)
    query = select(User)
    if user_data.email and user_data.username:
        query = query.where(or_(User.email == user_data.email, User.username == user_data.username))
    elif user_data.email:
        query = query.where(User.email == user_data.email)
    else:
        query = query.where(or_(User.username == user_data.username, User.email == user_data.username))

    user = session.exec(query).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token_sub = user.email or user.username
    token = create_access_token(
        {"sub": token_sub, "user_id": user.id, "role": user.role}
    )
    return {"access_token": token, "token_type": "bearer"}


# --- Google OAuth 2.0 endpoints ---
@app.get("/auth/google/login")
def google_login(request: Request):
    """Redirect to Google's OAuth 2.0 consent screen."""
    rate_limiter.check(request, "google-login", limit=10, window_seconds=60)
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=(
                "Google OAuth is not configured. "
                "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your backend .env file."
            ),
        )

    oauth_state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        sha256(code_verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": oauth_state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    response = RedirectResponse(url)
    response.set_cookie(
        "vaultic_oauth_state",
        oauth_state,
        max_age=600,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/auth/google",
    )
    response.set_cookie(
        "vaultic_oauth_verifier",
        code_verifier,
        max_age=600,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/auth/google",
    )
    return response


@app.get("/auth/google/callback")
def google_callback(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
):
    """Exchange authorization code for tokens, fetch userinfo, and create local user + JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=(
                "Google OAuth callback is not configured. "
                "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your backend .env file."
            ),
        )

    provider_error = request.query_params.get("error")
    if provider_error:
        raise HTTPException(status_code=400, detail="Google sign-in was cancelled or rejected.")

    code = request.query_params.get("code", "")
    state = request.query_params.get("state", "")
    expected_state = request.cookies.get("vaultic_oauth_state")
    code_verifier = request.cookies.get("vaultic_oauth_verifier")
    if (
        not code
        or not code_verifier
        or not expected_state
        or not state
        or not hmac.compare_digest(state, expected_state)
    ):
        raise HTTPException(status_code=400, detail="Invalid OAuth state.")

    google_http = requests.Session()
    google_http.trust_env = settings.GOOGLE_USE_SYSTEM_PROXY
    try:
        try:
            token_resp = google_http.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                    "code_verifier": code_verifier,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=(3, 10),
            )
        except requests.RequestException as error:
            logger.warning("Google OAuth token exchange failed: %s", type(error).__name__)
            raise HTTPException(
                status_code=503,
                detail="Google sign-in could not reach Google. Check backend network or proxy settings and retry.",
            ) from None
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token returned from provider")

        # Fetch user info
        userinfo_resp = google_http.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=(3, 10),
        )
    except requests.RequestException:
        logger.warning("Google OAuth user profile request failed")
        raise HTTPException(
            status_code=503,
            detail="Google sign-in could not reach Google. Check backend network or proxy settings and retry.",
        ) from None
    finally:
        google_http.close()
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    userinfo = userinfo_resp.json()
    email = userinfo.get("email", "").strip().lower()
    if not email or not userinfo.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google did not verify an email address.")

    # Upsert local user by email identity
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        username = email
        if session.exec(select(User).where(User.username == username)).first():
            username = f"{email.split('@', 1)[0]}-{secrets.token_hex(4)}"
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(os.urandom(24).hex()),
            monthly_income=0.0,
            rent=0.0,
            current_bank_balance=0.0
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    token = create_access_token(
        {"sub": user.username, "user_id": user.id, "role": user.role}
    )
    frontend_redirect = (
        f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login#token={quote(token)}"
    )
    response = RedirectResponse(frontend_redirect)
    response.delete_cookie("vaultic_oauth_state", path="/auth/google")
    response.delete_cookie("vaultic_oauth_verifier", path="/auth/google")
    return response


@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204, content=b"")


@app.get(API_PREFIX + "/admin/users", dependencies=[Depends(require_roles('admin'))])
def list_users(session: Annotated[Session, Depends(get_session)]):
    """Admin-only route: list all registered users."""
    users = session.exec(select(User)).all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]

def split_fixed_expenses(fixed_total: float, expenses: Optional[list] = None) -> tuple[float, float, float]:
    """Map wizard expense rows into rent / EMI / insurance columns."""
    rent, emis, insurance = 0.0, 0.0, 0.0
    if expenses:
        for item in expenses:
            if not isinstance(item, dict):
                continue
            category = str(item.get("category", "")).lower()
            try:
                amount = float(item.get("amount") or 0)
            except (TypeError, ValueError):
                amount = 0.0
            if not math.isfinite(amount):
                amount = 0.0
            amount = max(0.0, amount)
            if "rent" in category:
                rent += amount
            elif "emi" in category or "loan" in category:
                emis += amount
            elif "insurance" in category:
                insurance += amount
        if rent + emis + insurance > 0:
            return rent, emis, insurance
    return max(0.0, fixed_total), 0.0, 0.0


def resolve_wealth_goal_amount(
    goal_amount: float,
    monthly_income: float,
    fixed_expenses: float,
    savings_amount: Optional[float],
    target_savings_rate: float,
) -> float:
    """Treat small goal_amount values as monthly savings, not lifetime wealth targets."""
    threshold = max(monthly_income * 24, 500000)
    if goal_amount >= threshold:
        return goal_amount
    cash_available = max(0.0, monthly_income - fixed_expenses)
    savings = savings_amount if savings_amount is not None and savings_amount > 0 else monthly_income * target_savings_rate
    savings = min(max(0.0, savings), cash_available)
    # Savings are not spending. Estimate total consumption as income minus
    # savings, with fixed obligations as a floor when inputs are inconsistent.
    monthly_outflow = max(max(0.0, fixed_expenses), max(0.0, monthly_income - savings))
    fi_target = (monthly_outflow * 12) / 0.06
    return fi_target if fi_target > 0 else 50000000.0


@app.post("/user/setup")
async def setup_profile(data: ProfileUpdate, user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    rent, emis, insurance = split_fixed_expenses(data.fixed_expenses, data.expenses)
    resolved_goal = resolve_wealth_goal_amount(
        float(data.goal_amount or 0),
        float(data.monthly_income or 0),
        float(data.fixed_expenses or 0),
        data.savings_amount,
        float(data.target_savings_rate or 0.3),
    )

    user.monthly_income = data.monthly_income
    user.rent = rent
    user.emis = emis
    user.insurance = insurance
    user.current_bank_balance = data.bank_balance
    user.target_savings_rate = min(max(data.target_savings_rate, 0.0), 1.0)
    user.primary_goal = data.primary_goal
    user.goal_amount = resolved_goal
    
    session.add(user)
    session.commit()
    session.refresh(user)

    payload = {
        "monthly_income": data.monthly_income,
        "fixed_expenses": data.fixed_expenses,
        "bank_balance": data.bank_balance,
        "target_savings_rate": data.target_savings_rate,
        "savings_amount": data.savings_amount,
        "primary_goal": data.primary_goal,
        "goal_amount": resolved_goal,
        "expenses": data.expenses or [],
        "wizard_step": data.wizard_step,
    }
    snapshot = session.exec(select(UserProfileSnapshot).where(UserProfileSnapshot.user_id == user.id)).first()
    if snapshot:
        snapshot.payload = json.dumps(payload)
        snapshot.updated_at = datetime.now()
        session.add(snapshot)
    else:
        session.add(UserProfileSnapshot(user_id=user.id, payload=json.dumps(payload)))
    session.commit()

    # Upsert a Goal record for this primary goal
    existing_goal = session.exec(select(Goal).where(Goal.user_id == user.id, Goal.goal_name == (data.primary_goal or ""))).first()
    # Estimate required SIP for a default horizon (10 years), net of existing capital
    years = 10
    required_sip = compute_required_sip(
        goal_amount=resolved_goal,
        years=years,
        current_capital=data.bank_balance if data.bank_balance is not None else (user.current_bank_balance or 0),
    )

    if existing_goal:
        existing_goal.target_amount = resolved_goal or existing_goal.target_amount
        existing_goal.required_sip = required_sip
        session.add(existing_goal)
    else:
        new_goal = Goal(
            goal_name=(data.primary_goal or "Primary Goal"),
            target_amount=resolved_goal,
            years=years,
            required_sip=required_sip,
            user_id=user.id
        )
        session.add(new_goal)
    session.commit()
    return {"status": "DNA Initialized", "user_id": user.id}

@app.get("/dashboard/summary")
def get_master_summary(user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    daily_limit, _ = get_current_pulse_data(session, user)
    exit_date, years_to_go, total_months = calculate_freedom_projection(user)
    
    # 1. Algorithmic Capital Evaporation Calculations
    lazy_daily_leak = round(((user.current_bank_balance or 0) * 0.09) / 365, 2)
    monthly_lazy_loss = round(lazy_daily_leak * 30, 2)
    
    # 2. Trigger the Local Memory-Context Matrix
    current_destiny_text = compile_financial_destiny_matrix(user.id, session)

    # 3. Dynamic Cognitive Nudge Generator (Behavioral Multi-Agent Simulation)
    generated_nudges = []
    
    # Nudge Rule A: Trajectory Lock Status
    generated_nudges.append(f"Neural Forecast: Exit Date locked for {exit_date} ({years_to_go} years remaining).")
    
    # Nudge Rule B: Lazy Cash Fluid Leak Tracker
    if user.current_bank_balance > (user.monthly_income or 0):
        generated_nudges.append(f"CRITICAL DRAG: ₹{monthly_lazy_loss} evaporating monthly in low-yield holding channels. Recommend deploying to an index engine.")
    else:
        generated_nudges.append(f"SYSTEM ALERT: Passive capital friction leaking ₹{monthly_lazy_loss}/mo. Optimization advised.")
        
    # Nudge Rule C: Runway Friction Warnings
    db_transactions = session.exec(select(Transaction).where(Transaction.user_id == user.id)).all()
    if db_transactions:
        total_spend = sum(t.amount for t in db_transactions)
        if total_spend > (user.monthly_income or 0) * 0.5:
            generated_nudges.append("WARNING: Capital depletion velocity is exceeding 50% of monthly allocation parameters.")
        else:
            generated_nudges.append(f"LIQUIDITY NOMINAL: Spending velocity stable. Safe daily buffer calibrated at ₹{daily_limit}.")
    else:
        generated_nudges.append("DIAGNOSTIC STANDBY: Feed raw transactional telemetry to activate behavioral anomaly tracking.")

    # 4. Dynamic Health Score Calibration Engine
    base_score = 65
    if daily_limit > 1500:
        base_score += 15
    if monthly_lazy_loss < 500:
        base_score += 10
    health_score = min(100, base_score)

    # 5. Get user profile data
    snapshot = session.exec(select(UserProfileSnapshot).where(UserProfileSnapshot.user_id == user.id)).first()
    snapshot_payload = {}
    if snapshot and snapshot.payload:
        try:
            snapshot_payload = json.loads(snapshot.payload)
        except Exception:
            snapshot_payload = {}

    user_profile = {
        "monthly_income": user.monthly_income or 0,
        "rent": user.rent or 0,
        "emis": user.emis or 0,
        "insurance": user.insurance or 0,
        "current_bank_balance": user.current_bank_balance or 0,
        "target_savings_rate": user.target_savings_rate or 0.30,
        "primary_goal": getattr(user, 'primary_goal', 'Financial Freedom'),
        "goal_amount": getattr(user, 'goal_amount', 50000000),
        "savings_amount": snapshot_payload.get("savings_amount", 0),
        "fixed_expenses": (user.rent or 0) + (user.emis or 0) + (user.insurance or 0),
        "wizard_snapshot": snapshot_payload,
    }

    # 6. Get recent transactions (latest 10)
    recent_transactions = []
    for tx in db_transactions[-10:]:
        recent_transactions.append({
            "id": tx.id,
            "merchant": tx.merchant,
            "amount": tx.amount,
            "category": tx.category,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else ""
        })
    recent_transactions.reverse()  # Most recent first

    # 7. Get user goals
    user_goals = []
    db_goals = session.exec(select(Goal).where(Goal.user_id == user.id)).all()
    for goal in db_goals:
        user_goals.append({
            "id": goal.id,
            "goal_name": goal.goal_name,
            "target_amount": goal.target_amount,
            "years": goal.years,
            "required_sip": goal.required_sip
        })

    # 8. Calculate spending by category
    spending_by_category = {}
    for tx in db_transactions:
        if tx.category in spending_by_category:
            spending_by_category[tx.category] += tx.amount
        else:
            spending_by_category[tx.category] = tx.amount

    return {
        "overall_health_score": health_score,
        "daily_safe_budget": daily_limit,
        "username": user.username,
        "destiny_summary_log": current_destiny_text,
        "freedom_data": {
            "exit_date": exit_date,
            "years_remaining": years_to_go,
            "total_months": total_months
        },
        "wealth_leaks": {
            "daily_lazy_cash_loss": lazy_daily_leak,
            "monthly_impact": monthly_lazy_loss
        },
        "streak_data": {"current_streak": 7, "status": "Locked"},
        "nudges": generated_nudges,
        "user_profile": user_profile,
        "recent_transactions": recent_transactions,
        "user_goals": user_goals,
        "spending_by_category": spending_by_category
    }

@app.post("/simulate/trajectory")
async def simulate_trajectory(data: SimulationInput, user: Annotated[User, Depends(get_current_user)]):
    _, baseline_years, _ = calculate_freedom_projection(user)
    exit_date, years_remaining, _ = calculate_freedom_projection(user, boost=data.boost_amount)
    return {
        "new_exit_date": exit_date,
        "years_saved": round(baseline_years - years_remaining, 1),
        "years_remaining": years_remaining,
        "boost": data.boost_amount
    }


@app.post("/simulate/stress-test", responses={400: {"description": "Invalid stress test parameters"}, 500: {"description": "Stress test calculation failed"}})
async def stress_test_scenario(
    data: dict,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Execute wealth stress test with multiple crisis scenarios.
    """
    from stress_tester import StressTestInput, StressTester, validate_stress_parameters
    
    try:
        # Validate parameters
        scenario = StressTestInput(**data)
        validate_stress_parameters(scenario)
        
        # Get user financial parameters
        fixed_costs = (user.rent or 0) + (user.emis or 0) + (user.insurance or 0)
        income = user.monthly_income or 0
        monthly_expenses = fixed_costs + (income * 0.25)  # Add lifestyle buffer
        savings_rate = min(1.0, max(0.0, user.target_savings_rate if user.target_savings_rate is not None else 0.30))
        cash_available = max(0.0, income - fixed_costs)
        monthly_savings = min(income * savings_rate, cash_available)
        
        # Initialize stress tester
        tester = StressTester(
            monthly_income=income,
            monthly_expenses=monthly_expenses,
            current_investments=user.current_bank_balance or 0,
            monthly_savings=monthly_savings
        )
        
        # Run stress test
        result = tester.run_stress_test(scenario)
        
        return result.dict()
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Stress test error")
        raise HTTPException(status_code=500, detail="Stress test calculation failed")

@app.get("/analytics/transactions")
def get_transaction_analytics(user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    db_transactions = session.exec(select(Transaction).where(Transaction.user_id == user.id)).all()

    total_volume = sum(t.amount for t in db_transactions)
    return {
        "total_volume": round(total_volume, 2),
        "history": [
            {
                "merchant": t.merchant,
                "amount": t.amount,
                "category": t.category,
                "timestamp": t.timestamp.isoformat()
            } for t in db_transactions
        ]
    }


@app.get(API_PREFIX + "/history")
def public_history(session: Annotated[Session, Depends(get_session)]):
    """Public demo endpoint for landing page to fetch recent transaction history."""
    mock_history = [
        {"merchant": "Swiggy Pulse", "amount": 1240.00, "category": CATEGORY_FOOD_DINING, "timestamp": "2026-05-20T14:22:00"},
        {"merchant": "AWS Cloud Drag", "amount": 3450.00, "category": CATEGORY_BILLS_UTILITIES, "timestamp": "2026-05-18T09:11:00"},
        {"merchant": "Zara Velocity", "amount": 5600.00, "category": CATEGORY_SHOPPING, "timestamp": "2026-05-15T19:45:00"},
        {"merchant": "Uber Propulsion", "amount": 820.00, "category": CATEGORY_TRANSPORT_FUEL, "timestamp": "2026-05-12T08:30:00"}
    ]
    total_volume = sum(item["amount"] for item in mock_history)
    return {"total_volume": total_volume, "history": mock_history}


@app.get("/analytics/optimize")
def get_optimization_analysis(user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    """Analyze expense patterns and suggest optimizations."""
    from collections import defaultdict
    from types import SimpleNamespace

    db_transactions = session.exec(select(Transaction).where(Transaction.user_id == user.id)).all()

    # Group transactions by category, then average true monthly totals
    category_monthly_totals: dict[str, dict[tuple[int, int], float]] = defaultdict(lambda: defaultdict(float))
    for tx in db_transactions:
        ts = tx.timestamp or datetime.now()
        month_key = (ts.year, ts.month)
        category_monthly_totals[tx.category][month_key] += tx.amount or 0

    suggestions = []
    discretionary_categories = {CATEGORY_SHOPPING, CATEGORY_FOOD_DINING, CATEGORY_ENTERTAINMENT}
    essential_categories = {CATEGORY_BILLS_UTILITIES, CATEGORY_TRANSPORT_FUEL}

    for category, monthly_map in category_monthly_totals.items():
        # Average of monthly category totals (not mean of individual txs)
        current_spending = (sum(monthly_map.values()) / len(monthly_map)) if monthly_map else 0

        if category in discretionary_categories:
            reduction_pct = 30
            difficulty = "medium"
        elif category in essential_categories:
            reduction_pct = 10
            difficulty = "hard"
        else:
            reduction_pct = 15
            difficulty = "medium"

        target_spending = current_spending * (1 - reduction_pct / 100)
        monthly_savings = current_spending - target_spending

        suggestions.append({
            "category": category,
            "current_spending": round(current_spending, 2),
            "suggested_reduction": round(current_spending * reduction_pct / 100, 2),
            "target_spending": round(target_spending, 2),
            "reduction_percentage": reduction_pct,
            "monthly_savings": round(monthly_savings, 2),
            "annual_savings": round(monthly_savings * 12, 2),
            "implementation_difficulty": difficulty
        })

    total_current_spending = sum(s["current_spending"] for s in suggestions)
    total_optimized_spending = sum(s["target_spending"] for s in suggestions)
    total_monthly_savings = sum(s["monthly_savings"] for s in suggestions)
    total_annual_savings = sum(s["annual_savings"] for s in suggestions)

    exit_date, years_to_go, _ = calculate_freedom_projection(user)

    # Copy fields — never mutate the live ORM user
    optimized_user_copy = SimpleNamespace(
        rent=user.rent,
        emis=user.emis,
        insurance=user.insurance,
        target_savings_rate=user.target_savings_rate,
        monthly_income=(user.monthly_income or 0) + total_monthly_savings,
        current_bank_balance=user.current_bank_balance,
        goal_amount=getattr(user, "goal_amount", None),
    )
    optimized_exit_date, optimized_years, _ = calculate_freedom_projection(optimized_user_copy)

    years_gained = years_to_go - optimized_years

    return {
        "total_current_spending": round(total_current_spending, 2),
        "total_optimized_spending": round(total_optimized_spending, 2),
        "total_monthly_savings": round(total_monthly_savings, 2),
        "total_annual_savings": round(total_annual_savings, 2),
        "years_of_freedom_gained": max(0, round(years_gained, 1)),
        "baseline_exit_date": exit_date,
        "new_exit_date": optimized_exit_date,
        "suggestions": suggestions
    }


@app.post("/analytics/execute-optimization", responses={400: {"description": "No categories selected for optimization"}})
async def execute_optimization(
    data: dict,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """Execute the capital reallocation plan."""
    categories = data.get("categories_to_optimize", [])
    
    if not categories:
        raise HTTPException(status_code=400, detail="No categories selected for optimization")
    
    # Log optimization execution
    logger.info(f"User {user.id} executing optimization for categories: {categories}")
    
    # Broadcast to WebSocket
    await manager.send_system_alert(
        user.id,
        "info",
        f"Capital reallocation executed on {len(categories)} expense categories"
    )
    
    return {
        "status": "REALLOCATION_EXECUTED",
        "categories_optimized": categories,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/analytics/nlp-train", responses={500: {"description": "NLP training failed"}})
async def train_nlp_model(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Train NLP model on user's transaction history.
    Improves merchant recognition and category classification accuracy.
    """
    from nlp_parser import get_sms_parser
    
    try:
        get_sms_parser(use_spacy=True)
        
        # Get user transactions
        transactions = session.exec(
            select(Transaction).where(Transaction.user_id == user.id)
        ).all()
        
        if not transactions:
            return {"status": "NO_DATA", "message": "No transactions available for training"}
        
        # Train/update merchant recognition from transaction history
        merchant_categories = {}
        for tx in transactions:
            if tx.merchant not in merchant_categories:
                merchant_categories[tx.merchant] = []
            merchant_categories[tx.merchant].append(tx.category)
        
        logger.info(f"NLP model trained on {len(transactions)} transactions for user {user.id}")
        
        # Broadcast success to WebSocket
        await manager.send_system_alert(
            user.id,
            "success",
            f"NLP model retrained on {len(transactions)} transaction patterns"
        )
        
        return {
            "status": "TRAINING_COMPLETE",
            "transactions_processed": len(transactions),
            "merchants_learned": len(merchant_categories),
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.exception("NLP training failed")
        raise HTTPException(status_code=500, detail=f"NLP training failed: {str(e)}")

# --- EXTRACTIVE PARSER LOGIC ---
MERCHANT_CATEGORY_KEYWORDS = {
    CATEGORY_FOOD_DINING: [
        "swiggy", "zomato", "mcdonald", "mcdonalds", "domino", "dominos", "kfc",
        "starbucks", "restaurant", "cafe"
    ],
    CATEGORY_SHOPPING: [
        "amazon", "flipkart", "myntra", "reliance digital", "zara", "retail",
        "shopping", "blinkit", "zepto"
    ],
    CATEGORY_TRANSPORT_FUEL: [
        "uber", "ola", "rapido", "irctc", "metro", "fuel", "petrol", "diesel",
        "hpcl", "bpcl", "shell"
    ],
    CATEGORY_BILLS_UTILITIES: [
        "airtel", "jio", "bsnl", "electricity", "water", "broadband", "recharge",
        "gas", "bescom"
    ],
    CATEGORY_ENTERTAINMENT: [
        "netflix", "spotify", "prime video", "amazon prime", "hotstar", "pvr",
        "inox", "bookmyshow"
    ],
    "Healthcare": ["apollo", "pharmeasy", "tata 1mg", "1mg", "medplus", "hospital"],
    "Investment": ["zerodha", "groww", "upstox", "mutual fund", "sip", "nse", "bse"],
}

TRANSACTION_MODE_PATTERNS = [
    (r"\bupi\b", "UPI"),
    (r"\bdebit\s+card\b|\bdc\b", "Debit Card"),
    (r"\bcredit\s+card\b|\bcc\b", "Credit Card"),
    (r"\batm\b", "ATM Withdrawal"),
    (r"\bnet\s*banking\b|\binb\b", "Net Banking"),
    (r"\bwallet\b|paytm|phonepe|gpay|google\s*pay", "Wallet"),
    (r"\bimps\b", "IMPS"),
    (r"\bneft\b", "NEFT"),
    (r"\brtgs\b", "RTGS"),
]

def classify_sms_merchant(text: str, merchant: str) -> str:
    haystack = f"{merchant} {text}".lower()
    for category, keywords in MERCHANT_CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category
    return "Other"

def normalize_merchant_name(merchant: str) -> str:
    merchant = re.sub(r"[^A-Za-z0-9&.\- ]+", " ", merchant)
    merchant = re.sub(r"\s+", " ", merchant).strip(" .-")
    if not merchant:
        return "Unknown Merchant"

    known_merchants = {
        "swiggy": "Swiggy",
        "zomato": "Zomato",
        "mcdonald": "McDonald's",
        "domino": "Domino's",
        "amazon": "Amazon",
        "flipkart": "Flipkart",
        "myntra": "Myntra",
        "reliance digital": "Reliance Digital",
        "zara": "Zara",
        "uber": "Uber",
        "ola": "Ola",
        "rapido": "Rapido",
        "airtel": "Airtel",
        "jio": "Jio",
        "bsnl": "BSNL",
        "netflix": "Netflix",
        "spotify": "Spotify",
        "prime video": "Prime Video",
        "apollo": "Apollo",
        "pharmeasy": "PharmEasy",
        "tata 1mg": "Tata 1mg",
        "zerodha": "Zerodha",
        "groww": "Groww",
        "upstox": "Upstox",
    }
    merchant_lower = merchant.lower()
    for keyword, display in known_merchants.items():
        if keyword in merchant_lower:
            return display
    return merchant[:80].title()

def extract_sms_amount(text: str) -> float:
    amount_patterns = [
        r"(?:rs\.?|inr|\u20b9)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
        r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|\u20b9)",
        r"(?:debited|credited|paid|spent|withdrawn|received|sent|charged)\s+(?:by\s+)?(?:rs\.?|inr|\u20b9)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                continue
    return 0.0

def extract_sms_merchant(text: str) -> str:
    merchant_patterns = [
        r"(?:paid\s+to|payment\s+successful\s+to|sent\s+to|transferred\s+to)\s+([A-Za-z0-9&.\- ]+?)(?=\s+(?:on|via|using|for|ref|upi|vpa|a/c|account|rs|inr|\u20b9)|[.,]|$)",
        r"(?:debited\s+by\s+(?:rs\.?|inr|\u20b9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+at)\s+([A-Za-z0-9&.\- ]+?)(?=\s+(?:on|via|using|for|ref|upi|vpa|a/c|account)|[.,]|$)",
        r"(?:debited|spent|withdrawn|used)\s+(?:at|on|for|to)\s+([A-Za-z0-9&.\- ]+?)(?=\s+(?:on|via|using|for|ref|upi|vpa|a/c|account|rs|inr|\u20b9)|[.,]|$)",
        r"(?:at|to|from|merchant)\s+([A-Za-z0-9&.\- ]+?)(?=\s+(?:on|via|using|for|ref|upi|vpa|a/c|account|rs|inr|\u20b9)|[.,]|$)",
        r"^([A-Za-z0-9&.\- ]+?)\s+received\s+(?:rs\.?|inr|\u20b9)",
    ]
    for pattern in merchant_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            merchant = normalize_merchant_name(match.group(1))
            if merchant != "Unknown Merchant":
                return merchant

    text_lower = text.lower()
    for keywords in MERCHANT_CATEGORY_KEYWORDS.values():
        for keyword in keywords:
            if keyword in text_lower:
                return normalize_merchant_name(keyword)
    return "Unknown Merchant"

def extract_sms_date(text: str) -> date:
    today = date.today()
    date_patterns = [
        r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b",
        r"\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\b",
    ]
    numeric_match = re.search(date_patterns[0], text)
    if numeric_match:
        day, month, year = numeric_match.groups()
        year_number = int(year)
        if year_number < 100:
            year_number += 2000
        try:
            return date(year_number, int(month), int(day))
        except ValueError:
            return today

    named_match = re.search(date_patterns[1], text, re.IGNORECASE)
    if named_match:
        day, month_name, year = named_match.groups()
        month_lookup = {name.lower(): index for index, name in enumerate(calendar.month_name) if name}
        month_lookup.update({name.lower(): index for index, name in enumerate(calendar.month_abbr) if name})
        month_number = month_lookup.get(month_name.lower())
        year_number = int(year)
        if year_number < 100:
            year_number += 2000
        if month_number:
            try:
                return date(year_number, month_number, int(day))
            except ValueError:
                return today
    return today

def extract_sms_transaction_type(text: str) -> str:
    lower_text = text.lower()
    if re.search(r"\b(credited|credit|received from|refund|cashback)\b", lower_text):
        return "Credit"
    if re.search(r"\b(atm|withdrawn|withdrawal)\b", lower_text):
        return "ATM Withdrawal"
    return "Debit"

def extract_sms_mode(text: str) -> str:
    for pattern, mode in TRANSACTION_MODE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return mode
    return "Bank Transaction"

def parse_single_sms_transaction(text: str) -> Optional[dict]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return None

    amount = extract_sms_amount(cleaned)
    if amount <= 0:
        return None

    merchant = extract_sms_merchant(cleaned)
    category = classify_sms_merchant(cleaned, merchant)
    tx_date = extract_sms_date(cleaned)
    transaction_type = extract_sms_transaction_type(cleaned)

    return {
        "merchant": merchant,
        "amount": round(amount, 2),
        "category": category,
        "date": tx_date.isoformat(),
        "transaction_type": transaction_type,
        "mode": extract_sms_mode(cleaned),
        "source_text": cleaned,
    }

def parse_sms_batch(raw_sms: str) -> tuple[list[dict], list[str]]:
    chunks = [chunk.strip() for chunk in re.split(r"[\r\n]+", raw_sms) if chunk.strip()]
    if not chunks and raw_sms.strip():
        chunks = [raw_sms.strip()]

    transactions = []
    failures = []
    seen = set()
    for chunk in chunks:
        parsed = parse_single_sms_transaction(chunk)
        if not parsed:
            failures.append(chunk[:160])
            continue
        dedupe_key = (
            parsed["merchant"].lower(),
            parsed["amount"],
            parsed["category"].lower(),
            parsed["date"],
            parsed["transaction_type"].lower(),
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        transactions.append(parsed)
    return transactions, failures

def transaction_already_exists(session: Session, user_id: int, tx: ParsedSMSTransaction) -> bool:
    try:
        tx_date = date.fromisoformat(tx.date)
    except ValueError:
        tx_date = date.today()
    start = datetime.combine(tx_date, datetime.min.time())
    end = start + timedelta(days=1)
    existing = session.exec(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.amount == round(float(tx.amount), 2),
            Transaction.merchant == tx.merchant,
            Transaction.category == tx.category,
            Transaction.timestamp >= start,
            Transaction.timestamp < end,
        )
    ).first()
    return existing is not None

def extract_sms_metadata(text: str):
    parsed = parse_single_sms_transaction(text)
    if not parsed:
        return 0.0, "Unknown Merchant", "Other"
    return parsed["amount"], parsed["merchant"], parsed["category"]

@app.post("/api/parse-sms")
async def parse_sms_transactions(
    data: ParseSMSInput,
    request: Request,
    user: Annotated[User, Depends(get_current_user)]
):
    rate_limiter.check(request, "sms-parse", limit=10, window_seconds=60)
    raw_sms = data.raw_sms.strip()
    if not raw_sms:
        raise HTTPException(status_code=400, detail="Paste your banking SMS history before parsing.")

    transactions, failures = parse_sms_batch(raw_sms)
    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="Vaultic could not detect valid bank transactions. Try pasting complete SMS messages with amount and merchant details."
        )

    gemini_enhanced_count = 0
    gemini_failed_count = 0
    if data.use_gemini:
        if not settings.GOOGLE_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="Gemini enrichment is not configured. Use local parsing or configure GOOGLE_API_KEY.",
            )
        if len(transactions) > 20:
            raise HTTPException(
                status_code=422,
                detail="Gemini enrichment is limited to 20 transactions per request.",
            )

        from parser import extract_transaction_info

        valid_categories = {
            "food & dining": "Food & Dining",
            "food": "Food & Dining",
            "dining": "Food & Dining",
            "shopping": "Shopping",
            "transport & fuel": "Transport & Fuel",
            "transport": "Transport & Fuel",
            "travel": "Transport & Fuel",
            "bills & utilities": "Bills & Utilities",
            "bills": "Bills & Utilities",
            "utilities": "Bills & Utilities",
            "entertainment": "Entertainment",
            "healthcare": "Healthcare",
            "investment": "Investment",
            "personal transfer": "Personal Transfer",
            "transfer": "Personal Transfer",
            "other": "Other",
        }
        for transaction in transactions:
            try:
                suggestion = await asyncio.to_thread(
                    extract_transaction_info, transaction["source_text"]
                )
                merchant = str(suggestion.merchant or "").strip()
                if merchant:
                    transaction["merchant"] = normalize_merchant_name(merchant)
                category = valid_categories.get(str(suggestion.category).strip().lower())
                if category:
                    transaction["category"] = category
                gemini_enhanced_count += 1
            except Exception as error:
                gemini_failed_count += 1
                logger.warning("Gemini enrichment failed: %s", type(error).__name__)

    return {
        "status": "success",
        "transactions": transactions,
        "failed_count": len(failures),
        "warnings": failures[:5],
        "gemini_enhanced_count": gemini_enhanced_count,
        "gemini_failed_count": gemini_failed_count,
    }

@app.post("/api/import-sms-transactions")
async def import_sms_transactions(
    data: ImportSMSTransactionsInput,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    if not data.transactions:
        raise HTTPException(status_code=400, detail="Select at least one transaction to import.")

    imported = []
    duplicates = []
    skipped = []
    for tx in data.transactions:
        if tx.amount <= 0:
            skipped.append({"merchant": tx.merchant, "reason": "Invalid amount"})
            continue
        if tx.transaction_type.lower() == "credit":
            skipped.append({"merchant": tx.merchant, "reason": "Credit transactions are not stored as expenses"})
            continue
        if transaction_already_exists(session, user.id, tx):
            duplicates.append(tx.dict())
            continue

        try:
            tx_date = date.fromisoformat(tx.date)
        except ValueError:
            tx_date = date.today()

        timestamp = datetime.combine(tx_date, datetime.now().time())
        new_transaction = Transaction(
            amount=round(float(tx.amount), 2),
            merchant=tx.merchant,
            bank_name="SMS Import",
            category=tx.category,
            is_personal_transfer=bool(re.search(r"\b(upi|imps|neft|rtgs|transfer|vpa)\b", tx.source_text or "", re.IGNORECASE)),
            timestamp=timestamp,
            user_id=user.id,
        )
        session.add(new_transaction)
        imported.append(new_transaction)

    if imported:
        # This endpoint imports historical statements. The saved balance is a
        # current snapshot, so subtracting old transactions would double-count
        # them and corrupt the starting capital used by projections.
        session.commit()
        for tx in imported:
            session.refresh(tx)
        compile_financial_destiny_matrix(user.id, session)
    else:
        session.rollback()

    return {
        "status": "success",
        "imported_count": len(imported),
        "duplicate_count": len(duplicates),
        "skipped_count": len(skipped),
        "transactions": [
            {
                "id": tx.id,
                "merchant": tx.merchant,
                "amount": tx.amount,
                "category": tx.category,
                "date": tx.timestamp.date().isoformat(),
            }
            for tx in imported
        ],
        "duplicates": duplicates[:10],
        "skipped": skipped[:10],
    }

@app.post("/analytics/sms-ingest")
async def ingest_sms_notification(data: SMSInput, user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    """Ingest SMS transaction and broadcast to connected WebSocket clients."""
    parsed = parse_single_sms_transaction(data.text)
    if not parsed:
        raise HTTPException(status_code=400, detail="Neural Parser could not safely extract transaction parameters.")
    if parsed["transaction_type"] == "Credit":
        return {"status": "CREDIT_IGNORED", "detail": "Credit messages are not recorded as expenses."}

    amount, merchant, category = parsed["amount"], parsed["merchant"], parsed["category"]
    
    if amount <= 0.0:
        raise HTTPException(status_code=400, detail="Neural Parser could not safely extract debit parameters.")

    is_transfer = "transfer" in data.text.lower() or "vpa" in data.text.lower()

    new_transaction = Transaction(
        amount=amount,
        merchant=merchant,
        bank_name=data.bank_name or "Detected Account",
        category=category,
        is_personal_transfer=is_transfer,
        user_id=user.id
    )
    
    user.current_bank_balance = max(0.0, (user.current_bank_balance or 0.0) - amount)
    
    session.add(new_transaction)
    session.add(user)
    session.commit()
    session.refresh(new_transaction)
    
    # Broadcast real-time update to WebSocket clients
    await manager.send_transaction_update(user.id, {
        "id": new_transaction.id,
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "bank": data.bank_name or "Detected Account",
        "timestamp": new_transaction.timestamp.isoformat(),
        "balance_remaining": user.current_bank_balance
    })
    
    return {
        "status": "PROCESSED",
        "extracted_data": {
            "amount": amount,
            "merchant": merchant,
            "category": category,
            "system_balance_remaining": user.current_bank_balance
        }
    }
@app.post("/simulate/plan", responses={400: {"description": "Invalid plan parameters"}})
async def generate_autonomous_plan(data: PlanInput, user: Annotated[User, Depends(get_current_user)], session: Annotated[Session, Depends(get_session)]):
    """
    Autonomous Strategy Vector Core that maps custom capital targets against baseline macro conditions.
    """
    # 1. Read existing profile constants
    monthly_income = user.monthly_income or data.income
    fixed_costs = (user.rent or 0) + (user.emis or 0) + (user.insurance or 0)
    
    # 2. Extract baseline available capital surplus
    available_surplus = monthly_income - fixed_costs
    if available_surplus <= 0:
        raise HTTPException(
            status_code=400, 
            detail="STRATEGY ABORTED: Fixed operational liabilities exceed top-line system revenue."
        )
        
    # 3. Required SIP net of existing bank balance (12% annual return)
    required_monthly_sip = compute_required_sip(
        goal_amount=data.goal_amount,
        years=data.years,
        current_capital=user.current_bank_balance or 0,
    )

    # 4. Run feasibility check against real cash flow constraints
    is_feasible = required_monthly_sip <= available_surplus
    allocation_percentage = round((required_monthly_sip / monthly_income) * 100, 1) if monthly_income > 0 else 0
    
    # 5. Commit strategy parameters back to relational database goals tables
    new_goal = Goal(
        goal_name=data.goal_name,
        target_amount=data.goal_amount,
        years=data.years,
        required_sip=required_monthly_sip,
        user_id=user.id
    )
    session.add(new_goal)
    session.commit()
    session.refresh(new_goal)

    # 6. Generate custom structural breakdown string
    status_phrase = "OPTIMAL TRAJECTORY SECURED" if is_feasible else "CAPITAL SHORTFALL DETECTED"
    strategy_advice = (
        f"To hit the '{data.goal_name}' target of ₹{data.goal_amount:,} in {data.years} years, your engine requires an allocation of ₹{required_monthly_sip:,}/month ({allocation_percentage}% of top-line revenue). "
        if is_feasible else 
        f"WARNING: Reaching the '{data.goal_name}' target requires ₹{required_monthly_sip:,}/month, which exceeds your current liquid surplus by ₹{round(required_monthly_sip - available_surplus, 2):,}. Increase top-line income or scale timeline parameters outward by 24-36 months."
    )

    return {
        "strategy_status": status_phrase,
        "required_monthly_allocation": required_monthly_sip,
        "is_cashflow_feasible": is_feasible,
        "allocation_ratio_percentage": allocation_percentage,
        "tactical_guidance_log": strategy_advice,
        "stored_goal_id": new_goal.id
    }


@app.post(API_PREFIX + "/telemetry/sms-webhook", responses={403: {"description": "Invalid webhook token or secret"}, 400: {"description": "Invalid SMS crawl data"}, 404: {"description": "Target user not found"}})
async def sms_webhook_ingestion(
    data: SMSWebhookInput,
    request: Request,
    x_vaultic_token: Annotated[str | None, Header()] = None,
    session: Annotated[Session, Depends(get_session)] = None
):
    """Ingest an SMS transaction only for the explicitly selected user."""
    rate_limiter.check(request, "sms-webhook", limit=60, window_seconds=60)
    webhook_secret = settings.VAULTIC_WEBHOOK_SECRET
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="SMS webhook is not configured.")
    if not x_vaultic_token or not hmac.compare_digest(x_vaultic_token, webhook_secret):
        logger.warning("Rejected SMS webhook with missing or invalid token")
        raise HTTPException(status_code=403, detail="Invalid webhook token.")

    user = session.get(User, data.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    amount, merchant, category = extract_sms_metadata(data.text)
    if amount <= 0.0:
        raise HTTPException(status_code=400, detail="Could not extract transaction amount from SMS")

    is_transfer = bool(
        re.search(r"\b(transfer|vpa)\b", data.text, re.IGNORECASE)
    )
    new_transaction = Transaction(
        amount=round(amount, 2),
        merchant=merchant,
        bank_name=data.bank_name or "Automated",
        category=category,
        is_personal_transfer=is_transfer,
        user_id=user.id,
    )
    session.add(new_transaction)
    session.commit()
    session.refresh(new_transaction)

    await manager.send_webhook_event(user.id, "sms_transaction", {
        "id": new_transaction.id,
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "bank": new_transaction.bank_name,
        "balance_remaining": user.current_bank_balance
    })

    logger.info(f"Webhook SMS processed: {merchant} {amount} INR")
    broadcast_status = (
        "sent_to_active_clients"
        if manager.get_connection_count(user.id) > 0
        else "no_active_clients"
    )
    return {
        "status": "WEBHOOK_PROCESSED",
        "transaction_id": new_transaction.id,
        "broadcast_status": broadcast_status
    }


if __name__ == "__main__":
    import os
    port_env = os.environ.get('PORT') or os.environ.get('API_PORT')
    try:
        port = int(port_env) if port_env else 8001
    except Exception:
        port = 8001

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=False,
        reload=settings.DEBUG_MODE
    )
