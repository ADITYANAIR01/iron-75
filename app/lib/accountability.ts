import type { DailyLog } from './types';
import { createClient } from './supabase';

const ACCOUNTABILITY_PROFILE_KEY = 'iron75_accountability_circle_profile';
const ACCOUNTABILITY_PROFILE_FIELD = 'accountability_profile';
const MAX_PARTNERS = 5;

export interface WeeklySharedGoal {
  title: string;
  targetWorkoutDays: number;
}

export interface AccountabilityCircleProfile {
  enabled: boolean;
  teamLabel: string;
  partnerNames: string[];
  weeklyGoal: WeeklySharedGoal;
  updatedAt: string;
}

export interface AccountabilityWeekWindow {
  weekStart: string;
  weekEnd: string;
  dates: string[];
}

export interface WeeklyAccountabilityStatus {
  enabled: boolean;
  weekStart: string;
  weekEnd: string;
  teamLabel: string;
  partnerNames: string[];
  goalTitle: string;
  targetWorkoutDays: number;
  workoutDays: number;
  checkInDays: number;
  workoutsRemaining: number;
  goalProgressRatio: number;
  encouragement: string;
}

export interface AccountabilityProfileMergeResult {
  mergedProfile: AccountabilityCircleProfile;
  writeLocal: boolean;
  writeCloud: boolean;
}

const DEFAULT_WEEKLY_GOAL: WeeklySharedGoal = {
  title: 'Show up with consistency',
  targetWorkoutDays: 4,
};

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function clampWorkoutTarget(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_WEEKLY_GOAL.targetWorkoutDays;
  return Math.min(7, Math.max(1, Math.round(n)));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function persistAccountabilityCircleProfile(profile: AccountabilityCircleProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCOUNTABILITY_PROFILE_KEY, JSON.stringify(profile));
}

function normalizePartnerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return parsePartnerNames(value.filter((entry): entry is string => typeof entry === 'string').join(','));
}

function buildEncouragement(enabled: boolean, workoutDays: number, targetWorkoutDays: number, checkInDays: number): string {
  if (!enabled) {
    return 'Accountability mode is off. Enable it anytime for gentle weekly support.';
  }

  if (workoutDays >= targetWorkoutDays) {
    return 'Shared goal complete this week — celebrate the consistency together.';
  }

  const workoutsRemaining = Math.max(0, targetWorkoutDays - workoutDays);
  const dayLabel = workoutsRemaining === 1 ? 'day' : 'days';
  if (checkInDays >= 4) {
    return `Steady check-ins this week. ${workoutsRemaining} workout ${dayLabel} to reach your shared goal.`;
  }
  if (checkInDays > 0) {
    return `Momentum is building. ${workoutsRemaining} workout ${dayLabel} left, and every small win counts.`;
  }
  return 'Fresh week, fresh start. A quick check-in today is enough.';
}

function isCheckInDay(log: DailyLog | null): boolean {
  if (!log) return false;
  return Boolean(
    log.gymWorkoutDone ||
    log.outdoorWalkDone ||
    log.readingDone ||
    log.moodEmoji ||
    log.dietSlots.breakfast ||
    log.dietSlots.lunch ||
    log.dietSlots.dinner ||
    log.dietSlots.snacks
  );
}

export function parsePartnerNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const piece of raw.split(/[\n,;]+/)) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const safeName = trimmed.slice(0, 24);
    const dedupeKey = safeName.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    names.push(safeName);
    if (names.length >= MAX_PARTNERS) break;
  }

  return names;
}

export function createDefaultAccountabilityCircleProfile(): AccountabilityCircleProfile {
  return {
    enabled: false,
    teamLabel: '',
    partnerNames: [],
    weeklyGoal: { ...DEFAULT_WEEKLY_GOAL },
    updatedAt: '',
  };
}

export function normalizeAccountabilityCircleProfile(raw: unknown): AccountabilityCircleProfile {
  const fallback = createDefaultAccountabilityCircleProfile();
  const record = asRecord(raw);
  if (!record) return fallback;

  const weeklyGoalRecord = asRecord(record.weeklyGoal);
  const normalized: AccountabilityCircleProfile = {
    enabled: record.enabled === true,
    teamLabel: normalizeText(record.teamLabel, 40),
    partnerNames: normalizePartnerNames(record.partnerNames),
    weeklyGoal: {
      title: normalizeText(weeklyGoalRecord?.title, 80) || DEFAULT_WEEKLY_GOAL.title,
      targetWorkoutDays: clampWorkoutTarget(weeklyGoalRecord?.targetWorkoutDays),
    },
    updatedAt: normalizeText(record.updatedAt, 40),
  };

  return normalized;
}

export function isAccountabilityCircleProfileEmpty(profile: AccountabilityCircleProfile): boolean {
  const normalized = normalizeAccountabilityCircleProfile(profile);
  return (
    !normalized.enabled &&
    normalized.teamLabel.length === 0 &&
    normalized.partnerNames.length === 0 &&
    normalized.weeklyGoal.title === DEFAULT_WEEKLY_GOAL.title &&
    normalized.weeklyGoal.targetWorkoutDays === DEFAULT_WEEKLY_GOAL.targetWorkoutDays
  );
}

function areProfilesEqual(a: AccountabilityCircleProfile, b: AccountabilityCircleProfile): boolean {
  return JSON.stringify(normalizeAccountabilityCircleProfile(a)) === JSON.stringify(normalizeAccountabilityCircleProfile(b));
}

export function getAccountabilityProfileFromAppStateOverrides(raw: unknown): AccountabilityCircleProfile | null {
  const overrides = asRecord(raw);
  if (!overrides || !(ACCOUNTABILITY_PROFILE_FIELD in overrides)) return null;
  return normalizeAccountabilityCircleProfile(overrides[ACCOUNTABILITY_PROFILE_FIELD]);
}

export function mergeAccountabilityProfileIntoAppStateOverrides(
  raw: unknown,
  profile: AccountabilityCircleProfile
): Record<string, unknown> {
  const overrides = asRecord(raw);
  return {
    ...(overrides ?? {}),
    [ACCOUNTABILITY_PROFILE_FIELD]: normalizeAccountabilityCircleProfile(profile),
  };
}

export function resolveAccountabilityProfileMerge(
  localProfile: AccountabilityCircleProfile,
  cloudProfile: AccountabilityCircleProfile | null
): AccountabilityProfileMergeResult {
  const local = normalizeAccountabilityCircleProfile(localProfile);
  const cloud = cloudProfile ? normalizeAccountabilityCircleProfile(cloudProfile) : null;

  const localHasData = !isAccountabilityCircleProfileEmpty(local);
  const cloudHasData = cloud ? !isAccountabilityCircleProfileEmpty(cloud) : false;

  let winner: 'local' | 'cloud' = 'local';
  if (localHasData && !cloudHasData) {
    winner = 'local';
  } else if (!localHasData && cloudHasData) {
    winner = 'cloud';
  } else if (localHasData && cloudHasData && cloud) {
    const localTs = toTimestamp(local.updatedAt);
    const cloudTs = toTimestamp(cloud.updatedAt);
    if (localTs > 0 && cloudTs > 0 && localTs !== cloudTs) {
      winner = localTs > cloudTs ? 'local' : 'cloud';
    } else if (localTs === 0 && cloudTs > 0) {
      winner = 'cloud';
    } else {
      winner = 'local';
    }
  }

  const mergedProfile = winner === 'cloud' && cloud ? cloud : local;
  const writeLocal = winner === 'cloud' && cloud !== null && !areProfilesEqual(local, cloud);
  const writeCloud = winner === 'local' && localHasData && (!cloud || !areProfilesEqual(local, cloud));

  return { mergedProfile, writeLocal, writeCloud };
}

export async function syncAccountabilityCircleProfileToSupabase(profile: AccountabilityCircleProfile): Promise<void> {
  const normalized = normalizeAccountabilityCircleProfile(profile);
  if (isAccountabilityCircleProfileEmpty(normalized)) return;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: row, error: readError } = await supabase
      .from('app_state')
      .select('default_session_overrides')
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) {
      console.warn('Supabase accountability read error:', readError.message);
      return;
    }

    const overrides = mergeAccountabilityProfileIntoAppStateOverrides(row?.default_session_overrides, normalized);
    const { error: writeError } = await supabase.from('app_state').upsert(
      {
        user_id: user.id,
        default_session_overrides: overrides,
        updated_at: normalized.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (writeError) {
      console.warn('Supabase accountability upsert error:', writeError.message);
    }
  } catch (err) {
    console.warn('Supabase accountability sync failed (offline?):', err);
  }
}

export async function syncAccountabilityCircleProfileWithCloudOverrides(cloudOverrides: unknown): Promise<void> {
  const localProfile = getAccountabilityCircleProfile();
  const cloudProfile = getAccountabilityProfileFromAppStateOverrides(cloudOverrides);
  const mergeResult = resolveAccountabilityProfileMerge(localProfile, cloudProfile);

  if (mergeResult.writeLocal) {
    persistAccountabilityCircleProfile(mergeResult.mergedProfile);
  }
  if (mergeResult.writeCloud) {
    await syncAccountabilityCircleProfileToSupabase(mergeResult.mergedProfile);
  }
}

export async function syncAccountabilityCircleProfileFromSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: row, error } = await supabase
      .from('app_state')
      .select('default_session_overrides')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Supabase accountability sync-down error:', error.message);
      return;
    }

    await syncAccountabilityCircleProfileWithCloudOverrides(row?.default_session_overrides ?? null);
  } catch {
    // Offline or unauthenticated path — local data remains source of truth.
  }
}

export function getAccountabilityCircleProfile(): AccountabilityCircleProfile {
  if (typeof window === 'undefined') return createDefaultAccountabilityCircleProfile();

  try {
    const raw = localStorage.getItem(ACCOUNTABILITY_PROFILE_KEY);
    if (!raw) return createDefaultAccountabilityCircleProfile();
    return normalizeAccountabilityCircleProfile(JSON.parse(raw));
  } catch {
    return createDefaultAccountabilityCircleProfile();
  }
}

export function saveAccountabilityCircleProfile(profile: AccountabilityCircleProfile): AccountabilityCircleProfile {
  const normalized = normalizeAccountabilityCircleProfile(profile);
  const persisted: AccountabilityCircleProfile = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };

  persistAccountabilityCircleProfile(persisted);

  return persisted;
}

export function clearAccountabilityCircleProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCOUNTABILITY_PROFILE_KEY);
}

export function getAccountabilityWeekWindow(referenceDate: string): AccountabilityWeekWindow {
  const reference = new Date(referenceDate + 'T12:00:00');
  if (Number.isNaN(reference.getTime())) {
    const fallback = localDateString(new Date());
    return getAccountabilityWeekWindow(fallback);
  }

  const mondayOffset = (reference.getDay() + 6) % 7;
  const weekStart = addDays(localDateString(reference), -mondayOffset);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return {
    weekStart: dates[0],
    weekEnd: dates[dates.length - 1],
    dates,
  };
}

export function buildWeeklyAccountabilityStatus(args: {
  profile: AccountabilityCircleProfile;
  logs: DailyLog[];
  referenceDate: string;
}): WeeklyAccountabilityStatus {
  const profile = normalizeAccountabilityCircleProfile(args.profile);
  const weekWindow = getAccountabilityWeekWindow(args.referenceDate);
  const logByDate = new Map<string, DailyLog>();
  for (const log of args.logs) {
    if (log?.date) logByDate.set(log.date, log);
  }

  const weekLogs = weekWindow.dates.map((date) => logByDate.get(date) ?? null);
  const workoutDays = weekLogs.filter((log) => log?.gymWorkoutDone).length;
  const checkInDays = weekLogs.filter((log) => isCheckInDay(log)).length;
  const targetWorkoutDays = profile.weeklyGoal.targetWorkoutDays;
  const workoutsRemaining = Math.max(0, targetWorkoutDays - workoutDays);

  return {
    enabled: profile.enabled,
    weekStart: weekWindow.weekStart,
    weekEnd: weekWindow.weekEnd,
    teamLabel: profile.teamLabel,
    partnerNames: profile.partnerNames,
    goalTitle: profile.weeklyGoal.title,
    targetWorkoutDays,
    workoutDays,
    checkInDays,
    workoutsRemaining,
    goalProgressRatio: targetWorkoutDays > 0 ? Math.min(1, workoutDays / targetWorkoutDays) : 0,
    encouragement: buildEncouragement(profile.enabled, workoutDays, targetWorkoutDays, checkInDays),
  };
}
