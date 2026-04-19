import { SessionSpec, ExerciseSpec } from './pplData';
import { createClient } from './supabase';

const CUSTOM_SESSIONS_KEY = 'iron75_custom_sessions';
const DAY_ASSIGNMENTS_KEY = 'iron75_day_assignments';
export const DEFAULT_WARMUP_PLAN = ['5 min light cardio', 'Dynamic stretching', 'Activation drills'];
export const DEFAULT_COOLDOWN_PLAN = ['Light stretching - 3 min', 'Foam roll tight areas', 'Deep breathing - 2 min'];

type SupabaseErrorLike = { message?: string; code?: string };

function isRlsError(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42501' || (error.message ?? '').toLowerCase().includes('row-level security policy');
}

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
  id: string;
  name: string;
  emoji: string;
  color: string;
  exercises: CustomExercise[];
  warmup: string[];
  cooldown: string[];
}

export type DayAssignments = Partial<Record<number, string>>;

export function generateId(): string {
  return `custom_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

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
  Chest: '🫁',
  Back: '🔙',
  Shoulders: '🎯',
  Biceps: '💪',
  Triceps: '🦾',
  Quads: '🦵',
  Hamstrings: '🦿',
  Glutes: '🍑',
  Calves: '🐄',
  Core: '🧱',
  'Full Body': '🏋️',
  Cardio: '🏃',
  Flexibility: '🧘',
};

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeSessionId(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function parseSessionCollection(value: unknown): Array<Partial<CustomSession> | null | undefined> {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.values(value) as Array<Partial<CustomSession> | null | undefined>;
  return [];
}

function normalizeSessionCollection(value: unknown): CustomSession[] {
  return parseSessionCollection(value)
    .map((session) => normalizeCustomSession(session as Partial<CustomSession>))
    .filter((session) => session.name.length > 0);
}

function sortSessionsById(sessions: CustomSession[]): CustomSession[] {
  return [...sessions].sort((a, b) => a.id.localeCompare(b.id));
}

function sortAssignments(assignments: DayAssignments): DayAssignments {
  return Object.fromEntries(
    Object.entries(assignments).sort(([a], [b]) => Number(a) - Number(b))
  ) as DayAssignments;
}

function sessionsEqual(a: CustomSession[], b: CustomSession[]): boolean {
  return JSON.stringify(sortSessionsById(a)) === JSON.stringify(sortSessionsById(b));
}

function assignmentsEqual(a: DayAssignments, b: DayAssignments): boolean {
  return JSON.stringify(sortAssignments(a)) === JSON.stringify(sortAssignments(b));
}

export function mergeCustomSessions(localSessions: CustomSession[], cloudSessions: CustomSession[]): CustomSession[] {
  const local = localSessions.map(normalizeCustomSession).filter((session) => session.name.length > 0);
  const cloud = cloudSessions.map(normalizeCustomSession).filter((session) => session.name.length > 0);

  const mergedById = new Map<string, CustomSession>();
  for (const session of cloud) mergedById.set(session.id, session);
  for (const session of local) mergedById.set(session.id, session);

  // Preserve local ordering first, then append cloud-only sessions.
  const orderedIds: string[] = [];
  for (const session of local) {
    if (!orderedIds.includes(session.id)) orderedIds.push(session.id);
  }
  for (const session of cloud) {
    if (!orderedIds.includes(session.id)) orderedIds.push(session.id);
  }

  return orderedIds
    .map((id) => mergedById.get(id))
    .filter((session): session is CustomSession => !!session);
}

export function mergeDayAssignments(
  localAssignments: DayAssignments,
  cloudAssignments: DayAssignments,
  sessions: CustomSession[]
): DayAssignments {
  const merged = sanitizeDayAssignments({ ...cloudAssignments, ...localAssignments });
  const sessionIds = new Set(sessions.map((session) => session.id));
  const filtered: DayAssignments = {};

  for (const [dow, sessionId] of Object.entries(merged)) {
    if (!sessionId || !sessionIds.has(sessionId)) continue;
    filtered[Number(dow)] = sessionId;
  }

  return sanitizeDayAssignments(filtered);
}

export function sanitizePhaseItems(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value.map((item) => sanitizeText(item)).filter((item) => item.length > 0);
}

export function sanitizeDayAssignments(value: unknown): DayAssignments {
  const next: DayAssignments = {};
  const sourceEntries: Array<[string, unknown]> = Array.isArray(value)
    ? value.map((sessionId, dow) => [String(dow), sessionId])
    : isRecord(value)
      ? Object.entries(value)
      : [];

  for (const [rawDow, rawSessionId] of sourceEntries) {
    const dow = Number(rawDow);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    const sessionId = sanitizeSessionId(rawSessionId);
    if (sessionId.length === 0) continue;
    next[dow] = sessionId;
  }

  return next;
}

function sanitizeExercise(exercise: Partial<CustomExercise> | null | undefined): CustomExercise {
  const source = exercise ?? {};
  const targetMuscle = sanitizeText(source.targetMuscle) || 'Full Body';
  const sets = Number.isFinite(source.sets) ? Math.floor(source.sets as number) : 1;
  return {
    id: sanitizeText(source.id) || generateId(),
    name: sanitizeText(source.name),
    emoji: sanitizeText(source.emoji) || EXERCISE_EMOJIS[targetMuscle] || EXERCISE_EMOJIS['Full Body'],
    sets: Math.max(1, sets),
    repRange: sanitizeText(source.repRange) || '8-12',
    rest: sanitizeText(source.rest) || '90s',
    targetMuscle,
    tip: sanitizeText(source.tip) || 'Focus on form and progressive overload.',
  };
}

export function normalizeCustomSession(session: Partial<CustomSession> | null | undefined): CustomSession {
  const source = session ?? {};
  const exercises = (Array.isArray(source.exercises) ? source.exercises : [])
    .map(sanitizeExercise)
    .filter((exercise) => exercise.name.length > 0);

  return {
    id: sanitizeText(source.id) || generateId(),
    name: sanitizeText(source.name),
    emoji: sanitizeText(source.emoji) || '🏋️',
    color: sanitizeText(source.color) || '#A855F7',
    exercises,
    warmup: sanitizePhaseItems(source.warmup, DEFAULT_WARMUP_PLAN),
    cooldown: sanitizePhaseItems(source.cooldown, DEFAULT_COOLDOWN_PLAN),
  };
}

function parseJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getCustomSessions(): CustomSession[] {
  const parsed = parseJson<unknown>(CUSTOM_SESSIONS_KEY, []);
  return normalizeSessionCollection(parsed);
}

export function saveCustomSessions(sessions: CustomSession[]): void {
  if (typeof window === 'undefined') return;
  const sanitized = sessions.map(normalizeCustomSession).filter((session) => session.name.length > 0);
  localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(sanitized));
  syncCustomWorkoutsToSupabase();
}

export function getDayAssignments(): DayAssignments {
  const parsed = parseJson<unknown>(DAY_ASSIGNMENTS_KEY, {});
  return sanitizeDayAssignments(parsed);
}

export function saveDayAssignments(assignments: DayAssignments): void {
  if (typeof window === 'undefined') return;
  const sanitized = sanitizeDayAssignments(assignments);
  localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(sanitized));
  syncCustomWorkoutsToSupabase();
}

async function syncCustomWorkoutsToSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('app_state').upsert(
      {
        user_id: user.id,
        custom_sessions: getCustomSessions(),
        day_assignments: getDayAssignments(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (isRlsError(error)) {
      console.warn('Supabase custom workout sync blocked by RLS. Re-run Docs/supabase.sql policies.');
    }
  } catch {
    // Offline or unauthenticated. Local copy remains source of truth.
  }
}

export async function syncCustomWorkoutsFromSupabase(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: row, error } = await supabase
      .from('app_state')
      .select('custom_sessions, day_assignments')
      .eq('user_id', user.id)
      .single();

    if (error || !row || typeof window === 'undefined') return;

    const cloudSessions = normalizeSessionCollection(row.custom_sessions);
    const cloudAssignments = sanitizeDayAssignments(row.day_assignments);

    const localSessions = getCustomSessions();
    const localAssignments = getDayAssignments();
    const localEmpty = localSessions.length === 0;
    const cloudEmpty = cloudSessions.length === 0;
    const localAssignmentsEmpty = Object.keys(localAssignments).length === 0;
    const cloudAssignmentsEmpty = Object.keys(cloudAssignments).length === 0;

    if (localEmpty && !cloudEmpty) {
      localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(cloudSessions));
    } else if (!localEmpty && cloudEmpty) {
      syncCustomWorkoutsToSupabase();
    } else if (!localEmpty && !cloudEmpty) {
      const mergedSessions = mergeCustomSessions(localSessions, cloudSessions);
      const localSessionsMatch = sessionsEqual(localSessions, mergedSessions);
      const cloudSessionsMatch = sessionsEqual(cloudSessions, mergedSessions);

      if (!localSessionsMatch) {
        localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(mergedSessions));
      }
      if (!cloudSessionsMatch || !localSessionsMatch) {
        syncCustomWorkoutsToSupabase();
      }
    }

    const sessionsForAssignments = getCustomSessions();
    if (localAssignmentsEmpty && !cloudAssignmentsEmpty) {
      localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(cloudAssignments));
    } else if (!localAssignmentsEmpty && cloudAssignmentsEmpty) {
      syncCustomWorkoutsToSupabase();
    } else if (!localAssignmentsEmpty && !cloudAssignmentsEmpty) {
      const mergedAssignments = mergeDayAssignments(localAssignments, cloudAssignments, sessionsForAssignments);
      const localAssignmentsMatch = assignmentsEqual(localAssignments, mergedAssignments);
      const cloudAssignmentsMatch = assignmentsEqual(cloudAssignments, mergedAssignments);

      if (!localAssignmentsMatch) {
        localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(mergedAssignments));
      }
      if (!cloudAssignmentsMatch || !localAssignmentsMatch) {
        syncCustomWorkoutsToSupabase();
      }
    }
  } catch {
    // Offline — skip.
  }
}

function customToSessionSpec(session: CustomSession): SessionSpec {
  const cleaned = normalizeCustomSession(session);
  return {
    key: cleaned.id,
    name: cleaned.name,
    fullName: cleaned.name,
    emoji: cleaned.emoji,
    color: cleaned.color,
    tagline: 'Custom routine - built around your plan.',
    muscles:
      cleaned.exercises
        .map((exercise) => exercise.targetMuscle)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(' · ') || 'Custom',
    exercises: cleaned.exercises.map(
      (exercise): ExerciseSpec => ({
        name: exercise.name,
        emoji: exercise.emoji,
        sets: exercise.sets,
        repRange: exercise.repRange,
        rest: exercise.rest,
        tip: exercise.tip,
        targetMuscle: exercise.targetMuscle,
      })
    ),
    warmup: cleaned.warmup.length > 0 ? cleaned.warmup : [...DEFAULT_WARMUP_PLAN],
    cooldown: cleaned.cooldown.length > 0 ? cleaned.cooldown : [...DEFAULT_COOLDOWN_PLAN],
  };
}

export function getSessionForDow(dow: number): SessionSpec | null {
  const assignments = getDayAssignments();
  const assignedId = assignments[dow];
  if (!assignedId) return null;
  return getSessionById(assignedId);
}

export function getAllSessionSpecs(): SessionSpec[] {
  return getCustomSessions().map(customToSessionSpec);
}

export function getSessionById(id: string): SessionSpec | null {
  const session = getCustomSessions().find((entry) => entry.id === id);
  return session ? customToSessionSpec(session) : null;
}

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
    warmup: [...DEFAULT_WARMUP_PLAN],
    cooldown: [...DEFAULT_COOLDOWN_PLAN],
  };
}
