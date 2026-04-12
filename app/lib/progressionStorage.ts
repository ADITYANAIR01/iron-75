import { createDefaultProgressionState, normalizeProgressionState } from './progressionLogic';
import { getToday } from './storage';
import { ProgressionState } from './types';

const PROGRESSION_KEY = 'iron75_progression_state';

export function getProgressionState(date: string = getToday()): ProgressionState {
  if (typeof window === 'undefined') return createDefaultProgressionState(date);

  const raw = localStorage.getItem(PROGRESSION_KEY);
  if (!raw) return createDefaultProgressionState(date);

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeProgressionState(parsed, date);
  } catch {
    return createDefaultProgressionState(date);
  }
}

export function saveProgressionState(state: ProgressionState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(state));
}
