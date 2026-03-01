// ─── Iron75 localStorage Utilities ──────────────────────────────────────────

import { DailyLog, AppState, MoodEmoji } from './types';
import { withRetrySync } from './retry';

// ── Key helpers ───────────────────────────────────────────────────────────────
export const KEYS = {
  STREAK: 'iron75_streak',
  DAY: 'iron75_day',
  START_DATE: 'iron75_start_date',
  LONGEST_STREAK: 'iron75_longest_streak',
  TOTAL_RESTARTS: 'iron75_total_restarts',
  DAILY_LOG: (date: string) => `iron75_dailylog_${date}`,
  WORKOUT: (date: string) => `iron75_workout_${date}`,
  PHOTO: (date: string) => `iron75_photo_${date}`,
} as const;

// ── Date helpers ──────────────────────────────────────────────────────────────
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/** Returns day-of-week 0=Sun…6=Sat for a YYYY-MM-DD string */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

// ── Storage helpers ───────────────────────────────────────────────────────────

/**
 * Removes daily-log entries older than 75 days to free localStorage quota.
 * Called automatically before retrying a failed write.
 */
function evictOldLogs(): void {
  const logPrefix = KEYS.DAILY_LOG('');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 75);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(logPrefix)) {
      const dateStr = key.slice(logPrefix.length);
      if (dateStr < cutoffStr) toRemove.push(key);
    }
  }
  for (const key of toRemove) localStorage.removeItem(key);
}

/**
 * Writes `value` to localStorage under `key`, retrying up to 3 times.
 * Old daily-log entries are evicted once before the first retry to free space.
 */
function safeSetItem(key: string, value: string): void {
  let evicted = false;
  withRetrySync(() => localStorage.setItem(key, value), {
    attempts: 3,
    onRetry: () => {
      if (!evicted) {
        evictOldLogs();
        evicted = true;
      }
    },
  });
}

// ── App state (streak / day / meta) ──────────────────────────────────────────
function defaultAppState(): AppState {
  return {
    streak: 0,
    currentDay: 1,
    startDate: getToday(),
    longestStreak: 0,
    totalRestarts: 0,
  };
}

export function getAppState(): AppState {
  if (typeof window === 'undefined') return defaultAppState();
  return {
    streak: parseInt(localStorage.getItem(KEYS.STREAK) ?? '0', 10),
    currentDay: parseInt(localStorage.getItem(KEYS.DAY) ?? '1', 10),
    startDate: localStorage.getItem(KEYS.START_DATE) ?? getToday(),
    longestStreak: parseInt(localStorage.getItem(KEYS.LONGEST_STREAK) ?? '0', 10),
    totalRestarts: parseInt(localStorage.getItem(KEYS.TOTAL_RESTARTS) ?? '0', 10),
  };
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  safeSetItem(KEYS.STREAK, String(state.streak));
  safeSetItem(KEYS.DAY, String(state.currentDay));
  safeSetItem(KEYS.START_DATE, state.startDate);
  safeSetItem(KEYS.LONGEST_STREAK, String(state.longestStreak));
  safeSetItem(KEYS.TOTAL_RESTARTS, String(state.totalRestarts));
}

// ── Daily log ─────────────────────────────────────────────────────────────────
export function createDefaultDailyLog(date: string): DailyLog {
  const dow = getDayOfWeek(date);
  const isWeekday = dow >= 1 && dow <= 5; // Mon–Fri auto-tick outdoor walk
  return {
    date,
    gymWorkoutDone: false,
    outdoorWalkDone: isWeekday,
    waterLiters: 0,
    waterGoalMet: false,
    readingDone: false,
    readingBook: '',
    dietSlots: { breakfast: '', lunch: '', dinner: '', snacks: '' },
    moodEmoji: '' as MoodEmoji,
    energyLevel: 3,
    motivationLevel: 3,
    sorenessLevel: 3,
    progressPhotoUrl: '',
    allTasksComplete: false,
    celebrationShown: false,
    aiInsightShown: '',
  };
}

export function getDailyLog(date: string): DailyLog | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.DAILY_LOG(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyLog;
  } catch {
    return null;
  }
}

export function saveDailyLog(log: DailyLog): void {
  if (typeof window === 'undefined') return;
  safeSetItem(KEYS.DAILY_LOG(log.date), JSON.stringify(log));
}

/** Returns the log for today, creating a default if it doesn't exist yet. */
export function getOrCreateTodayLog(): DailyLog {
  const today = getToday();
  const existing = getDailyLog(today);
  if (existing) return existing;
  const fresh = createDefaultDailyLog(today);
  saveDailyLog(fresh);
  return fresh;
}

// ── Task completion check ─────────────────────────────────────────────────────
export function checkAllTasksComplete(log: DailyLog): boolean {
  const dietFilled =
    log.dietSlots.breakfast.trim() !== '' ||
    log.dietSlots.lunch.trim() !== '' ||
    log.dietSlots.dinner.trim() !== '' ||
    log.dietSlots.snacks.trim() !== '';

  return (
    log.gymWorkoutDone &&
    log.outdoorWalkDone &&
    log.waterLiters >= 3.8 &&
    dietFilled &&
    log.moodEmoji !== '' &&
    log.readingDone
  );
}

