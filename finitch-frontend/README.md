# Vaultic Frontend

This is the Next.js frontend for Vaultic. It is the user-facing application for onboarding, dashboard analytics, Wealth Audit, freedom projections, leak detection, and the Core Engine.

## Stack

| Tool | Role |
| --- | --- |
| Next.js App Router | Routing, pages, builds, API route support |
| React | UI state and components |
| TypeScript | Static typing |
| Tailwind CSS | Utility styling and Vaultic design tokens |
| Framer Motion | Motion and transitions |
| Recharts | Charts and financial visualizations |
| Lucide React | Icons |

## Folder Map

```text
app/
  page.tsx                      Landing page
  login/page.tsx                Login and token capture
  layout.tsx                    Root layout
  globals.css                   Vaultic theme and shared classes
  dashboard/
    page.tsx                    Overview
    audit/page.tsx              Wealth Audit and SMS transaction import
    freedom/page.tsx            Freedom projection
    leaks/page.tsx              Spending leak analysis
    core/page.tsx               Core Engine and planning surface
    stress-sandbox/page.tsx     Stress simulator
    wrapped/page.tsx            Wrapped/summary experience
components/
  Dashboard/                    Overview widgets and sidebar
  Engine/                       Goal and engine widgets
  Charts/                       Shared chart components
  landing/                      Landing page sections
lib/
  cookies.ts                    Auth token helpers
  finance.ts                    Onboarding storage helpers
  routes.ts                     Route constants/helpers
```

## Design System

Use the existing Vaultic classes in `app/globals.css`:

- `vaultic-page`
- `vaultic-panel`
- `vaultic-input`
- `vaultic-btn-primary`
- `vaultic-btn-secondary`
- `vaultic-alert-error`
- `vaultic-alert-success`
- `vaultic-chip`

Prefer these shared classes before creating new visual patterns.

## Authentication Flow

1. Login sends credentials to the backend.
2. Backend returns a JWT.
3. Frontend stores the token through `lib/cookies.ts`.
4. Dashboard pages read the token with `getAuthToken()`.
5. Protected API calls include `Authorization: Bearer <token>`.
6. A `401` clears the token and redirects to `/login`.

## Dashboard Data Flow

The main dashboard calls `/dashboard/summary`.

That response powers daily safe budget, health score, profile cards, recent transactions, goals, spending breakdown, wealth leaks, freedom timeline, and Core Engine quick insights.

## Wealth Audit SMS Import

File: `app/dashboard/audit/page.tsx`

Flow:

1. User pastes banking SMS history into `Import Bank Transactions`.
2. `handleParseTransactions()` posts `{ raw_sms }` to `/api/parse-sms`.
3. Parsed rows render in a review table.
4. User can edit category and deselect unwanted rows.
5. `handleImportTransactions()` posts selected rows to `/api/import-sms-transactions`.
6. On success, `fetchAuditLedger()` refreshes `/analytics/transactions` and `/dashboard/summary`.
7. Imported rows are stored in the backend `Transaction` table, so Overview, Wealth Audit, Leaks, Freedom, and Core Engine update from the shared ledger.

Local API fallback:

- `NEXT_PUBLIC_API_BASE_URL` if set
- `http://127.0.0.1:8002`
- `http://localhost:8002`
- `http://127.0.0.1:8001`
- `http://localhost:8001`

## Running

```powershell
cd "D:\final vault\VAULTIC\finitch-frontend"
npm install
npm run dev
```

Open `http://localhost:3000`.

Build:

```powershell
npm run build
```

## Environment

Optional `.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
```

Do not place backend secrets in frontend environment variables. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Adding A Dashboard Feature

1. Put route-level screens under `app/dashboard/<feature>/page.tsx`.
2. Add reusable UI under `components/Dashboard` or `components/Engine`.
3. Use shared Vaultic classes from `globals.css`.
4. Fetch backend data with the auth token from `lib/cookies.ts`.
5. Reuse `/dashboard/summary` where possible.
6. If the feature writes expenses, write to backend `Transaction` so all analytics remain synchronized.
