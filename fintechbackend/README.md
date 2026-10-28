# Vaultic Backend

This is the FastAPI backend for Vaultic. It owns authentication, database access, dashboard analytics, transaction ingestion, SMS parsing, goal planning, stress testing, and WebSocket support.

## Stack

| Tool | Role |
| --- | --- |
| FastAPI | HTTP API and automatic Swagger docs |
| SQLModel | Database tables and ORM sessions |
| SQLAlchemy | Query engine underneath SQLModel |
| Pydantic | Request and response validation |
| Uvicorn | ASGI server |
| python-jose | JWT validation |
| bcrypt/passlib | Password hashing |
| SQLite/PostgreSQL | Local and production persistence |

## Important Files

```text
main.py                 FastAPI app, routes, analytics, parser endpoints
models.py               SQLModel tables and request models
database_new.py         Engine, sessions, startup lifecycle
auth.py                 Password hashing and JWT creation
security.py             Auth dependency helpers and role checks
config.py               Environment-driven settings
nlp_parser.py           Optional parser support and merchant classification helpers
parser.py               AI/parser wrapper with fallback behavior
stress_tester.py        Wealth stress simulation logic
websocket_manager.py    WebSocket connection management
websocket_routes.py     WebSocket routes
seed_test_data.py       Test/demo data seeding
seed_rbac.py            Admin/user role seeding
```

## Data Model

Models live in `models.py`.

| Model | Purpose |
| --- | --- |
| `User` | Login identity, role, income, expenses, balance, savings rate, goal metadata |
| `Transaction` | Expense ledger used by every analytics module |
| `Goal` | User financial goals and required SIP |
| `UserProfileSnapshot` | Serialized onboarding payload |
| `DailySnapshot` | Daily budget/spend tracking |

The `Transaction` table is the shared expense storage. Do not create a separate database for imported transactions unless the product requirements change.

## Request Flow

```text
Frontend fetch
  |
  v
FastAPI route in main.py
  |
  v
get_current_user() validates JWT
  |
  v
get_session() opens SQLModel session
  |
  v
Route reads/writes User, Transaction, Goal, snapshots
  |
  v
JSON response returns to frontend
```

## Authentication And RBAC

- `POST /auth/signup` creates users.
- `POST /auth/login` verifies password and returns a JWT.
- Protected routes depend on `get_current_user`.
- JWT `sub` is matched against username or email.
- `User.role` supports role-based access.
- `require_roles(...)` restricts admin routes.
- WebSocket routes enforce ownership/admin access.

Seed admin/user roles:

```powershell
cd "D:\final vault\VAULTIC\fintechbackend"
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "StrongPass123"
python seed_rbac.py
```

## Core Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/signup` | Register identity |
| `POST /auth/login` | Login and receive JWT |
| `POST /user/setup` | Store onboarding profile and goal setup |
| `GET /dashboard/summary` | Main dashboard payload |
| `GET /analytics/transactions` | Transaction history and total volume |
| `GET /analytics/optimize` | Optimization suggestions |
| `POST /analytics/execute-optimization` | Optimization action event |
| `POST /analytics/nlp-train` | Train parser/merchant recognition from user history |
| `POST /analytics/sms-ingest` | Existing single SMS transaction ingestion |
| `POST /api/parse-sms` | Batch parse pasted banking SMS history |
| `POST /api/import-sms-transactions` | Import selected parsed transactions |
| `POST /simulate/trajectory` | Freedom projection with boost |
| `POST /simulate/stress-test` | Stress scenario simulation |
| `POST /simulate/plan` | Goal plan and required SIP calculation |
| `POST /api/v1/telemetry/sms-webhook` | Automated SMS webhook path |

## SMS Parser Architecture

The parser is part of Wealth Audit and writes into the same `Transaction` table as the rest of Vaultic.

### Parse Endpoint

`POST /api/parse-sms`

Request:

```json
{
  "raw_sms": "Rs.1200 debited at Swiggy\nINR 540 paid to Uber"
}
```

Response:

```json
{
  "status": "success",
  "transactions": [
    {
      "merchant": "Swiggy",
      "amount": 1200,
      "category": "Food & Dining",
      "date": "2026-07-07",
      "transaction_type": "Debit",
      "mode": "Bank Transaction",
      "source_text": "Rs.1200 debited at Swiggy"
    }
  ],
  "failed_count": 0,
  "warnings": []
}
```

The parser extracts amount, merchant, transaction type, category, date, payment mode, and source text.

Supported modes/signals:

- UPI
- Debit Card
- Credit Card
- ATM Withdrawal
- Net Banking
- Wallet
- IMPS
- NEFT
- RTGS

Merchant categories:

- Food & Dining: Swiggy, Zomato, McDonald's, Domino's
- Shopping: Amazon, Flipkart, Myntra, Reliance Digital, Zara
- Transport & Fuel: Uber, Ola, Rapido
- Bills & Utilities: Airtel, Jio, BSNL, electricity, water
- Entertainment: Netflix, Spotify, Prime Video
- Healthcare: Apollo, PharmEasy, Tata 1mg
- Investment: Zerodha, Groww, Upstox
- Other: fallback

### Import Endpoint

`POST /api/import-sms-transactions`

Behavior:

1. Rejects empty import requests.
2. Skips invalid amounts.
3. Skips credit transactions because the current `Transaction` model is an expense ledger.
4. Checks duplicates by user, amount, merchant, category, and transaction date.
5. Inserts valid rows into `Transaction`.
6. Deducts imported expense total from `User.current_bank_balance`.
7. Recomputes the financial destiny summary.
8. Existing dashboard endpoints automatically reflect the new ledger.

## Dashboard Summary Calculation

`GET /dashboard/summary` gathers user profile, recent transactions, spending by category, goals, safe daily budget, freedom projection, lazy cash leak, financial health score, generated nudges, and destiny summary text.

This route is the main synchronization point for Overview, Freedom, Leaks, and Core Engine surfaces.

## Running Locally

Install dependencies:

```powershell
cd "D:\final vault\VAULTIC\fintechbackend"
pip install -r requirements.txt
```

Run on default port:

```powershell
python -B main.py
```

Run on alternate port:

```powershell
$env:API_PORT = "8002"
python -B main.py
```

Open docs at `http://127.0.0.1:8001/docs` or `http://127.0.0.1:8002/docs`.

## Environment

Common variables:

```text
SECRET_KEY=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=postgresql://user:password@localhost:5432/vaultic
API_PORT=8001
```

Keep real secrets out of git.

## Verification

Syntax check without writing `__pycache__`:

```powershell
python -B -c "import ast, pathlib; ast.parse(pathlib.Path('main.py').read_text(encoding='utf-8'))"
```

Parser smoke test:

```powershell
python -B -c "import json; from main import parse_sms_batch; rows, failures = parse_sms_batch('Rs.1200 debited at Swiggy\nINR 540 paid to Uber\nYour account has been debited by Rs 15000 at Reliance Digital'); print(json.dumps({'rows': rows, 'failures': failures}, ensure_ascii=True))"
```

Route check:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8001/openapi.json | Select-Object -ExpandProperty paths
```

## Common Problems

### `/api/parse-sms` returns 404

The frontend is talking to an old backend process. Confirm the live route table:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8001/openapi.json | Select-Object -ExpandProperty paths
```

If `/api/parse-sms` is missing, restart the backend from this folder or run the updated backend on `8002`.

### Port 8001 is already in use

Run on `8002`:

```powershell
$env:API_PORT = "8002"
python -B main.py
```

### Database values do not update after SMS import

Check that you are importing selected rows, not only parsing them. Parsing is review-only; import writes rows into `Transaction`.

### Credit SMS messages are skipped

This is intentional. The current analytics model treats `Transaction` as expense storage. Credits need a separate income/cashflow model before they should affect spending analytics.
