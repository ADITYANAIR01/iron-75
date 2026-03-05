# Supabase Setup Guide — Iron75

Complete step-by-step guide to configure Supabase for authentication, database, and photo storage with the Iron75 app.

---

## Table of Contents

1. [Create a Supabase Project](#1-create-a-supabase-project)
2. [Get API Keys](#2-get-api-keys)
3. [Configure Environment Variables](#3-configure-environment-variables)
4. [Create Database Tables](#4-create-database-tables)
5. [Enable Row Level Security (RLS)](#5-enable-row-level-security-rls)
6. [Set Up Authentication](#6-set-up-authentication)
7. [Configure Google OAuth (Optional)](#7-configure-google-oauth-optional)
8. [Set Up Storage for Photos](#8-set-up-storage-for-photos)
9. [Database Trigger for Auto-Profile](#9-database-trigger-for-auto-profile)
10. [Verify Setup](#10-verify-setup)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (GitHub login works).
2. Click **"New Project"**.
3. Fill in:
   - **Project Name**: `iron75` (or any name you prefer)
   - **Database Password**: Generate a strong password and **save it** — you'll need it for direct DB access later.
   - **Region**: Choose the region closest to you.
4. Click **"Create new project"** and wait ~2 minutes for provisioning.

---

## 2. Get API Keys

1. In your Supabase dashboard, go to **Project Settings → API** (left sidebar → ⚙️ Settings → API).
2. You need two values:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon (public) key** — a long JWT string starting with `eyJ...`

> ⚠️ **Never expose the `service_role` key** in frontend code. Only use the `anon` key.

---

## 3. Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Edit `.env.local` and paste your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Restart your dev server after changes:
   ```bash
   npm run dev
   ```

---

## 4. Create Database Tables

Go to **SQL Editor** in your Supabase dashboard (left sidebar → SQL Editor), click **"New query"**, and run the following SQL:

```sql
-- ─────────────────────────────────────────────────────────
-- Iron75 Database Schema
-- ─────────────────────────────────────────────────────────

-- 1. Profiles table (auto-created on sign-up via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. App state (streak, day, meta — one row per user)
CREATE TABLE IF NOT EXISTS public.app_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INTEGER DEFAULT 0,
  current_day INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  longest_streak INTEGER DEFAULT 0,
  total_restarts INTEGER DEFAULT 0,
  custom_sessions JSONB DEFAULT '[]',
  day_assignments JSONB DEFAULT '{}',
  wrapped_shown_weeks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Daily logs (one row per user per day)
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gym_workout_done BOOLEAN DEFAULT FALSE,
  outdoor_walk_done BOOLEAN DEFAULT FALSE,
  water_liters NUMERIC(4,2) DEFAULT 0,
  water_goal_met BOOLEAN DEFAULT FALSE,
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

-- 4. Workout sessions (optional — for future PPL tracking)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  duration_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_state_user ON public.app_state(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, date);
```

Click **"Run"** (or press `Ctrl+Enter`). You should see "Success. No rows returned."

---

## 5. Enable Row Level Security (RLS)

RLS ensures each user can only read/write **their own data**. Run this in the SQL Editor:

```sql
-- ─────────────────────────────────────────────────────────
-- Row Level Security Policies
-- ─────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- App State: users can CRUD their own state
CREATE POLICY "Users can view own app_state"
  ON public.app_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app_state"
  ON public.app_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app_state"
  ON public.app_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily Logs: users can CRUD their own logs
CREATE POLICY "Users can view own daily_logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Workout Sessions: users can CRUD their own sessions
CREATE POLICY "Users can view own workout_sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout_sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout_sessions"
  ON public.workout_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 6. Set Up Authentication

### Email/Password Auth (enabled by default)

1. Go to **Authentication → Providers** in the Supabase dashboard.
2. **Email** should already be enabled. Verify settings:
   - ✅ Enable email confirmations (recommended for production)
   - Or ❌ Disable email confirmations for faster dev testing
3. For development, you may want to disable "Confirm email" under **Authentication → Settings → Email Auth** to skip the confirmation email step.

### Configure Auth Redirect URLs

1. Go to **Authentication → URL Configuration**.
2. Set:
   - **Site URL**: `http://localhost:3000` (for dev)
   - **Redirect URLs**: Add `http://localhost:3000/**`
3. For production, add your deployed domain (e.g., `https://iron75.vercel.app/**`).

---

## 7. Configure Google OAuth (Optional)

To enable "Continue with Google" login:

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or use an existing one).
3. Go to **APIs & Services → Credentials**.
4. Click **"Create Credentials" → "OAuth client ID"**.
5. Choose **Web application**.
6. Set:
   - **Authorized JavaScript Origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `https://your-project-id.supabase.co/auth/v1/callback`
     (Replace `your-project-id` with your actual Supabase project ID)
7. Click **Create** and copy the **Client ID** and **Client Secret**.

### Step 2: Configure in Supabase

1. Go to **Authentication → Providers** in the Supabase dashboard.
2. Find **Google** and toggle it on.
3. Paste the **Client ID** and **Client Secret** from Step 1.
4. Click **Save**.

> 💡 For production, also add your production domain to the Google OAuth redirect URIs.

---

## 8. Set Up Storage for Photos

Progress photos (up to 4 per day) are uploaded to Supabase Storage and synced via the `progress_photos` JSONB column in `daily_logs`.

### Create a Storage Bucket

1. Go to **Storage** in the Supabase dashboard.
2. Click **"New bucket"**.
3. Configure:
   - **Name**: `progress-photos`
   - **Public**: ❌ No (keep private — users access via signed URLs)
   - **File size limit**: `5MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`
4. Click **Create bucket**.

### Add Storage RLS Policies

Run in SQL Editor:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own photos
CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Upload Pattern

Photos are uploaded to the path: `{user_id}/iron75_day{N}_{date}_slot{i}_{timestamp}.jpg`

Up to 4 photos per day. The app compresses images to JPEG before upload and stores signed URLs (1-year expiry) in the `progress_photos` array.

```typescript
// How the app uploads (handled automatically by storage.ts)
const urls = await uploadMultiplePhotos(files, date, dayNumber);
// urls = ['https://...signed-url-1', 'https://...signed-url-2', ...]
```

---

## 9. Database Trigger for Auto-Profile

This trigger automatically creates a `profiles` row when a new user signs up. Run in SQL Editor:

```sql
-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  -- Also create default app_state
  INSERT INTO public.app_state (user_id, streak, current_day, start_date)
  VALUES (NEW.id, 0, 1, CURRENT_DATE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 10. Verify Setup

### Quick Checklist

- [ ] Supabase project created
- [ ] `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] All 4 tables created (`profiles`, `app_state`, `daily_logs`, `workout_sessions`)
- [ ] RLS enabled on all tables with correct policies
- [ ] Email auth is working (try signing up)
- [ ] Google OAuth configured (optional)
- [ ] Auto-profile trigger is active
- [ ] `progress-photos` storage bucket created with RLS policies

### Test the App

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000).
3. You should see the **Login screen**.
4. Sign up with email/password.
5. Check the Supabase dashboard → **Table Editor** → `profiles` to verify a row was created.
6. Complete some tasks in the app.
7. Check **Table Editor** → `daily_logs` and `app_state` for synced data.

---

## 11. Troubleshooting

### "Invalid API key" error
- Double-check `.env.local` values match the Supabase dashboard exactly.
- Make sure you restarted the dev server after editing `.env.local`.

### Auth redirect loops
- Verify **Site URL** and **Redirect URLs** in **Authentication → URL Configuration**.
- For local dev, use `http://localhost:3000` (not `https`).

### Google OAuth not working
- Ensure the redirect URI in Google Cloud Console matches: `https://<project-id>.supabase.co/auth/v1/callback`
- Check that Google provider is enabled in Supabase dashboard.

---

## 12. Migration: Add Custom Workouts & Wrapped Sync Columns

If you already created the `app_state` table before these columns were added, run this migration in the SQL Editor:

```sql
-- Add JSONB columns for custom workout definitions, day assignments, and wrapped tracking
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS custom_sessions JSONB DEFAULT '[]';
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS day_assignments JSONB DEFAULT '{}';
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS wrapped_shown_weeks JSONB DEFAULT '[]';

-- Add multi-photo support to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS progress_photos JSONB DEFAULT '[]';
```

### Data not syncing to Supabase
- Open browser DevTools → Console and look for Supabase errors.
- Verify RLS policies are created (check **Authentication → Policies** in dashboard).
- The app uses fire-and-forget sync — data always writes to localStorage first.

### RLS policy errors (403)
- Make sure all policies use `auth.uid()` correctly.
- Check that the user is actually authenticated before making DB calls.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │────▶│  localStorage │     │    Supabase      │
│   (React)    │     │  (instant)    │     │                  │
│              │     └──────────────┘     │  ┌─────────────┐ │
│  User taps   │            │             │  │  PostgreSQL  │ │
│  a checkbox  │            │ fire &      │  │  (Database)  │ │
│              │            │ forget      │  └─────────────┘ │
│              │            ▼             │                  │
│              │────────────────────────▶│  ┌─────────────┐ │
│              │                          │  │    Auth      │ │
│              │◀─── on login sync ──────│  │  (Supabase)  │ │
│              │                          │  └─────────────┘ │
│              │                          │                  │
│              │                          │  ┌─────────────┐ │
│              │                          │  │   Storage    │ │
│              │                          │  │   (Photos)   │ │
│              │                          │  └─────────────┘ │
└─────────────┘                          └─────────────────┘
```

**Key design decisions:**
- **Offline-first**: localStorage is always the primary data source for instant UX
- **Fire-and-forget sync**: After writing to localStorage, Supabase sync happens asynchronously
- **Cloud → Local on login**: `syncFromSupabase()` pulls all cloud data into localStorage when a user signs in
- **RLS**: Every table is secured so users can only access their own rows

---

## 13. Complete Fresh Setup (Single Copy-Paste)

If you want to drop everything and recreate from scratch, run these blocks **in order** in the SQL Editor.

### Step 1 — Delete all existing objects

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP TABLE IF EXISTS public.workout_sessions CASCADE;
DROP TABLE IF EXISTS public.daily_logs CASCADE;
DROP TABLE IF EXISTS public.app_state CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

Also delete the `progress-photos` bucket in **Storage** (if it exists).

### Step 2 — Create everything fresh

```sql
-- Tables
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
  custom_sessions JSONB DEFAULT '[]',
  day_assignments JSONB DEFAULT '{}',
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
  water_liters NUMERIC(4,2) DEFAULT 0,
  water_goal_met BOOLEAN DEFAULT FALSE,
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_app_state_user ON public.app_state(user_id);
CREATE INDEX idx_daily_logs_user_date ON public.daily_logs(user_id, date);
CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, date);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own app_state"   ON public.app_state FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app_state" ON public.app_state FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own app_state" ON public.app_state FOR UPDATE  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_logs"   ON public.daily_logs FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_logs" ON public.daily_logs FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_logs" ON public.daily_logs FOR UPDATE  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own workout_sessions"   ON public.workout_sessions FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_sessions" ON public.workout_sessions FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout_sessions" ON public.workout_sessions FOR UPDATE  USING (auth.uid() = user_id);

-- Auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  INSERT INTO public.app_state (user_id, streak, current_day, start_date)
  VALUES (NEW.id, 0, 1, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 3 — Recreate storage bucket

1. Go to **Storage** → **New bucket**
2. Name: `progress-photos`, Public: **No**, Size limit: **5MB**, MIME: `image/jpeg, image/png, image/webp`
3. Run:

```sql
CREATE POLICY "Users can upload own photos"  ON storage.objects FOR INSERT  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own photos"    ON storage.objects FOR SELECT  USING  (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own photos"  ON storage.objects FOR DELETE  USING  (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

After running all 3 steps, sign out and sign back in so the trigger creates your fresh profile and app_state row.
