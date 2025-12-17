# Room Duty Scheduler

This project tracks shared kitchen duties for a room and rotates assignments daily throughout a month. It also lets each roommate log expenses with timestamps.

## Project structure

- `frontend/` – Vite + React app for managing the schedule and expenses

## Getting started

### Database Setup

Before running the application, you need to set up the database tables in Supabase. Run the SQL commands from the README (see the "Database Schema" section below) in your Supabase SQL editor.

**Important:** If you encounter a "Database schema error" about missing columns, you may need to run additional migration scripts:

- `backend/migrations/add_is_completed_column.sql` - Adds the `is_completed` column to the `shopping_items` table

To run a migration:
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of the migration file
4. Click "Run" to execute the migration

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # On macOS/Linux use: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://localhost:8000` by default.

The backend looks for Supabase and SMTP credentials in the environment:

- `SUPABASE_URL` – project URL (defaults to the provided instance)
- `SUPABASE_ANON_KEY` – anon key (defaults to the provided token)
- `SMTP_SERVER`, `SMTP_PORT`
- `SMTP_USERNAME`, `SMTP_PASSWORD`, `SENDER_EMAIL`
- `SMTP_USE_TLS`, `SMTP_USE_SSL`
- `JWT_SECRET` (override the default secret before deploying)

Create the following tables in Supabase (SQL editor):

```sql
create table if not exists public.expenses (
  id bigint primary key generated always as identity,
  person text not null,
  amount numeric(12,2) not null,
  description text,
  "timestamp" timestamptz not null default now()
);

create index if not exists idx_expenses_timestamp on public.expenses("timestamp");

create table if not exists public.settings (
  id text primary key,
  persons jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id bigint primary key generated always as identity,
  name text not null,
  votes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_completed boolean not null default false
);

-- If the table already exists, add the created_by column:
alter table public.shopping_items add column if not exists created_by text;

-- If the table already exists, add the is_completed column:
alter table public.shopping_items add column if not exists is_completed boolean not null default false;

create table if not exists public.day_notes (
  id bigint primary key generated always as identity,
  date date not null unique,
  note text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already exists, add the created_by column:
alter table public.day_notes add column if not exists created_by text;

create index if not exists idx_day_notes_date on public.day_notes(date);

create table if not exists public.schedules (
  id text primary key,
  year integer not null,
  month integer,
  schedule_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedules_year on public.schedules(year);
create index if not exists idx_schedules_year_month on public.schedules(year, month);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  is_admin boolean not null default false,
  has_access boolean not null default false,
  created_at timestamptz not null default now()
);

-- If the table already exists, add the new columns:
alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists has_access boolean not null default false;

-- Set the admin user
update public.users set is_admin = true, has_access = true where email = 'ananthulasriharsha3@gmail.com';

create table if not exists public.stock_items (
  id bigint primary key generated always as identity,
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_items_start_date on public.stock_items(start_date);
create index if not exists idx_stock_items_is_active on public.stock_items(is_active);

create table if not exists public.grocery_purchases (
  id bigint primary key generated always as identity,
  name text not null,
  price numeric(12,2) not null,
  quantity text,
  unit text,
  purchase_date date not null default current_date,
  bill_image_url text,
  is_from_bill boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_grocery_purchases_purchase_date on public.grocery_purchases(purchase_date);
create index if not exists idx_grocery_purchases_created_by on public.grocery_purchases(created_by);

create table if not exists public.password_reset_tokens (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_token_hash on public.password_reset_tokens(token_hash);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);

-- Add updated_at column to users table if it doesn't exist
alter table public.users add column if not exists updated_at timestamptz;
```

**Note:** If you encounter errors about missing columns (e.g., "column users.is_admin does not exist"), you can add them using the SQL commands in the database schema section above.

**Note:** If you encounter errors about missing the `password_reset_tokens` table, run the migration script `frontend/migrations/create_password_reset_tokens_table.sql` in your Supabase SQL editor.

**Note:** The `password_reset_tokens` table is required for the forgot password feature. If you encounter errors about this table, run the migration script `frontend/migrations/create_password_reset_tokens_table.sql` in your Supabase SQL editor.

All data is stored directly in Supabase - no backend server required!

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The development server runs on `http://localhost:5173`.

## API overview

- `POST /schedule` – Generate a monthly rotation. Provide `year`, `month`, and optional task/person overrides.
- `GET /expenses` – List all expense entries with timestamps.
- `POST /expenses` – Add a new expense. Requires `person`, `amount`, and optional `description`.
- `DELETE /expenses/{id}` – Remove an expense entry by its identifier.
- `GET /settings` / `POST /settings` – Retrieve or persist the shared list of people and tasks.
- `GET /shopping-items` – List household shopping needs sorted by vote priority.
- `POST /shopping-items` – Add a new item to buy.
- `POST /shopping-items/{id}/vote` – Record a vote for a person on an item.
- `POST /auth/register` – Create a user account (email, display name, password).
- `POST /auth/login` – Obtain a bearer token for authenticated requests.

Expenses, schedule settings, and shopping items are stored in Supabase; restart the backend after updating credentials or table schemas.

