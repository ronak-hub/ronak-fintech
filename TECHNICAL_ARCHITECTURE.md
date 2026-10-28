# VAULTIC: Technical Architecture Documentation

## Document Overview
This document provides detailed technical architecture information about the Vaultic application, suitable for code reviews, technical assessments, and educational purposes.

---

## Table of Contents
1. System Architecture
2. Component Architecture
3. Data Flow Diagrams
4. API Specifications
5. Database Schema
6. Security Architecture
7. Performance Considerations
8. Scalability Roadmap

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER TIER                               │
│                     (Browser/Client)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (HTTPS/TCP)
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER                             │
│              Next.js Frontend (React Components)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Landing Page │ Dashboard │ Freedom Path │ Goal Planner  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Navbar │ Charts │ Cards │ Sliders │ Forms │ Animations  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (REST API/JSON)
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION TIER                              │
│                   FastAPI Server (Python)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Route Handlers │ Business Logic │ Validation │ Security  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /auth/login │ /auth/register │ /dashboard/summary        │   │
│  │ /simulate/trajectory │ Other Endpoints                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (SQL)
┌─────────────────────────────────────────────────────────────────┐
│                    DATA TIER                                    │
│                PostgreSQL Database (Primary)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ User Table │ Transaction Table │ Goal Table │ Snapshot   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Layers

#### Layer 1: Presentation (Frontend)
```
Next.js Application
├── Client-Side Rendering (CSR)
├── Server-Side Rendering (SSR) - optional pages
├── Static Generation (SSG) - optional pages
└── Incremental Static Regeneration (ISR) - optional

React Components
├── Functional Components (hooks-based)
├── Custom Hooks (useCallback, useState, useEffect)
├── Context API (for global state if needed)
└── Refs (for DOM manipulation)

Styling System
├── Tailwind CSS (utility-first)
├── CSS-in-JS (framer-motion inline styles)
├── CSS Modules (component-scoped styles)
└── Global CSS (animations, keyframes)

Build Tools
├── Turbopack (bundler)
├── TypeScript Compiler (type checking)
├── ESLint (code quality)
└── PostCSS (CSS processing)
```

#### Layer 2: API Gateway & Security
```
HTTP Client (Fetch API)
├── Request Headers (Authorization, Content-Type)
├── JWT Token Management (localStorage)
├── Error Handling (4xx, 5xx responses)
└── Retry Logic (optional)

CORS Middleware
├── Allowed Origins (frontend domain)
├── Allowed Methods (GET, POST, PUT, DELETE)
├── Allowed Headers (Authorization, Content-Type)
└── Credential Handling
```

#### Layer 3: Application Server
```
FastAPI Framework
├── Routing (decorator-based)
├── Request Validation (Pydantic models)
├── Response Serialization
└── OpenAPI Documentation

Middleware Stack
├── CORS Handler
├── Authentication Handler
├── Error Handler
└── Logging Handler

Business Logic
├── Authentication Service
├── Dashboard Service
├── Simulation Engine
└── Data Processing
```

#### Layer 4: Data Access & Persistence
```
ORM Layer (SQLAlchemy)
├── Session Management
├── Query Building
├── Relationship Loading
├── Transaction Management

Database Layer (PostgreSQL)
├── ACID Compliance
├── Foreign Key Constraints
├── Indexing
└── Query Execution
```

---

## 2. COMPONENT ARCHITECTURE

### 2.1 Frontend Component Hierarchy

```
App (Root Layout)
│
├── Navbar
│   ├── Logo
│   ├── Navigation Links
│   ├── User Profile (Conditional)
│   └── Auth Buttons (Conditional)
│
├── Main Routes
│   │
│   ├── Landing Page (/dashboard -> Login redirect)
│   │   ├── HeroSection
│   │   ├── QuickStatsCards
│   │   ├── GraphVisualization
│   │   ├── InteractiveDemo
│   │   │   ├── MetricsButtons
│   │   │   └── Recharts LineChart
│   │   ├── FeatureCards
│   │   └── Footer
│   │
│   ├── Dashboard (/dashboard)
│   │   ├── ControlCenter
│   │   ├── FinancialProfileCards (4-card grid)
│   │   │   ├── MonthlyIncomeCard
│   │   │   ├── FixedExpensesCard
│   │   │   ├── BankBalanceCard
│   │   │   └── SavingsTargetCard
│   │   ├── CapitalEvaporationSection
│   │   ├── RecentTransactionsList
│   │   │   └── TransactionItem[] (mapped)
│   │   ├── ActiveGoalsGrid
│   │   │   └── GoalCard[] (mapped)
│   │   ├── SpendingBreakdown
│   │   │   └── CategoryItem[] (mapped)
│   │   └── StrategicMatrixPlanner
│   │
│   ├── Freedom Path (/dashboard/freedom)
│   │   ├── CurrentStatusPanel
│   │   └── InteractiveSimulator
│   │       ├── MonthlyBoostSlider
│   │       ├── WarpTrajectoryButton
│   │       └── SimulationResultsDisplay
│   │
│   ├── Wealth Audit (/dashboard/audit)
│   ├── Goal Planner (/dashboard/core)
│   ├── Neural Leaks (/dashboard/leaks)
│   └── [Other Dashboard Pages]
│
└── Auth Routes
    ├── Login Page
    └── Register Page (if implemented)
```

### 2.2 Component State Management

Each component manages:
- **Local State**: useState for component-specific data
- **Async State**: Loading, error, data states
- **Form State**: Input values, validation
- **UI State**: Modals, dropdowns, visibility

Example Dashboard Component Pattern:
```typescript
const DashboardPage = () => {
  // State declarations
  const [pulse, setPulse] = useState<DashboardPulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Memoized callbacks
  const fetchDashboardData = useCallback(async () => {
    // Implementation
  }, [router]);

  // Effects
  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  // Conditional rendering
  if (loading) return <LoadingState />;
  if (error) return <ErrorState />;

  // Main render
  return <DashboardLayout data={pulse} />;
};
```

### 2.3 Reusable Component Patterns

**Card Component Pattern:**
```typescript
interface CardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle?: string;
  color?: string;
}

const Card: React.FC<CardProps> = ({ title, icon, value, subtitle, color }) => (
  <div className={`bg-[#0d0d0d] border border-white/5 p-6 rounded-2xl ${color}`}>
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] font-bold uppercase">{title}</span>
      {icon}
    </div>
    <p className="text-2xl font-black mt-2">{value}</p>
    {subtitle && <p className="text-xs font-light text-gray-400">{subtitle}</p>}
  </div>
);
```

**List Item Pattern with Mapping:**
```typescript
{data?.map((item, idx) => (
  <div key={`item-${item.id}`} className="flex items-center justify-between">
    <span>{item.name}</span>
    <span className="text-orange-500 font-bold">₹{item.amount}</span>
  </div>
))}
```

---

## 3. DATA FLOW DIAGRAMS

### 3.1 Authentication Flow

```
User Input (Credentials)
        ↓
Frontend Form Validation
        ↓
        ├─→ Valid? ──→ Invalid Message
        └─→ Valid
            ↓
    API Call: POST /auth/login
            ↓
    Backend Validation
            ├─→ User Not Found ──→ Error Response
            └─→ User Found
                ↓
        Hash Provided Password
                ↓
        Compare with Stored Hash
                ├─→ Mismatch ──→ Error Response
                └─→ Match
                    ↓
            Generate JWT Token
            (sub: email, role: user, exp: +24h)
                ↓
            Return Token + User Data
                ↓
        Frontend: Store Token in localStorage
                ↓
        Redirect to Dashboard
```

### 3.2 Dashboard Data Load Flow

```
Component Mount
        ↓
Check localStorage for Token
        ├─→ No Token ──→ Redirect to Login
        └─→ Token Found
            ↓
    Construct API Headers
    {Authorization: "Bearer <token>"}
            ↓
    API Call: GET /dashboard/summary
            ↓
    Backend: Verify JWT Token
            ├─→ Invalid/Expired ──→ 401 Response
            └─→ Valid
                ↓
        Extract user_id from Token
                ↓
        Query User from Database
                ↓
        Query User's Transactions (Last 10)
                ↓
        Query User's Goals
                ↓
        Calculate Metrics:
        - Daily Budget = (Monthly Income - Fixed Expenses) / 30
        - Lazy Loss = Bank Balance × 0.09 / 365
        - Health Score = (Daily Budget - Lazy Loss) / Daily Budget × 100
        - Wealth Leaks = {daily, monthly totals}
        - Freedom Projection = Years to FI
        - Spending Aggregation = Sum by Category
                ↓
        Format Response JSON
                ↓
    Return Complete Dashboard Data
                ↓
Frontend: Parse Response
                ↓
Update Component State (setPulse)
                ↓
Render Dashboard Sections
                ↓
Display to User
```

### 3.3 Trajectory Simulation Flow

```
User Input: Boost Amount (₹1000-50000)
        ↓
User Clicks: "Warp Trajectory Timeline"
        ↓
Frontend: Get Token from localStorage
        ↓
API Call: POST /simulate/trajectory
        Body: {boost_amount: <value>}
        Headers: {Authorization: Bearer <token>}
        ↓
Backend: Verify Token
        ├─→ Invalid ──→ 401 Response
        └─→ Valid
            ↓
    Get User Financial Profile
    {monthly_income, rent, emis, insurance, 
     target_savings_rate, current_bank_balance}
            ↓
    Calculate Current Scenario:
    - Monthly Savings = Income - Expenses
    - Current Exit Date = Based on savings rate
            ↓
    Calculate Boosted Scenario:
    - New Monthly Savings = Base Savings + Boost
    - New Years to FI = Recalculate
    - New Exit Date = Based on new timeline
    - Years Saved = Old Years - New Years
            ↓
    Format Result:
    {new_exit_date, years_saved, boost}
            ↓
Frontend: Receive & Display Results
        ↓
Show Success Message with New Timeline
```

---

## 4. API SPECIFICATIONS

### 4.1 Authentication Endpoints

#### POST /auth/login
**Purpose:** User authentication

**Request:**
```json
{
  "username": "testuser",
  "password": "testpassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid credentials"
}
```

**Implementation Details:**
- Password verification using bcrypt.verify()
- JWT token includes: sub (email), role, exp
- Token expiration: 24 hours
- CORS enabled for frontend origin

---

#### POST /auth/register
**Purpose:** New user registration

**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "username": "newuser",
  "email": "user@example.com",
  "role": "user"
}
```

**Validation:**
- Username unique
- Email valid format
- Password min 8 characters
- No SQL injection risks (Pydantic validation)

---

### 4.2 Dashboard Endpoints

#### GET /dashboard/summary
**Purpose:** Get comprehensive dashboard data for authenticated user

**Headers Required:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "username": "testuser",
  "health_score": 75,
  "daily_safe_budget": 3083.33,
  "overall_health_score": 75,
  "wealth_leaks": {
    "daily_lazy_cash_loss": 7.41,
    "monthly_impact": 222.3
  },
  "freedom_data": {
    "exit_date": "2048-04-15",
    "years_remaining": 21.8,
    "total_months": 261.6
  },
  "streak_data": {
    "current_streak": 7,
    "status": "Discipline Lock Active"
  },
  "nudges": [
    "Your spending is 12% above average...",
    "Emergency fund needs attention..."
  ],
  "destiny_summary_log": "You're on track to achieve...",
  "user_profile": {
    "monthly_income": 60000,
    "rent": 0,
    "emis": 0,
    "insurance": 5000,
    "current_bank_balance": 30000,
    "target_savings_rate": 0.3
  },
  "recent_transactions": [
    {
      "id": 1,
      "merchant": "Starbucks",
      "amount": 2500,
      "category": "Food & Dining",
      "timestamp": "2026-06-14T10:30:00"
    }
  ],
  "user_goals": [
    {
      "id": 1,
      "goal_name": "Emergency Fund",
      "target_amount": 500000,
      "years": 2,
      "required_sip": 20833
    }
  ],
  "spending_by_category": {
    "Food & Dining": 5500,
    "Shopping": 5000,
    "Entertainment": 13000
  }
}
```

**Business Logic Implementation:**
```python
# Calculate daily budget
daily_limit = (monthly_income - fixed_expenses) / 30

# Calculate lazy cash loss
lazy_loss_daily = current_bank_balance * 0.09 / 365

# Calculate health score
health_score = max(0, min(100, 
  (daily_limit - lazy_loss_daily) / daily_limit * 100
))

# Query transactions
transactions = db.query(Transaction)\
  .filter(Transaction.user_id == user.id)\
  .order_by(Transaction.timestamp.desc())\
  .limit(10)\
  .all()

# Aggregate spending by category
spending = {}
for tx in transactions:
  spending[tx.category] = spending.get(tx.category, 0) + tx.amount
```

---

#### POST /simulate/trajectory
**Purpose:** Simulate financial independence timeline with boost

**Request:**
```json
{
  "boost_amount": 5000
}
```

**Response (200 OK):**
```json
{
  "new_exit_date": "2045-03-15",
  "years_saved": 3.09,
  "boost": 5000
}
```

**Calculation Logic:**
```python
# Base scenario (from user profile)
base_monthly_savings = monthly_income - (rent + emis + insurance)
base_years_to_fi = current_bank_balance / (base_monthly_savings * 12)

# Boosted scenario
boosted_monthly_savings = base_monthly_savings + boost_amount
boosted_years_to_fi = current_bank_balance / (boosted_monthly_savings * 12)

# Calculate results
years_saved = base_years_to_fi - boosted_years_to_fi
new_exit_date = today + timedelta(days=boosted_years_to_fi * 365.25)
```

---

### 4.3 Error Handling

**Standard Error Responses:**

**401 Unauthorized:**
```json
{
  "detail": "Invalid token or expired"
}
```

**422 Unprocessable Entity:**
```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

---

## 5. DATABASE SCHEMA

### 5.1 Entity-Relationship Diagram

```
┌──────────────────┐
│      USER        │
├──────────────────┤
│ id (PK)          │
│ username (UQ)    │
│ email (UQ)       │
│ hashed_password  │
│ monthly_income   │
│ rent             │
│ emis             │
│ insurance        │
│ target_savings_  │
│   rate           │
│ current_bank_    │
│   balance        │
│ role             │
│ created_at       │
└──────────────────┘
        │ 1
        │
        ├─────┬─────┐
        │     │     │
    (1:N)│ │ │(1:N)(1:N)
        │ │ │
        ↓ ↓ ↓
    ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
    │TRANSACTION  │ │    GOAL      │ │  DAILY_SNAPSHOT  │
    ├─────────────┤ ├──────────────┤ ├──────────────────┤
    │ id (PK)     │ │ id (PK)      │ │ id (PK)          │
    │ user_id (FK)│ │ user_id (FK) │ │ user_id (FK)     │
    │ amount      │ │ goal_name    │ │ snapshot_date    │
    │ merchant    │ │ target_      │ │ created_at       │
    │ bank_name   │ │   amount     │ └──────────────────┘
    │ category    │ │ years        │
    │ is_personal │ │ required_sip │
    │   _transfer │ │ timestamp    │
    │ timestamp   │ │ created_at   │
    │ is_recurring│ │              │
    │ created_at  │ │              │
    └─────────────┘ └──────────────┘
```

### 5.2 Table Definitions

**User Table:**
```sql
CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  monthly_income FLOAT DEFAULT 0,
  rent FLOAT DEFAULT 0,
  emis FLOAT DEFAULT 0,
  insurance FLOAT DEFAULT 0,
  target_savings_rate FLOAT DEFAULT 0.3,
  current_bank_balance FLOAT DEFAULT 0,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_username ON user(username);
```

**Transaction Table:**
```sql
CREATE TABLE transaction (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount FLOAT NOT NULL,
  merchant VARCHAR(255),
  bank_name VARCHAR(255),
  category VARCHAR(100),
  is_personal_transfer BOOLEAN DEFAULT FALSE,
  timestamp DATETIME,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_transaction_user_id ON transaction(user_id);
CREATE INDEX idx_transaction_timestamp ON transaction(timestamp);
CREATE INDEX idx_transaction_category ON transaction(category);
```

**Goal Table:**
```sql
CREATE TABLE goal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_name VARCHAR(255) NOT NULL,
  target_amount FLOAT NOT NULL,
  years INTEGER NOT NULL,
  required_sip FLOAT,
  timestamp DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_goal_user_id ON goal(user_id);
```

**DailySnapshot Table:**
```sql
CREATE TABLE daily_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  snapshot_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_snapshot_user_id ON daily_snapshot(user_id);
```

### 5.3 Query Patterns

**Get User with All Relationships:**
```python
from sqlalchemy.orm import joinedload

user = session.query(User)\
  .options(
    joinedload(User.transactions),
    joinedload(User.goals)
  )\
  .filter(User.id == user_id)\
  .first()
```

**Get Recent Transactions:**
```python
transactions = session.query(Transaction)\
  .filter(Transaction.user_id == user_id)\
  .order_by(Transaction.timestamp.desc())\
  .limit(10)\
  .all()
```

**Aggregate Spending by Category:**
```python
from sqlalchemy import func

spending = session.query(
  Transaction.category,
  func.sum(Transaction.amount).label('total')
)\
  .filter(Transaction.user_id == user_id)\
  .group_by(Transaction.category)\
  .all()

# Convert to dict
spending_dict = {cat: amount for cat, amount in spending}
```

---

## 6. SECURITY ARCHITECTURE

### 6.1 Authentication Security

**Password Security:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(
  schemes=["bcrypt"],
  deprecated="auto",
  bcrypt__rounds=10  # Cost factor for hashing
)

# Hash password during registration
hashed_password = pwd_context.hash(plain_password)

# Verify during login
is_valid = pwd_context.verify(login_password, stored_hash)
```

**JWT Token Structure:**
```python
# Token payload
{
  "sub": "user@example.com",      # Subject (user email)
  "role": "user",                  # User role
  "exp": 1234567890,              # Expiration timestamp (24h)
  "iss": "vaultic-auth-engine"    # Issuer
}

# Token secret stored in environment
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
```

### 6.2 Authorization & Access Control

**JWT Verification Middleware:**
```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    email: str = payload.get("sub")
    if email is None:
      raise HTTPException(status_code=401)
  except JWTError:
    raise HTTPException(status_code=401)
  
  user = db.query(User).filter(User.email == email).first()
  if user is None:
    raise HTTPException(status_code=401)
  
  return user

# Usage in routes
@app.get("/dashboard/summary")
async def get_dashboard(current_user = Depends(get_current_user)):
  # Only authenticated users can access
  return dashboard_data
```

### 6.3 CORS Security

**Configuration:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    # Add production domain here
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
```

### 6.4 Data Validation & Input Sanitization

**Pydantic Models:**
```python
from pydantic import BaseModel, EmailStr, Field

class UserLogin(BaseModel):
  username: str = Field(..., min_length=3, max_length=50)
  password: str = Field(..., min_length=8)

class TransactionCreate(BaseModel):
  amount: float = Field(..., gt=0)
  merchant: str = Field(..., min_length=1)
  category: str
  # Validated before reaching database

# Automatic validation on request
@app.post("/auth/login")
async def login(credentials: UserLogin):
  # credentials.username and credentials.password are validated
  pass
```

### 6.5 Environment Variables

**Development (.env):**
```
DATABASE_URL=postgresql://vaultic_user:secure_password_change_me@localhost:5432/vaultic_db
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Frontend Performance

**Code Splitting & Lazy Loading:**
```typescript
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(
  () => import('../components/Charts'),
  { loading: () => <LoadingSpinner /> }
);
```

**Memoization:**
```typescript
const fetchDashboardData = useCallback(async () => {
  // Only recreated when dependencies change
  // Prevents unnecessary re-renders
}, [router, token]);

const DashboardComponent = React.memo(({ data }) => {
  // Only re-renders when data prop changes
  return <Dashboard data={data} />;
});
```

**Query String Caching:**
```typescript
const response = await fetch(
  'http://localhost:8001/dashboard/summary',
  {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

### 7.2 Backend Performance

**Database Query Optimization:**
```python
# Avoid N+1 queries
user = session.query(User)\
  .options(joinedload(User.transactions))\
  .filter(User.id == user_id)\
  .first()

# Instead of
user = session.query(User).filter(User.id == user_id).first()
for tx in user.transactions:  # Additional query per transaction
  process(tx)
```

**Indexing Strategy:**
```sql
-- Foreign keys for joins
CREATE INDEX idx_transaction_user_id ON transaction(user_id);
CREATE INDEX idx_goal_user_id ON goal(user_id);

-- Frequently queried columns
CREATE INDEX idx_transaction_timestamp ON transaction(timestamp);
CREATE INDEX idx_transaction_category ON transaction(category);

-- Unique constraints
CREATE UNIQUE INDEX idx_user_email ON user(email);
CREATE UNIQUE INDEX idx_user_username ON user(username);
```

### 7.3 Network Optimization

**Request Batching:**
- Single API call `/dashboard/summary` returns all data
- Reduces number of HTTP requests
- Improves perceived performance

**Response Compression:**
```python
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

---

## 8. SCALABILITY ROADMAP

### Phase 1: Current (Single User/Development)
- ✅ PostgreSQL database configured by default
- ✅ Single-threaded Uvicorn
- ✅ Localhost deployment
- ✅ In-memory token caching

### Phase 2: Production Ready (Multiple Users)
- ❌ PostgreSQL/MySQL migration
- ❌ Connection pooling
- ❌ Caching layer (Redis)
- ❌ Rate limiting
- ❌ Docker containerization

### Phase 3: Scalable (High Traffic)
- ❌ Horizontal scaling (multiple server instances)
- ❌ Load balancing (Nginx/HAProxy)
- ❌ Microservices architecture
- ❌ Message queues (Celery/RabbitMQ)
- ❌ CDN for static assets

### Phase 4: Enterprise (Mission-Critical)
- ❌ Database replication
- ❌ Backup & disaster recovery
- ❌ Monitoring & alerting
- ❌ A/B testing infrastructure
- ❌ Analytics pipeline

---

## 9. MONITORING & DEBUGGING

### 9.1 Frontend Debugging

**Browser DevTools:**
- Console for error messages
- Network tab for API calls
- Application tab for localStorage/cookies
- Performance tab for rendering metrics

**React DevTools:**
- Component hierarchy inspection
- Props and state tracking
- Performance profiling

### 9.2 Backend Debugging

**FastAPI Swagger UI:**
```
http://localhost:8001/docs
```
- Interactive API testing
- Request/response visualization
- Parameter documentation

**Logging:**
```python
import logging

logger = logging.getLogger(__name__)

logger.info(f"User {user_id} logged in")
logger.error(f"Database error: {str(e)}")
```

### 9.3 Common Issues & Solutions

**Issue: CORS Error**
```
Error: Access to XMLHttpRequest... blocked by CORS policy
Solution: Check CORS middleware configuration in FastAPI
```

**Issue: 401 Unauthorized**
```
Error: Invalid token or expired
Solution: 
  - Check token in localStorage
  - Verify Authorization header format
  - Check token expiration time
```

**Issue: Database Locked**
```
Error: database is locked
Solution:
  - Close other connections to SQLite
  - Use WAL mode: PRAGMA journal_mode=WAL;
```

---

## CONCLUSION

This technical architecture documentation provides a comprehensive view of the VAULTIC application's internal structure, design patterns, and implementation details. The system demonstrates:

1. **Three-tier Architecture** - Presentation, Application, Data layers
2. **RESTful API Design** - Standard HTTP methods and status codes
3. **Secure Authentication** - JWT tokens with password hashing
4. **Efficient Database Design** - Normalized schema with proper relationships
5. **Performance Optimization** - Caching, indexing, and query optimization
6. **Scalability Ready** - Architecture supports future growth

All systems are implemented following industry best practices and modern web development standards.

---

**Documentation Date:** 2026-06-19  
**Version:** 1.0  
**Status:** Complete
