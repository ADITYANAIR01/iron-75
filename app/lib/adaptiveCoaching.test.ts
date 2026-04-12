import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveCoachingContext,
  formatAdaptiveContextForPrompt,
} from './adaptiveCoaching';
import type { DailyLog, UserFocus } from './types';

function makeLog(date: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date,
    gymWorkoutDone: false,
    outdoorWalkDone: false,
    readingDone: false,
    readingBook: '',
    dietSlots: { breakfast: '', lunch: '', dinner: '', snacks: '' },
    moodEmoji: 'meh',
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

function buildContext(args: {
  recentLogs: DailyLog[];
  todayLog: DailyLog | null;
  focus?: UserFocus;
  streak?: number;
  currentDay?: number;
}) {
  return computeAdaptiveCoachingContext({
    recentLogs: args.recentLogs,
    todayLog: args.todayLog,
    focus: args.focus ?? 'balanced',
    streak: args.streak ?? 7,
    currentDay: args.currentDay ?? 14,
  });
}

describe('adaptiveCoaching', () => {
  it('flags high miss risk and prioritizes consistency when workout adherence drops', () => {
    const recentLogs = [
      makeLog('2026-03-01', { gymWorkoutDone: false, energyLevel: 2, motivationLevel: 2 }),
      makeLog('2026-03-02', { gymWorkoutDone: false, energyLevel: 2, motivationLevel: 2 }),
      makeLog('2026-03-03', { gymWorkoutDone: true, energyLevel: 2, motivationLevel: 2 }),
      makeLog('2026-03-04', { gymWorkoutDone: false, energyLevel: 2, motivationLevel: 1 }),
    ];

    const context = buildContext({
      recentLogs,
      todayLog: makeLog('2026-03-05', { gymWorkoutDone: false }),
      focus: 'habit_first',
      streak: 1,
      currentDay: 4,
    });

    expect(context.riskLevel).toBe('high');
    expect(context.riskKind).toBe('miss');
    expect(context.primaryPriority).toBe('consistency');
    expect(context.triggerSummary).toContain('workout still pending today');
  });

  it('flags burnout risk and prioritizes recovery under sustained soreness', () => {
    const recentLogs = [
      makeLog('2026-04-01', { gymWorkoutDone: true, energyLevel: 2, sorenessLevel: 5, motivationLevel: 3 }),
      makeLog('2026-04-02', { gymWorkoutDone: true, energyLevel: 2, sorenessLevel: 4, motivationLevel: 3 }),
      makeLog('2026-04-03', { gymWorkoutDone: true, energyLevel: 2, sorenessLevel: 5, motivationLevel: 3 }),
      makeLog('2026-04-04', { gymWorkoutDone: true, energyLevel: 2, sorenessLevel: 4, motivationLevel: 3 }),
      makeLog('2026-04-05', { gymWorkoutDone: true, energyLevel: 2, sorenessLevel: 4, motivationLevel: 3 }),
    ];

    const context = buildContext({
      recentLogs,
      todayLog: makeLog('2026-04-05', { gymWorkoutDone: true }),
      focus: 'gym_first',
      streak: 18,
      currentDay: 24,
    });

    expect(context.riskLevel).toBe('high');
    expect(context.riskKind).toBe('burnout');
    expect(context.primaryPriority).toBe('recovery');
    expect(context.triggerSummary).toContain('soreness');
  });

  it('selects intensity priority when readiness is strong and risk is low', () => {
    const recentLogs = [
      makeLog('2026-05-01', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        dietSlots: { breakfast: 'eggs', lunch: 'chicken', dinner: 'salmon', snacks: 'yogurt' },
        energyLevel: 4,
        motivationLevel: 4,
        sorenessLevel: 2,
        moodEmoji: 'good',
      }),
      makeLog('2026-05-02', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        dietSlots: { breakfast: 'oats', lunch: 'rice', dinner: 'beef', snacks: 'fruit' },
        energyLevel: 4,
        motivationLevel: 4,
        sorenessLevel: 2,
        moodEmoji: 'great',
      }),
      makeLog('2026-05-03', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        dietSlots: { breakfast: 'oats', lunch: 'turkey', dinner: 'rice', snacks: 'nuts' },
        energyLevel: 4,
        motivationLevel: 4,
        sorenessLevel: 2,
        moodEmoji: 'good',
      }),
      makeLog('2026-05-04', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        dietSlots: { breakfast: 'eggs', lunch: 'beef', dinner: 'fish', snacks: 'protein shake' },
        energyLevel: 5,
        motivationLevel: 4,
        sorenessLevel: 2,
        moodEmoji: 'good',
      }),
    ];

    const context = buildContext({
      recentLogs,
      todayLog: makeLog('2026-05-04', {
        gymWorkoutDone: true,
        dietSlots: { breakfast: 'eggs', lunch: 'rice', dinner: 'beef', snacks: '' },
      }),
      focus: 'gym_first',
      streak: 21,
      currentDay: 35,
    });

    expect(context.riskLevel).toBe('low');
    expect(context.primaryPriority).toBe('intensity');
    expect(context.triggerSummary).toContain('Stable momentum');
  });

  it('prioritizes nutrition when diet logging is weak despite training completion', () => {
    const recentLogs = [
      makeLog('2026-06-01', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        energyLevel: 3,
        motivationLevel: 3,
      }),
      makeLog('2026-06-02', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        energyLevel: 3,
        motivationLevel: 3,
      }),
      makeLog('2026-06-03', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        energyLevel: 3,
        motivationLevel: 3,
        dietSlots: { breakfast: 'toast', lunch: '', dinner: '', snacks: '' },
      }),
      makeLog('2026-06-04', {
        gymWorkoutDone: true,
        outdoorWalkDone: true,
        readingDone: true,
        energyLevel: 3,
        motivationLevel: 3,
      }),
    ];

    const context = buildContext({
      recentLogs,
      todayLog: makeLog('2026-06-04', { gymWorkoutDone: true }),
      focus: 'balanced',
      streak: 10,
      currentDay: 30,
    });

    expect(context.riskLevel).toBe('low');
    expect(context.primaryPriority).toBe('nutrition');
  });

  it('handles empty logs safely and still returns actionable context', () => {
    const context = buildContext({
      recentLogs: [],
      todayLog: null,
      focus: 'balanced',
      streak: 0,
      currentDay: 1,
    });

    expect(context.sampleSize).toBe(0);
    expect(context.riskLevel).toBe('medium');
    expect(context.primaryPriority).toBe('consistency');
    expect(context.triggerSummary.length).toBeGreaterThan(0);
  });

  it('formats prompt context with directive text', () => {
    const context = buildContext({
      recentLogs: [],
      todayLog: null,
      focus: 'balanced',
      streak: 0,
      currentDay: 1,
    });

    const text = formatAdaptiveContextForPrompt(context);
    expect(text).toContain('Adaptive coaching context');
    expect(text).toContain('Primary priority');
    expect(text).toContain('Coaching directive');
  });
});
