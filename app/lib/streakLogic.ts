
import {
  getAppState,
  saveAppState,
  getDailyLog,
  getToday,
  getYesterday,
  isStreakDayComplete,
} from './storage';
import { AppState } from './types';

const STREAK_CHECK_KEY = 'iron75_streak_check_date';

function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function countMissedDaysSinceLastCheck(state: AppState, yesterday: string, lastChecked: string | null): number {
  const challengeActive = state.streak > 0 || state.currentDay > 1;
  if (!challengeActive) return 0;

  // Backward compatibility: if no last check exists, preserve historic behavior
  // by only evaluating yesterday once (avoids retroactive penalties).
  const fallbackStart = yesterday;
  const candidateStart = lastChecked ? addDays(lastChecked, 1) : fallbackStart;
  const scanStart = candidateStart < state.startDate ? state.startDate : candidateStart;
  if (scanStart > yesterday) return 0;

  let cursor = scanStart;
  let misses = 0;
  while (cursor <= yesterday) {
    const log = getDailyLog(cursor);
    const missed = !isStreakDayComplete(log);
    if (missed) misses += 1;
    cursor = addDays(cursor, 1);
  }
  return misses;
}

/**
 * Called on app load.
 * - Any missed streak day resets streak to zero.
 * - Returns the (possibly updated) AppState for today.
 *
 * IMPORTANT: This function is idempotent — it stores the date it last ran so
 * repeated calls on the same calendar day (e.g. tab switches causing remounts)
 * never trigger more than one reset.
 */
export function initializeStreakOnLoad(): AppState {
  const state = getAppState();
  const today = getToday();
  const yesterday = getYesterday();
  const challengeActive = state.streak > 0 || state.currentDay > 1;

  // First-ever launch: set start date
  if (!state.startDate || (state.startDate === today && state.currentDay <= 1 && state.streak === 0)) {
    state.startDate = today;
    saveAppState(state);
    return state;
  }

  // If it's still the same day as when we started, nothing to check yet
  if (state.startDate === today) return state;

  // Guard: only run the missed-day check once per calendar day to prevent
  // repeated tab switches from triggering multiple resets.
  let lastChecked: string | null = null;
  if (typeof window !== 'undefined') {
    lastChecked = localStorage.getItem(STREAK_CHECK_KEY);
    if (lastChecked === today) return state;
  }

  const missedDays = countMissedDaysSinceLastCheck(state, yesterday, lastChecked);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STREAK_CHECK_KEY, today);
  }

  if (!challengeActive || missedDays <= 0) return state;

  state.streak = 0;
  state.currentDay = 1;
  state.totalRestarts += 1;
  state.startDate = today;
  saveAppState(state);

  return state;
}

/**
 * Called once when today's workout is first marked complete.
 * Increments streak + currentDay, updates longestStreak.
 */
export function completeTodayStreak(state: AppState): AppState {
  const newStreak = state.streak + 1;
  const newDay = state.currentDay + 1;
  const newLongest = Math.max(state.longestStreak, newStreak);

  const updated: AppState = {
    ...state,
    streak: newStreak,
    currentDay: newDay,
    longestStreak: newLongest,
  };
  saveAppState(updated);
  return updated;
}

/** Returns true if current time is past 22:00 (10 PM) */
export function isPastTenPM(): boolean {
  const h = new Date().getHours();
  return h >= 22;
}
