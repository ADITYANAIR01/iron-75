'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getAppState, getDailyLog, getToday, getUserFocus } from '../lib/storage';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, DailyLog, ChallengeId, UserFocus } from '../lib/types';
import { askGemini } from '../lib/gemini';
import { recordTelemetryEvent } from '../lib/telemetry';
import {
  computeAdaptiveCoachingContext,
  formatAdaptiveContextForPrompt,
  type AdaptiveCoachingContext,
} from '../lib/adaptiveCoaching';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'late night (past midnight)';
  if (h < 10) return 'morning';
  if (h < 13) return 'late morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
}

function getRecentLogs(maxLogs = 7, lookbackDays = 14): DailyLog[] {
  const recentLogs: DailyLog[] = [];
  const now = new Date();
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const entry = getDailyLog(toLocalDateString(d));
    if (entry) recentLogs.push(entry);
    if (recentLogs.length >= maxLogs) break;
  }
  return recentLogs;
}

const MOOD_LABEL: Record<string, string> = {
  great: 'great (5/5)', good: 'good (4/5)', meh: 'okay (3/5)',
  bad: 'bad (2/5)', terrible: 'terrible (1/5)',
};
const MOOD_EMOJI: Record<string, string> = {
  great: '😄', good: '🙂', meh: '😐', bad: '😞', terrible: '😩',
};

// ── Prompt builders ──────────────────────────────────────────────────────────

function focusInstruction(focus: UserFocus): string {
  if (focus === 'gym_first') {
    return 'User focus is gym-first: prioritize workout quality, recovery, and nutrition suggestions before other tasks.';
  }
  if (focus === 'habit_first') {
    return 'User focus is habit-first: prioritize consistency rituals, mood regulation, reading, and low-friction completion.';
  }
  return 'User focus is balanced: keep guidance split across both gym and non-gym habits.';
}

function buildCoachPrompt(
  state: AppState,
  log: DailyLog | null,
  focus: UserFocus,
  adaptiveContext: AdaptiveCoachingContext
): string {
  const dietItems = log
    ? [log.dietSlots.breakfast, log.dietSlots.lunch, log.dietSlots.dinner, log.dietSlots.snacks].filter(Boolean)
    : [];
  const dietStr = dietItems.length > 0 ? dietItems.join(', ') : 'nothing logged yet';
  const bookStr = log?.readingBook?.trim() ? `"${log.readingBook}"` : 'not specified';

  const workoutPending = !log?.gymWorkoutDone;
  const optionalPending: string[] = [];
  if (!log?.outdoorWalkDone) optionalPending.push('outdoor walk');
  if (!log?.readingDone) optionalPending.push('reading (10 pages)');
  if (dietItems.length === 0) optionalPending.push('diet logging');
  if (!log?.moodEmoji) optionalPending.push('mood check-in');

  const phaseName =
    state.currentDay <= 7 ? 'Foundation week' :
    state.currentDay <= 21 ? 'Momentum building' :
    state.currentDay <= 45 ? 'Consistency phase' :
    'Long-run discipline';

  return `GrindOs tracker — Day ${state.currentDay} (${phaseName}).

Athlete profile: ${state.streak}-day current streak, longest ever ${state.longestStreak} days, ${state.totalRestarts} restarts.
Time of day: ${getTimeOfDay()}.
${focusInstruction(focus)}
${formatAdaptiveContextForPrompt(adaptiveContext)}

Today's progress:
- Streak-driving workout: ${log?.gymWorkoutDone ? 'COMPLETE' : 'NOT DONE'}
- Outdoor walk: ${log?.outdoorWalkDone ? 'COMPLETE' : 'NOT DONE'}
- Reading: ${log?.readingDone ? `COMPLETE — book: ${bookStr}` : 'NOT DONE'}
- Diet logged: ${dietStr}
- Mood: ${log?.moodEmoji ? MOOD_LABEL[log.moodEmoji] : 'not logged yet'}
- Energy: ${log?.energyLevel ?? '?'}/5 | Motivation: ${log?.motivationLevel ?? '?'}/5 | Soreness: ${log?.sorenessLevel ?? '?'}/5
${workoutPending ? '\nWorkout is still pending — streak will not advance until workout is completed.' : '\nWorkout completed — streak requirement is satisfied for today.'}
${optionalPending.length > 0 ? `\nOptional check-ins pending: ${optionalPending.join(', ')}` : '\nOptional check-ins are all logged.'}

Write a 3-4 sentence coaching insight using the stats above. Prioritize any remaining tasks and follow the adaptive coaching context. End with 🔥.`;
}

function buildPatternPrompt(
  state: AppState,
  recentLogs: DailyLog[],
  focus: UserFocus,
  adaptiveContext: AdaptiveCoachingContext
): string {
  const n = recentLogs.length;
  if (n === 0) return 'Not enough data yet. Keep logging daily and come back in a few days for pattern analysis.';

  const moodMap: Record<string, number> = { great: 5, good: 4, meh: 3, bad: 2, terrible: 1 };
  const pct = (count: number) => Math.round((count / n) * 100);

  const gymDays       = recentLogs.filter((l) => l.gymWorkoutDone).length;
  const walkDays      = recentLogs.filter((l) => l.outdoorWalkDone).length;
  const readingDays   = recentLogs.filter((l) => l.readingDone).length;
  const dietDays      = recentLogs.filter((l) => {
    const d = l.dietSlots;
    return d.breakfast || d.lunch || d.dinner || d.snacks;
  }).length;
  const workoutDays   = recentLogs.filter((l) => l.gymWorkoutDone).length;

  const avgMood       = (recentLogs.reduce((s, l) => s + (moodMap[l.moodEmoji] ?? 3), 0) / n).toFixed(1);
  const avgEnergy     = (recentLogs.reduce((s, l) => s + l.energyLevel, 0) / n).toFixed(1);
  const avgSoreness   = (recentLogs.reduce((s, l) => s + l.sorenessLevel, 0) / n).toFixed(1);
  const avgMotivation = (recentLogs.reduce((s, l) => s + l.motivationLevel, 0) / n).toFixed(1);

  // Find weakest and strongest areas
  const rates = [
    { task: 'Workout', rate: pct(gymDays) },
    { task: 'Walk', rate: pct(walkDays) },
    { task: 'Reading', rate: pct(readingDays) },
    { task: 'Diet logging', rate: pct(dietDays) },
  ];
  const weakest = rates.reduce((a, b) => a.rate < b.rate ? a : b);
  const strongest = rates.reduce((a, b) => a.rate > b.rate ? a : b);

  return `GrindOs performance analysis — last ${n} days.

Overall: ${state.streak} current streak, Day ${state.currentDay}.
${focusInstruction(focus)}
${formatAdaptiveContextForPrompt(adaptiveContext)}

Task Completion Rates:
- Workout (streak-driving): ${gymDays}/${n} days (${pct(gymDays)}%)
- Outdoor walk: ${walkDays}/${n} days (${pct(walkDays)}%)
- Reading: ${readingDays}/${n} days (${pct(readingDays)}%)
- Diet logging: ${dietDays}/${n} days (${pct(dietDays)}%)
- Workout-complete days: ${workoutDays}/${n} (${pct(workoutDays)}%)

Averages:
- Mood: ${avgMood}/5 | Energy: ${avgEnergy}/5 | Motivation: ${avgMotivation}/5 | Soreness: ${avgSoreness}/5

Key finding: Weakest area is ${weakest.task} at ${weakest.rate}%. Strongest is ${strongest.task} at ${strongest.rate}%.

Give a 3-4 sentence analysis. Weakest: ${weakest.task} (${weakest.rate}%). Identify why it matters and one concrete action this week, aligned to the adaptive coaching context.`;
}

function buildMotivationPrompt(state: AppState): string {
  const phase =
    state.currentDay >= 60 ? 'long-run discipline phase' :
    state.currentDay >= 30 ? 'solid momentum phase' :
    state.currentDay >= 14 ? 'habit-locking phase' :
    'early consistency phase';

  const streakContext =
    state.streak >= 30 ? `${state.streak}-day streak — they are in the top 5% of attempts.` :
    state.streak >= 14 ? `${state.streak}-day streak — momentum is undeniable.` :
    state.streak >= 7  ? `${state.streak}-day streak — the habit is forming but still fragile.` :
    `${state.streak}-day streak — every single day counts right now.`;

  return `GrindOs motivation coach.
Day ${state.currentDay} — ${phase}.
${streakContext}
${state.totalRestarts > 0 ? `They've restarted ${state.totalRestarts} time(s). They know what failure tastes like and chose to come back. That takes more guts than starting fresh.` : "Zero restarts. The streak is clean. They haven't broken once."}

3-sentence locker-room speech. Raw, direct, urgent. Reference their day, streak, and phase. End with 🔥.`;
}

function buildRecoveryPrompt(state: AppState, log: DailyLog | null): string {
  const soreness = log?.sorenessLevel ?? 3;
  const energy = log?.energyLevel ?? 3;
  const sorenessContext =
    soreness >= 5 ? 'EXTREME soreness (5/5) — potential overtraining risk' :
    soreness >= 4 ? 'HIGH soreness (4/5) — significant muscle fatigue' :
    soreness >= 3 ? 'MODERATE soreness (3/5) — normal training load' :
    'LOW soreness — body is adapting well';

  return `GrindOs athlete doing one custom gym session plus a daily walk.
Current status: Day ${state.currentDay}, ${sorenessContext}, energy ${energy}/5.
Training frequency: 5-7 days/week depending on recovery.

Give 4 numbered recovery protocols. Each: 1-2 sentences, specific quantities/timing. Tailored to the soreness level above.`;
}

function buildNutritionPrompt(state: AppState, log: DailyLog | null): string {
  const d = log?.dietSlots;
  const meals = [
    d?.breakfast ? `Breakfast: ${d.breakfast}` : 'Breakfast: not logged',
    d?.lunch     ? `Lunch: ${d.lunch}`         : 'Lunch: not logged',
    d?.dinner    ? `Dinner: ${d.dinner}`        : 'Dinner: not logged',
    d?.snacks    ? `Snacks: ${d.snacks}`        : 'Snacks: not logged',
  ].join(' | ');

  return `GrindOs nutrition coach — Day ${state.currentDay}.

Today's actual meals: ${meals}
Workout status: gym ${log?.gymWorkoutDone ? 'done' : 'pending'}, walk ${log?.outdoorWalkDone ? 'done' : 'pending'}
Energy: ${log?.energyLevel ?? '?'}/5 | Soreness: ${log?.sorenessLevel ?? '?'}/5

Give 3 targeted adjustments based on the meals above. Specific foods, quantities, and timing.`;
}

// ── Challenge definitions ────────────────────────────────────────────────────

interface Challenge {
  id: ChallengeId;
  icon: string;
  label: string;
  color: string;
}

const CHALLENGES: Challenge[] = [
  { id: 'tip',        icon: '🔥', label: "Today's Insight",   color: '#FF6B35' },
  { id: 'pattern',   icon: '📊', label: 'Pattern Analysis',  color: '#00F5D4' },
  { id: 'motivation', icon: '⚡', label: 'Hype Me Up',        color: '#FFE66D' },
  { id: 'recovery',  icon: '🛌', label: 'Recovery Protocol', color: '#A855F7' },
  { id: 'nutrition', icon: '🥗', label: 'Nutrition Coach',   color: '#BAFF39' },
];

// ── Response renderer — handles \n\n paragraphs and \n line breaks ────────────
function ResponseText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-200">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ── Per-day localStorage cache for coach responses ────────────────────────────
const COACH_CACHE_PREFIX = 'grindos_coach_';

function loadCoachCache(today: string): Partial<Record<ChallengeId, string>> {
  if (typeof window === 'undefined') return {};
  const result: Partial<Record<ChallengeId, string>> = {};
  const ids: ChallengeId[] = ['tip', 'pattern', 'motivation', 'recovery', 'nutrition'];
  ids.forEach((id) => {
    const raw = localStorage.getItem(`${COACH_CACHE_PREFIX}${id}_${today}`);
    if (raw) result[id] = raw;
  });
  return result;
}

function saveCoachCache(id: ChallengeId, text: string, today: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${COACH_CACHE_PREFIX}${id}_${today}`, text);
}

function clearCoachCache(id: ChallengeId, today: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${COACH_CACHE_PREFIX}${id}_${today}`);
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AICoachScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeId | null>(null);
  const [responses, setResponses] = useState<Partial<Record<ChallengeId, string>>>({});
  const [loading, setLoading] = useState<ChallengeId | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ref that always reflects current `responses` — used for synchronous cache reads
  // inside useCallback without needing it in the dependency array.
  const responsesRef = useRef<Partial<Record<ChallengeId, string>>>({});
  responsesRef.current = responses;

  // Ref for the same reason with state
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;

  const logRef = useRef<DailyLog | null>(null);
  logRef.current = log;

  useEffect(() => {
    setMounted(true);
    setState(getAppState());
    setLog(getDailyLog(getToday()));
    // Hydrate in-memory responses from localStorage cache (survives tab switches)
    const cached = loadCoachCache(getToday());
    if (Object.keys(cached).length > 0) setResponses(cached);
  }, []);

  const handleAsk = useCallback(async (challengeId: ChallengeId, options?: { forceRefresh?: boolean }) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    setActiveChallenge(challengeId);
    const forceRefresh = options?.forceRefresh === true;

    // Synchronous cache check via ref — no setState side-effect hack needed
    if (!forceRefresh && responsesRef.current[challengeId]) {
      recordTelemetryEvent('ai_coach_request_completed', {
        challengeId,
        durationMs: 0,
        fromCache: true,
      });
      return;
    }

    setLoading(challengeId);
    const startedAt = Date.now();
    recordTelemetryEvent('ai_coach_request_started', {
      challengeId,
      source: 'ai_coach',
    });

    try {
      const currentLog = logRef.current;

      let prompt = '';
      const focus = getUserFocus();
      const recentLogs = getRecentLogs();
      const adaptiveContext = computeAdaptiveCoachingContext({
        recentLogs,
        todayLog: currentLog,
        focus,
        streak: currentState.streak,
        currentDay: currentState.currentDay,
      });
      if (challengeId === 'pattern') {
        prompt = buildPatternPrompt(currentState, recentLogs, focus, adaptiveContext);
      } else if (challengeId === 'tip') {
        prompt = buildCoachPrompt(currentState, currentLog, focus, adaptiveContext);
      } else if (challengeId === 'motivation') {
        prompt = buildMotivationPrompt(currentState);
      } else if (challengeId === 'recovery') {
        prompt = buildRecoveryPrompt(currentState, currentLog);
      } else if (challengeId === 'nutrition') {
        prompt = buildNutritionPrompt(currentState, currentLog);
      }

      const text = await askGemini(prompt, challengeId);
      setResponses((prev) => ({ ...prev, [challengeId]: text }));
      saveCoachCache(challengeId, text, getToday());
      recordTelemetryEvent('ai_coach_request_completed', {
        challengeId,
        durationMs: Date.now() - startedAt,
        fromCache: false,
      });
    } catch {
      recordTelemetryEvent('ai_coach_request_failed', {
        challengeId,
        durationMs: Date.now() - startedAt,
        reason: 'request_error',
      });
    } finally {
      setLoading(null);
    }
  }, []); // no deps needed — all reads go through refs

  // Auto-load today's tip on mount
  useEffect(() => {
    if (!mounted || !state) return;
    setActiveChallenge((prev) => prev ?? 'tip');
    if (!responsesRef.current['tip']) handleAsk('tip');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state]);

  if (!mounted) return null;

  const activeCh = CHALLENGES.find((c) => c.id === activeChallenge);
  const isLoading = loading === activeChallenge;
  const responseText = activeChallenge ? responses[activeChallenge] : undefined;

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #00F5D4, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI Coach
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Powered by Gemini — personalised to your live data</p>
      </motion.div>

      {/* Challenge selector pills */}
      <motion.div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {CHALLENGES.map((ch) => {
          const isActive = activeChallenge === ch.id;
          return (
            <motion.button
              key={ch.id}
              onClick={() => handleAsk(ch.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap"
              style={{
                background: isActive ? `${ch.color}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? `${ch.color}55` : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? ch.color : '#64748b',
                boxShadow: isActive ? `0 0 14px ${ch.color}18` : 'none',
              }}
              whileTap={{ scale: 0.9 }}
            >
              {ch.icon} {ch.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Response area */}
      <AnimatePresence mode="wait">
        {activeChallenge && activeCh && (
          <motion.div
            key={activeChallenge}
            className="rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, ${activeCh.color}08, rgba(6,6,15,0.95))`,
              border: `1px solid ${activeCh.color}28`,
              boxShadow: `0 0 24px ${activeCh.color}08`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{activeCh.icon}</span>
              <span className="font-bold text-sm uppercase tracking-wide" style={{ color: activeCh.color }}>
                {activeCh.label}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-3 py-4">
                <motion.span className="text-2xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚙️</motion.span>
                <div className="flex flex-col gap-1.5 flex-1">
                  {[80, 60, 72, 50].map((w, i) => (
                    <div key={i} className="h-2 rounded-full animate-pulse" style={{ background: '#1a1a3a', width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ) : responseText ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <ResponseText text={responseText} />
              </motion.div>
            ) : null}

            {!isLoading && responseText && (
              <motion.button
                onClick={() => {
                  if (!activeChallenge) return;
                  clearCoachCache(activeChallenge, getToday());
                  setResponses((prev) => {
                    const next = { ...prev };
                    delete next[activeChallenge];
                    return next;
                  });
                  handleAsk(activeChallenge, { forceRefresh: true });
                }}
                className="mt-4 text-xs font-semibold"
                style={{ color: activeCh.color, opacity: 0.65 }}
                whileTap={{ scale: 0.9 }}
              >
                🔄 Regenerate
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats mini-cards */}
      {state && (
        <motion.div
          className="grid grid-cols-2 gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { label: 'Day', value: `${state.currentDay}`, color: '#FF6B35' },
            { label: 'Streak',        value: `${state.streak} 🔥`,     color: '#FF6B35' },
            { label: 'Longest Streak', value: `${state.longestStreak} days`, color: '#00F5D4' },
            { label: "Today's Mood",  value: log?.moodEmoji ? MOOD_EMOJI[log.moodEmoji] : '—', color: '#FFE66D' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
