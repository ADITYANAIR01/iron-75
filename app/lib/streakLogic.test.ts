import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./storage', () => ({
  getAppState: vi.fn(),
  saveAppState: vi.fn(),
  getDailyLog: vi.fn(),
  getToday: vi.fn(),
  getYesterday: vi.fn(),
  isStreakDayComplete: vi.fn((log: DailyLog | null | undefined) => !!log?.gymWorkoutDone),
}));

import { completeTodayStreak, initializeStreakOnLoad } from './streakLogic';
import { getAppState, getDailyLog, getToday, getYesterday, saveAppState } from './storage';
import type { AppState, DailyLog } from './types';

const mockGetAppState = vi.mocked(getAppState);
const mockGetDailyLog = vi.mocked(getDailyLog);
const mockGetToday = vi.mocked(getToday);
const mockGetYesterday = vi.mocked(getYesterday);
const mockSaveAppState = vi.mocked(saveAppState);

function buildLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: '2026-03-13',
    gymWorkoutDone: false,
    outdoorWalkDone: false,
    readingDone: false,
    readingBook: '',
    dietSlots: { breakfast: '', lunch: '', dinner: '', snacks: '' },
    moodEmoji: '',
    energyLevel: 3,
    motivationLevel: 3,
    sorenessLevel: 3,
    progressPhotoUrl: '',
    progressPhotos: [],
    allTasksComplete: false,
    celebrationShown: false,
    aiInsightShown: '',
    ...overrides,
  };
}

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

  it('resets streak when a streak day is missed', () => {
    const state: AppState = {
      streak: 12,
      currentDay: 13,
      startDate: '2026-03-01',
      longestStreak: 12,
      totalRestarts: 1,
    };
    mockGetAppState.mockReturnValue(state);
    mockGetDailyLog.mockReturnValue(null);

    const result = initializeStreakOnLoad();

    expect(result.streak).toBe(0);
    expect(result.currentDay).toBe(1);
    expect(result.totalRestarts).toBe(2);
    expect(result.startDate).toBe('2026-03-14');
    expect(mockSaveAppState).toHaveBeenCalledTimes(1);
  });

  it('resets once even when multiple days were missed', () => {
    const state: AppState = {
      streak: 20,
      currentDay: 21,
      startDate: '2026-02-20',
      longestStreak: 20,
      totalRestarts: 0,
    };
    mockGetAppState.mockReturnValue(state);
    mockGetDailyLog.mockReturnValue(null);
    localStorage.setItem('iron75_streak_check_date', '2026-03-10');

    const result = initializeStreakOnLoad();

    expect(result.streak).toBe(0);
    expect(result.currentDay).toBe(1);
    expect(result.totalRestarts).toBe(1);
    expect(mockGetDailyLog).toHaveBeenCalledWith('2026-03-11');
    expect(mockGetDailyLog).toHaveBeenCalledWith('2026-03-12');
    expect(mockGetDailyLog).toHaveBeenCalledWith('2026-03-13');
    expect(mockSaveAppState).toHaveBeenCalledTimes(1);
  });

  it('does not reset when yesterday workout was completed', () => {
    const state: AppState = {
      streak: 8,
      currentDay: 9,
      startDate: '2026-03-01',
      longestStreak: 8,
      totalRestarts: 0,
    };
    mockGetAppState.mockReturnValue(state);
    mockGetDailyLog.mockReturnValue(buildLog({ gymWorkoutDone: true, allTasksComplete: false }));

    const result = initializeStreakOnLoad();

    expect(result).toEqual(state);
    expect(mockSaveAppState).not.toHaveBeenCalled();
  });

  it('is idempotent when already checked today', () => {
    const state: AppState = {
      streak: 9,
      currentDay: 10,
      startDate: '2026-03-01',
      longestStreak: 9,
      totalRestarts: 0,
    };
    mockGetAppState.mockReturnValue(state);
    localStorage.setItem('iron75_streak_check_date', '2026-03-14');

    const result = initializeStreakOnLoad();

    expect(result).toEqual(state);
    expect(mockSaveAppState).not.toHaveBeenCalled();
  });

  it('increments streak and day when workout completes', () => {
    const state: AppState = {
      streak: 11,
      currentDay: 12,
      startDate: '2026-03-01',
      longestStreak: 11,
      totalRestarts: 0,
    };

    const result = completeTodayStreak(state);
    expect(result.streak).toBe(12);
    expect(result.currentDay).toBe(13);
    expect(result.longestStreak).toBe(12);
  });
});
