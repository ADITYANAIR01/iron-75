import { ProgressionSource, ProgressionState } from './types';

export const DAILY_XP_CAP = 120;

export const XP_REWARDS: Record<ProgressionSource, number> = {
  workout: 40,
  walk: 20,
  diet: 15,
  mood: 10,
  reading: 15,
  mission_path: 30,
};

const SOURCE_ORDER: ProgressionSource[] = [
  'workout',
  'walk',
  'diet',
  'mood',
  'reading',
  'mission_path',
];

const VALID_SOURCES = new Set<ProgressionSource>(SOURCE_ORDER);
const BASE_LEVEL_XP = 100;
const LEVEL_STEP_XP = 20;

function toSafeInt(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSources(raw: unknown): ProgressionSource[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((source): source is ProgressionSource => VALID_SOURCES.has(source as ProgressionSource));
  return SOURCE_ORDER.filter((source) => valid.includes(source));
}

export function createDefaultProgressionState(date: string): ProgressionState {
  return {
    totalXp: 0,
    level: 1,
    daily: {
      date,
      xpGained: 0,
      claimedSources: [],
    },
  };
}

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return BASE_LEVEL_XP + (safeLevel - 1) * LEVEL_STEP_XP;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progress: number;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  let remainingXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let xpForNextLevel = xpRequiredForLevel(level);

  while (remainingXp >= xpForNextLevel) {
    remainingXp -= xpForNextLevel;
    level += 1;
    xpForNextLevel = xpRequiredForLevel(level);
  }

  return {
    level,
    xpIntoLevel: remainingXp,
    xpForNextLevel,
    xpToNextLevel: xpForNextLevel - remainingXp,
    progress: xpForNextLevel === 0 ? 1 : remainingXp / xpForNextLevel,
  };
}

export function normalizeProgressionState(raw: unknown, date: string): ProgressionState {
  if (!isRecord(raw)) return createDefaultProgressionState(date);

  const totalXp = Math.max(0, toSafeInt(raw.totalXp, 0));
  const rawDaily = isRecord(raw.daily) ? raw.daily : {};
  const storedDate = typeof rawDaily.date === 'string' ? rawDaily.date : date;
  const sameDay = storedDate === date;

  const dailyXp = sameDay ? clamp(Math.max(0, toSafeInt(rawDaily.xpGained, 0)), 0, DAILY_XP_CAP) : 0;
  const claimedSources = sameDay ? normalizeSources(rawDaily.claimedSources) : [];
  const level = getLevelProgress(totalXp).level;

  return {
    totalXp,
    level,
    daily: {
      date,
      xpGained: dailyXp,
      claimedSources,
    },
  };
}

export interface ProgressionUpdateInput {
  date: string;
  completedSources: ProgressionSource[];
  missionCompleted: boolean;
}

export interface ProgressionUpdateResult {
  state: ProgressionState;
  awardedXp: number;
  claimedSources: ProgressionSource[];
  capped: boolean;
}

export function applyProgressionUpdate(
  currentState: ProgressionState,
  input: ProgressionUpdateInput
): ProgressionUpdateResult {
  const normalized = normalizeProgressionState(currentState, input.date);
  const completed = new Set<ProgressionSource>(
    input.completedSources.filter((source): source is ProgressionSource => VALID_SOURCES.has(source))
  );

  if (input.missionCompleted) completed.add('mission_path');

  const claimed = new Set<ProgressionSource>(normalized.daily.claimedSources);
  let totalXp = normalized.totalXp;
  let dailyXp = normalized.daily.xpGained;
  const newlyClaimed: ProgressionSource[] = [];

  for (const source of SOURCE_ORDER) {
    if (!completed.has(source) || claimed.has(source)) continue;

    const xpRemainingForToday = Math.max(DAILY_XP_CAP - dailyXp, 0);
    if (xpRemainingForToday > 0) {
      const gained = Math.min(xpRemainingForToday, XP_REWARDS[source]);
      totalXp += gained;
      dailyXp += gained;
    }

    claimed.add(source);
    newlyClaimed.push(source);
  }

  const level = getLevelProgress(totalXp).level;
  const nextState: ProgressionState = {
    totalXp,
    level,
    daily: {
      date: input.date,
      xpGained: dailyXp,
      claimedSources: SOURCE_ORDER.filter((source) => claimed.has(source)),
    },
  };

  return {
    state: nextState,
    awardedXp: totalXp - normalized.totalXp,
    claimedSources: newlyClaimed,
    capped: dailyXp >= DAILY_XP_CAP,
  };
}
