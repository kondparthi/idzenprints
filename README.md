# PVC Card Printing & Generator — Phase 1

Phase 1 delivers the project skeleton, database, authentication, dashboard,
and customer management. Later phases (document upload/OCR, templates, the
card designer, PDF/PNG generation, orders, reports) build on this foundation
without changing it.

## Folder structure

```
pvc-card-app/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── main.py          App entrypoint, CORS, router registration
│   │   ├── config/          Settings (reads .env)
│   │   ├── models/          SQLAlchemy models (User, Customer)
│   │   ├── schemas/         Pydantic request/response schemas
│   │   ├── routers/         API routes (auth, customers, dashboard)
│   │   ├── services/        Business logic
│   │   ├── repositories/    Data-access layer (DB queries only)
│   │   ├── utils/           Password hashing, JWT helpers
│   │   ├── middleware/      Auth dependency (get_current_user, require_roles)
│   │   └── workers/         Reserved for background jobs (OCR, generation) — Phase 2+
│   ├── migrations/          Alembic migrations
│   ├── scripts_seed_admin.py  Creates the first Super Admin user
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 React + TypeScript (Vite)
│   └── src/
│       ├── api/              Axios client + per-resource API calls
│       ├── auth/              AuthContext, ProtectedRoute
│       ├── components/       Shared components (ConfirmDialog, …)
│       ├── hooks/             useDebouncedValue, …
│       ├── layouts/           AppLayout (sidebar + topbar)
│       ├── pages/             Login, Dashboard, Customers, CustomerForm
│       ├── types/             Shared TypeScript types
│       ├── designer/          Reserved for the card designer — Phase 3
│       └── store/             Reserved if/when global state grows beyond AuthContext
└── database/
    └── schema.sql            Standalone MySQL schema (Phase 1 tables)
```

## Backend setup

macOS / Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit DATABASE_URL, JWT_SECRET, etc.
```

Windows (PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit DATABASE_URL, JWT_SECRET, etc.
```

If `Activate.ps1` is blocked by execution policy, run PowerShell as your user
and allow it for this session: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`.

Windows (cmd.exe): use `.venv\Scripts\activate.bat` instead of the `.ps1` script.

> **Use Python 3.11, 3.12, or 3.13 — not 3.14 yet.** Python 3.14 is very new
> and some packages here (notably `pydantic-core`, which is written in Rust)
> don't reliably ship prebuilt Windows wheels for it yet. Without a wheel,
> pip tries to compile it from source, which needs a Rust toolchain and the
> MSVC linker (Visual Studio Build Tools) — and still may not succeed. Using
> 3.11–3.13 avoids this entirely; if you only have 3.14 installed, grab 3.12
> from python.org and create the venv with `py -3.12 -m venv .venv`.
copy .env.example .env
Create the database (MySQL running locally):

```bash
mysql -u root -p < ../database/schema.sql
```

Or apply the same schema through Alembic instead of the raw SQL file:

```bash
alembic upgrade head
```

Create the first Super Admin login:

```bash
python scripts_seed_admin.py
# admin@pvccard.local / ChangeMe123!  — change this password immediately after first login
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL, defaults to http://localhost:8000/api
npm run dev
```

App: http://localhost:5173 — sign in with the seeded admin account.

## What's in Phase 1

- Project scaffolding for both frontend and backend
- MySQL schema + Alembic migration for `users` and `customers`
- JWT authentication (login / logout / me), bcrypt password hashing, 4 roles
  (Super Admin, Admin, Operator, Designer) enforced via `require_roles()`
- Dashboard summary endpoint (customer count now; order/card counts wire up
  once those modules exist)
- Full customer CRUD (API + UI): list with search and pagination, create,
  edit, delete with a confirmation dialog

## Not yet built (later phases, per the roadmap)

Document upload & OCR (Phase 2) · card types, templates & the card designer
(Phase 3) · live preview & PDF/PNG/JPG generation (Phase 4) · orders,
reports & audit logs (Phase 5) · testing & deployment hardening (Phase 6).

Say **"continue"** to move to Phase 2.
