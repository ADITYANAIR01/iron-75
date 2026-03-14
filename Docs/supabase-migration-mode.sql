-- Migration: Add mode + freeze_count columns to app_state
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Safe to run on existing data — adds columns with sensible defaults
-- so every existing row automatically gets mode='workout' and freeze_count=3.

ALTER TABLE public.app_state
  ADD COLUMN IF NOT EXISTS mode        text    NOT NULL DEFAULT 'workout'
                                        CHECK (mode IN ('workout', '75hard')),
  ADD COLUMN IF NOT EXISTS freeze_count integer NOT NULL DEFAULT 3
                                        CHECK (freeze_count >= 0 AND freeze_count <= 5);

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'app_state'
  AND column_name  IN ('mode', 'freeze_count');
