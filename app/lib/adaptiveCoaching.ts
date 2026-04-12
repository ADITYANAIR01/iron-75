import type { DailyLog, MoodEmoji, UserFocus } from './types';

export type CoachingRiskLevel = 'low' | 'medium' | 'high';
export type CoachingRiskKind = 'miss' | 'burnout' | 'balanced';
export type CoachingPriority = 'recovery' | 'consistency' | 'intensity' | 'nutrition' | 'motivation';

export interface AdaptiveCoachingInput {
  recentLogs: readonly DailyLog[];
  todayLog: DailyLog | null;
  focus: UserFocus;
  streak: number;
  currentDay: number;
}

export interface AdaptiveCoachingContext {
  riskLevel: CoachingRiskLevel;
  riskKind: CoachingRiskKind;
  primaryPriority: CoachingPriority;
  triggerSummary: string;
  sampleSize: number;
}

const moodScoreMap: Record<MoodEmoji | '', number> = {
  great: 5,
  good: 4,
  meh: 3,
  bad: 2,
  terrible: 1,
  '': 3,
};

const priorityDirective: Record<CoachingPriority, string> = {
  recovery: 'Bias toward recovery tactics, reduced load, and sleep/nutrition compliance before extra intensity.',
  consistency: 'Bias toward streak protection with low-friction actions and immediate next steps.',
  intensity: 'Bias toward smart progression, high-quality execution, and one controlled performance push.',
  nutrition: 'Bias toward meal quality, protein timing, and simple nutrition fixes that improve training output.',
  motivation: 'Bias toward mindset and activation cues that reduce avoidance and increase follow-through.',
};

function clampScale(value: number | undefined): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, value as number));
}

function average(values: number[], fallback: number = 3): number {
  if (values.length === 0) return fallback;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function completionRate(logs: readonly DailyLog[], done: (log: DailyLog) => boolean): number {
  if (logs.length === 0) return 0;
  return logs.filter(done).length / logs.length;
}

function hasAnyDietLog(log: DailyLog | null | undefined): boolean {
  if (!log) return false;
  const { breakfast, lunch, dinner, snacks } = log.dietSlots;
  return [breakfast, lunch, dinner, snacks].some((item) => item.trim() !== '');
}

function riskFromScore(maxScore: number, missScore: number, burnoutScore: number): CoachingRiskLevel {
  if (maxScore >= 4 || (missScore >= 3 && burnoutScore >= 3)) return 'high';
  if (maxScore >= 2) return 'medium';
  return 'low';
}

function classifyRiskKind(missScore: number, burnoutScore: number): CoachingRiskKind {
  if (missScore === 0 && burnoutScore === 0) return 'balanced';
  if (Math.abs(missScore - burnoutScore) <= 1 && missScore >= 2 && burnoutScore >= 2) {
    return 'balanced';
  }
  return missScore >= burnoutScore ? 'miss' : 'burnout';
}

function pickPrimaryPriority(
  scores: Record<CoachingPriority, number>,
  riskKind: CoachingRiskKind
): CoachingPriority {
  const order: CoachingPriority[] =
    riskKind === 'burnout'
      ? ['recovery', 'consistency', 'nutrition', 'motivation', 'intensity']
      : riskKind === 'miss'
        ? ['consistency', 'nutrition', 'motivation', 'recovery', 'intensity']
        : ['consistency', 'recovery', 'nutrition', 'motivation', 'intensity'];

  return order.reduce((best, candidate) =>
    scores[candidate] > scores[best] ? candidate : best
  );
}

function toPercent(value: number): number {
  return Math.round(value * 100);
}

function toFixedScore(value: number): string {
  return value.toFixed(1);
}

function summarizeTriggers(input: {
  workoutPendingToday: boolean;
  workoutRate: number;
  dietRate: number;
  avgEnergy: number;
  avgMotivation: number;
  avgSoreness: number;
  riskLevel: CoachingRiskLevel;
  sampleSize: number;
}): string {
  const triggers: string[] = [];

  if (input.workoutPendingToday) triggers.push('workout still pending today');
  if (input.sampleSize >= 3 && input.workoutRate < 0.75) {
    triggers.push(`workout consistency ${toPercent(input.workoutRate)}%`);
  }
  if (input.avgMotivation <= 2.6) triggers.push(`motivation ${toFixedScore(input.avgMotivation)}/5`);
  if (input.avgEnergy <= 2.6) triggers.push(`energy ${toFixedScore(input.avgEnergy)}/5`);
  if (input.avgSoreness >= 3.8) triggers.push(`soreness ${toFixedScore(input.avgSoreness)}/5`);
  if (input.sampleSize >= 3 && input.dietRate < 0.6) triggers.push(`diet logging ${toPercent(input.dietRate)}%`);

  if (triggers.length === 0) {
    if (input.riskLevel === 'low') {
      return 'Stable momentum and recovery signals; ready for a controlled progression push';
    }
    return 'Mixed readiness signals; keep coaching focused on one clear priority';
  }

  return triggers.slice(0, 3).join('; ');
}

export function computeAdaptiveCoachingContext(input: AdaptiveCoachingInput): AdaptiveCoachingContext {
  const logs = [...(input.recentLogs ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const sampleSize = logs.length;

  const workoutRate = completionRate(logs, (log) => log.gymWorkoutDone);
  const walkRate = completionRate(logs, (log) => log.outdoorWalkDone);
  const readingRate = completionRate(logs, (log) => log.readingDone);
  const dietRate = completionRate(logs, (log) => hasAnyDietLog(log));

  const avgEnergy = average(logs.map((log) => clampScale(log.energyLevel)));
  const avgMotivation = average(logs.map((log) => clampScale(log.motivationLevel)));
  const avgSoreness = average(logs.map((log) => clampScale(log.sorenessLevel)));
  const avgMood = average(logs.map((log) => moodScoreMap[log.moodEmoji] ?? 3));

  const workoutPendingToday = !input.todayLog?.gymWorkoutDone;
  const todayDietLogged = hasAnyDietLog(input.todayLog);
  const latestSorenessWindow = logs.slice(-3).map((log) => clampScale(log.sorenessLevel));
  const sustainedHighSoreness =
    latestSorenessWindow.length >= 2 && latestSorenessWindow.every((value) => value >= 4);

  let missRiskScore = 0;
  if (workoutPendingToday) missRiskScore += 2;
  if (sampleSize >= 3 && workoutRate < 0.5) missRiskScore += 2;
  else if (sampleSize >= 3 && workoutRate < 0.75) missRiskScore += 1;
  if (avgMotivation <= 2.3) missRiskScore += 1;
  if (avgEnergy <= 2.2) missRiskScore += 1;
  if (input.streak <= 2 && input.currentDay <= 10) missRiskScore += 1;

  let burnoutRiskScore = 0;
  if (avgSoreness >= 4.2) burnoutRiskScore += 2;
  else if (avgSoreness >= 3.8) burnoutRiskScore += 1;
  if (avgEnergy <= 2.3) burnoutRiskScore += 1;
  if (sampleSize >= 3 && workoutRate >= 0.85 && avgSoreness >= 3.8) burnoutRiskScore += 1;
  if (sustainedHighSoreness) burnoutRiskScore += 1;

  const maxRiskScore = Math.max(missRiskScore, burnoutRiskScore);
  const riskLevel = riskFromScore(maxRiskScore, missRiskScore, burnoutRiskScore);
  const riskKind = classifyRiskKind(missRiskScore, burnoutRiskScore);

  const scores: Record<CoachingPriority, number> = {
    recovery: 0,
    consistency: 0,
    intensity: 0,
    nutrition: 0,
    motivation: 0,
  };

  if (burnoutRiskScore >= 3) scores.recovery += 3;
  if (avgSoreness >= 4) scores.recovery += 2;
  if (avgEnergy <= 2.5) scores.recovery += 1;

  if (workoutPendingToday) scores.consistency += 3;
  if (sampleSize >= 3 && workoutRate < 0.75) scores.consistency += 2;
  if (sampleSize >= 3 && walkRate < 0.6) scores.consistency += 1;
  if (sampleSize >= 3 && readingRate < 0.5) scores.consistency += 1;
  if (input.streak <= 3 && input.currentDay <= 14) scores.consistency += 1;

  if (sampleSize >= 3 && dietRate < 0.6) scores.nutrition += 2;
  if (!todayDietLogged) scores.nutrition += 1;
  if (avgEnergy <= 2.6 && (sampleSize === 0 || dietRate < 0.75)) scores.nutrition += 1;

  if (avgMotivation <= 2.5) scores.motivation += 2;
  if (avgMood <= 2.5) scores.motivation += 1;
  if (avgEnergy <= 2.4) scores.motivation += 1;

  const progressionReady =
    riskLevel === 'low' &&
    sampleSize >= 3 &&
    workoutRate >= 0.8 &&
    avgEnergy >= 3.5 &&
    avgMotivation >= 3.5 &&
    avgSoreness <= 3.2;
  if (progressionReady) scores.intensity += 3;
  if (
    riskLevel !== 'high' &&
    sampleSize >= 3 &&
    workoutRate >= 0.75 &&
    avgMotivation >= 3.2 &&
    avgSoreness <= 3.6
  ) {
    scores.intensity += 1;
  }

  if (riskKind === 'burnout') scores.recovery += 2;
  if (riskKind === 'miss') scores.consistency += 2;
  if (riskKind === 'balanced' && riskLevel !== 'low') {
    scores.consistency += 1;
    scores.recovery += 1;
  }

  if (input.focus === 'gym_first') {
    scores.recovery += 1;
    scores.intensity += 1;
  } else if (input.focus === 'habit_first') {
    scores.consistency += 1;
    scores.motivation += 1;
  }

  const primaryPriority = pickPrimaryPriority(scores, riskKind);
  const triggerSummary = summarizeTriggers({
    workoutPendingToday,
    workoutRate,
    dietRate,
    avgEnergy,
    avgMotivation,
    avgSoreness,
    riskLevel,
    sampleSize,
  });

  return {
    riskLevel,
    riskKind,
    primaryPriority,
    triggerSummary,
    sampleSize,
  };
}

export function formatAdaptiveContextForPrompt(context: AdaptiveCoachingContext): string {
  return `Adaptive coaching context:
- Risk level: ${context.riskLevel.toUpperCase()} (${context.riskKind})
- Primary priority: ${context.primaryPriority}
- Trigger summary: ${context.triggerSummary}
- Coaching directive: ${priorityDirective[context.primaryPriority]}`;
}
