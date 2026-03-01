// ─── Iron75 Storage Utilities (localStorage + Supabase sync) ────────────────
//
// Strategy: localStorage is the primary write target for instant offline UX.
// When a Supabase user is authenticated, writes are mirrored to the cloud DB
// asynchronously (fire-and-forget). Reads always come from localStorage first,
// with a background sync-down on app load via syncFromSupabase().

import { DailyLog, AppState, MoodEmoji } from './types';
import { createClient } from './supabase';

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

// ── Supabase helper (safe — no-ops when not authenticated) ──────────────────
async function getSupabaseUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
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
  // 1. Write to localStorage (instant, offline-first)
  localStorage.setItem(KEYS.STREAK, String(state.streak));
  localStorage.setItem(KEYS.DAY, String(state.currentDay));
  localStorage.setItem(KEYS.START_DATE, state.startDate);
  localStorage.setItem(KEYS.LONGEST_STREAK, String(state.longestStreak));
  localStorage.setItem(KEYS.TOTAL_RESTARTS, String(state.totalRestarts));
  // 2. Mirror to Supabase (fire-and-forget)
  syncAppStateToSupabase(state);
}

async function syncAppStateToSupabase(state: AppState): Promise<void> {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('app_state').upsert(
    {
      user_id: userId,
      streak: state.streak,
      current_day: state.currentDay,
      start_date: state.startDate,
      longest_streak: state.longestStreak,
      total_restarts: state.totalRestarts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
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
  // 1. Write to localStorage (instant, offline-first)
  localStorage.setItem(KEYS.DAILY_LOG(log.date), JSON.stringify(log));
  // 2. Mirror to Supabase (fire-and-forget)
  syncDailyLogToSupabase(log);
}

async function syncDailyLogToSupabase(log: DailyLog): Promise<void> {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('daily_logs').upsert(
    {
      user_id: userId,
      date: log.date,
      gym_workout_done: log.gymWorkoutDone,
      outdoor_walk_done: log.outdoorWalkDone,
      water_liters: log.waterLiters,
      water_goal_met: log.waterGoalMet,
      reading_done: log.readingDone,
      reading_book: log.readingBook,
      diet_slots: log.dietSlots,
      mood_emoji: log.moodEmoji,
      energy_level: log.energyLevel,
      motivation_level: log.motivationLevel,
      soreness_level: log.sorenessLevel,
      progress_photo_url: log.progressPhotoUrl,
      all_tasks_complete: log.allTasksComplete,
      celebration_shown: log.celebrationShown,
      ai_insight_shown: log.aiInsightShown,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  );
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

// ─── Supabase → localStorage sync (call once after login) ──────────────────
export async function syncFromSupabase(): Promise<void> {
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const supabase = createClient();

  // Sync app_state
  const { data: stateRow } = await supabase
    .from('app_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (stateRow) {
    localStorage.setItem(KEYS.STREAK, String(stateRow.streak));
    localStorage.setItem(KEYS.DAY, String(stateRow.current_day));
    localStorage.setItem(KEYS.START_DATE, stateRow.start_date);
    localStorage.setItem(KEYS.LONGEST_STREAK, String(stateRow.longest_streak));
    localStorage.setItem(KEYS.TOTAL_RESTARTS, String(stateRow.total_restarts));
  }

  // Sync daily_logs
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId);

  if (logs) {
    for (const row of logs) {
      const log: DailyLog = {
        date: row.date,
        gymWorkoutDone: row.gym_workout_done,
        outdoorWalkDone: row.outdoor_walk_done,
        waterLiters: row.water_liters,
        waterGoalMet: row.water_goal_met,
        readingDone: row.reading_done,
        readingBook: row.reading_book ?? '',
        dietSlots: row.diet_slots ?? { breakfast: '', lunch: '', dinner: '', snacks: '' },
        moodEmoji: (row.mood_emoji ?? '') as MoodEmoji,
        energyLevel: row.energy_level ?? 3,
        motivationLevel: row.motivation_level ?? 3,
        sorenessLevel: row.soreness_level ?? 3,
        progressPhotoUrl: row.progress_photo_url ?? '',
        allTasksComplete: row.all_tasks_complete,
        celebrationShown: row.celebration_shown,
        aiInsightShown: row.ai_insight_shown ?? '',
      };
      localStorage.setItem(KEYS.DAILY_LOG(log.date), JSON.stringify(log));
    }
  }

  // Sync profile display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();

  if (profile?.display_name) {
    localStorage.setItem('iron75_user_name', profile.display_name);
  }
}

// ─── Supabase Storage — progress photo upload ────────────────────────────────
export async function uploadProgressPhoto(
  file: File,
  date: string
): Promise<string | null> {
  const userId = await getSupabaseUserId();
  if (!userId) return null;
  try {
    const supabase = createClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${date}.${ext}`;
    const { error } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      console.error('Photo upload error:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('progress-photos').getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.error('Photo upload exception:', err);
    return null;
  }
}

// ─── Save profile name to Supabase ─────────────────────────────────────────
export async function saveProfileName(name: string): Promise<void> {
  localStorage.setItem('iron75_user_name', name);
  const userId = await getSupabaseUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('profiles').upsert(
    { id: userId, display_name: name, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
}

