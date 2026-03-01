# 🔥 IRON75 — 75 Hard Challenge Tracker

A mobile-first Progressive Web App (PWA) built with Next.js to track every day of the 75 Hard mental toughness challenge. Dark theme, gamified streaks, animated UI, and full progress visualization — all running offline from `localStorage`, no backend required.

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

**Charts sub-tab — 4 live Recharts charts reading from localStorage:**
1. 📈 **Mood Trend** — line chart, terrible=1 to great=5, orange line, reference baseline at 3
2. ⚡ **Energy / Motivation / Soreness** — three-line chart (orange / teal / red), 1–5 scale
3. 💧 **Water Intake** — bar chart in litres, yellow goal line at 3.8L
4. ✅ **Tasks per Day** — colour-coded bar chart (teal=6/6, orange=3–5, red=0–2), reference line at 6

All charts: dark transparent background, `#2a2a4a` grid lines, smooth mount animations, responsive width. Empty state shown when no logs exist yet.

### AI Coach Tab
- Day-specific motivational tip (15-tip rotating pool)
- Pattern Analysis panel (Gemini Flash via AWS Lambda — planned integration)

### Settings Tab
- User name (persisted to `localStorage`)
- Challenge stats grid: current day, streak, longest streak, total restarts
- Start date display
- **Danger Zone** — restart challenge with confirmation dialog (resets streak, increments restart counter)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| Storage | `localStorage` (100% offline, no backend) |
| PWA | Web App Manifest + viewport meta |
| Font | Geist Sans / Geist Mono |

---

## Project Structure

```
app/
├── page.tsx               # App shell — tab router, bottom nav
├── layout.tsx             # Root layout, PWA metadata, viewport
├── globals.css            # Global styles, slider theming
├── components/
│   ├── TodayScreen.tsx    # 6 task cards + optional photo section
│   ├── WorkoutScreen.tsx  # PPL schedule display
│   ├── ProgressScreen.tsx # Heatmap (grid/rings) + 4 Recharts charts
│   ├── AICoachScreen.tsx  # Daily tip + pattern analysis
│   ├── SettingsScreen.tsx # Profile, stats, restart
│   ├── CelebrationOverlay.tsx
│   └── WaterBottle.tsx    # Animated SVG water bottle
└── lib/
    ├── types.ts           # DailyLog, AppState, WorkoutSession interfaces
    ├── storage.ts         # localStorage CRUD, key helpers, task completion check
    ├── streakLogic.ts     # Streak init, completion, wedding countdown, 10 PM check
    └── aiTips.ts          # 15-tip daily coaching pool
public/
└── manifest.json          # PWA manifest
```

---

## localStorage Keys

| Key | Value |
|---|---|
| `iron75_dailylog_YYYY-MM-DD` | Full `DailyLog` JSON for each day |
| `iron75_streak` | Current streak integer |
| `iron75_day` | Current challenge day (1–75) |
| `iron75_start_date` | Challenge start date (`YYYY-MM-DD`) |
| `iron75_longest_streak` | All-time best streak |
| `iron75_total_restarts` | Number of challenge restarts |
| `iron75_user_name` | User display name |
| `iron75_photo_YYYY-MM-DD` | Base64 progress photo for a given day |
| `iron75_workout_YYYY-MM-DD` | Workout session JSON |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works fully offline — no API keys, no database, no sign-in required.

```bash
npm run build   # Production build
npm start       # Serve production build
```

---

## Streak Rules

- All **6 required tasks** must be completed before midnight to maintain the streak
- Missing any single task on a given day resets the streak to 0 and increments the restart counter
- Streak and day are automatically validated on each app load against yesterday's log
- The 10 PM warning fires when tasks remain incomplete after 22:00

---

## Roadmap

- [ ] Push workout exercise cards (set/rep tracking per PPL session)
- [ ] Gemini Flash pattern analysis via AWS Lambda
- [ ] Progress photo comparison (Day 1 vs today slider)
- [ ] Firebase FCM push notifications (10 PM reminder)
- [ ] Cloud sync / multi-device support
