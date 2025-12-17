-- Create user_fcm_tokens table for storing Firebase Cloud Messaging tokens
create table if not exists public.user_fcm_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  fcm_token text not null unique,
  updated_at timestamptz not null default now()
);

-- Create index on user_id for faster lookups
create index if not exists idx_user_fcm_tokens_user_id on public.user_fcm_tokens(user_id);

-- Create index on fcm_token for faster lookups
create index if not exists idx_user_fcm_tokens_token on public.user_fcm_tokens(fcm_token);

