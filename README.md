# 🔥 IRON75

IRON75 is your digital companion for the grueling 75-day mental toughness challenge. This app allows you to track goals, monitor your mood, stay hydrated, manage workout sessions, and stay accountable to your commitment without sacrificing your personal privacy.

## ✨ Features

- **Daily Dashboard:** Track your 6 core required tasks daily. Watch your flame and streak counters grow as you conquer each objective.
- **PPL Workout Plans:** Built-in Push/Pull/Legs tracking lets you log reps, sets, and notes immediately within the app.
- **Progress Tracking:** Review your whole journey via dynamic GitHub-styled heatmap grids, rings, and trend charts.
- **Weekly Wrapped:** Every 7 days, get a comprehensive, automated summary of how well you performed and where you can improve.
- **AI Coach:** Receive personalized, highly contextual motivation and actionable recovery guidance every time you log in.

## 🔒 We Value Your Privacy

We believe a tracking app should not turn your daily routine into a commodity. This means:

1. **You Own Your Data:** We store your data locally on your device whenever possible. Information synced to the cloud is strictly isolated to your user account alone using enterprise-grade Row-Level Security (RLS). No other user can ever query or read your data files.
2. **AI with Boundaries:** The intelligent coaching you receive is powered by anonymized API calls. We do not expose backend keys, nor do we track or retain your interactions identically linked to your identity inside the AI. The system assesses *only the metrics necessary* (like mood, energy levels, and logged completion items) to formulate a tip or strategy.
3. **No Hidden Tracking:** This app is a tool designed to log events you initiate. There are zero non-essential background telemetry analytics, zero ads, and zero third-party behavioral fingerprint trackers.

## 🚀 Start Tracking Now

You do not need to be a developer to use IRON75! Because all of the privacy and security features described above are already fully implemented, you can start tracking your challenge directly right now as a normal user.

----
👉 **[iron-75.vercel.app](iron-75.vercel.app)** 
----

## 💻 Developer Overview

Welcome to the IRON75 codebase. This is a Next.js Progressive Web App (PWA) with local-first data storage and background cloud synchronization.

### Architecture & Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS v4 + Framer Motion
- **Database / Auth:** Supabase (PostgreSQL, Row Level Security)
- **State Management:** React state + direct `localStorage` sync
- **AI Integration:** Google Gemini integration via server-side proxy

### Core Philosophies

#### 1. Privacy First & Local-First Processing
All core daily logs and streaks immediately save to `localStorage`. The application can function offline. Cloud synchronization runs asynchronously purely for multi-device support and data persistence. Row Level Security (RLS) policies on Supabase guarantee that users can exclusively access their own rows.

The AI Coaching proxy (`/api/gemini/route.ts`) acts as a secure intermediary. The Gemini API key is never exposed to the client bundle.

#### 2. Gamified Tracking
The challenge requires completing 6 explicit daily tasks before midnight. Missing any unchecks the sequence, triggering a logic flow (`streakLogic.ts`) that resets the user's progress while preserving their historical logs (`daily_logs` table).

### Development Setup

#### 1. Requirements
Ensure you have Node.js 18+ installed. Connect to an active Supabase project.

#### 2. Environment Variables
Create a `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_INSTANCE].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_KEY]
GEMINI_API_KEY=[YOUR_AI_KEY] # Optional
```

#### 3. Running Locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.

### Supabase Schema Requirements
See `Docs/supabase-setup.md` for full DB implementation rules. The minimal required tables are:
- `profiles`
- `app_state`
- `daily_logs`
- `workout_sessions`

All tables must enforce `auth.uid() = id/user_id` inside their RLS policies.
