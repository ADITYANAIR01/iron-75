// ─── Iron75 Streak & Day Logic ───────────────────────────────────────────────

import {
  getAppState,
  saveAppState,
  getDailyLog,
  getToday,
  getYesterday,
} from './storage';
import { AppState } from './types';

/**
 * Called on app load.
 * - If yesterday's log is missing or incomplete & today is a new calendar day,
 *   resets the streak and increments restart counter.
 * - Returns the (possibly updated) AppState for today.
 */
export function initializeStreakOnLoad(): AppState {
  const state = getAppState();
  const today = getToday();
  const yesterday = getYesterday();

  // First-ever launch: set start date
  if (!localStorage.getItem('iron75_start_date')) {
    state.startDate = today;
    saveAppState(state);
    return state;
  }

  const yesterdayLog = getDailyLog(yesterday);

  // If we have a log for yesterday and it was NOT complete → reset streak
  if (yesterdayLog && !yesterdayLog.allTasksComplete) {
    if (state.streak > 0 || state.currentDay > 1) {
      state.streak = 0;
      state.currentDay = 1;
      state.totalRestarts += 1;
      state.startDate = today;
      saveAppState(state);
    }
  }
  // If yesterday has no log at all AND we already had a non-zero streak → reset
  // (edge case: user skipped a full day without opening the app)
  else if (!yesterdayLog && (state.streak > 0 || state.currentDay > 1)) {
    // Only reset if the start date isn't today (i.e. this isn't day 1)
    if (state.startDate !== today) {
      state.streak = 0;
      state.currentDay = 1;
      state.totalRestarts += 1;
      state.startDate = today;
      saveAppState(state);
    }
  }

  return state;
}

/**
 * Called once when all 7 tasks are first marked complete for today.
 * Increments streak + currentDay, updates longestStreak, persists.
 */
export function completeTodayStreak(state: AppState): AppState {
  const newStreak = state.streak + 1;
  const newDay = Math.min(state.currentDay + 1, 75);
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

/** Days remaining until sister's wedding (May 31 2026) */
export function getDaysToWedding(): number {
  const wedding = new Date('2026-05-31T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = wedding.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Returns true if current time is past 22:00 (10 PM) */
export function isPastTenPM(): boolean {
  const h = new Date().getHours();
  return h >= 22;
}

/** Returns true if current time is past 23:59 (midnight cutoff) */
export function isPastMidnight(): boolean {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  return h === 23 && m >= 59;
}
