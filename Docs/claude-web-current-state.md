# IRON75 — Full Current State Handoff (for Claude Web)

## 1) Purpose and context
This document captures the full practical state of the project so you can use Claude Web with high context and continue from the working web app instead of rebuilding the same foundations again in Flutter.

Current intent based on your note:
- Keep this project as the core working product.
- Stop splitting focus across abandoned GrindOs variants.
- Integrate the customization ideas into this codebase incrementally.

## 2) Current health summary
As of 2026-04-12, this project is in a working state:
- Dependency install completed successfully.
- Type checking passed.
- Automated tests passed.
- Production build passed.
- App is already deployed and accessible from the public URL in the main README.
- Latest stress rerun also passed (`55/55` tests across `9/9` files), with no failure hotspots.

Practical meaning: this is now a valid baseline for feature integration, not a rescue state.

## 3) Product and experience scope (what exists now)
- Daily challenge tracking with a single daily log.
- Workout tracking with default PPL sessions plus custom sessions and day assignments.
- Progress analytics (heatmap/rings/charts/photos).
- Weekly wrapped summaries.
- AI coach actions through a server proxy.
- Browser notification reminders in Settings (permission-aware, local schedule + test trigger).
- Accountability shared check-ins with local-first persistence and cloud mirror for authenticated users.
- Water tracking has been removed from product behavior and UI.
- Dual mode challenge system:
  - Workout mode (freeze-based tolerance for misses).
  - 75 Hard mode (strict reset on misses).
- Cloud sync through Supabase with local-first behavior.

## 4) Core behavior contracts (important for future work)

### 4.1 Daily completion contract
Streak completion is workout-only:
- Gym workout done = streak requirement complete for the day.

Optional check-ins are still tracked for analytics/coach context, but they do not advance or protect streaks:
- Outdoor walk/activity.
- Diet logging.
- Mood check-in.
- Reading.

### 4.2 Streak contract
State model:
- `currentDay` represents the next challenge day to complete.
- `streak` is consecutive completed days.
- `freezeCount` is only meaningful in workout mode.

Initialization rules:
- On load, the app evaluates missed days since last check.
- Missed-day evaluation is idempotent per calendar day (prevents accidental double penalties).

Mode rules:
- Workout mode: each missed day consumes one freeze, then resets only when misses exceed available freezes.
- 75 Hard mode: any missed day resets immediately.

Progression rules:
- Completing the day's workout increments streak and advances day.
- Workout mode awards +2 freezes at streak milestones 10 / 20 / 40 / 60 (no cap at 5).

### 4.3 Mode switching contract
- Entering 75 Hard requires streak >= 10.
- Returning to workout mode no longer auto-refills freezes.

This closes a prior loophole where users could refill freezes by toggling modes.

### 4.4 Weekly wrapped contract
Auto-trigger behavior:
- Triggered only at completed week boundaries (7, 14, 21, etc.).
- Final wrapped week is only unlocked when day 75 is actually completed.

Manual behavior:
- Manual wrapped opening now resolves to the latest completed week.
- It no longer jumps to final week early.

## 5) Data model and persistence behavior

### 5.1 Local-first strategy
- Local storage is the primary immediate write target.
- Supabase sync is asynchronous and retryable.
- App remains usable offline.

### 5.2 Sync reliability model
- A pending sync queue retries failed writes.
- Merge strategy is timestamp-based for app state, daily logs, and workout sessions.
- Wrapped-shown state is merged and synced.

### 5.3 Cross-account isolation (critical fix already in place)
- On authenticated user switch, stale local `iron75_` keys are cleared before sync.
- This prevents cross-account local data leakage into another user account.

### 5.4 Workout sync integrity
- Workout sessions rely on unique identity across user, date, and session type.
- Upsert path is hardened, with fallback logic for older DBs.
- Dedicated migration exists to enforce safe uniqueness.

### 5.5 Reset and delete behavior
- Challenge reset clears challenge progress/log state and restarts day progression.
- Full delete now clears all `iron75_` local keys and cloud user data paths involved by the app.

## 6) Supabase and backend state
- Required tables are documented and include profiles, app state, daily logs, and workout sessions.
- Required RLS model is user-isolated access by auth user id.
- Supabase browser client now fails fast when required env vars are missing (no placeholder fallback).
- Important migrations are already documented:
  - Dual mode columns migration.
  - Workout session upsert-safety migration.
  - Freeze milestone migration (remove legacy `freeze_count <= 5` check).

AI route behavior:
- Requires authenticated user.
- Applies per-user request rate limit.
- Validates prompt size.
- Keeps API key server-side only.

## 7) UI/UX state
- Visual style is dark neon with animated, mobile-first card interactions.
- Responsive shell for mobile and desktop.
- Celebration overlay uses local audio generation instead of external media.
- Accessibility baseline improved:
  - Visible keyboard focus styling.
  - Reduced-motion support.

Still worth future design polish:
- Information density tuning for long-term daily use.
- More explicit trust/status indicators around sync and pending writes.
- More advanced habit analytics and retrospective UX.

## 8) Security and privacy posture
- CSP and security headers are configured in Next config.
- Data ownership model is local-first with user-isolated cloud rows.
- No ad/analytics tracking system is part of the current implementation.
- AI uses a server proxy, not direct client key exposure.

## 9) Testing and quality snapshot
- Automated tests now cover streak logic, notifications, accountability, progression logic, adaptive coaching, telemetry, custom workouts, and workout progression helpers.
- Build and typecheck succeed in the current state.
- There is no lint script configured in package scripts.
- Dependency audit output currently reports high-severity items (not yet remediated in this pass).

## 10) Known practical constraints
- Some ambitious “next-gen UX” ambitions are only partially addressed.
- Notifications are browser-local reminders (not service-worker push delivery yet).
- AI coach quality depends on external API availability and quota.
- The in-memory AI rate limiter resets with server process restarts.

## 11) Recommended integration path for your GrindOs ideas
Use this order to reduce pain and avoid another rewrite cycle:

1. Treat this app as the source of truth for challenge logic and sync contracts.
2. Define your desired customizations as behavior changes, not framework-first changes.
3. Implement one domain at a time in this repository:
   - Today flow and task model
   - Workout planner/execution customization
   - Progress and weekly wrapped upgrades
   - AI coach personalization
4. Keep DB schema and streak logic backward-compatible while iterating UI.
5. Only consider cross-platform migration after behavior stabilizes and all loopholes are closed.

## 12) File map for fast orientation (Claude Web context)
- Main app shell and mode/wrapped orchestration: `app/dashboard/page.tsx`
- Daily workflow and completion flow: `app/components/TodayScreen.tsx`
- Streak rules and progression logic: `app/lib/streakLogic.ts`
- Storage/sync engine and data utilities: `app/lib/storage.ts`
- AI proxy endpoint: `app/api/gemini/route.ts`
- Supabase setup and migration guide: `Docs/supabase-setup.md`
- Fresh Supabase SQL: `Docs/supabase.sql`

## 13) Bottom line
This project is not in an abandoned or broken state anymore. It is currently a stable, working baseline with major loopholes already hardened. The most efficient path now is to absorb your GrindOs customization goals into this existing system rather than restarting architecture in another stack.
