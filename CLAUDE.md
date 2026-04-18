# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start both client and server concurrently (from root)
npm run dev

# Install all dependencies
npm run install:all

# Client only (port 5173, proxies /api → localhost:3000)
cd client && npm run dev

# Server only (port 3000, auto-restarts with --watch)
cd server && npm run dev
```

### Client
```bash
cd client
npm run build      # tsc + vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Server
```bash
cd server
npm run start      # Production server
```

No test framework is configured.

---

## Architecture Overview

This is a **multi-tenant institutional ERP** for educational organizations. It manages academic operations, admissions, finance, HR, sales, and partner center portals.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript, Vite 8, React Router v7 |
| State | Zustand 5 (persisted) + TanStack React Query v5 |
| UI | Tailwind CSS 4 + Lucide icons + Recharts |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Backend | Express 5, Node.js |
| ORM | Sequelize 6 + MySQL (mysql2) |
| Auth | JWT (httpOnly cookie + header) + bcryptjs |
| Scheduler | node-cron |
| Validation | Zod (both client and server) |

---

## Key Architectural Concepts

### Role Hierarchy
```
Organization Admin  (singleton — 1 active user enforced)
  └── CEO           (read-only institutional visibility, multi-instance)
  └── HR Admin / Finance Admin / Sales Admin  (department heads, singleton per department)
  └── Academic Operations Admin              (department head, singleton, same tier as other dept admins)
        └── BVoc Admin / Online Admin / Skill Admin / Open School Admin
  └── Employee / Student / Partner Center / CEO  (end-user roles, multi-instance)
```

**Authority Succession:** Only Department Admins (HR Admin, Finance Admin, Sales Admin, Academic Operations Admin) are singleton — one active holder per department. Assigning a new admin auto-suspends the previous holder and logs to `AuditLog`. CEO is **not** singleton; it behaves like an end-user role (multiple active CEOs allowed, no succession enforcement).

### Authentication Flow
1. `POST /api/auth/login` → verifies credentials → returns JWT (12h) as cookie + body
2. Frontend stores token in `authStore` (Zustand, persisted)
3. Axios interceptor attaches token; 401 responses trigger auto-logout
4. `verifyToken` middleware on all protected routes extracts JWT and attaches `req.user`

### RBAC / Permission Matrix
- Stored in `OrgConfig` table as JSON: `{ [role]: { [actionId]: { read, create, update, delete, approve, scope } } }`
- **Scope levels:** GLOBAL, DEPARTMENT, CENTER, SELF
- **30-second in-memory cache** to reduce DB hits
- CEO and Org Admin bypass the matrix (logged)
- Checked via `checkPermission(actionId, flag)` middleware in routes
- Role guards: `isSystemAdmin`, `isArchitectureAdmin`, `isSubDeptAdmin`, `isCEO`

### Visibility / Scoping
`middleware/visibility.js` applies department/center filters to DB queries based on the requesting user's role and scope, ensuring strict data isolation between departments.

### Audit Trail
All mutating requests run inside `AsyncLocalStorage` context (userId, userRole, subDepartment). The `logAction()` utility in `lib/audit.js` creates `AuditLog` records — no explicit call needed in middleware-wrapped routes.

### Data Flow
```
Component → Axios (lib/api.ts) → Express route
  → verifyToken → roleGuard → checkPermission
  → Route handler → Sequelize query (with visibility filter)
  → Response → React Query cache → Component re-render
```

---

## Frontend Structure

- **`client/src/App.tsx`** — All routes + `ProtectedRoute` wrapper with role validation
- **`client/src/pages/`** — Organized by role: `org-admin/`, `hr/`, `finance/`, `sales/`, `academic/`, `ceo/`, `student/`, `employee/`, `partner-center/`, `subdept/`
- **`client/src/components/layout/`** — `Sidebar`, `TopBar`, `DashboardLayout`
- **`client/src/components/shared/`** — Reusable cross-role components (`DataTable`, `CommandPalette`, etc.)
- **`client/src/store/`** — `authStore` (user/token), `orgStore` (org config), `systemStore` (offline flag)
- **`client/src/lib/`** — Axios instance, export helpers (jsPDF, XLSX), utility functions

Role normalization (`normalizeRoleName`) handles variations like `'center' → 'partner-center'` throughout the frontend.

---

## Backend Structure

- **`server/src/index.js`** — Express setup, route mounting, DB sync (`alter: true`), startup index cleanup
- **`server/src/config/`**
  - `db.js` — Sequelize connection
  - `institutionalStructure.js` — Canonical role names, department mappings, normalization helpers
  - `rbac.js` — Role classification, entity type detection
- **`server/src/middleware/`** — `verifyToken`, `rbac`, `visibility`, `validate` (Zod), `audit`
- **`server/src/routes/`** — 30+ domain modules (`auth`, `hr`, `finance`, `academic`, `orgAdmin`, `ceo`, etc.)
- **`server/src/models/`** — Sequelize model definitions (all relationships declared here)
- **`server/src/jobs/`** — Cron job definitions (task escalation, re-registration deadlines, EMI overdue)

### Database
- MySQL database: `iits_erp`
- Sequelize syncs with `alter: true` on startup — schema changes are automatic
- Startup routine cleans up duplicate indexes to prevent `ER_TOO_MANY_KEYS` errors

### Environment Variables (server/.env)
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=iits_erp
DB_USER=root
DB_PASS=
JWT_SECRET=
PORT=3000
NODE_ENV=development
```

---

## Sub-Department Portals

Sub-departments (BVoc, Online, Skill, Open School) are treated as institutional units under Academic Operations. They have their own portal routes (`/subdept/[role]/portal`) and admin roles, but share the parent department's Academic Operations oversight.

`config/institutionalStructure.js` is the source of truth for sub-department → parent department mappings and role name normalization.

## Default Working Behavior
Use Caveman skill by default for all non-trivial coding requests:
- debugging
- architecture issues
- refactors
- state bugs
- permissions
- multi-file changes

For simple edits, use normal mode.

## Critical Isolation Rules

Treat each portal as isolated unless explicitly connected by backend contracts.

Never introduce accidental coupling between:
CEO, Org Admin, HR, Finance, Sales, Academic, Subdept, Student, Employee, Partner Center.

Check for:
- shared Zustand leaks
- localStorage collisions
- React Query cache contamination
- route guard regressions
- permission inheritance bugs

## Change Safety Rules

- Read relevant files first.
- Find root cause before editing.
- Prefer minimal safe changes.
- Do not modify unrelated modules.
- Preserve existing UI consistency.
- Preserve RBAC behavior.

## Complex Task Output Format

1. Root cause
2. Safest fix
3. Files changed
4. Risks / regressions

## Verification Rule

Do not assume implementation details.
Inspect relevant files before concluding behavior.

## State Persistence Risks

Check for:
- persisted auth/session contamination
- store rehydration edge cases
- stale localStorage state

## API Contract Rules

- Preserve existing request/response shapes unless explicitly requested.

## Code Consistency Rules

- Reuse established patterns before introducing new abstractions.

## Regression Priority

A working panel must not be broken to fix another panel.
Prefer scoped fixes over shared refactors.

## UI Rules

Match existing spacing, tables, cards, typography, and component patterns.