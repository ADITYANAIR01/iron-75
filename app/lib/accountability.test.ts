import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWeeklyAccountabilityStatus,
  clearAccountabilityCircleProfile,
  createDefaultAccountabilityCircleProfile,
  getAccountabilityCircleProfile,
  getAccountabilityProfileFromAppStateOverrides,
  getAccountabilityWeekWindow,
  isAccountabilityCircleProfileEmpty,
  mergeAccountabilityProfileIntoAppStateOverrides,
  parsePartnerNames,
  resolveAccountabilityProfileMerge,
  saveAccountabilityCircleProfile,
} from './accountability';
import type { DailyLog } from './types';

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
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

function makeLog(date: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date,
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

describe('accountability helpers', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('parses partner names, de-duplicates, and keeps a tiny circle', () => {
    const names = parsePartnerNames(' Asha, Liam ,asha;Noah\nMia, Zoe, Chris ');
    expect(names).toEqual(['Asha', 'Liam', 'Noah', 'Mia', 'Zoe']);
  });

  it('saves and reads a normalized local circle profile', () => {
    const saved = saveAccountabilityCircleProfile({
      enabled: true,
      teamLabel: '  Morning Squad  ',
      partnerNames: [' Asha ', 'asha', 'Liam', 'Noah', 'Mia', 'Zoe'],
      weeklyGoal: {
        title: '  4 focused lifts this week  ',
        targetWorkoutDays: 99,
      },
      updatedAt: '',
    });

    expect(saved.enabled).toBe(true);
    expect(saved.teamLabel).toBe('Morning Squad');
    expect(saved.partnerNames).toEqual(['Asha', 'Liam', 'Noah', 'Mia', 'Zoe']);
    expect(saved.weeklyGoal.title).toBe('4 focused lifts this week');
    expect(saved.weeklyGoal.targetWorkoutDays).toBe(7);
    expect(saved.updatedAt).not.toBe('');

    const loaded = getAccountabilityCircleProfile();
    expect(loaded).toEqual(saved);
  });

  it('clears accountability profile data locally', () => {
    saveAccountabilityCircleProfile({
      ...createDefaultAccountabilityCircleProfile(),
      enabled: true,
      teamLabel: 'Focus Crew',
    });

    clearAccountabilityCircleProfile();

    expect(getAccountabilityCircleProfile()).toEqual(createDefaultAccountabilityCircleProfile());
  });

  it('builds Monday-start week windows', () => {
    const window = getAccountabilityWeekWindow('2026-03-12');
    expect(window.weekStart).toBe('2026-03-09');
    expect(window.weekEnd).toBe('2026-03-15');
    expect(window.dates).toHaveLength(7);
  });

  it('builds weekly accountability status from local logs', () => {
    const profile = saveAccountabilityCircleProfile({
      enabled: true,
      teamLabel: 'Morning Squad',
      partnerNames: ['Asha', 'Liam'],
      weeklyGoal: { title: '4 focused lifts this week', targetWorkoutDays: 4 },
      updatedAt: '',
    });

    const status = buildWeeklyAccountabilityStatus({
      profile,
      referenceDate: '2026-03-12',
      logs: [
        makeLog('2026-03-09', { gymWorkoutDone: true }),
        makeLog('2026-03-10', { gymWorkoutDone: true }),
        makeLog('2026-03-11', { moodEmoji: 'good' }),
        makeLog('2026-03-12', { gymWorkoutDone: true }),
      ],
    });

    expect(status.workoutDays).toBe(3);
    expect(status.checkInDays).toBe(4);
    expect(status.workoutsRemaining).toBe(1);
    expect(status.goalProgressRatio).toBe(0.75);
    expect(status.encouragement).toContain('Steady check-ins');
  });

  it('returns a gentle message when accountability mode is off', () => {
    const status = buildWeeklyAccountabilityStatus({
      profile: createDefaultAccountabilityCircleProfile(),
      referenceDate: '2026-03-12',
      logs: [],
    });

    expect(status.enabled).toBe(false);
    expect(status.encouragement).toContain('Accountability mode is off');
  });

  it('serializes and normalizes accountability profile in app_state overrides', () => {
    const merged = mergeAccountabilityProfileIntoAppStateOverrides(
      { custom_feature: { keep: true } },
      {
        enabled: true,
        teamLabel: '  Focus Crew  ',
        partnerNames: ['Asha', 'Liam'],
        weeklyGoal: { title: '  5 sessions  ', targetWorkoutDays: 5 },
        updatedAt: '2026-01-01T10:00:00.000Z',
      }
    );

    expect((merged.custom_feature as Record<string, boolean>).keep).toBe(true);

    const fromCloud = getAccountabilityProfileFromAppStateOverrides(merged);
    expect(fromCloud).toEqual({
      enabled: true,
      teamLabel: 'Focus Crew',
      partnerNames: ['Asha', 'Liam'],
      weeklyGoal: { title: '5 sessions', targetWorkoutDays: 5 },
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
  });

  it('prefers non-empty local profile when cloud payload is empty', () => {
    const local = {
      enabled: true,
      teamLabel: 'Morning Squad',
      partnerNames: ['Asha'],
      weeklyGoal: { title: '4 lifts', targetWorkoutDays: 4 },
      updatedAt: '2026-01-03T10:00:00.000Z',
    };
    const cloud = createDefaultAccountabilityCircleProfile();

    const result = resolveAccountabilityProfileMerge(local, cloud);
    expect(result.mergedProfile).toEqual(local);
    expect(result.writeCloud).toBe(true);
    expect(result.writeLocal).toBe(false);
  });

  it('prefers non-empty cloud profile when local payload is empty', () => {
    const local = createDefaultAccountabilityCircleProfile();
    const cloud = {
      enabled: true,
      teamLabel: 'Cloud Crew',
      partnerNames: ['Noah'],
      weeklyGoal: { title: '3 workouts', targetWorkoutDays: 3 },
      updatedAt: '2026-01-04T10:00:00.000Z',
    };

    const result = resolveAccountabilityProfileMerge(local, cloud);
    expect(result.mergedProfile).toEqual(cloud);
    expect(result.writeLocal).toBe(true);
    expect(result.writeCloud).toBe(false);
    expect(isAccountabilityCircleProfileEmpty(result.mergedProfile)).toBe(false);
  });

  it('chooses the newer profile when both local and cloud have data', () => {
    const local = {
      enabled: true,
      teamLabel: 'Local Squad',
      partnerNames: ['Asha', 'Liam'],
      weeklyGoal: { title: '4 lifts', targetWorkoutDays: 4 },
      updatedAt: '2026-01-05T10:00:00.000Z',
    };
    const cloud = {
      enabled: true,
      teamLabel: 'Cloud Squad',
      partnerNames: ['Noah', 'Mia'],
      weeklyGoal: { title: '5 lifts', targetWorkoutDays: 5 },
      updatedAt: '2026-01-06T10:00:00.000Z',
    };

    const result = resolveAccountabilityProfileMerge(local, cloud);
    expect(result.mergedProfile).toEqual(cloud);
    expect(result.writeLocal).toBe(true);
    expect(result.writeCloud).toBe(false);
  });
});
