-- Create password_reset_tokens table for password reset functionality
create table if not exists public.password_reset_tokens (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Create index on user_id for faster lookups
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);

-- Create index on token_hash for faster verification
create index if not exists idx_password_reset_tokens_token_hash on public.password_reset_tokens(token_hash);

-- Create index on expires_at to help with cleanup of expired tokens
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);

-- Add updated_at column to users table if it doesn't exist (for password reset tracking)
alter table public.users add column if not exists updated_at timestamptz;

