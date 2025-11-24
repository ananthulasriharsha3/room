-- Migration: Add month_closed column to expenses and grocery_purchases tables
-- This migration adds the month_closed column to track which month an expense/grocery was closed in.
-- Format: 'YYYY-MM' (e.g., '2024-01') or NULL for current/open months

-- Add month_closed column to expenses table
alter table public.expenses 
add column if not exists month_closed text;

-- Add month_closed column to grocery_purchases table
alter table public.grocery_purchases 
add column if not exists month_closed text;

-- Add comments to document the columns
comment on column public.expenses.month_closed is 'The month (YYYY-MM) when this expense was closed, NULL for current/open months';
comment on column public.grocery_purchases.month_closed is 'The month (YYYY-MM) when this grocery purchase was closed, NULL for current/open months';

-- Create indexes for better query performance
create index if not exists idx_expenses_month_closed on public.expenses(month_closed);
create index if not exists idx_grocery_purchases_month_closed on public.grocery_purchases(month_closed);

