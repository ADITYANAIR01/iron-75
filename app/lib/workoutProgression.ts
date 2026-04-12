import type { ExerciseState } from './types';

/**
 * Pure workout-progression helpers.
 * Integration usage (read-only): buildWorkoutProgressionReport(history) and render
 * `nextTargets` + `prs` as optional guidance in the workout UI.
 */
export interface WorkoutHistoryEntry {
  date: string;
  sessionKey: string;
  completed?: boolean;
  exercises: Record<string, ExerciseState | undefined>;
}

export interface ExerciseProgressSnapshot {
  date: string;
  sessionKey: string;
  totalSets: number;
  completedSets: number;
  completionRate: number;
  totalReps: number;
  averageReps: number;
  bestSetReps: number;
  repsBySet: Array<number | null>;
  repLoggingRate: number;
}

export type PersonalRecordMetric = 'best_set_reps' | 'total_reps' | 'completed_sets';
export type PersonalRecordConfidence = 'low' | 'medium' | 'high';

export interface DetectedPersonalRecord {
  exerciseName: string;
  date: string;
  sessionKey: string;
  metric: PersonalRecordMetric;
  value: number;
  previousBest: number;
  improvement: number;
  confidence: PersonalRecordConfidence;
}

export type TrendDirection = 'up' | 'flat' | 'down' | 'insufficient_data';

export interface ProgressionTrendSignal {
  exerciseName: string;
  direction: TrendDirection;
  score: number;
  sampleSize: number;
  baselineAverage: number;
  recentAverage: number;
}

export type RecommendationAction = 'push' | 'hold' | 'ease';

export interface NextSessionTarget {
  exerciseName: string;
  basedOnDate: string;
  targetRepsBySet: number[];
  action: RecommendationAction;
  trend: TrendDirection;
  reason: string;
}

export interface ProgressionOptions {
  defaultRepTarget?: number;
  minRepTarget?: number;
  maxRepTarget?: number;
}

export interface WorkoutProgressionReport {
  prs: DetectedPersonalRecord[];
  trends: ProgressionTrendSignal[];
  nextTargets: NextSessionTarget[];
}

const DEFAULT_OPTIONS: Required<ProgressionOptions> = {
  defaultRepTarget: 8,
  minRepTarget: 4,
  maxRepTarget: 30,
};

function parseRepValue(raw: string): number | null {
  const match = raw.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function sortHistory(history: readonly WorkoutHistoryEntry[]): WorkoutHistoryEntry[] {
  return [...history].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.sessionKey.localeCompare(b.sessionKey);
  });
}

function toSnapshot(date: string, sessionKey: string, exercise: ExerciseState): ExerciseProgressSnapshot {
  const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const repsBySet = sets.map((set) => parseRepValue(set.reps ?? ''));
  const totalSets = sets.length;
  const completedSets = sets.filter((set) => set.done).length;

  let totalReps = 0;
  let bestSetReps = 0;
  let repSetsLogged = 0;

  sets.forEach((set, index) => {
    if (!set.done) return;
    const reps = repsBySet[index];
    if (reps === null) return;
    repSetsLogged += 1;
    totalReps += reps;
    if (reps > bestSetReps) bestSetReps = reps;
  });

  return {
    date,
    sessionKey,
    totalSets,
    completedSets,
    completionRate: totalSets > 0 ? completedSets / totalSets : 0,
    totalReps,
    averageReps: repSetsLogged > 0 ? totalReps / repSetsLogged : 0,
    bestSetReps,
    repsBySet,
    repLoggingRate: completedSets > 0 ? repSetsLogged / completedSets : 0,
  };
}

function buildExerciseHistoryMap(
  history: readonly WorkoutHistoryEntry[]
): Map<string, ExerciseProgressSnapshot[]> {
  const byExercise = new Map<string, ExerciseProgressSnapshot[]>();

  for (const entry of sortHistory(history)) {
    for (const [exerciseName, exerciseState] of Object.entries(entry.exercises ?? {})) {
      if (!exerciseState) continue;
      const snapshot = toSnapshot(entry.date, entry.sessionKey, exerciseState);
      const current = byExercise.get(exerciseName);
      if (current) {
        current.push(snapshot);
      } else {
        byExercise.set(exerciseName, [snapshot]);
      }
    }
  }

  return byExercise;
}

function getPrConfidence(snapshot: ExerciseProgressSnapshot): PersonalRecordConfidence {
  if (snapshot.completionRate >= 0.9 && snapshot.repLoggingRate >= 0.7) return 'high';
  if (snapshot.completionRate >= 0.6 && snapshot.repLoggingRate >= 0.4) return 'medium';
  return 'low';
}

function toSessionSignal(snapshot: ExerciseProgressSnapshot): number {
  if (snapshot.averageReps > 0) {
    return snapshot.averageReps + snapshot.completionRate;
  }
  return snapshot.completionRate;
}

function computeTrendFromSnapshots(
  exerciseName: string,
  snapshots: readonly ExerciseProgressSnapshot[]
): ProgressionTrendSignal {
  if (snapshots.length < 2) {
    const singleSignal = snapshots.length === 1 ? toSessionSignal(snapshots[0]) : 0;
    return {
      exerciseName,
      direction: 'insufficient_data',
      score: 0,
      sampleSize: snapshots.length,
      baselineAverage: singleSignal,
      recentAverage: singleSignal,
    };
  }

  const splitAt = Math.floor(snapshots.length / 2);
  const baselineValues = snapshots.slice(0, splitAt).map(toSessionSignal);
  const recentValues = snapshots.slice(splitAt).map(toSessionSignal);
  const baselineAverage = average(baselineValues);
  const recentAverage = average(recentValues);
  const rawScore = (recentAverage - baselineAverage) / Math.max(baselineAverage, 1);
  const score = clamp(rawScore, -1, 1);

  let direction: Exclude<TrendDirection, 'insufficient_data'> = 'flat';
  if (score >= 0.08) direction = 'up';
  if (score <= -0.08) direction = 'down';

  return {
    exerciseName,
    direction,
    score,
    sampleSize: snapshots.length,
    baselineAverage,
    recentAverage,
  };
}

function resolveOptions(options: ProgressionOptions = {}): Required<ProgressionOptions> {
  const minRepTarget = Math.min(
    options.minRepTarget ?? DEFAULT_OPTIONS.minRepTarget,
    options.maxRepTarget ?? DEFAULT_OPTIONS.maxRepTarget
  );
  const maxRepTarget = Math.max(
    options.minRepTarget ?? DEFAULT_OPTIONS.minRepTarget,
    options.maxRepTarget ?? DEFAULT_OPTIONS.maxRepTarget
  );

  return {
    minRepTarget,
    maxRepTarget,
    defaultRepTarget: clamp(
      options.defaultRepTarget ?? DEFAULT_OPTIONS.defaultRepTarget,
      minRepTarget,
      maxRepTarget
    ),
  };
}

export function getExerciseSnapshots(
  history: readonly WorkoutHistoryEntry[],
  exerciseName: string
): ExerciseProgressSnapshot[] {
  return sortHistory(history)
    .map((entry) => {
      const exercise = entry.exercises?.[exerciseName];
      if (!exercise) return null;
      return toSnapshot(entry.date, entry.sessionKey, exercise);
    })
    .filter((snapshot): snapshot is ExerciseProgressSnapshot => snapshot !== null);
}

export function detectLikelyPRs(history: readonly WorkoutHistoryEntry[]): DetectedPersonalRecord[] {
  const prs: DetectedPersonalRecord[] = [];
  const exerciseHistory = buildExerciseHistoryMap(history);

  for (const [exerciseName, snapshots] of exerciseHistory) {
    let bestSet: number | null = null;
    let bestTotalReps: number | null = null;
    let bestCompletedSets: number | null = null;

    for (const snapshot of snapshots) {
      const confidence = getPrConfidence(snapshot);

      if (bestSet !== null && snapshot.bestSetReps > bestSet && snapshot.bestSetReps > 0) {
        prs.push({
          exerciseName,
          date: snapshot.date,
          sessionKey: snapshot.sessionKey,
          metric: 'best_set_reps',
          value: snapshot.bestSetReps,
          previousBest: bestSet,
          improvement: snapshot.bestSetReps - bestSet,
          confidence,
        });
      }

      if (bestTotalReps !== null && snapshot.totalReps > bestTotalReps && snapshot.totalReps > 0) {
        prs.push({
          exerciseName,
          date: snapshot.date,
          sessionKey: snapshot.sessionKey,
          metric: 'total_reps',
          value: snapshot.totalReps,
          previousBest: bestTotalReps,
          improvement: snapshot.totalReps - bestTotalReps,
          confidence,
        });
      }

      if (
        bestCompletedSets !== null &&
        snapshot.completedSets > bestCompletedSets &&
        snapshot.completedSets > 0
      ) {
        prs.push({
          exerciseName,
          date: snapshot.date,
          sessionKey: snapshot.sessionKey,
          metric: 'completed_sets',
          value: snapshot.completedSets,
          previousBest: bestCompletedSets,
          improvement: snapshot.completedSets - bestCompletedSets,
          confidence,
        });
      }

      if (bestSet === null || snapshot.bestSetReps > bestSet) {
        bestSet = snapshot.bestSetReps;
      }
      if (bestTotalReps === null || snapshot.totalReps > bestTotalReps) {
        bestTotalReps = snapshot.totalReps;
      }
      if (bestCompletedSets === null || snapshot.completedSets > bestCompletedSets) {
        bestCompletedSets = snapshot.completedSets;
      }
    }
  }

  return prs;
}

export function computeTrendSignal(
  history: readonly WorkoutHistoryEntry[],
  exerciseName: string
): ProgressionTrendSignal {
  const snapshots = getExerciseSnapshots(history, exerciseName);
  return computeTrendFromSnapshots(exerciseName, snapshots);
}

export function computeTrendSignals(
  history: readonly WorkoutHistoryEntry[]
): ProgressionTrendSignal[] {
  const exerciseHistory = buildExerciseHistoryMap(history);
  return Array.from(exerciseHistory.entries())
    .map(([exerciseName, snapshots]) => computeTrendFromSnapshots(exerciseName, snapshots))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export function suggestNextSessionTargets(
  history: readonly WorkoutHistoryEntry[],
  options: ProgressionOptions = {}
): NextSessionTarget[] {
  const resolvedOptions = resolveOptions(options);
  const exerciseHistory = buildExerciseHistoryMap(history);
  const targets: NextSessionTarget[] = [];

  for (const [exerciseName, snapshots] of exerciseHistory) {
    const latest = snapshots[snapshots.length - 1];
    if (!latest || latest.totalSets === 0) continue;

    const trend = computeTrendFromSnapshots(exerciseName, snapshots);
    const fallbackRepTarget = clamp(
      latest.averageReps > 0 ? Math.round(latest.averageReps) : resolvedOptions.defaultRepTarget,
      resolvedOptions.minRepTarget,
      resolvedOptions.maxRepTarget
    );
    const baselineTargets = latest.repsBySet.map((reps) =>
      clamp(
        reps ?? fallbackRepTarget,
        resolvedOptions.minRepTarget,
        resolvedOptions.maxRepTarget
      )
    );

    if (baselineTargets.length === 0) continue;

    const shouldPush = latest.completionRate >= 0.85 && trend.direction === 'up';
    const shouldEase = latest.completionRate < 0.5 || trend.direction === 'down';
    let action: RecommendationAction = 'hold';
    let targetRepsBySet = baselineTargets;
    let reason = 'Hold current targets and prioritize consistent execution.';

    if (shouldPush) {
      action = 'push';
      const setsToNudge = Math.min(2, Math.max(1, Math.ceil(latest.totalSets / 2)));
      targetRepsBySet = baselineTargets.map((rep, index) =>
        index < setsToNudge
          ? clamp(rep + 1, resolvedOptions.minRepTarget, resolvedOptions.maxRepTarget)
          : rep
      );
      reason = `Positive trend with strong completion; add +1 rep on ${setsToNudge} set${setsToNudge === 1 ? '' : 's'} only.`;
    } else if (shouldEase) {
      action = 'ease';
      targetRepsBySet = baselineTargets.map((rep) =>
        clamp(rep - 1, resolvedOptions.minRepTarget, resolvedOptions.maxRepTarget)
      );
      reason = 'Downtrend or low completion detected; reduce by 1 rep per set and focus on form.';
    }

    targets.push({
      exerciseName,
      basedOnDate: latest.date,
      targetRepsBySet,
      action,
      trend: trend.direction,
      reason,
    });
  }

  return targets.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export function buildWorkoutProgressionReport(
  history: readonly WorkoutHistoryEntry[],
  options: ProgressionOptions = {}
): WorkoutProgressionReport {
  return {
    prs: detectLikelyPRs(history),
    trends: computeTrendSignals(history),
    nextTargets: suggestNextSessionTargets(history, options),
  };
}
