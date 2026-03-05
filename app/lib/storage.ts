// ─── Iron75 Storage Utilities (localStorage + Supabase sync) ────────────────
//
// Strategy: localStorage is the primary write target for instant offline UX.
// When a Supabase user is authenticated, writes are mirrored to the cloud DB
// asynchronously (fire-and-forget). Reads always come from localStorage first,
// with a background sync-down on app load via syncFromSupabase().

import { DailyLog, AppState, MoodEmoji } from './types';
import { createClient } from './supabase';

// ── Key helpers ───────────────────────────────────────────────────────────────
const KEYS = {
  STREAK: 'iron75_streak',
  DAY: 'iron75_day',
  START_DATE: 'iron75_start_date',
  LONGEST_STREAK: 'iron75_longest_streak',
  TOTAL_RESTARTS: 'iron75_total_restarts',
  DAILY_LOG: (date: string) => `iron75_dailylog_${date}`,
} as const;

// ── Date helpers ──────────────────────────────────────────────────────────────
/** Returns YYYY-MM-DD in the user's LOCAL timezone, never UTC. */
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getToday(): string {
  return localDateString(new Date());
}

export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
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
  try {
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
  } catch (err) {
    console.warn('Supabase app_state sync failed (offline?):', err);
  }
}

// ── Daily log ─────────────────────────────────────────────────────────────────
function createDefaultDailyLog(date: string): DailyLog {
  return {
    date,
    gymWorkoutDone: false,
    outdoorWalkDone: false,
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
  // Always recompute allTasksComplete so any caller (incl. WorkoutScreen) keeps it correct.
  const committed: DailyLog = { ...log, allTasksComplete: checkAllTasksComplete(log) };
  // 1. Write to localStorage (instant, offline-first)
  localStorage.setItem(KEYS.DAILY_LOG(committed.date), JSON.stringify(committed));
  // 2. Mirror to Supabase (fire-and-forget)
  syncDailyLogToSupabase(committed);
}

async function syncDailyLogToSupabase(log: DailyLog): Promise<void> {
  try {
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
  } catch (err) {
    console.warn('Supabase daily_log sync failed (offline?):', err);
  }
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
  try {
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
  } catch (err) {
    console.warn('Supabase sync-down failed (offline?):', err);
  }
}

// ─── Photo rename helper — date + metadata ──────────────────────────────────
export function renamePhotoWithMetadata(
  file: File,
  date: string,
  dayNumber: number
): File {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const newName = `iron75_day${dayNumber}_${date}_${timestamp}.${ext}`;
  return new File([file], newName, { type: file.type, lastModified: Date.now() });
}

// ─── Image compression helper — reduces memory usage before upload/storage ───
export function compressImage(
  file: File,
  maxWidthPx = 1080,
  quality = 0.78
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidthPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => { blob ? resolve(blob) : resolve(file); },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

// ─── Supabase Storage — progress photo upload ────────────────────────────────
export async function uploadProgressPhoto(
  file: File,
  date: string,
  dayNumber: number = 1
): Promise<string | null> {
  const userId = await getSupabaseUserId();
  if (!userId) return null;
  try {
    const supabase = createClient();
    // Compress before upload to avoid low-memory errors on large camera files
    let uploadBlob: Blob = file;
    try { uploadBlob = await compressImage(file); } catch { /* fall back to original */ }
    const renamedFile = renamePhotoWithMetadata(
      new File([uploadBlob], file.name, { type: 'image/jpeg', lastModified: Date.now() }),
      date,
      dayNumber
    );
    const path = `${userId}/${renamedFile.name}`;
    const { error } = await supabase.storage
      .from('progress-photos')
      .upload(path, renamedFile, { upsert: true, contentType: 'image/jpeg' });
    if (error) {
      console.error('Photo upload error:', error.message);
      return null;
    }
    const { data: signedData } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(path, 31536000); // 1-year expiry — private even if bucket is public
    if (signedData?.signedUrl) return signedData.signedUrl;
    // Fallback: public URL (only works if bucket allows public access)
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

// ─── Export all data ────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function exportAllData(): { appState: AppState; logs: DailyLog[]; userName: string } {
  const appState = getAppState();
  const userName = typeof window !== 'undefined'
    ? localStorage.getItem('iron75_user_name') ?? ''
    : '';

  // Gather all daily logs from localStorage
  const logs: DailyLog[] = [];
  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iron75_dailylog_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) logs.push(JSON.parse(raw) as DailyLog);
        } catch { /* skip corrupt entries */ }
      }
    }
    logs.sort((a, b) => a.date.localeCompare(b.date));
  }

  return { appState, logs, userName };
}

/** Returns a downloadable HTML report string */
export function generateExportHTML(): string {
  const { appState, logs, userName } = exportAllData();
  const dateGenerated = new Date().toLocaleString();

  const logRows = logs.map((l) => `
    <tr>
      <td>${escapeHtml(l.date)}</td>
      <td>${l.gymWorkoutDone ? '✅' : '❌'}</td>
      <td>${l.outdoorWalkDone ? '✅' : '❌'}</td>
      <td>${l.waterLiters.toFixed(1)}L</td>
      <td>${l.readingDone ? '✅' : '❌'}</td>
      <td>${escapeHtml(l.moodEmoji || '—')}</td>
      <td>${l.energyLevel}/5</td>
      <td>${l.motivationLevel}/5</td>
      <td>${l.sorenessLevel}/5</td>
      <td>${escapeHtml(l.dietSlots.breakfast || '—')}</td>
      <td>${escapeHtml(l.dietSlots.lunch || '—')}</td>
      <td>${escapeHtml(l.dietSlots.dinner || '—')}</td>
      <td>${escapeHtml(l.dietSlots.snacks || '—')}</td>
      <td>${l.allTasksComplete ? '✅' : '❌'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iron75 Data Export — ${escapeHtml(userName || 'User')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; color: #e2e8f0; padding: 2rem; }
    h1 { font-size: 2rem; background: linear-gradient(135deg, #FF6B35, #FFE66D); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
    h2 { color: #94a3b8; font-size: 1.1rem; margin: 2rem 0 1rem; }
    .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; padding: 1.25rem; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 900; color: #FF6B35; }
    .stat-label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { padding: 0.6rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center; }
    th { background: rgba(255,255,255,0.03); color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .footer { margin-top: 3rem; text-align: center; color: #475569; font-size: 0.75rem; }
    @media (max-width: 768px) { body { padding: 1rem; } table { font-size: 0.7rem; } th, td { padding: 0.4rem 0.25rem; } }
  </style>
</head>
<body>
  <h1>🔥 IRON75 Data Export</h1>
  <p class="meta">${userName ? `Athlete: <strong>${escapeHtml(userName)}</strong> · ` : ''}Generated: ${escapeHtml(dateGenerated)}</p>

  <h2>📊 Challenge Overview</h2>
  <div class="stats">
    <div class="stat-card"><div class="stat-value">${appState.currentDay}</div><div class="stat-label">Current Day</div></div>
    <div class="stat-card"><div class="stat-value">${appState.streak} 🔥</div><div class="stat-label">Current Streak</div></div>
    <div class="stat-card"><div class="stat-value">${appState.longestStreak}</div><div class="stat-label">Longest Streak</div></div>
    <div class="stat-card"><div class="stat-value">${appState.totalRestarts}</div><div class="stat-label">Total Restarts</div></div>
    <div class="stat-card"><div class="stat-value">${appState.startDate}</div><div class="stat-label">Start Date</div></div>
    <div class="stat-card"><div class="stat-value">${logs.length}</div><div class="stat-label">Days Logged</div></div>
    <div class="stat-card"><div class="stat-value">${logs.filter(l => l.allTasksComplete).length}</div><div class="stat-label">Perfect Days</div></div>
  </div>

  <h2>📅 Daily Logs (${logs.length} days)</h2>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Gym</th><th>Walk</th><th>Water</th><th>Read</th><th>Mood</th>
          <th>Energy</th><th>Motiv.</th><th>Sore.</th><th>Breakfast</th><th>Lunch</th>
          <th>Dinner</th><th>Snacks</th><th>Complete</th>
        </tr>
      </thead>
      <tbody>${logRows}</tbody>
    </table>
  </div>

  <div class="footer">Iron75 Challenge Tracker · Exported from app</div>
</body>
</html>`;
}

// ─── Reset everything and schedule a fresh start on a given date ─────────────

/** Keys that must never be wiped, no matter what reset is triggered. */
const PROTECTED_KEYS = new Set(['iron75_user_name', 'iron75_fresh_start_used']);

/**
 * Wipes all daily logs + app_state from localStorage AND Supabase,
 * then seeds a clean app_state with `startDate` so the first open on that
 * date shows Day 1 with streak 0.  Display name and one-time-use flag are preserved.
 */
export async function resetForFreshStart(startDate: string): Promise<void> {
  // 1. Remove all iron75_ keys except protected ones
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iron75_') && !PROTECTED_KEYS.has(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  // 2. Seed localStorage with the clean fresh-start state
  const fresh: AppState = {
    streak: 0,
    currentDay: 1,
    startDate,
    longestStreak: 0,
    totalRestarts: 0,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEYS.STREAK, '0');
    localStorage.setItem(KEYS.DAY, '1');
    localStorage.setItem(KEYS.START_DATE, startDate);
    localStorage.setItem(KEYS.LONGEST_STREAK, '0');
    localStorage.setItem(KEYS.TOTAL_RESTARTS, '0');
    // Mark as used immediately — before any async work that could exit early
    localStorage.setItem('iron75_fresh_start_used', 'true');
  }

  // 3. Mirror clean state to Supabase (fire-and-forget)
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;
    const supabase = createClient();
    // Wipe all daily logs
    await supabase.from('daily_logs').delete().eq('user_id', userId);
    // Wipe progress photos
    const { data: files } = await supabase.storage.from('progress-photos').list(userId);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('progress-photos').remove(paths);
    }
    // Upsert clean app_state
    await supabase.from('app_state').upsert(
      {
        user_id: userId,
        streak: fresh.streak,
        current_day: fresh.currentDay,
        start_date: fresh.startDate,
        longest_streak: fresh.longestStreak,
        total_restarts: fresh.totalRestarts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('Supabase fresh-start reset failed (offline?):', err);
  }
}

// ─── Delete all data (localStorage + Supabase) ──────────────────────────────
export async function deleteAllData(): Promise<void> {
  // 1. Clear all Iron75 keys from localStorage (preserve protected keys)
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iron75_') && !PROTECTED_KEYS.has(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  // 2. Delete from Supabase
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return;
    const supabase = createClient();

    // Delete daily logs
    await supabase.from('daily_logs').delete().eq('user_id', userId);
    // Delete app state
    await supabase.from('app_state').delete().eq('user_id', userId);
    // Delete profile
    await supabase.from('profiles').delete().eq('id', userId);

    // Delete all progress photos from storage
    const { data: files } = await supabase.storage
      .from('progress-photos')
      .list(userId);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('progress-photos').remove(paths);
    }
  } catch (err) {
    console.warn('Supabase data deletion failed:', err);
  }
}

