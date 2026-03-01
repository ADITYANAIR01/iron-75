// ─── Iron75 localStorage Utilities ──────────────────────────────────────────

import { DailyLog, AppState, MoodEmoji } from './types';

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
  localStorage.setItem(KEYS.STREAK, String(state.streak));
  localStorage.setItem(KEYS.DAY, String(state.currentDay));
  localStorage.setItem(KEYS.START_DATE, state.startDate);
  localStorage.setItem(KEYS.LONGEST_STREAK, String(state.longestStreak));
  localStorage.setItem(KEYS.TOTAL_RESTARTS, String(state.totalRestarts));
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
  localStorage.setItem(KEYS.DAILY_LOG(log.date), JSON.stringify(log));
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

/** Resets today's daily log back to the default state. Returns the fresh log. */
export function resetTodayLog(): DailyLog {
  const fresh = createDefaultDailyLog(getToday());
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

