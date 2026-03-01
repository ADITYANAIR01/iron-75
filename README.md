# 🔥 IRON75 — 75 Hard Challenge Tracker

A mobile-first Progressive Web App (PWA) built with Next.js to track every day of the 75 Hard mental toughness challenge. Dark theme, gamified streaks, animated UI, and full progress visualization — with **Supabase** for authentication, cloud database sync, and photo storage.

---

## Features

### Today Tab
- **6 required daily tasks** tracked independently, each counting toward the 6/6 completion goal and streak:
  - 🏋️ Gym Workout (PPL Session) — single-tap binary checkbox with spring-animated tick
  - 🚶 Outdoor Walk / College Walk — single-tap binary checkbox
  - 💧 Water Intake — animated water bottle fill, logs in 0.5L increments toward 3.8L goal
  - 🥗 Diet Diary — 4 meal slots (breakfast, lunch, dinner, snacks)
  - 😊 Mood & Energy Log — emoji mood picker + energy / motivation / soreness sliders (1–5)
  - 📖 10 Pages Read — mark done with optional book title input
- **Progress Photo (Optional)** — separate dashed-border section below required tasks, not counted toward streak
- **Streak counter** with flame animation, current day, best streak, and wedding countdown badge
- **6/6 progress bar** that animates as tasks are completed
- **Celebration overlay** fires once when all 6 required tasks are completed for the first time that day
- **10 PM warning banner** when tasks remain incomplete after 22:00
- **AI Coach tip card** — dismissable daily motivational insight per challenge day

### Workout Tab
- Displays today's PPL session (Push A/B, Pull A/B, Legs A/B, Mobility) based on day of week
- Session type, muscle group focus, and emoji indicator

### Progress Tab
**Overview sub-tab — Dual heatmap with toggle:**
- **GitHub Grid** — 75 squares (11-col grid), green = complete, red = failed, grey = future; hover tooltip with day number, date, and task count
- **Progress Rings** — 75 circular SVG rings, arc fill = tasks completed that day (0–6), color-graded red → yellow → teal; staggered entrance animation

**Charts sub-tab — 4 live Recharts charts:**
1. 📈 **Mood Trend** — line chart, terrible=1 to great=5, orange line, reference baseline at 3
2. ⚡ **Energy / Motivation / Soreness** — three-line chart (orange / teal / red), 1–5 scale
3. 💧 **Water Intake** — bar chart in litres, yellow goal line at 3.8L
4. ✅ **Tasks per Day** — colour-coded bar chart (teal=6/6, orange=3–5, red=0–2), reference line at 6

### AI Coach Tab
- Day-specific motivational tip (15-tip rotating pool)
- Pattern Analysis panel (Gemini Flash via Supabase Edge Functions — planned integration)

### Settings Tab
- User name (synced to Supabase profile)
- Challenge stats grid: current day, streak, longest streak, total restarts
- Start date display
- **Account section** — shows signed-in email, Supabase sync status, sign-out button
- **Danger Zone** — restart challenge with confirmation dialog (resets streak, increments restart counter)

### Authentication
- **Email/password** sign-up and login
- **Google OAuth** sign-in (optional, configurable)
- Session managed via Supabase Auth + middleware cookie refresh
- Full login/sign-up screen with animated branding

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase (PostgreSQL) with RLS |
| Storage | Supabase Storage (for photos — planned) |
| Offline | localStorage (primary) + cloud sync |
| PWA | Web App Manifest + viewport meta |
| Font | Geist Sans / Geist Mono |

---

## Project Structure

```
app/
├── page.tsx               # App shell — auth gate, tab router, bottom nav
├── layout.tsx             # Root layout, PWA metadata, viewport
├── globals.css            # Global styles, slider theming
├── components/
│   ├── AuthProvider.tsx   # Supabase Auth context + hooks
│   ├── LoginScreen.tsx    # Email/password + Google OAuth login
│   ├── TodayScreen.tsx    # 6 task cards + optional photo section
│   ├── WorkoutScreen.tsx  # PPL schedule display
│   ├── ProgressScreen.tsx # Heatmap (grid/rings) + 4 Recharts charts
│   ├── AICoachScreen.tsx  # Daily tip + pattern analysis
│   ├── SettingsScreen.tsx # Profile, stats, account, restart
│   ├── CelebrationOverlay.tsx
│   └── WaterBottle.tsx    # Animated SVG water bottle
└── lib/
    ├── types.ts           # DailyLog, AppState, WorkoutSession interfaces
    ├── storage.ts         # localStorage + Supabase sync CRUD
    ├── streakLogic.ts     # Streak init, completion, wedding countdown
    ├── aiTips.ts          # 15-tip daily coaching pool
    ├── supabase.ts        # Browser Supabase client
    ├── supabase-server.ts # Server Supabase client
    └── database.types.ts  # TypeScript types for Supabase tables
middleware.ts              # Auth session refresh middleware
Docs/
├── supabase-setup.md      # Complete Supabase setup guide
└── Iron75_Master_Plan.pdf
public/
└── manifest.json          # PWA manifest
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Follow the complete guide: **[Docs/supabase-setup.md](Docs/supabase-setup.md)**

Quick summary:
1. Create a Supabase project
2. Copy `.env.local.example` → `.env.local` and fill in your Supabase URL + anon key
3. Run the SQL migrations in the Supabase SQL Editor (create tables, RLS, triggers)
4. Enable email auth (+ optionally Google OAuth)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see the login screen — sign up to get started.

### 4. Production Build

```bash
npm run build
npm start
```

---

## Data Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │────▶│  localStorage │────▶│    Supabase      │
│   (React)    │     │  (instant)    │     │   PostgreSQL     │
│              │     └──────────────┘     │   + Auth + RLS   │
│              │◀─── on login sync ──────│                  │
└─────────────┘                          └─────────────────┘
```

- **Offline-first**: localStorage is the primary data source for instant UX
- **Fire-and-forget sync**: After writing to localStorage, Supabase sync happens asynchronously
- **Cloud → local on login**: `syncFromSupabase()` pulls all cloud data into localStorage on sign-in
- **RLS**: Every table is secured — users can only access their own rows

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `profiles` | User display name + avatar (auto-created on sign-up) |
| `app_state` | Streak, current day, start date, longest streak, total restarts |
| `daily_logs` | Full daily log per user per day (tasks, mood, water, diet, etc.) |
| `workout_sessions` | PPL workout tracking (future) |

---

## Streak Rules

- All **6 required tasks** must be completed before midnight to maintain the streak
- Missing any single task on a given day resets the streak to 0 and increments the restart counter
- Streak and day are automatically validated on each app load against yesterday's log
- The 10 PM warning fires when tasks remain incomplete after 22:00

---

## Roadmap

- [ ] Push workout exercise cards (set/rep tracking per PPL session)
- [ ] Gemini Flash pattern analysis via Supabase Edge Functions
- [ ] Progress photo upload to Supabase Storage (replace base64)
- [ ] Progress photo comparison (Day 1 vs today slider)
- [ ] Push notifications (10 PM reminder)
- [ ] Multi-device real-time sync

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon (public) key |
