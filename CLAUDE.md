# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (frontend + backend concurrently)
npm run dev

# Frontend only (Vite on :8080)
npm run dev:client

# Backend only (Fastify on :3000)
npm run dev:server

# Build for production (frontend + backend)
npm run build

# Preview production build
npm run preview

# Run all tests (Vitest frontend + backend)
npm test

# Run frontend tests in watch mode
npm run test:watch

# Run a single test file
npx vitest run src/__tests__/useFinanceData.test.ts

# Run a single backend test
npx vitest run server/__tests__/budget.test.ts

# Lint
npm run lint
```

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Fastify 5 + TypeScript (compiled via `tsc -p server/tsconfig.json`)
- **Database**: SQLite via better-sqlite3 (WAL mode, stored in `./data/`)
- **Auth**: JWT via @fastify/jwt (optional — gated by `AUTH_ENABLED` env var)
- **Charts**: d3-sankey (Sankey flow diagram) + custom donut chart

### Structure

```
├── src/                          # Frontend (React + Vite)
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   ├── pages/Index.tsx           # Main single-page layout (chart + sidebar)
│   ├── components/
│   │   ├── finance/              # App-specific components
│   │   │   ├── FinanceSidebar.tsx # Sidebar for editing budget data
│   │   │   ├── SankeyChart.tsx   # Sankey flow visualization
│   │   │   ├── DonutChart.tsx    # Donut/ring chart
│   │   │   ├── AuthBar.tsx       # Login/signup bar
│   │   │   └── SummaryBar.tsx    # Income/expenses/remaining summary
│   │   └── ui/                   # shadcn/ui primitives (~30 components)
│   ├── hooks/
│   │   ├── useFinanceData.ts     # Core state: income CRUD, category/expense CRUD,
│   │   │                         # localStorage persistence, auto-save to server,
│   │   │                         # stats calculation, JSON export/import
│   │   ├── useAuth.ts            # Auth state: login, register, session check,
│   │   │                         # account deletion
│   │   ├── use-mobile.tsx        # Responsive breakpoint detection
│   │   └── use-toast.ts          # Shadcn toast hook
│   ├── lib/
│   │   ├── api.ts                # ApiClient class (fetch wrapper with retry,
│   │   │                         #   JWT bearer, error parsing)
│   │   └── utils.ts              # Shadcn cn() utility
│   └── types/
│       ├── finance.ts            # FinanceData, Category, IncomeItem, Stats
│       └── api.ts                # ApiUser, ApiBudgetData, ApiAuthResponse
├── server/                       # Backend (Fastify)
│   ├── index.ts                  # Server entry: JWT, CORS, rate-limit,
│   │                             #   static serving, route registration
│   ├── config.ts                 # Env-based config (PORT, HOST, JWT_SECRET,
│   │                             #   AUTH_ENABLED, LOG_LEVEL)
│   ├── db/schema.ts              # SQLite schema: users, budget_data tables
│   ├── middleware/auth.ts        # JWT verification or anonymous fallback
│   ├── routes/
│   │   ├── auth.ts               # POST /api/auth/{register,login}, GET /api/auth/{me,setup-status},
│   │   │                         #   DELETE /api/auth/account
│   │   └── budget.ts             # GET/PUT /api/budget
│   └── __tests__/                # Backend tests (Vitest with mocked SQLite)
├── Dockerfile                    # Multi-stage: deps → build → runner (node:20-slim)
└── docker-compose.yml            # Quick-start with data volume
```

### Key Data Flow

1. **`useFinanceData`** is the single source of truth for the budget model. It manages `FinanceData` (income sources + expense categories with items), persists to `localStorage` on every change, and auto-saves to the backend (debounced 2s) when authenticated.
2. **`useAuth`** handles JWT-based auth. When `AUTH_ENABLED=false` (dev default), it skips login and creates a default session.
3. **`ApiClient`** is a lightweight fetch wrapper with exponential backoff retry (2 retries), JWT bearer injection, and unified error extraction. Used by both hooks.
4. **Server** serves the SPA in production via `@fastify/static` (SPA fallback for non-`/api` routes). In dev, Vite proxies `/api` to `localhost:3000`.

### Auth Behavior

- `AUTH_ENABLED=false` (dev default): anonymous access with a `default` user. No JWT validation on endpoints.
- `AUTH_ENABLED=true`: first-user-is-admin registration flow. All budget endpoints require a valid JWT.
- Auth routes are rate-limited (20 req/min). Budget routes are not (autosave needs many requests).

### Build Targets

- **Frontend**: Vite builds to `./dist/` (served by Fastify in production)
- **Backend**: `tsc -p server/tsconfig.json` compiles to `./server/dist/` (CommonJS)
- **Docker**: Multi-stage build that runs `server/dist/index.js` as `tini` entrypoint