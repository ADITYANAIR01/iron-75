import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./storage', () => ({
  getAppState: vi.fn(),
  saveAppState: vi.fn(),
  getDailyLog: vi.fn(),
  getToday: vi.fn(),
  getYesterday: vi.fn(),
}));

import { completeTodayStreak, initializeStreakOnLoad } from './streakLogic';
import { getAppState, getDailyLog, getToday, getYesterday, saveAppState } from './storage';
import type { AppState } from './types';

const mockGetAppState = vi.mocked(getAppState);
const mockGetDailyLog = vi.mocked(getDailyLog);
const mockGetToday = vi.mocked(getToday);
const mockGetYesterday = vi.mocked(getYesterday);
const mockSaveAppState = vi.mocked(saveAppState);

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
  });
}

describe('streakLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installLocalStorageMock();
    mockGetToday.mockReturnValue('2026-03-14');
    mockGetYesterday.mockReturnValue('2026-03-13');
  });

  it('consumes one freeze in workout mode on a missed day', () => {
    const state: AppState = {
      streak: 12,
      currentDay: 13,
      startDate: '2026-03-01',
      longestStreak: 12,
      totalRestarts: 1,
      mode: 'workout',
      freezeCount: 2,
    };
    mockGetAppState.mockReturnValue(state);
    mockGetDailyLog.mockReturnValue(null);

    const result = initializeStreakOnLoad();

    expect(result.streak).toBe(12);
    expect(result.currentDay).toBe(13);
    expect(result.freezeCount).toBe(1);
    expect(result.totalRestarts).toBe(1);
    expect(mockSaveAppState).toHaveBeenCalledTimes(1);
  });

  it('resets streak immediately in 75hard mode on a missed day', () => {
    const state: AppState = {
      streak: 18,
      currentDay: 19,
      startDate: '2026-02-24',
      longestStreak: 22,
      totalRestarts: 0,
      mode: '75hard',
      freezeCount: 0,
    };
    mockGetAppState.mockReturnValue(state);
    mockGetDailyLog.mockReturnValue(null);

    const result = initializeStreakOnLoad();

    expect(result.streak).toBe(0);
    expect(result.currentDay).toBe(1);
    expect(result.totalRestarts).toBe(1);
    expect(result.startDate).toBe('2026-03-14');
    expect(mockSaveAppState).toHaveBeenCalledTimes(1);
  });

  it('awards a freeze at 7-day milestones and caps at 5', () => {
    const stateNearMilestone: AppState = {
      streak: 6,
      currentDay: 7,
      startDate: '2026-03-08',
      longestStreak: 6,
      totalRestarts: 0,
      mode: 'workout',
      freezeCount: 4,
    };

    const afterMilestone = completeTodayStreak(stateNearMilestone);
    expect(afterMilestone.streak).toBe(7);
    expect(afterMilestone.freezeCount).toBe(5);

    const alreadyMax: AppState = {
      ...afterMilestone,
      streak: 13,
      currentDay: 14,
      freezeCount: 5,
    };

    const afterNextMilestone = completeTodayStreak(alreadyMax);
    expect(afterNextMilestone.streak).toBe(14);
    expect(afterNextMilestone.freezeCount).toBe(5);
  });
});
