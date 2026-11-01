# VAULTIC API

FastAPI service for identity, user profile, planning projections, transaction parsing/import, analytics, integrations, and authenticated WebSocket telemetry. Route definitions and actual response shapes in `main.py` are authoritative.

## Stack and request flow

Python 3.12 runs FastAPI on Uvicorn. Pydantic validates HTTP inputs; SQLModel (built on SQLAlchemy) maps models and sessions to SQLite locally or PostgreSQL in production. `main.py` composes routes and middleware. `config.py` loads environment-backed settings and rejects unsafe production configuration. `auth.py` hashes passwords and signs JWTs with PyJWT. `security.py` validates required JWT claims and supplies user/role dependencies. `parser.py` and `nlp_parser.py` provide optional SMS parsing helpers; `stress_tester.py` contains planning simulations. `websocket_routes.py` and `websocket_manager.py` implement telemetry connections.

Typical request path: browser sends JSON and a bearer token → FastAPI validates the model and authentication dependency → route reads/writes through a SQLModel session → JSON response is rendered by the frontend. Parser/Google integrations are optional and require server-side credentials.

## Run locally

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Set `DATABASE_URL=sqlite:///./finova_core.db` for local SQLite. The interactive docs are at `/docs` while debug mode is enabled. For Docker Compose, copy the root and backend env templates first; Compose uses PostgreSQL and binds development ports to localhost.

## Configuration

See `.env.example` for the variable list. Important values: `DATABASE_URL`, `SECRET_KEY` (or `VAULTIC_SECRET_KEY`), `ENVIRONMENT`, `DEBUG_MODE`, `CORS_ORIGINS`, `FRONTEND_BASE_URL`, and optional Google OAuth/Gemini/webhook settings. Production startup requires PostgreSQL, a unique 32+ character signing secret, HTTPS frontend and CORS origins, a matching CORS/frontend origin, HS256, debug disabled, and a token lifetime no longer than 24 hours. Keep secrets in the hosting secret store. Do not commit `.env` files, database files, private keys, or model artifacts containing user data.

## API map

The API prefix defaults to `/api/v1` for versioned service routes; authentication routes also include `/auth/*`. The implementation includes signup/login and optional Google OAuth, profile/dashboard endpoints, planning/simulation, SMS parsing and import, analytics, integration status, and WebSocket telemetry. `/health` is the service health endpoint. Inspect `/openapi.json` or `/docs` in development for the precise current method, schema, and response.

## Security boundaries

Password hashes and signed short-lived tokens protect identity routes. Request schemas cap SMS text and imported transaction counts/field sizes. Basic process-local rate limits protect expensive/auth endpoints, and WebSockets check browser origin and configured connection capacity. Those limits reset on restart and are not shared by replicas; put a durable limiter and connection controls at the edge for multi-instance deployments. Never load untrusted pickle files; the legacy ML helper uses Python pickle and must only ever receive trusted, integrity-checked artifacts. JWTs currently reach the frontend in a JavaScript-readable cookie, which remains an XSS token-theft risk.

## Verification

Run `python -m pytest -q tests/test_security_hardening.py` from this directory. A successful unit run does not replace dependency scanning, integration tests against the deployment database, or external security review.
