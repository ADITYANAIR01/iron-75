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
  if (!state.startDate || (state.startDate === getToday() && state.currentDay <= 1 && state.streak === 0)) {
    state.startDate = getToday();
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
      // Clear stale goal date so it re-anchors to the new startDate.
      if (typeof window !== 'undefined') localStorage.removeItem('iron75_goal_date');
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
      if (typeof window !== 'undefined') localStorage.removeItem('iron75_goal_date');
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
