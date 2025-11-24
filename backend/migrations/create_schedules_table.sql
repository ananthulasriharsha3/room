-- Create schedules table to store generated schedules
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

