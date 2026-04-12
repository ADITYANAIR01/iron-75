# IRON75 Memory Document

Last audited: 2026-04-12
Repository root: `C:\CODES\iron-75`

## 1) Purpose Of This File
This document is the full project memory for rebuilding this web application from scratch.

It is intentionally implementation-level detailed.

It is written as a platform blueprint first (architecture, contracts, behavior), then mapped to the current reference implementation.

Important language note:
- Do not lock your rebuild to one language.
- Build around behavior contracts, data schema, sync rules, and UI states.
- Current reference implementation only: Next.js + React + TypeScript.

## 2) Product Definition
IRON75 is a 75-day habit and fitness challenge tracker with:
- Daily task completion tracking.
- Streak and day progression logic.
- Dual mode challenge behavior.
- Workout tracking (default PPL + custom sessions).
- Progress analytics and photos.
- Weekly wrapped summary.
- AI coach prompts based on user data.
- Local-first persistence with cloud sync.
- Authenticated multi-device support.
- PWA support for install and offline shell.

Core principles:
- Local-first responsiveness.
- Privacy first.
- Offline tolerance.
- Cloud sync as secondary durability layer.
- User-specific isolation through database Row Level Security.

## 3) Route-Level Feature Map
| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Marketing landing page | Public |
| `/login` | Email/password + OAuth entry | Public |
| `/auth/callback` | OAuth code exchange and redirect | Public callback route |
| `/dashboard` | Main app shell + all tabs | Auth required |
| `/api/gemini` | Server proxy to Gemini API | Auth required |

Dashboard tabs:
- Today
- Workout
- Progress
- AI Coach
- Roadmap
- Settings

## 4) Reference Stack (Current Implementation)
Runtime and framework:
- Next.js 16.1.6
- React 19.2.4
- TypeScript 5.9.3

UI and animation:
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Framer Motion
- Recharts

Backend services:
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Google Gemini via server route

Utility:
- Howler (celebration sound)
- Vitest (tests)

## 5) Project Structure And Ownership
Top level:
- `app/` -> application routes, screens, components, business logic
- `Docs/` -> Supabase setup and migration SQL
- `public/` -> PWA manifest, logo, service worker
- `next.config.ts` -> headers and PWA/security policies
- `package.json` -> scripts and dependencies

Key files:
- `app/dashboard/page.tsx` -> authenticated shell, tab system, mode toggle, wrapped trigger logic
- `app/components/TodayScreen.tsx` -> main daily workflow, completion logic, photo upload UX
- `app/components/WorkoutScreen.tsx` -> workout execution and session completion
- `app/components/WorkoutPlanner.tsx` -> custom session management and day assignments
- `app/components/ProgressScreen.tsx` -> heatmap, charts, photo gallery
- `app/components/AICoachScreen.tsx` -> challenge-specific AI prompts and response caching
- `app/components/RoadmapScreen.tsx` -> milestone and phase roadmap
- `app/components/SettingsScreen.tsx` -> profile, export, recovery, reset/delete, account actions
- `app/lib/storage.ts` -> primary persistence/sync engine
- `app/lib/streakLogic.ts` -> streak progression and missed-day rules
- `app/lib/customWorkouts.ts` -> custom sessions, default overrides, assignment resolution
- `app/lib/pplData.ts` -> default workouts
- `app/lib/aiTips.ts` -> deterministic daily tips and quote cache logic
- `app/lib/gemini.ts` -> client fetch wrapper with offline fallback
- `app/api/gemini/route.ts` -> secure AI proxy and rate limit

## 6) Functional Domains
### 6.1 Authentication
Implemented through Supabase browser client.

User actions:
- Login with email/password.
- Signup with email/password.
- Sign in with Google OAuth.
- Sign out.

Session flow:
- `AuthProvider` loads initial session, subscribes to auth state changes.
- `/auth/callback` exchanges OAuth code to session and redirects.
- `/dashboard` gate checks `useAuth()`, falls back to login UI if unauthenticated.
- Supabase client init now fails fast if required env vars are missing (no placeholder fallback credentials).

### 6.2 Daily Challenge Domain
Tracked daily habits (5 total):
- Gym workout done
- Outdoor walk done
- Diet logged (at least one meal slot non-empty)
- Mood selected
- Reading completed

Note:
- Progress photos exist but are optional and not part of all-task completion count.

### 6.3 Streak Modes
App mode values:
- `workout`
- `75hard`

Workout mode:
- Missed day consumes a freeze first.
- If freezes are 0, missed day resets streak/day and increments restart counter.
- Freeze count is non-negative (no legacy cap at 5).
- Milestone reward: +2 freezes at streak 10/20/40/60.

75hard mode:
- No freeze protection.
- Any missed day resets immediately.

Mode switching rules in dashboard:
- Entering 75hard requires streak >= 10.
- Returning to workout preserves current freeze count (no auto-refill exploit).

### 6.4 Workout Domain
Default sessions:
- pushA, pullA, legsA, pushB, pullB, legsB, mobility

Week mapping:
- Sun: mobility
- Mon: pushA
- Tue: pullA
- Wed: legsA
- Thu: pushB
- Fri: pullB
- Sat: legsB

User can:
- Create custom sessions.
- Assign custom or default sessions to day-of-week.
- Override default exercises for each default session key.

Workout completion:
- Auto-complete when all sets of all exercises are marked done.
- Manual "Complete Session" button exists.
- Completion updates daily log `gymWorkoutDone`.

### 6.5 Progress Domain
Visual outputs:
- 75-day heatmap (grid mode).
- Ring mode showing per-day task completion ratio.
- Stats cards (complete, failed, remaining).
- Photo timeline and before/after.
- Trend charts (mood, energy/motivation/soreness, tasks).

### 6.6 Weekly Wrapped Domain
Triggered at:
- Every week boundary (`currentDay % 7 === 0`).
- End of challenge (`currentDay >= 75`).

Behavior:
- Reads 7 logs from provided week start date.
- Calculates score and summary metrics.
- Shows multi-slide overlay.
- Tracks shown weeks locally and syncs to cloud (`wrapped_shown_weeks`).

### 6.7 AI Coach Domain
Five challenge actions:
- tip
- pattern
- motivation
- recovery
- nutrition

Each action builds a structured prompt from current app state and logs.

Response behavior:
- Calls `/api/gemini`.
- If unavailable or invalid, returns robust local offline tips.
- Caches coach responses per day in local storage.
- Daily quote cache handled separately in `aiTips.ts`.

### 6.8 Notifications Domain
Implemented reminder feature:
- Daily reminder settings are saved locally (`iron75_daily_reminder_settings`).
- Browser Notification API permission states (`granted`/`denied`/`default`/unsupported) are handled explicitly.
- Settings exposes enable/save/test flows with safe fallback messaging when notifications are blocked.

### 6.9 Accountability Domain
Shared check-ins are now local-first plus cloud mirrored:
- Local profile is stored in `iron75_accountability_circle_profile`.
- Authenticated users sync profile data through `app_state.default_session_overrides.accountability_profile`.
- Merge policy prefers non-empty data, then newer `updatedAt` when both local and cloud contain values.

## 7) Data Contracts
### 7.1 Core Types
`AppState`:
- `streak: number`
- `currentDay: number` (1..75)
- `startDate: string` (`YYYY-MM-DD`)
- `longestStreak: number`
- `totalRestarts: number`
- `mode: 'workout' | '75hard'`
- `freezeCount: number`

`DailyLog`:
- `date: string`
- `gymWorkoutDone: boolean`
- `outdoorWalkDone: boolean`
- `readingDone: boolean`
- `readingBook: string`
- `dietSlots: { breakfast, lunch, dinner, snacks }`
- `moodEmoji: 'great' | 'good' | 'meh' | 'bad' | 'terrible' | ''`
- `energyLevel: 1..5`
- `motivationLevel: 1..5`
- `sorenessLevel: 1..5`
- `progressPhotoUrl: string` (legacy single photo field)
- `progressPhotos: string[]` (up to 4)
- `allTasksComplete: boolean`
- `celebrationShown: boolean`
- `aiInsightShown: string`
- `updatedAt?: string` (ISO timestamp)

Workout state:
- `ExerciseState` -> `sets[]`, `notes`, `expanded`
- `SetState` -> `done`, `reps`

### 7.2 Local Storage Keys (Critical)
App and streak keys:
- `iron75_streak`
- `iron75_day`
- `iron75_start_date`
- `iron75_longest_streak`
- `iron75_total_restarts`
- `iron75_mode`
- `iron75_freeze_count`
- `iron75_app_state_updated_at`
- `iron75_streak_check_date`
- `iron75_goal_date`

Daily and workout keys:
- `iron75_dailylog_<YYYY-MM-DD>`
- `iron75_workout_state_<date>_<sessionKey>`
- `iron75_workout_complete_<date>_<sessionKey>`
- `iron75_workout_ts_<date>_<sessionKey>`

Wrapped and custom workout keys:
- `iron75_wrapped_shown_weeks`
- `iron75_custom_sessions`
- `iron75_day_assignments`
- `iron75_default_session_overrides`

Profile and AI cache keys:
- `iron75_user_name`
- `iron75_ai_quote`
- `iron75_ai_quote_date`
- `iron75_ai_quote_failed_date`
- `iron75_coach_<challengeId>_<YYYY-MM-DD>`

Reminder and accountability keys:
- `iron75_daily_reminder_settings`
- `iron75_accountability_circle_profile`

Sync queue:
- `iron75_pending_sync`

### 7.3 Cloud Schema (Supabase)
Tables:
- `profiles`
- `app_state`
- `daily_logs`
- `workout_sessions`

`profiles`:
- `id` UUID PK references `auth.users`
- `display_name`, `avatar_url`, timestamps

`app_state`:
- `user_id` UUID unique
- streak metrics and challenge metadata
- `mode`, `freeze_count`
- JSONB: `custom_sessions`, `day_assignments`, `default_session_overrides`, `wrapped_shown_weeks`
- timestamps

`daily_logs`:
- `user_id`, `date` unique pair
- booleans and metrics mirroring `DailyLog`
- JSONB `diet_slots`, JSONB `progress_photos`
- legacy `progress_photo_url` kept for compatibility
- timestamps

`workout_sessions`:
- `user_id`, `date`, `session_type`
- `day_of_week`
- JSONB `exercises`
- `completed`
- timestamps

Storage:
- Bucket: `progress-photos` (private).
- Path format: `<user_id>/iron75_day<N>_<date>_slot<idx>_<timestamp>.jpg`.

### 7.4 Row Level Security
RLS expected on all above tables.
Policies must enforce `auth.uid() = id` or `auth.uid() = user_id`.
Storage policies scoped to first path segment folder name (`auth.uid()`).

### 7.5 Local To Cloud Field Mapping
App state mapping:

| Local contract | Cloud column |
| --- | --- |
| `streak` | `app_state.streak` |
| `currentDay` | `app_state.current_day` |
| `startDate` | `app_state.start_date` |
| `longestStreak` | `app_state.longest_streak` |
| `totalRestarts` | `app_state.total_restarts` |
| `mode` | `app_state.mode` |
| `freezeCount` | `app_state.freeze_count` |
| wrapped shown weeks | `app_state.wrapped_shown_weeks` |
| custom sessions JSON | `app_state.custom_sessions` |
| day assignments JSON | `app_state.day_assignments` |
| default overrides JSON | `app_state.default_session_overrides` |
| accountability profile JSON | `app_state.default_session_overrides.accountability_profile` |

Daily log mapping:

| Local contract | Cloud column |
| --- | --- |
| `date` | `daily_logs.date` |
| `gymWorkoutDone` | `daily_logs.gym_workout_done` |
| `outdoorWalkDone` | `daily_logs.outdoor_walk_done` |
| `readingDone` | `daily_logs.reading_done` |
| `readingBook` | `daily_logs.reading_book` |
| `dietSlots` | `daily_logs.diet_slots` |
| `moodEmoji` | `daily_logs.mood_emoji` |
| `energyLevel` | `daily_logs.energy_level` |
| `motivationLevel` | `daily_logs.motivation_level` |
| `sorenessLevel` | `daily_logs.soreness_level` |
| `progressPhotoUrl` | `daily_logs.progress_photo_url` |
| `progressPhotos` | `daily_logs.progress_photos` |
| `allTasksComplete` | `daily_logs.all_tasks_complete` |
| `celebrationShown` | `daily_logs.celebration_shown` |
| `aiInsightShown` | `daily_logs.ai_insight_shown` |
| `updatedAt` | `daily_logs.updated_at` |

Workout mapping:

| Local contract | Cloud column |
| --- | --- |
| local key date | `workout_sessions.date` |
| local key session id | `workout_sessions.session_type` |
| resolved day label | `workout_sessions.day_of_week` |
| exercise state object | `workout_sessions.exercises` |
| completion bit | `workout_sessions.completed` |
| local workout timestamp | `workout_sessions.updated_at` |

### 7.6 JSON Shapes You Must Keep Stable
`custom_sessions` JSONB:
- array of sessions
- each session contains:
- `id`, `name`, `emoji`, `color`
- `exercises[]` where each exercise has:
- `id`, `name`, `emoji`, `sets`, `repRange`, `rest`, `targetMuscle`, `tip`
- `warmup[]`, `cooldown[]`

`day_assignments` JSONB:
- object keyed by day-of-week integer (`0..6`)
- value is either default session key or custom session id

`default_session_overrides` JSONB:
- object keyed by default session key (`pushA`, `pullA`, etc.) with array values of custom exercise objects
- also includes `accountability_profile` object for shared check-ins sync metadata

`wrapped_shown_weeks` JSONB:
- array of numeric week numbers, for example `[1,2,3]`

### 7.7 Database Setup Notes For Rebuild
Use SQL from:
- `Docs/supabase.sql`

Minimum build-time checklist:
1. Create four core tables.
2. Create unique constraints and indexes.
3. Enable RLS on each table.
4. Create CRUD policies per table.
5. Create storage bucket and storage RLS policies.
6. Create `handle_new_user` trigger.
7. If needed, rerun `Docs/supabase.sql` for a fully fresh environment.

## 8) Sync Architecture (Local First + Cloud Mirror)
### 8.1 Write Path
On write:
1. Persist immediately to local storage.
2. Stamp `updatedAt`/timestamp.
3. Fire cloud upsert asynchronously.
4. If cloud call fails, enqueue in `iron75_pending_sync`.

### 8.2 Queue Flush
`syncFromSupabase()` starts by flushing queue:
- Replays pending app_state, daily_log, workout_state entries.
- Removes successful entries.
- Keeps failed entries for future retries.

### 8.3 Merge Strategy
Conflict resolution rule:
- Compare local and cloud timestamps lexically (ISO strings).
- Newer record wins.

Applied per domain:
- app_state: one row
- daily_logs: per date
- workout_sessions: per `(date, session_type)`

Custom workouts:
- synced through `app_state` JSONB fields.
- local-empty/cloud-nonempty -> pull cloud.
- local-nonempty/cloud-empty -> push local.
- both populated -> keep local edits.

Accountability profile:
- serialized under `app_state.default_session_overrides.accountability_profile`.
- merged local-first with timestamp tie-break (`updatedAt`).

### 8.4 Offline Guarantees
- Main UX is local storage backed.
- App remains usable without connectivity.
- Sync catches up when authenticated and online.

### 8.5 Critical Flow Pseudocode
Write flow:
```text
function saveX(record):
  record.updatedAt = nowIso()
  localStorage.set(key(record), serialize(record))
  try:
    cloudUpsert(record)
    dequeueIfPresent(record.identity)
  catch:
    enqueue(record.identity)
```

Startup sync flow:
```text
function syncFromCloud():
  if not authenticated: return
  flushPendingQueue()
  mergeAppStateByUpdatedAt()
  mergeDailyLogsByDateAndUpdatedAt()
  mergeWorkoutSessionsByDateSessionAndUpdatedAt()
  syncProfileName()
  syncCustomWorkoutJson()
```

Missed day streak flow:
```text
function initializeStreakOnLoad():
  if alreadyCheckedToday: return state
  if yesterdayComplete: return state
  if mode == "75hard": hardReset()
  else:
    if freezeCount > 0: freezeCount -= 1
    else: hardReset()
```

## 9) Business Rules You Must Preserve
### 9.1 Daily Completion Rule
`allTasksComplete` is true when `gymWorkoutDone` is true (workout-only streak rule).

### 9.2 Streak Initialization Rule
On app load:
- Run once per calendar day (guarded by `iron75_streak_check_date`).
- Inspect yesterday completion.
- Apply mode-specific penalty/recovery behavior.

### 9.3 Celebration Rule
When `gymWorkoutDone` flips true first time for day:
- trigger celebration overlay
- call `completeTodayStreak()`
- set `celebrationShown = true`
- avoid duplicate firing with local ref + stored field

### 9.4 Weekly Wrapped Rule
- Show at weekly milestones and challenge end.
- Do not show same week twice.
- Persist shown weeks locally and in `app_state`.

### 9.5 Photo Rule
- Up to 4 photos/day.
- try compressed upload to cloud first.
- fallback to base64 local if upload unavailable.
- keep first image mirrored in legacy `progressPhotoUrl`.

## 10) AI Pipeline Details
### 10.1 Client API Wrapper
`askGemini(prompt, challengeId)`:
- POST `/api/gemini`
- 12s timeout via `AbortController`
- if non-OK or weak response, return offline fallback text from local arrays

### 10.2 Server Route `/api/gemini`
Behavior sequence:
1. require `GEMINI_API_KEY`.
2. verify authenticated user from Supabase session cookies.
3. apply in-memory per-user rate limit:
- max 10 requests per 60s window.
4. validate prompt (string, max 3000 chars).
5. call Gemini model endpoint:
- `gemini-2.0-flash-lite:generateContent`
6. return plain text response payload.

Failure responses:
- 503 if no API key
- 401 if unauthenticated
- 429 if rate limited
- 400 for empty prompt
- 502 on upstream/network errors

Request contract:
```json
{
  "prompt": "string up to 3000 chars"
}
```

Success response contract:
```json
{
  "text": "plain text coach output"
}
```

Typical non-success response contract:
```json
{
  "text": "human-readable fallback message"
}
```

### 10.3 Local AI Caching
Daily quote cache:
- one generated quote/day.
- failed API attempt also cached by date to avoid repeated quota hits.

Coach response cache:
- per challenge id per day.

## 11) PWA, Security, And Runtime Headers
### 11.1 Manifest
`public/manifest.json` includes:
- standalone display mode
- icon definitions (maskable + normal)
- app metadata and theme colors

### 11.2 Service Worker
`public/sw.js`:
- precaches `/`, `/manifest.json`, `/logo.png`
- static cache-first for assets
- API network-first (no caching)
- page navigation network-first with cache fallback
- cleans old caches on activate

### 11.3 Next Headers
`next.config.ts` sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict `Referrer-Policy`
- `Strict-Transport-Security`
- custom CSP
- long immutable caching for static assets
- no-cache for service worker

## 12) Environment Variables
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional but required for AI features:
- `GEMINI_API_KEY`

Deploy all variables in hosting environment (not only local files).
Missing Supabase env now throws explicit configuration errors; placeholders are no longer used.

## 13) Rebuild Blueprint (From Scratch)
This section is the actual build plan.

### Phase 0: Define Contracts First
Deliverables:
- Product requirement doc with exact daily tasks and streak rules.
- Data contract doc for `AppState`, `DailyLog`, workout structures.
- Local key naming contract and cloud table schema.

Gate:
- Team agrees that all later code is implementation detail around these contracts.

### Phase 1: Initialize Core App Shell
Deliverables:
- Routing structure for `/`, `/login`, `/auth/callback`, `/dashboard`, `/api/gemini`.
- Base layout, theme variables, mobile-first shell, desktop sidebar.
- Tab scaffolding for six dashboard sections.

Gate:
- Unauthenticated user sees login.
- Authenticated user lands in dashboard shell.

### Phase 2: Authentication
Deliverables:
- Auth context/provider with session listener.
- Email/password login and signup.
- OAuth login and callback exchange.
- Sign out behavior.

Gate:
- Session survives reload.
- Logout fully detaches user and protected content.

### Phase 3: Local Persistence Engine
Deliverables:
- Date helpers using local timezone-safe formatting.
- Read/write functions for app state and daily logs.
- task completion evaluator.
- Workout state persistence per date/session key.
- wrapped shown-week tracking.

Gate:
- Full app works with no backend connectivity.

### Phase 4: Cloud Schema + RLS
Deliverables:
- Create all database tables and indexes.
- Create storage bucket for photos.
- Apply all RLS policies.
- Add trigger to auto-create profile and app_state on signup.

Gate:
- User only reads/writes own data.
- New signup auto-creates required rows.

### Phase 5: Sync Engine
Deliverables:
- Fire-and-forget cloud mirror on writes.
- Pending sync queue.
- merge/downsync function (`syncFromSupabase` equivalent).
- timestamp-based conflict handling.

Gate:
- Offline changes made on device A sync correctly when online.
- Cross-device state converges.

### Phase 6: Streak Logic Engine
Deliverables:
- initialize-on-load missed-day evaluator.
- mode-specific penalties.
- freeze milestone rewards (+2 at streak 10/20/40/60) in workout mode.
- goal countdown target behavior.

Gate:
- Unit tests for missed day, freeze usage, strict mode reset, and milestone rewards.

### Phase 7: Today Screen
Deliverables:
- Hero streak panel and progress ring.
- Six task cards with expand/collapse where needed.
- Water bottle interaction.
- mood + sliders.
- reading + diet inputs.
- photo capture/upload/fallback.
- celebration overlay.
- post-10pm warning.
- AI tip card.

Gate:
- Completing all six tasks increments streak exactly once.
- repeated remount does not duplicate rewards.

### Phase 8: Workout + Planner
Deliverables:
- default session execution screen with sets/reps/notes.
- auto complete when all sets done.
- manual completion fallback.
- custom session CRUD.
- day assignment controls.
- default template override editor with reset.

Gate:
- Session changes persist and reflect in today's resolved workout.

### Phase 9: Progress + Wrapped + Roadmap + Settings
Deliverables:
- heatmap/ring over 75 days.
- chart views and photo gallery.
- weekly wrapped modal slides and one-time show logic.
- roadmap phases + milestones.
- settings for export/recover/reset/delete/signout.

Gate:
- Export generates report.
- recover streak reconstructs from daily_logs.
- reset/delete actions behave exactly by spec.

### Phase 10: AI Coach
Deliverables:
- client prompt builders from live stats.
- server proxy route with auth and rate limiting.
- fallback content when API unavailable.
- per-day response caching.

Gate:
- AI tab always returns useful text even when API is unavailable.

### Phase 11: PWA + Production Hardening
Deliverables:
- manifest and service worker.
- caching policy validation.
- security headers.
- deployment config.

Gate:
- installable PWA.
- app shell available offline.
- production build passes.

### Phase 12: Screen-Level Parity Checklist
Use this checklist to ensure behavior parity with current app.

Landing (`/`):
1. Hero with app positioning and CTA to dashboard/login.
2. Feature sections that communicate daily tracking, workout intelligence, weekly reflection.
3. Mobile and desktop responsive layout with reveal/floating animations.

Login (`/login`):
1. Toggle between login and signup mode.
2. Email/password auth actions.
3. Google OAuth action.
4. Loading and error/success states.
5. Auto redirect to `/dashboard` when already authenticated.

Auth callback (`/auth/callback`):
1. Parse `code` from query.
2. Exchange code for session.
3. Redirect to `/dashboard` on success.
4. Redirect to `/login` on failure.

Dashboard shell (`/dashboard`):
1. Auth gate.
2. Mobile bottom nav and desktop side nav.
3. Dynamic tab mount with animated transitions.
4. Initial cloud-to-local sync before showing tab content.
5. Mode toggle with confirmation modal.
6. Streak threshold modal for 75hard entry restriction.
7. Weekly wrapped trigger and manual open.

Today tab:
1. Initialize app state with streak load check.
2. Load or create today log.
3. Compute and show completion count.
4. Task cards:
5. gym toggle
6. walk toggle
7. no water card (water tracking removed)
8. diet logging fields
9. mood selection + three sliders
10. reading status + book title
11. photo section with camera and gallery flows
12. photo removal
13. ten-PM warning banner if incomplete
14. quote and AI tip panels
15. celebration overlay and one-time streak increment guard

Workout tab:
1. Resolve session by day assignment.
2. Session pills for defaults and custom sessions.
3. Warm-up and cool-down collapsible sections.
4. Exercise cards with:
5. set completion toggles
6. reps fields
7. notes
8. auto complete when all sets done
9. manual completion button fallback
10. write gym completion to daily log

Workout planner:
1. Show weekly assignment strip.
2. Show editable default template list.
3. Show custom session list.
4. Create/edit/delete custom sessions.
5. Assign session to one or more weekdays.
6. Edit default template exercises and reset to base.
7. Save assignments and templates to storage/cloud sync.

Progress tab:
1. Overview mode:
2. 75-day heatmap grid
3. ring mode
4. complete/failed/remaining summary cards
5. Photos mode:
6. aggregate photos across logged days
7. before/after pair from earliest and latest
8. all-photos grid
9. Charts mode:
10. mood trend line
11. energy/motivation/soreness multi-line chart
12. tasks-per-day bar chart with 5-habit reference
13. tasks-per-day bar chart with color bands

AI Coach tab:
1. Render five challenge pills.
2. Build prompt per challenge type.
3. Show loading skeleton while waiting.
4. Persist response per challenge/day cache.
5. Regenerate action invalidates only active response.
6. Always show usable output via fallback tips.

Roadmap tab:
1. Determine current phase by day ranges.
2. Render phase banner and quote.
3. Render overall progress bar and next milestone countdown.
4. Render earned badges.
5. Render week-by-week cards with current/complete/future styles.
6. Render milestone modal with details.

Settings tab:
1. Profile name read/save.
2. Stats summary panel.
3. Data export action (download HTML report).
4. Streak recovery from cloud logs.
5. Restart challenge confirm flow.
6. Delete all data confirm flow.
7. Account display and signout.
8. Toast feedback.

## 14) Verification Matrix
Automated:
- Current suite covers streak logic, notifications, accountability, progression logic, adaptive coaching, telemetry, and workout progression helpers.
- Highest remaining gap is screen-level and integration coverage for sync and auth-heavy flows.

Manual test scenarios:
1. Signup/login/logout flow with both email and OAuth.
2. Complete all six daily tasks, verify celebration and streak increment.
3. Miss a day in workout mode with freezes remaining.
4. Miss a day in workout mode with zero freezes.
5. Miss a day in 75hard mode.
6. Switch modes at streak below 10 and above 10.
7. Upload one and multiple photos, verify cloud URL and fallback.
8. Offline usage then reconnect sync.
9. Open on second device and verify merged state.
10. Trigger weekly wrapped at day 7.
11. Export data and inspect generated HTML.
12. Recover streak from cloud logs.
13. Delete all data and verify cloud + local wipe.
14. AI request rate limit and unauthenticated rejection.
15. Service worker cache behavior and offline shell.

## 15) Build/Run Commands (Reference)
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run start`

Current observed status on 2026-03-25:
- tests pass
- typecheck passes
- production build passes

Stress rerun snapshot on 2026-04-12:
- `npm run test -- --reporter=verbose` passed (`55/55` tests, `9/9` files).
- Runtime hotspots were `workoutProgression.test.ts` (~36ms), `adaptiveCoaching.test.ts` (~30ms), and `accountability.test.ts` (~21ms); no failure hotspots observed.
- Temporary stress artifact used during rerun was cleaned up (no retained stress artifact files in repo notes).

### 15.1 Deployment Runbook
Local:
1. Copy `.env.local.example` to `.env.local`.
2. Fill Supabase public URL and anon key.
3. Add Gemini key if AI coach should be active.
4. Run `npm install`.
5. Run `npm run dev`.
6. Validate auth, dashboard, and sync behavior manually.

Production:
1. Create Supabase project and run full SQL setup.
2. Configure auth URL settings for production domain.
3. Configure storage bucket and policies.
4. Set environment variables in hosting provider.
5. Deploy build output.
6. Verify:
7. login and oauth callback domain settings
8. RLS isolation with two different user accounts
9. photo upload and signed URL access
10. AI route authentication and rate limits
11. service worker install/update behavior

### 15.2 Migrations For Existing Instances
If upgrading an older database:
1. use `Docs/supabase.sql` for a clean rebuild path.
2. if preserving data, manually apply only the specific SQL blocks from `Docs/supabase-setup.md` migration sections.
3. verify columns/constraints exist before deploying UI that depends on them.

## 16) Known Technical Risks And Improvement Backlog
1. Unit coverage is broader now, but screen-level/integration coverage is still thin.
2. In-memory server rate limiter is process-local (not distributed).
3. Base64 photo fallback can increase local storage pressure.
4. Some UI text and markdown files show encoding artifacts; standardize UTF-8.
5. Sync conflict policy is timestamp-only, without field-level merge.
6. Supabase config now fails fast when env vars are missing; onboarding breaks hard until env is correctly set (intentional hardening).
7. No analytics/telemetry means limited production observability (intentional privacy tradeoff).

## 17) Non-Negotiables For Any Rebuild
If you rewrite this project in another stack, preserve these exactly:
1. Local-first writes with immediate UX.
2. Fire-and-forget cloud sync plus retry queue.
3. Per-user data isolation in DB and storage.
4. Mode-specific streak rules and freeze semantics.
5. Weekly wrapped once-per-week behavior.
6. Workout template + custom assignment model.
7. AI fallback behavior when provider is unavailable.
8. Optional photos, not required for daily completion.
9. Mobile-first usability and PWA installability.

## 18) Quick Rebuild Checklist
1. Scaffold routes and shell.
2. Implement auth.
3. Implement local contracts and key schema.
4. Stand up Supabase schema + RLS + trigger.
5. Implement sync engine with conflict rules.
6. Implement streak logic and tests.
7. Build Today tab fully.
8. Build Workout + Planner.
9. Build Progress + Wrapped + Roadmap + Settings.
10. Add AI route + prompt builders + fallback.
11. Add PWA and headers.
12. Run full verification matrix.

This file should be treated as the single source of truth for rebuilding IRON75 behaviorally from scratch.
