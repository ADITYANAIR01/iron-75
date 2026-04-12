import { describe, expect, it } from 'vitest';
import {
  buildWorkoutProgressionReport,
  computeTrendSignal,
  detectLikelyPRs,
  getExerciseSnapshots,
  suggestNextSessionTargets,
  type WorkoutHistoryEntry,
} from './workoutProgression';
import type { ExerciseState } from './types';

function makeExerciseState(
  sets: Array<{ done?: boolean; reps?: string }>
): ExerciseState {
  return {
    sets: sets.map((set) => ({
      done: set.done ?? true,
      reps: set.reps ?? '',
    })),
    notes: '',
    expanded: false,
  };
}

function makeHistoryEntry(
  date: string,
  exercises: Record<string, ExerciseState>,
  sessionKey = 'custom_session'
): WorkoutHistoryEntry {
  return {
    date,
    sessionKey,
    completed: true,
    exercises,
  };
}

describe('workoutProgression', () => {
  it('builds sorted snapshots and parses rep strings safely', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-02-03', {
        'Bench Press': makeExerciseState([{ reps: '10 reps' }, { reps: 'x' }]),
      }),
      makeHistoryEntry('2026-02-01', {
        'Bench Press': makeExerciseState([{ reps: '8' }, { reps: '8' }]),
      }),
    ];

    const snapshots = getExerciseSnapshots(history, 'Bench Press');
    expect(snapshots.map((snapshot) => snapshot.date)).toEqual(['2026-02-01', '2026-02-03']);
    expect(snapshots[1].repsBySet).toEqual([10, null]);
  });

  it('detects likely PRs for total reps, best set, and completed sets', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-01-04', {
        'Bench Press': makeExerciseState([{ reps: '10 reps' }, { reps: '9' }, { reps: '8' }]),
      }),
      makeHistoryEntry('2026-01-02', {
        'Bench Press': makeExerciseState([{ reps: '8' }, { done: false }, { done: false }]),
      }),
      makeHistoryEntry('2026-01-03', {
        'Bench Press': makeExerciseState([{ reps: '8' }, { reps: '8' }, { done: false }]),
      }),
    ];

    const prs = detectLikelyPRs(history);
    expect(prs.map((pr) => `${pr.date}:${pr.metric}:${pr.value}`)).toEqual([
      '2026-01-03:total_reps:16',
      '2026-01-03:completed_sets:2',
      '2026-01-04:best_set_reps:10',
      '2026-01-04:total_reps:27',
      '2026-01-04:completed_sets:3',
    ]);
    expect(prs[prs.length - 1]?.confidence).toBe('high');
  });

  it('does not report rep PRs when reps are missing or non-numeric', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-02-01', {
        'Seated Row': makeExerciseState([{ reps: 'abc' }, { done: false }]),
      }),
      makeHistoryEntry('2026-02-02', {
        'Seated Row': makeExerciseState([{ reps: 'xyz' }, { done: false }]),
      }),
    ];

    expect(detectLikelyPRs(history)).toEqual([]);
  });

  it('computes up/down/insufficient trend signals', () => {
    const upHistory: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-03-01', { Squat: makeExerciseState([{ reps: '8' }, { reps: '8' }, { reps: '8' }]) }),
      makeHistoryEntry('2026-03-02', { Squat: makeExerciseState([{ reps: '8' }, { reps: '8' }, { reps: '8' }]) }),
      makeHistoryEntry('2026-03-03', { Squat: makeExerciseState([{ reps: '9' }, { reps: '9' }, { reps: '9' }]) }),
      makeHistoryEntry('2026-03-04', { Squat: makeExerciseState([{ reps: '10' }, { reps: '10' }, { reps: '10' }]) }),
    ];
    const downHistory: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-04-01', { Deadlift: makeExerciseState([{ reps: '12' }, { reps: '12' }, { reps: '12' }]) }),
      makeHistoryEntry('2026-04-02', { Deadlift: makeExerciseState([{ reps: '12' }, { reps: '12' }, { reps: '12' }]) }),
      makeHistoryEntry('2026-04-03', { Deadlift: makeExerciseState([{ reps: '10' }, { reps: '10' }, { reps: '10' }]) }),
      makeHistoryEntry('2026-04-04', { Deadlift: makeExerciseState([{ reps: '8' }, { done: false }, { done: false }]) }),
    ];

    const up = computeTrendSignal(upHistory, 'Squat');
    const down = computeTrendSignal(downHistory, 'Deadlift');
    const insufficient = computeTrendSignal(
      [makeHistoryEntry('2026-05-01', { Row: makeExerciseState([{ reps: '10' }]) })],
      'Row'
    );

    expect(up.direction).toBe('up');
    expect(up.score).toBeGreaterThan(0.1);
    expect(down.direction).toBe('down');
    expect(down.score).toBeLessThan(0);
    expect(insufficient.direction).toBe('insufficient_data');
    expect(insufficient.score).toBe(0);
  });

  it('suggests conservative push targets when trend is positive', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-06-01', { 'Pull Up': makeExerciseState([{ reps: '8' }, { reps: '8' }, { reps: '8' }]) }),
      makeHistoryEntry('2026-06-02', { 'Pull Up': makeExerciseState([{ reps: '9' }, { reps: '9' }, { reps: '9' }]) }),
      makeHistoryEntry('2026-06-03', { 'Pull Up': makeExerciseState([{ reps: '10' }, { reps: '10' }, { reps: '10' }]) }),
    ];

    const target = suggestNextSessionTargets(history).find((entry) => entry.exerciseName === 'Pull Up');

    expect(target).toBeDefined();
    expect(target?.action).toBe('push');
    expect(target?.targetRepsBySet).toEqual([11, 11, 10]);
  });

  it('suggests easier targets when completion is low and clamps to safety floor', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-07-01', {
        Row: makeExerciseState([{ reps: '4' }, { done: false }, { done: false }]),
      }),
    ];

    const target = suggestNextSessionTargets(history, { minRepTarget: 4 }).find(
      (entry) => entry.exerciseName === 'Row'
    );

    expect(target).toBeDefined();
    expect(target?.action).toBe('ease');
    expect(target?.targetRepsBySet).toEqual([4, 4, 4]);
  });

  it('uses fallback defaults when rep history is missing and respects max clamp', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-08-01', {
        Plank: makeExerciseState([{ reps: '' }, { reps: '' }]),
        Curl: makeExerciseState([{ reps: '11' }, { reps: '11' }]),
      }),
      makeHistoryEntry('2026-08-02', {
        Curl: makeExerciseState([{ reps: '12' }, { reps: '12' }]),
      }),
      makeHistoryEntry('2026-08-03', {
        Curl: makeExerciseState([{ reps: '12' }, { reps: '12' }]),
      }),
    ];

    const targets = suggestNextSessionTargets(history, { defaultRepTarget: 6, maxRepTarget: 12 });
    const plank = targets.find((entry) => entry.exerciseName === 'Plank');
    const curl = targets.find((entry) => entry.exerciseName === 'Curl');

    expect(plank?.action).toBe('hold');
    expect(plank?.targetRepsBySet).toEqual([6, 6]);
    expect(curl?.action).toBe('push');
    expect(curl?.targetRepsBySet).toEqual([12, 12]);
  });

  it('builds a report with PRs, trend signals, and next-session targets', () => {
    const history: WorkoutHistoryEntry[] = [
      makeHistoryEntry('2026-09-01', {
        Squat: makeExerciseState([{ reps: '8' }, { reps: '8' }, { reps: '8' }]),
      }),
      makeHistoryEntry('2026-09-02', {
        Squat: makeExerciseState([{ reps: '9' }, { reps: '9' }, { reps: '9' }]),
      }),
    ];

    const report = buildWorkoutProgressionReport(history);
    expect(report.prs.length).toBeGreaterThan(0);
    expect(report.trends.map((trend) => trend.exerciseName)).toEqual(['Squat']);
    expect(report.nextTargets[0]?.exerciseName).toBe('Squat');
  });
});
