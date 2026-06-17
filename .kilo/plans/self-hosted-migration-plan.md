# BudgetFlow Self-Hosted Migration Plan

## Architecture

```
┌─────────────────────────────────────────────┐
│            Docker Container                  │
│                                              │
│  Browser ──▶ Fastify (:3000)                │
│                ├── /api/*     → JSON routes  │
│                ├── /*         → static SPA   │
│                └── SQLite     → /data/db     │
│                                              │
│  Env: AUTH_ENABLED, JWT_SECRET, PORT, etc.   │
└─────────────────────────────────────────────┘
```

**Key decisions:**
- Single container: Fastify serves both API and built frontend
- `AUTH_ENABLED=false` → single-user, no login (ARR-style default)
- `AUTH_ENABLED=true` → local JWT auth with bcrypt passwords
- SQLite via `better-sqlite3` — zero-config, single file, backup = file copy
- JWT in localStorage (same-origin, no CSRF concern)
- localStorage as instant cache + server as source of truth
- Debounced auto-save to server (2s after last edit)

---

## Phase 0: Baseline Verification

**0.1 — Verify current app works**
```bash
npm install
npm run dev          # App loads at :8080, Supabase login works
npm run build        # Production build succeeds
npm run lint
npm run test         # Current test suite
```

**0.2 — Commit baseline snapshot**
```bash
git add -A && git commit -m "chore: baseline before self-hosted migration"
```

**0.3 — Install all new dependencies at once**
```bash
# Runtime
npm install fastify @fastify/cors @fastify/rate-limit @fastify/jwt @fastify/static better-sqlite3 bcryptjs

# Dev
npm install -D @types/better-sqlite3 @types/bcryptjs tsx concurrently
```

> **Why `bcryptjs` not `bcrypt`?** `bcrypt` requires native compilation (node-gyp, python, gcc) which complicates Docker builds and Windows dev. `bcryptjs` is pure JS — zero native deps, same API, ~2x slower but irrelevant for a single-user app.

**0.4 — Create `data/` directory and gitignore it**
```bash
mkdir data
```
Add to `.gitignore`:
```
data/
```

**✅ CHECKPOINT:** App still runs. New deps installed. `data/` gitignored.

---

## Phase 1: Backend Server (Scaffolding + Health)

**1.1 — Create server directory and files**
```
server/
├── db/
│   └── schema.ts
├── middleware/
│   └── auth.ts
├── routes/
│   ├── auth.ts
│   └── budget.ts
├── config.ts
├── index.ts
└── tsconfig.json
```

**1.2 — Write `server/tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": ".",
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**1.3 — Write `server/config.ts`**
Parse env vars with defaults:
- `PORT` → 3000
- `HOST` → "0.0.0.0"
- `DATA_DIR` → "./data"
- `JWT_SECRET` → auto-generate if empty (log warning)
- `JWT_EXPIRES_IN` → "7d"
- `AUTH_ENABLED` → "false"
- `LOG_LEVEL` → "info"

**1.4 — Write `server/db/schema.ts`**
```typescript
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";

export function initDB(): Database {
  const dir = config.DATA_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(path.join(dir, "budgetflow.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_data (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      finance_data TEXT NOT NULL DEFAULT '{}',
      dark_mode INTEGER DEFAULT 0,
      currency TEXT DEFAULT '€',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
    INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `);

  return db;
}
```

Key details:
- `WAL` mode for better concurrent read performance
- `ON DELETE CASCADE` on `budget_data.user_id` — deleting a user deletes their data
- `schema_version` table for future migrations
- Auto-creates `data/` directory if missing

**1.5 — Write `server/index.ts`**
- Create Fastify instance
- Register CORS (open for dev, same-origin in prod)
- Register rate limiter (10 req/min on `/api/auth/*`)
- Register health route: `GET /api/health` → `{ status: "ok", version: "1.0.0" }`
- Register `@fastify/static` to serve `../dist` (built frontend) — only in production (when `dist/` exists)
- Graceful shutdown on SIGTERM/SIGINT
- Listen on `config.HOST:config.PORT`

**1.6 — Add npm scripts for server**
```json
{
  "dev:server": "tsx watch server/index.ts",
  "dev:client": "vite",
  "dev": "concurrently -n server,client -c blue,green \"npm run dev:server\" \"npm run dev:client\"",
  "build:server": "tsc -p server/tsconfig.json",
  "start": "node server/dist/index.js"
}
```

> Note: `npm run dev` starts BOTH server and client. The Vite proxy (added in Phase 2) connects them.

**Test:**
```bash
npx tsx server/index.ts    # Server starts on :3000
# In another terminal:
curl http://localhost:3000/api/health
# Expected: {"status":"ok","version":"1.0.0"}

# Verify SQLite file was created:
ls data/budgetflow.db
```

**✅ CHECKPOINT:** Server starts, health endpoint responds, SQLite file exists. Frontend still works independently on :8080.

---

## Phase 2: Vite Dev Proxy

This phase connects the frontend dev server to the backend, so API calls from the browser reach the server during development.

**2.1 — Update `vite.config.ts`**
```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    hmr: { overlay: false },
  },
  // ... rest unchanged
}));
```

**Test:**
```bash
# Terminal 1:
npm run dev:server    # Starts on :3000

# Terminal 2:
npm run dev:client    # Starts on :8080

# In browser at http://localhost:8080:
# Open DevTools → Network tab
# Navigate to http://localhost:8080/api/health
# Expected: {"status":"ok","version":"1.0.0"} (proxied to :3000)
```

**✅ CHECKPOINT:** Frontend dev server proxies `/api/*` to backend. Both hot-reload independently.

---

## Phase 3: Auth API + Budget API (Backend)

Build the complete backend API before touching any frontend code. This way the frontend migration is a clean swap.

**3.1 — Write `server/middleware/auth.ts`**

Fastify preHandler hook:
- If `AUTH_ENABLED=false`: attach a synthetic `{ id: "default", username: "admin", email: "admin@local" }` user to every request. Skip token validation.
- If `AUTH_ENABLED=true`: extract `Authorization: Bearer <token>` header, verify JWT via `@fastify/jwt`, attach decoded user to `request.user`. Return 401 if missing/invalid.

**3.2 — Write `server/routes/auth.ts`**

| Endpoint | Auth? | Body | Returns |
|----------|-------|------|---------|
| `POST /api/auth/register` | No | `{ username, email, password }` | `{ token, user }` |
| `POST /api/auth/login` | No | `{ email, password }` | `{ token, user }` |
| `GET /api/auth/me` | Yes | — | `{ id, username, email }` |
| `DELETE /api/auth/account` | Yes | — | `{ success: true }` |
| `GET /api/auth/setup-status` | No | — | `{ needsSetup: boolean, authEnabled: boolean }` |

Register logic:
1. Validate input (email format, password >= 8 chars, username 2-30 chars)
2. Check email/username uniqueness
3. Hash password with `bcryptjs` (10 rounds)
4. Insert into `users` table
5. Generate JWT with `{ userId, username }`
6. Return token + user

Login logic:
1. Find user by email
2. Compare password with `bcryptjs.compare`
3. Generate JWT
4. Return token + user

`setup-status` logic:
- If `AUTH_ENABLED=false`: return `{ needsSetup: false, authEnabled: false }`
- If `AUTH_ENABLED=true`: check if any users exist in DB. Return `{ needsSetup: true, authEnabled: true }` if zero users.

**3.3 — Write `server/routes/budget.ts`**

| Endpoint | Auth? | Body | Returns |
|----------|-------|------|---------|
| `GET /api/budget` | Yes | — | `{ finance_data, dark_mode, currency, updated_at }` |
| `PUT /api/budget` | Yes | `{ finance_data, dark_mode, currency }` | `{ success: true }` |

GET logic:
- Look up `budget_data` by `request.user.id`
- If no row exists: return default empty data `{ finance_data: { income: [], categories: [] }, dark_mode: false, currency: "€" }`
- If row exists: parse `finance_data` JSON string, return object

PUT logic:
- Upsert: `INSERT OR REPLACE` into `budget_data` with `user_id = request.user.id`
- Validate `finance_data` has `income` and `categories` fields (basic shape check)
- Update `updated_at`
- Return `{ success: true }`

**3.4 — Register routes in `server/index.ts`**
- Import and register auth routes with rate limiter (10 req/min)
- Import and register budget routes with auth preHandler
- Add request logging (method, url, statusCode, responseTime)

**Test:**
```bash
npx tsx server/index.ts

# Test auth (with AUTH_ENABLED=true)
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@local","password":"Test1234"}' | jq
# Expected: { "token": "...", "user": { "id": "...", "username": "testuser", "email": "test@local" } }

TOKEN="<the-token-from-above>"

curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
# Expected: { "id": "...", "username": "testuser", "email": "test@local" }

# Test budget CRUD
curl -s -X PUT http://localhost:3000/api/budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"finance_data":{"income":[{"id":"i0","name":"Salary","value":3000}],"categories":[]},"dark_mode":false,"currency":"€"}' | jq
# Expected: { "success": true }

curl -s http://localhost:3000/api/budget \
  -H "Authorization: Bearer $TOKEN" | jq
# Expected: { "finance_data": { "income": [...], "categories": [] }, "dark_mode": false, "currency": "€", "updated_at": "..." }

# Test AUTH_ENABLED=false (restart server with AUTH_ENABLED=false)
curl -s http://localhost:3000/api/auth/setup-status | jq
# Expected: { "needsSetup": false, "authEnabled": false }

curl -s http://localhost:3000/api/budget | jq
# Expected: budget data (auto-authenticated as default admin)

# Test delete account
curl -s -X DELETE http://localhost:3000/api/auth/account \
  -H "Authorization: Bearer $TOKEN" | jq
# Expected: { "success": true }

# Verify data is gone
curl -s http://localhost:3000/api/budget \
  -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized (token invalidated, user deleted)

# Test server restart preserves data
# Stop server, start again, re-register, verify data persisted
```

**✅ CHECKPOINT:** Complete backend API works via curl. Both auth modes work. SQLite persists data across restarts.

---

## Phase 4: Frontend API Client + Types

**4.1 — Create `src/types/api.ts`**
```typescript
export interface ApiUser {
  id: string;
  username: string;
  email: string;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiBudgetData {
  finance_data: {
    income: { id: string; name: string; value: number }[];
    categories: {
      id: string; name: string; color: string;
      items: { id: string; name: string; value: number }[];
    }[];
  };
  dark_mode: boolean;
  currency: string;
  updated_at?: string;
}

export interface ApiSetupStatus {
  needsSetup: boolean;
  authEnabled: boolean;
}
```

> Note: `finance_data` shape mirrors the existing `FinanceData` type from `src/types/finance.ts`. We'll keep both — `FinanceData` is the canonical type, `ApiBudgetData` is the wire format.

**4.2 — Create `src/lib/api.ts`**
```typescript
import type { ApiUser, ApiAuthResponse, ApiBudgetData, ApiSetupStatus } from "@/types/api";
import type { FinanceData } from "@/types/finance";

const TOKEN_KEY = "budgetflow-token";

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(path, { ...options, headers });
        if (res.status === 401) {
          this.clearToken();
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
    throw new Error("Unreachable");
  }

  auth = {
    register: (username: string, email: string, password: string) =>
      this.request<ApiAuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
    login: (email: string, password: string) =>
      this.request<ApiAuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () =>
      this.request<ApiUser>("/api/auth/me"),
    deleteAccount: () =>
      this.request<{ success: boolean }>("/api/auth/account", { method: "DELETE" }),
    setupStatus: () =>
      this.request<ApiSetupStatus>("/api/auth/setup-status"),
  };

  budget = {
    get: () =>
      this.request<ApiBudgetData>("/api/budget"),
    save: (data: FinanceData, darkMode: boolean, currency: string) =>
      this.request<{ success: boolean }>("/api/budget", {
        method: "PUT",
        body: JSON.stringify({ finance_data: data, dark_mode: darkMode, currency }),
      }),
  };
}

export const api = new ApiClient();
```

**Test:**
```bash
npm run build    # Must compile without errors
```

**✅ CHECKPOINT:** API client and types compile. No behavioral change yet — app still uses Supabase.

---

## Phase 5: Migrate Frontend (Atomic — All Supabase References at Once)

This is the critical phase. All Supabase references must be removed in one coordinated step because the hooks and components are tightly coupled:
- `useAuth` returns `User` from `@supabase/supabase-js`
- `AuthBar` accepts `User` from `@supabase/supabase-js`
- `useFinanceData` calls `supabase` directly
- `Index.tsx` wires them together

**5.1 — Rewrite `src/hooks/useAuth.ts`**

Replace the entire file. New implementation:
- State: `user: ApiUser | null`, `loading: boolean`, `username: string`
- Remove `session` state (no Supabase session concept)
- Remove `User` and `Session` imports from `@supabase/supabase-js`
- On mount: check if token exists in localStorage, if so call `api.auth.me()` to validate
- `signIn(email, password)` → `api.auth.login()` → store token → set user
- `signUp(email, password, name)` → `api.auth.register()` → store token → set user
- `signOut()` → `api.clearToken()` → clear user state
- `deleteAccount()` → `api.auth.deleteAccount()` → sign out

Also handle `AUTH_ENABLED=false` mode:
- On mount, call `api.auth.setupStatus()`
- If `authEnabled === false`: auto-set user to a synthetic admin (no login needed)
- If `authEnabled === true && needsSetup === true`: show first-run setup

**5.2 — Rewrite `src/hooks/useFinanceData.ts`**

Replace Supabase-specific parts:
- Remove `import { supabase } from "@/integrations/supabase/client"`
- Replace `loadFromSupabase` with `loadFromServer`:
  - `api.budget.get()` → merge server data into local state
  - Only called when user is authenticated
- Replace `save` function:
  - Always save to localStorage first (instant)
  - If authenticated, also save to server via `api.budget.save()`
- Add debounced auto-save:
  ```typescript
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      api.budget.save(data, darkMode, currency).catch(console.error);
    }, 2000);
    return () => clearTimeout(timer);
  }, [data, darkMode, currency, userId]);
  ```
- Keep JSON export/import unchanged (they're local-only, no Supabase dependency)
- `saveToJson` and `importFromJson` remain as-is

**5.3 — Rewrite `src/components/finance/AuthBar.tsx`**

- Remove `import type { User } from "@supabase/supabase-js"`
- Remove `import { supabase } from "@/integrations/supabase/client"`
- Change `user: User | null` to `user: ApiUser | null` in props
- Remove `supabase.auth.getSession()` call in `handleDeleteAccount` — use the token from `api` client instead
- Replace `supabase.functions.invoke("delete-account")` with `api.auth.deleteAccount()`
- Remove "Please confirm your email" toast on registration (no email confirmation in self-hosted)
- If `AUTH_ENABLED=false`: hide the entire AuthBar (no login needed)

**5.4 — Update `src/pages/Index.tsx`**

- Remove `loadFromSupabase` from the destructured `useFinanceData` return
- Replace the `useEffect` that calls `loadFromSupabase` with one that calls `loadFromServer`
- Update `AuthBar` props to use `ApiUser` instead of Supabase `User`
- If `AUTH_ENABLED=false` (detected via auth hook): hide the AuthBar entirely

**5.5 — Verify zero Supabase imports remain**
```bash
# Search for any remaining Supabase references
grep -r "supabase" src/ --include="*.ts" --include="*.tsx" -l
# Expected: NO results
```

**Test:**
```bash
npm run build    # Must compile without errors
npm run dev      # Start both server + client
```

**Manual testing (AUTH_ENABLED=true):**
1. Go to http://localhost:8080
2. Click "Sign In" → fill form → register
3. Verify: user appears in top-right, no Supabase errors in console
4. Edit budget data → click "Save" → verify toast "Saved!"
5. Refresh page → verify data loads from server
6. Click delete account → verify account is deleted
7. Register again → verify fresh default data

**Manual testing (AUTH_ENABLED=false):**
1. Restart server with `AUTH_ENABLED=false`
2. Go to http://localhost:8080
3. Verify: no login UI, app loads immediately
4. Edit budget data → verify auto-save after 2s
5. Refresh → verify data persisted

**Manual testing (offline resilience):**
1. Stop the backend server
2. Refresh the frontend (it will show cached data from localStorage)
3. Edit data → save to localStorage works
4. Restart backend → data syncs on next save

**✅ CHECKPOINT:** Frontend fully functional without Supabase. Both auth modes work. Offline localStorage fallback works.

---

## Phase 6: Remove Supabase Code & Dependencies

**6.1 — Delete Supabase files**
```
rm -rf src/integrations/supabase/
rm -rf supabase/
```

**6.2 — Remove Supabase dependency**
```bash
npm uninstall @supabase/supabase-js
```

**6.3 — Delete old .env files (Supabase-specific)**
```bash
rm .env .env.example
```

**6.4 — Create new `.env.example` (self-hosted config)**
```
# BudgetFlow Self-Hosted Configuration
PORT=3000
HOST=0.0.0.0
DATA_DIR=./data
JWT_SECRET=change-me-to-a-random-string
JWT_EXPIRES_IN=7d
AUTH_ENABLED=false
LOG_LEVEL=info
```

**6.5 — Create `.env` with working defaults (for local dev)**
```
PORT=3000
HOST=0.0.0.0
DATA_DIR=./data
JWT_SECRET=dev-secret-change-in-production
AUTH_ENABLED=true
LOG_LEVEL=debug
```

**6.6 — Verify clean state**
```bash
npm install              # Reinstall without @supabase/supabase-js
npm run build            # Must succeed
npm run dev              # App starts without any Supabase errors
npm run lint             # No import errors

# Confirm Supabase is gone
npm ls @supabase/supabase-js    # Expected: empty or ERR!
grep -r "supabase" src/ --include="*.ts" --include="*.tsx" -l    # Expected: no results
```

**✅ CHECKPOINT:** Zero Supabase code, config, or dependencies. Clean build and run.

---

## Phase 7: Server Static File Serving (Production)

The server must serve the built frontend in production. This was partially set up in Phase 1, but needs testing.

**7.1 — Verify `@fastify/static` registration in `server/index.ts`**

The server should:
- In production: serve `../dist/` as static files at `/`
- SPA fallback: any non-`/api` route returns `index.html` (for client-side routing)
- In development: don't serve static files (Vite dev server handles this)

```typescript
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";

const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.register(fastifyStatic, { root: distPath, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith("/api")) {
      return reply.sendFile("index.html");
    }
    return reply.status(404).send({ error: "Not found" });
  });
}
```

**Test:**
```bash
npm run build          # Builds frontend to dist/
npm run build:server   # Compiles server to server/dist/
npm start              # Starts production server on :3000

# In browser:
curl http://localhost:3000/               # Returns HTML (SPA)
curl http://localhost:3000/api/health     # Returns JSON
```

**✅ CHECKPOINT:** Production mode serves both API and frontend from a single process on port 3000.

---

## Phase 8: Docker

**8.1 — Create `Dockerfile`**
```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY vite.config.ts tsconfig*.json postcss.config.js tailwind.config.ts components.json index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server
WORKDIR /app
RUN apk add --no-cache python3 make g++   # Needed for better-sqlite3 native compilation
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
RUN npx tsc -p server/tsconfig.json

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=server /app/node_modules/ ./node_modules/
COPY --from=server /app/server/dist/ ./server/dist/
COPY --from=frontend /app/dist/ ./dist/
COPY package.json ./

EXPOSE 3000
VOLUME ["/app/data"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
```

Key details:
- `tini` as PID 1 for proper signal handling (SIGTERM graceful shutdown)
- `VOLUME /app/data` — SQLite persistence
- `npm ci --omit=dev` for server stage — only production deps
- Multi-stage: final image has no dev deps, no source maps, no build tools
- Stage 2 installs `python3 make g++` for `better-sqlite3` native compilation

**8.2 — Create `docker-compose.yml`**
```yaml
services:
  budgetflow:
    build: .
    container_name: budgetflow
    ports:
      - "3000:3000"
    volumes:
      - budgetflow-data:/app/data
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - DATA_DIR=/app/data
      - JWT_SECRET=${JWT_SECRET:-please-change-this-secret}
      - AUTH_ENABLED=${AUTH_ENABLED:-false}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    restart: unless-stopped

volumes:
  budgetflow-data:
```

> Using a named Docker volume instead of a bind mount. Easier to manage, better for Proxmox. If the user prefers bind mounts for easy backup, they can swap `budgetflow-data:/app/data` for `./data:/app/data`.

**8.3 — Create `.dockerignore`**
```
node_modules
.git
data
dist
*.md
.env
kilo.json
.kilo
```

**Test:**
```bash
docker compose build
# Expected: builds successfully, image <200MB

docker compose up -d
# Expected: container starts

curl http://localhost:3000/api/health
# Expected: {"status":"ok","version":"1.0.0"}

curl http://localhost:3000/
# Expected: HTML page (the SPA)

# In browser: http://localhost:3000
# Expected: full app loads, can edit budget data

docker compose down
docker compose up -d
# Expected: data persists across restarts (verify in app)
```

**✅ CHECKPOINT:** Docker image builds and runs. Single container serves both API and frontend. Data persists across restarts.

---

## Phase 9: Cleanup & Optimizations

**9.1 — Fix `sonner.tsx` to not use `next-themes`**

`src/components/ui/sonner.tsx` imports `useTheme` from `next-themes`, but the app never wraps components in a `<ThemeProvider>` — it uses `document.documentElement.classList.toggle("dark")` instead. This is dead code that will crash if the toaster ever calls `useTheme()`.

Replace the contents of `src/components/ui/sonner.tsx`:
```typescript
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
```

Then uninstall `next-themes`:
```bash
npm uninstall next-themes
```

**9.2 — Remove `@tanstack/react-query` (unused)**

The app wraps everything in `QueryClientProvider` in `App.tsx`, but **no component uses `useQuery` or `useMutation`**. All data fetching is done with raw `useEffect`/`useCallback`. The provider is dead boilerplate.

Remove from `src/App.tsx`:
```diff
- import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
- const queryClient = new QueryClient();
- <QueryClientProvider client={queryClient}>
    ...
- </QueryClientProvider>
```

Then uninstall:
```bash
npm uninstall @tanstack/react-query
```

**9.3 — Remove unused frontend dependencies**

Audit which shadcn/ui components are actually imported by non-UI files:

**Used by app code (KEEP):**
- `@radix-ui/react-alert-dialog` (AuthBar)
- `@radix-ui/react-tooltip` (App)

**Likely unused (REMOVE after verifying no transitive imports):**
- `cmdk`, `embla-carousel-react`, `input-otp`, `vaul`, `react-day-picker`, `react-resizable-panels`
- `@radix-ui/react-accordion`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-carousel`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-pagination`, `@radix-ui/react-popover`, `@radix-ui/react-progress`
- `date-fns` (zero imports in `src/`)
- `react-hook-form` (only in `src/components/ui/form.tsx` — never used by app code)
- `@hookform/resolvers` (only used with react-hook-form)

Process: remove in one batch, run `npm run build` after. If build fails, re-add the missing one.

```bash
npm uninstall cmdk embla-carousel-react input-otp vaul react-day-picker react-resizable-panels \
  @radix-ui/react-accordion @radix-ui/react-aspect-ratio @radix-ui/react-avatar \
  @radix-ui/react-context-menu @radix-ui/react-hover-card @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu @radix-ui/react-pagination @radix-ui/react-popover \
  @radix-ui/react-progress date-fns react-hook-form @hookform/resolvers
npm run build  # Verify
```

**9.4 — Remove lovable-tagger from Vite config**

The `componentTagger` plugin is a Lovable-specific dev tool. Remove it:

```diff
- import { componentTagger } from "lovable-tagger";
- plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
+ plugins: [react()],
```

```bash
npm uninstall lovable-tagger
```

**9.5 — Optional: Remove `react-router-dom`**

The app has exactly two routes: `/` (Index) and `*` (NotFound). The router adds ~14KB to the bundle for virtually nothing. For a self-hosted single-page app, it's unnecessary overhead.

If removing:
1. Replace `BrowserRouter` + `Routes` + `Route` in `App.tsx` with direct `<Index />` render
2. Delete `src/pages/NotFound.tsx`
3. Delete `src/components/NavLink.tsx` (unused by app code)
4. Uninstall: `npm uninstall react-router-dom`

**Test:**
```bash
npm run build    # Still compiles
npm run dev      # Still works
npm run lint     # Clean
docker compose build  # Still builds
```

**✅ CHECKPOINT:** Minimal dependencies. No unused code. Documentation updated.

---

## Phase 10: Testing

**10.1 — Server unit tests**

Create `server/__tests__/` directory. Use Vitest with in-memory SQLite:

- `auth.test.ts` — register, login, duplicate email, wrong password, token validation
- `budget.test.ts` — get empty, save, get saved, update, invalid shape
- `auth-middleware.test.ts` — no token, expired token, valid token, AUTH_ENABLED=false bypass

Setup: create a fresh in-memory DB before each test, tear down after.

**10.2 — Frontend unit tests**

- `useAuth.test.ts` — mock `api` module, test login/register/logout flows
- `useFinanceData.test.ts` — test stats calculation, CRUD operations, save behavior

**10.3 — Integration test (manual)**

Full end-to-end checklist:
1. `docker compose up -d`
2. Open http://localhost:3000
3. First run with `AUTH_ENABLED=true`: register → login → edit → save → refresh → data persists
4. Switch to `AUTH_ENABLED=false`: no login UI → edit → auto-saves → refresh → data persists
5. JSON export → clear data → JSON import → data restored
6. Dark mode toggle → refresh → preference persists
7. Currency change → refresh → preference persists
8. Delete account → data gone
9. `docker compose down && docker compose up -d` → data persists
10. Stop container → edit not possible → start container → data still there

**Test:**
```bash
npm run test     # All unit tests pass
```

**✅ CHECKPOINT:** Tests pass. App is fully functional as a self-hosted service.

---

## Phase 11: Final Commit

```bash
git add -A
git commit -m "feat: migrate from Supabase to self-hosted Fastify + SQLite backend

- Replace Supabase Auth with local JWT (bcryptjs + @fastify/jwt)
- Replace Supabase PostgreSQL with embedded SQLite (better-sqlite3)
- Add Fastify API server with auth and budget CRUD endpoints
- Add AUTH_ENABLED toggle (false = single-user ARR-style, true = JWT auth)
- Add debounced auto-save and offline localStorage fallback
- Add Docker multi-stage build + docker-compose.yml
- Remove @supabase/supabase-js and all Supabase config
- Remove unused shadcn/ui dependencies"
```

---

## Rollback Strategy

Each phase is a commit boundary. If something goes wrong:

| Situation | Recovery |
|-----------|----------|
| Build fails after a phase | `git diff HEAD` → fix the issue → rebuild |
| Runtime error in a phase | `git checkout -- <file>` to revert specific files |
| Complete failure | `git reset --hard HEAD~1` to undo the last commit |
| Need to start over | `git checkout <baseline-commit>` (from Phase 0) |

---

## Quick Reference: Testing Checklist

| Phase | Test | Success Criteria |
|-------|------|-----------------|
| 0 | `npm run dev && npm run build` | App works, baseline committed |
| 1 | `curl :3000/api/health` | `{"status":"ok"}`, SQLite file created |
| 2 | `curl :8080/api/health` (via proxy) | Same response, proxied correctly |
| 3 | curl register/login/budget CRUD | Auth + budget API works, data persists |
| 4 | `npm run build` | New api.ts + types compile |
| 5 | Manual browser test | Login, save, reload, offline — all work |
| 6 | `npm ls @supabase/supabase-js` | Empty (package gone) |
| 7 | `npm start` + `curl :3000/` | Frontend HTML returned from server |
| 8 | `docker compose up` | Container works, data persists |
| 9 | `npm run build` | Still compiles after dep removal |
| 10 | `npm run test` | All tests pass |
| 11 | Final manual test | Full E2E checklist passes |
