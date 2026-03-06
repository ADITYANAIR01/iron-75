// ─── Custom Workout Planner – Data Layer ────────────────────────────────────
//
// Lets users create their own workout sessions and assign them to days of the
// week. Unassigned days fall back to the default PPL rotation.

import { SESSIONS, DOW_TO_SESSION, SessionSpec, ExerciseSpec } from './pplData';
import { createClient } from './supabase';

// ── Storage keys ──────────────────────────────────────────────────────────────
const CUSTOM_SESSIONS_KEY = 'iron75_custom_sessions';
const DAY_ASSIGNMENTS_KEY = 'iron75_day_assignments';
const DEFAULT_SESSION_OVERRIDES_KEY = 'iron75_default_session_overrides';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CustomExercise {
  id: string;
  name: string;
  emoji: string;
  sets: number;
  repRange: string;
  rest: string;
  targetMuscle: string;
  tip: string;
}

export interface CustomSession {
  id: string;       // unique, e.g. "custom_abc123"
  name: string;     // user-given name
  emoji: string;
  color: string;
  exercises: CustomExercise[];
  warmup: string[];
  cooldown: string[];
}

export type DefaultSessionKey =
  | 'pushA'
  | 'pullA'
  | 'legsA'
  | 'pushB'
  | 'pullB'
  | 'legsB'
  | 'mobility';

export const DEFAULT_SESSION_KEYS: DefaultSessionKey[] = [
  'pushA',
  'pullA',
  'legsA',
  'pushB',
  'pullB',
  'legsB',
  'mobility',
];

const DEFAULT_SESSION_KEY_SET = new Set<string>(DEFAULT_SESSION_KEYS);
export type DefaultSessionOverrides = Partial<Record<DefaultSessionKey, CustomExercise[]>>;

// Maps day-of-week (0=Sun..6=Sat) → session id (custom id or PPL key).
// Missing entries = use PPL default for that day.
export type DayAssignments = Partial<Record<number, string>>;

function isDefaultSessionKey(key: string): key is DefaultSessionKey {
  return DEFAULT_SESSION_KEY_SET.has(key);
}

// ── ID generator ──────────────────────────────────────────────────────────────
export function generateId(): string {
  return 'custom_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Preset colors & emojis for custom sessions ────────────────────────────────
export const SESSION_COLORS = [
  '#FF6B35', '#A855F7', '#00F5D4', '#BAFF39', '#FF6B9D', '#38BDF8',
  '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#6366F1', '#14B8A6',
];

export const SESSION_EMOJIS = [
  '🏋️', '💪', '🔥', '⚡', '🎯', '🦾', '🏆', '💎', '🚀', '🧘',
  '🤸', '🏃', '🥊', '⛹️', '🤾', '🚴', '🏊', '🧗',
];

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings',
  'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio', 'Flexibility',
];

export const EXERCISE_EMOJIS: Record<string, string> = {
  Chest: '🫁', Back: '🔙', Shoulders: '🎯', Biceps: '💪', Triceps: '🦾',
  Quads: '🦵', Hamstrings: '🦿', Glutes: '🍑', Calves: '🐄', Core: '🧱',
  'Full Body': '🏋️', Cardio: '🏃', Flexibility: '🧘',
};

// ── CRUD: Custom Sessions ─────────────────────────────────────────────────────
function cleanExercise(ex: CustomExercise): CustomExercise {
  return {
    ...ex,
    name: ex.name.trim(),
    emoji: ex.emoji || EXERCISE_EMOJIS[ex.targetMuscle] || EXERCISE_EMOJIS['Full Body'],
    sets: Math.max(1, ex.sets || 1),
    repRange: ex.repRange.trim() || '8-12',
    rest: ex.rest.trim() || '90s',
    targetMuscle: ex.targetMuscle || 'Full Body',
    tip: ex.tip.trim() || 'Focus on form and progressive overload.',
  };
}

function customExerciseToSpec(ex: CustomExercise): ExerciseSpec {
  const cleaned = cleanExercise(ex);
  return {
    name: cleaned.name,
    emoji: cleaned.emoji,
    sets: cleaned.sets,
    repRange: cleaned.repRange,
    rest: cleaned.rest,
    tip: cleaned.tip,
    targetMuscle: cleaned.targetMuscle,
  };
}

function exerciseSpecToCustom(ex: ExerciseSpec): CustomExercise {
  return {
    id: generateId(),
    name: ex.name,
    emoji: ex.emoji,
    sets: ex.sets,
    repRange: ex.repRange,
    rest: ex.rest,
    targetMuscle: ex.targetMuscle,
    tip: ex.tip,
  };
}

export function getCustomSessions(): CustomSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomSessions(sessions: CustomSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(sessions));
  syncCustomWorkoutsToSupabase();
}

// ── CRUD: Day Assignments ─────────────────────────────────────────────────────
export function getDayAssignments(): DayAssignments {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DAY_ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDayAssignments(assignments: DayAssignments): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  syncCustomWorkoutsToSupabase();
}

export function getDefaultSessionOverrides(): DefaultSessionOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DEFAULT_SESSION_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDefaultSessionExercises(sessionKey: DefaultSessionKey): CustomExercise[] {
  const overrides = getDefaultSessionOverrides();
  const custom = overrides[sessionKey];
  if (custom && custom.length > 0) {
    return custom.map((ex) => ({ ...cleanExercise(ex), id: ex.id || generateId() }));
  }
  return SESSIONS[sessionKey].exercises.map(exerciseSpecToCustom);
}

export function saveDefaultSessionExercises(sessionKey: DefaultSessionKey, exercises: CustomExercise[]): void {
  if (typeof window === 'undefined') return;

  const cleaned = exercises
    .map((ex) => ({ ...cleanExercise(ex), id: ex.id || generateId() }))
    .filter((ex) => ex.name.length > 0);

  const baseSpecs = SESSIONS[sessionKey].exercises;
  const cleanedSpecs = cleaned.map(customExerciseToSpec);
  const isSameAsBase = JSON.stringify(cleanedSpecs) === JSON.stringify(baseSpecs);

  const overrides = getDefaultSessionOverrides();
  if (cleaned.length === 0 || isSameAsBase) {
    delete overrides[sessionKey];
  } else {
    overrides[sessionKey] = cleaned;
  }

  localStorage.setItem(DEFAULT_SESSION_OVERRIDES_KEY, JSON.stringify(overrides));
  syncCustomWorkoutsToSupabase();
}

export function resetDefaultSessionExercises(sessionKey: DefaultSessionKey): void {
  if (typeof window === 'undefined') return;
  const overrides = getDefaultSessionOverrides();
  delete overrides[sessionKey];
  localStorage.setItem(DEFAULT_SESSION_OVERRIDES_KEY, JSON.stringify(overrides));
  syncCustomWorkoutsToSupabase();
}

// ── Supabase sync for custom workouts ─────────────────────────────────────────
async function syncCustomWorkoutsToSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const sessions = getCustomSessions();
    const assignments = getDayAssignments();
    const defaultOverrides = getDefaultSessionOverrides();
    const now = new Date().toISOString();
    const { error } = await supabase.from('app_state').upsert(
      {
        user_id: user.id,
        custom_sessions: sessions,
        day_assignments: assignments,
        default_session_overrides: defaultOverrides,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );
    // Backward compatibility: older DB schema may not have default_session_overrides yet.
    if (error) {
      await supabase.from('app_state').upsert(
        {
          user_id: user.id,
          custom_sessions: sessions,
          day_assignments: assignments,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );
    }
  } catch {
    // Offline — will sync on next syncFromSupabase() call
  }
}

/** Pull custom workouts from Supabase into localStorage. Called from syncFromSupabase(). */
export async function syncCustomWorkoutsFromSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let supportsDefaultOverrides = true;
    let { data: row, error } = await supabase
      .from('app_state')
      .select('custom_sessions, day_assignments, default_session_overrides')
      .eq('user_id', user.id)
      .single();
    if (error) {
      supportsDefaultOverrides = false;
      const fallback = await supabase
        .from('app_state')
        .select('custom_sessions, day_assignments')
        .eq('user_id', user.id)
        .single();
      row = fallback.data as typeof row;
      error = fallback.error;
    }
    if (error) return;
    if (!row) return;
    // Only pull if cloud has data and local is empty or cloud has more content
    if (row.custom_sessions) {
      const cloudSessions = row.custom_sessions as CustomSession[];
      const localSessions = getCustomSessions();
      // If local has no custom sessions, or cloud has sessions and local doesn't match, prefer cloud
      if (localSessions.length === 0 && cloudSessions.length > 0) {
        localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(cloudSessions));
      } else if (localSessions.length > 0 && cloudSessions.length === 0) {
        // Local has data cloud doesn't — push up
        syncCustomWorkoutsToSupabase();
      }
      // If both have data, keep local (user was editing) — it will push up on next save
    }
    if (row.day_assignments) {
      const cloudAssignments = row.day_assignments as DayAssignments;
      const localAssignments = getDayAssignments();
      const localKeys = Object.keys(localAssignments);
      const cloudKeys = Object.keys(cloudAssignments);
      if (localKeys.length === 0 && cloudKeys.length > 0) {
        localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(cloudAssignments));
      } else if (localKeys.length > 0 && cloudKeys.length === 0) {
        syncCustomWorkoutsToSupabase();
      }
    }
    if (supportsDefaultOverrides && row.default_session_overrides) {
      const cloudOverrides = row.default_session_overrides as DefaultSessionOverrides;
      const localOverrides = getDefaultSessionOverrides();
      const localKeys = Object.keys(localOverrides);
      const cloudKeys = Object.keys(cloudOverrides);
      if (localKeys.length === 0 && cloudKeys.length > 0) {
        localStorage.setItem(DEFAULT_SESSION_OVERRIDES_KEY, JSON.stringify(cloudOverrides));
      } else if (localKeys.length > 0 && cloudKeys.length === 0) {
        syncCustomWorkoutsToSupabase();
      }
    }
  } catch {
    // Offline — skip
  }
}

// ── Resolve session for a given day-of-week ───────────────────────────────────
// Returns: a SessionSpec (from PPL) or a CustomSession converted to SessionSpec

function customToSessionSpec(cs: CustomSession): SessionSpec {
  return {
    key: cs.id,
    name: cs.name,
    fullName: cs.name,
    emoji: cs.emoji,
    color: cs.color,
    tagline: 'Custom workout — your rules, your gains.',
    muscles: cs.exercises.map((e) => e.targetMuscle).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || 'Custom',
    exercises: cs.exercises.map((e): ExerciseSpec => ({
      name: e.name,
      emoji: e.emoji,
      sets: e.sets,
      repRange: e.repRange,
      rest: e.rest,
      tip: e.tip || 'Focus on form and progressive overload.',
      targetMuscle: e.targetMuscle,
    })),
    warmup: cs.warmup.length ? cs.warmup : ['5 min light cardio', 'Dynamic stretching'],
    cooldown: cs.cooldown.length ? cs.cooldown : ['Light stretching', 'Deep breathing — 2 minutes'],
  };
}

function getResolvedDefaultSession(sessionKey: DefaultSessionKey): SessionSpec {
  const base = SESSIONS[sessionKey];
  const overrides = getDefaultSessionOverrides();
  const customExercises = overrides[sessionKey];
  if (!customExercises || customExercises.length === 0) return base;

  const exercises = customExercises
    .map(customExerciseToSpec)
    .filter((ex) => ex.name.trim().length > 0);

  return {
    ...base,
    exercises: exercises.length > 0 ? exercises : base.exercises,
  };
}

/**
 * Get the session for a day-of-week, respecting custom assignments.
 * Falls back to PPL default if no custom assignment.
 */
export function getSessionForDow(dow: number): SessionSpec {
  const assignments = getDayAssignments();
  const assignedId = assignments[dow];

  if (assignedId) {
    // Check if it's a PPL session key
    if (isDefaultSessionKey(assignedId)) return getResolvedDefaultSession(assignedId);
    // Check custom sessions
    const custom = getCustomSessions().find((s) => s.id === assignedId);
    if (custom) return customToSessionSpec(custom);
  }

  // Fallback to default PPL mapping
  const pplKey = (DOW_TO_SESSION[dow] ?? 'pushA') as DefaultSessionKey;
  return getResolvedDefaultSession(pplKey);
}

/**
 * Get the full ordered list of sessions to show in the pill selector.
 * Includes default PPL sessions + any custom sessions.
 */
export function getAllSessionSpecs(): SessionSpec[] {
  const pplSessions = DEFAULT_SESSION_KEYS.map((k) => getResolvedDefaultSession(k));
  const custom = getCustomSessions().map(customToSessionSpec);
  return [...pplSessions, ...custom];
}

/**
 * Get a SessionSpec by key/id (works for both PPL and custom).
 */
export function getSessionById(id: string): SessionSpec | null {
  if (isDefaultSessionKey(id)) return getResolvedDefaultSession(id);
  if (SESSIONS[id]) return SESSIONS[id];
  const custom = getCustomSessions().find((s) => s.id === id);
  return custom ? customToSessionSpec(custom) : null;
}

// ── Default blank exercise template ───────────────────────────────────────────
export function createBlankExercise(): CustomExercise {
  return {
    id: generateId(),
    name: '',
    emoji: '🏋️',
    sets: 3,
    repRange: '8-12',
    rest: '90s',
    targetMuscle: 'Full Body',
    tip: '',
  };
}

export function createBlankSession(): CustomSession {
  return {
    id: generateId(),
    name: '',
    emoji: SESSION_EMOJIS[Math.floor(Math.random() * SESSION_EMOJIS.length)],
    color: SESSION_COLORS[Math.floor(Math.random() * SESSION_COLORS.length)],
    exercises: [createBlankExercise()],
    warmup: ['5 min light cardio', 'Dynamic stretching', 'Activation drills'],
    cooldown: ['Light stretching — 3 min', 'Foam roll tight areas', 'Deep breathing — 2 min'],
  };
}
