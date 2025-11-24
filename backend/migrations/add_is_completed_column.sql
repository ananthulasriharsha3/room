-- Migration: Add is_completed column to shopping_items table
-- This migration adds the is_completed boolean column to track completion status of shopping items.

-- Add the is_completed column if it doesn't exist
alter table public.shopping_items 
add column if not exists is_completed boolean not null default false;

-- Add a comment to document the column
comment on column public.shopping_items.is_completed is 'Indicates whether the shopping item has been completed';

