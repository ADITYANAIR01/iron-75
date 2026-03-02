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

### Workout Tab — Full PPL Session Tracker
- **7 sessions** (Push A/B, Pull A/B, Legs A/B, Mobility), auto-selected by day of week
- **7 exercises per session** with per-set checkboxes, reps input, coach tip, rest timer, and notes
- Live session progress bar; **Complete Session** marks `gymWorkoutDone = true` for the day
- Session state persisted in `localStorage` keyed by `date + sessionKey`
- Warmup & cooldown protocols shown for each session

### Progress Tab
**Overview sub-tab — Dual heatmap with toggle:**
- **GitHub Grid** — 75 squares (11-col grid), green = complete, red = failed, grey = future; hover tooltip with day number, date, and task count
- **Progress Rings** — 75 circular SVG rings, arc fill = tasks completed that day (0–6), color-graded red → yellow → teal; staggered entrance animation

**Charts sub-tab — 4 live Recharts charts:**
1. 📈 **Mood Trend** — line chart, terrible=1 to great=5, orange line, reference baseline at 3
2. ⚡ **Energy / Motivation / Soreness** — three-line chart (orange / teal / red), 1–5 scale
3. 💧 **Water Intake** — bar chart in litres, yellow goal line at 3.8L
4. ✅ **Tasks per Day** — colour-coded bar chart (teal=6/6, orange=3–5, red=0–2), reference line at 6

### AI Coach Tab (Powered by Gemini)
- **Today's Power Tip** — auto-loads on mount with real log context (day, streak, mood, tasks, energy)
- **7-day Pattern Analysis** — identifies trends across last 7 days
- **Hype Me Up** — championship-style motivational speech
- **Recovery Tips** — science-backed soreness & sleep advice
- Responses cached per session; refresh button to regenerate
- All API calls go through `/api/gemini` server-side proxy — key never exposed to client

### Roadmap Tab
- **5 named phases**: Foundation (Days 1–7) → Momentum → Forging → Elite → Legacy (Days 61–75)
- **6 milestone badges**: Days 7, 14, 21, 30, 50, 75 — tap to open milestone modal
- Week-by-week timeline with phase tags and current week indicator
- Overall progress bar with gradient across all 75 days
- Earned badges section + phase motivation quotes

### Weekly Wrapped
- Spotify-style 5-slide weekly recap, auto-triggered every 7 days
- Slides: Personality title, Hydration stats, Workout/Walk/Reading counts, Mood/Energy averages, Perfect-day count
- Touch-swipe navigation; shown-state persisted to `localStorage`

### Responsive Layout
- **Desktop** (≥768px): persistent side navigation (220px), content capped at 780px centered, Weekly Wrapped button in header
- **Mobile**: original bottom nav unchanged (6 tabs including Roadmap + Settings)
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
| Storage | Supabase Storage (progress photos — live) |
| Offline | localStorage (primary) + cloud sync |
| PWA | Web App Manifest + viewport meta |
| Font | Geist Sans / Geist Mono |

---

## Project Structure

```
app/
├── page.tsx               # App shell — auth gate, tab router, responsive nav
├── layout.tsx             # Root layout, PWA metadata, viewport
├── globals.css            # Global styles, slider theming, animation keyframes
├── api/
│   └── gemini/route.ts    # Server-side Gemini AI proxy (key never in client)
├── components/
│   ├── AuthProvider.tsx   # Supabase Auth context + hooks
│   ├── LoginScreen.tsx    # Email/password + Google OAuth login
│   ├── TodayScreen.tsx    # 6 task cards + optional photo section
│   ├── WorkoutScreen.tsx  # Full PPL session cards with per-set tracking
│   ├── ProgressScreen.tsx # Heatmap (grid/rings) + 4 Recharts charts + photo grid
│   ├── AICoachScreen.tsx  # Gemini-powered coaching (4 modes)
│   ├── RoadmapScreen.tsx  # 75-day journey map (5 phases, 6 milestones)
│   ├── WeeklyWrapped.tsx  # Spotify-style weekly recap (5 slides)
│   ├── SettingsScreen.tsx # Profile, stats, account, restart
│   ├── CelebrationOverlay.tsx
│   └── WaterBottle.tsx    # Animated SVG water bottle
└── lib/
    ├── types.ts           # DailyLog, AppState, WorkoutSession interfaces
    ├── storage.ts         # localStorage + Supabase sync CRUD + photo upload
    ├── streakLogic.ts     # Streak init, completion, wedding countdown
    ├── aiTips.ts          # Fallback daily coaching tip pool
    ├── pplData.ts         # PPL exercise database (7 sessions × 7 exercises)
    ├── gemini.ts          # Gemini API client (calls /api/gemini proxy)
    ├── supabase.ts        # Browser Supabase client
    ├── supabase-server.ts # Server Supabase client
    └── database.types.ts  # TypeScript types for Supabase tables
proxy.ts                   # Auth session refresh proxy (Next.js 16)
Docs/
├── supabase-setup.md      # Complete Supabase setup guide
└── Iron75_Master_Plan.pdf
public/
├── logo.png               # App icon (PWA + browser tab)
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

### 2. Set Up Environment Variables

Copy `.env.local.example` → `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

- **Supabase**: Get these from your [Supabase project API settings](https://supabase.com/dashboard/project/_/settings/api)
- **Gemini**: Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Set Up Supabase

Follow the complete guide: **[Docs/supabase-setup.md](Docs/supabase-setup.md)**

Quick summary:
1. Create a Supabase project
2. Run the SQL migrations in the Supabase SQL Editor (create tables, RLS, triggers)
3. Enable email auth (+ optionally Google OAuth)
4. Create a `progress-photos` storage bucket (set to public)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see the login screen — sign up to get started.

### 5. Production Build

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
| `workout_sessions` | PPL workout session state (set/rep tracking) |

---

## Streak Rules

- All **6 required tasks** must be completed before midnight to maintain the streak
- Missing any single task on a given day resets the streak to 0 and increments the restart counter
- Streak and day are automatically validated on each app load against yesterday's log
- The 10 PM warning fires when tasks remain incomplete after 22:00

---

## Roadmap

- [x] Full PPL workout exercise cards (set/rep tracking per session)
- [x] Gemini AI coaching (4 modes, server-side proxy)
- [x] Progress photo upload to Supabase Storage
- [x] 75-day Roadmap tab (5 phases, 6 milestone badges)
- [x] Weekly Wrapped (Spotify-style 5-slide recap)
- [x] Responsive desktop + mobile layout
- [ ] Progress photo comparison (Day 1 vs today slider)
- [ ] Push notifications (10 PM reminder)
- [ ] Multi-device real-time sync

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon (public) key |
| `GEMINI_API_KEY` | ⚠️ Optional | Google Gemini API key (server-side only). Without it the AI Coach tab shows a fallback message; all other features work normally. |
