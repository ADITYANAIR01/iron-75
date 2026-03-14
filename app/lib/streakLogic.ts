
import {
  getAppState,
  saveAppState,
  getDailyLog,
  getToday,
  getYesterday,
} from './storage';
import { AppState } from './types';

const MAX_FREEZES = 5;
const STREAK_CHECK_KEY = 'iron75_streak_check_date';

/**
 * Called on app load.
 * - Workout mode: missing a day consumes a freeze (if available) before resetting streak.
 * - 75 Hard mode: any missed day immediately resets streak to zero.
 * - Returns the (possibly updated) AppState for today.
 *
 * IMPORTANT: This function is idempotent — it stores the date it last ran so
 * repeated calls on the same calendar day (e.g. tab switches causing remounts)
 * never consume more than one freeze or trigger more than one reset.
 */
export function initializeStreakOnLoad(): AppState {
  const state = getAppState();
  const today = getToday();
  const yesterday = getYesterday();

  // First-ever launch: set start date
  if (!state.startDate || (state.startDate === today && state.currentDay <= 1 && state.streak === 0)) {
    state.startDate = today;
    saveAppState(state);
    return state;
  }

  // If it's still the same day as when we started, nothing to check yet
  if (state.startDate === today) return state;

  // Guard: only run the missed-day check once per calendar day to prevent
  // multiple tab switches from burning through all freeze charges.
  if (typeof window !== 'undefined') {
    const lastChecked = localStorage.getItem(STREAK_CHECK_KEY);
    if (lastChecked === today) return state;
    localStorage.setItem(STREAK_CHECK_KEY, today);
  }

  const yesterdayLog = getDailyLog(yesterday);
  const missedYesterday =
    (yesterdayLog && !yesterdayLog.allTasksComplete) ||
    (!yesterdayLog && (state.streak > 0 || state.currentDay > 1));

  if (!missedYesterday) return state;

  if (state.mode === '75hard') {
    // Strict — any miss resets the challenge
    if (state.streak > 0 || state.currentDay > 1) {
      state.streak = 0;
      state.currentDay = 1;
      state.totalRestarts += 1;
      state.startDate = today;
      if (typeof window !== 'undefined') localStorage.removeItem('iron75_goal_date');
      saveAppState(state);
    }
  } else {
    // Workout mode — try to consume a freeze first
    if (state.streak > 0 || state.currentDay > 1) {
      if (state.freezeCount > 0) {
        state.freezeCount -= 1;
        saveAppState(state);
        // Streak is preserved; no counter reset
      } else {
        state.streak = 0;
        state.currentDay = 1;
        state.totalRestarts += 1;
        state.startDate = today;
        if (typeof window !== 'undefined') localStorage.removeItem('iron75_goal_date');
        saveAppState(state);
      }
    }
  }

  return state;
}

/**
 * Called once when all daily tasks are first marked complete for today.
 * Increments streak + currentDay, updates longestStreak.
 * In workout mode awards +1 freeze at every 7-day milestone (capped at MAX_FREEZES).
 */
export function completeTodayStreak(state: AppState): AppState {
  const newStreak = state.streak + 1;
  const newDay = Math.min(state.currentDay + 1, 75);
  const newLongest = Math.max(state.longestStreak, newStreak);

  let newFreezeCount = state.freezeCount;
  if (state.mode === 'workout' && newStreak % 7 === 0 && newFreezeCount < MAX_FREEZES) {
    newFreezeCount = Math.min(newFreezeCount + 1, MAX_FREEZES);
  }

  const updated: AppState = {
    ...state,
    streak: newStreak,
    currentDay: newDay,
    longestStreak: newLongest,
    freezeCount: newFreezeCount,
  };
  saveAppState(updated);
  return updated;
}

/** Days remaining until target date (configurable via localStorage 'iron75_goal_date', defaults to 75 days from challenge start) */
export function getDaysToGoal(): number {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('iron75_goal_date') : null;
  let target: Date;
  if (raw) {
    target = new Date(raw + 'T00:00:00');
  } else {
    // Anchor to startDate so the countdown actually counts down each day.
    const state = getAppState();
    target = new Date(state.startDate + 'T00:00:00');
    target.setDate(target.getDate() + 75);
    // Persist so every subsequent call uses the same fixed target.
    if (typeof window !== 'undefined') {
      localStorage.setItem('iron75_goal_date', `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`);
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Returns true if current time is past 22:00 (10 PM) */
export function isPastTenPM(): boolean {
  const h = new Date().getHours();
  return h >= 22;
}
