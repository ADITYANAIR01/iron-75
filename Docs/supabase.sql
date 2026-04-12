-- GrindOs Fresh Supabase Setup (single-file)
-- Run this whole script in Supabase SQL Editor.
-- It recreates the database/auth/storage setup from scratch with current product rules.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

DROP TABLE IF EXISTS public.workout_sessions CASCADE;
DROP TABLE IF EXISTS public.daily_logs CASCADE;
DROP TABLE IF EXISTS public.app_state CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.app_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INTEGER DEFAULT 0,
  current_day INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  longest_streak INTEGER DEFAULT 0,
  total_restarts INTEGER DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'workout' CHECK (mode IN ('workout', '75hard')),
  freeze_count INTEGER NOT NULL DEFAULT 3 CHECK (freeze_count >= 0),
  custom_sessions JSONB DEFAULT '[]',
  day_assignments JSONB DEFAULT '{}',
  default_session_overrides JSONB DEFAULT '{}',
  wrapped_shown_weeks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE public.daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gym_workout_done BOOLEAN DEFAULT FALSE,
  outdoor_walk_done BOOLEAN DEFAULT FALSE,
  reading_done BOOLEAN DEFAULT FALSE,
  reading_book TEXT DEFAULT '',
  diet_slots JSONB DEFAULT '{"breakfast":"","lunch":"","dinner":"","snacks":""}',
  mood_emoji TEXT DEFAULT '',
  energy_level INTEGER DEFAULT 3,
  motivation_level INTEGER DEFAULT 3,
  soreness_level INTEGER DEFAULT 3,
  progress_photo_url TEXT DEFAULT '',
  progress_photos JSONB DEFAULT '[]',
  all_tasks_complete BOOLEAN DEFAULT FALSE,
  celebration_shown BOOLEAN DEFAULT FALSE,
  ai_insight_shown TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  duration_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, session_type)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_app_state_user ON public.app_state(user_id);
CREATE INDEX idx_daily_logs_user_date ON public.daily_logs(user_id, date);
CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, date);

-- ---------------------------------------------------------------------------
-- RLS + policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own app_state" ON public.app_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app_state" ON public.app_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own app_state" ON public.app_state
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_logs" ON public.daily_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_logs" ON public.daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_logs" ON public.daily_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workout_sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout_sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-profile trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  INSERT INTO public.app_state (user_id, streak, current_day, start_date, mode, freeze_count)
  VALUES (NEW.id, 0, 1, CURRENT_DATE, 'workout', 3);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage bucket + policies for progress photos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMIT;
