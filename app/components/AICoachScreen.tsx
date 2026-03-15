'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getAppState, getDailyLog, getToday } from '../lib/storage';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, DailyLog, ChallengeId } from '../lib/types';
import { askGemini } from '../lib/gemini';

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

const MOOD_LABEL: Record<string, string> = {
  great: 'great (5/5)', good: 'good (4/5)', meh: 'okay (3/5)',
  bad: 'bad (2/5)', terrible: 'terrible (1/5)',
};
const MOOD_EMOJI: Record<string, string> = {
  great: '😄', good: '🙂', meh: '😐', bad: '😞', terrible: '😩',
};

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildCoachPrompt(state: AppState, log: DailyLog | null): string {
  const mode = state.mode === '75hard' ? '75 HARD (no freezes, strict)' : 'Workout Mode (with freeze charges)';
  const dietItems = log
    ? [log.dietSlots.breakfast, log.dietSlots.lunch, log.dietSlots.dinner, log.dietSlots.snacks].filter(Boolean)
    : [];
  const dietStr = dietItems.length > 0 ? dietItems.join(', ') : 'nothing logged yet';
  const bookStr = log?.readingBook?.trim() ? `"${log.readingBook}"` : 'not specified';

  const tasksRemaining: string[] = [];
  if (!log?.gymWorkoutDone) tasksRemaining.push('gym workout');
  if (!log?.outdoorWalkDone) tasksRemaining.push('outdoor walk');
  if ((log?.waterLiters ?? 0) < 3.8) tasksRemaining.push(`${(3.8 - (log?.waterLiters ?? 0)).toFixed(1)}L more water`);
  if (!log?.readingDone) tasksRemaining.push('reading (10 pages)');
  if (dietItems.length === 0) tasksRemaining.push('diet logging');
  if (!log?.moodEmoji) tasksRemaining.push('mood check-in');

  const phaseName =
    state.currentDay <= 7 ? 'Week 1 — Foundation' :
    state.currentDay <= 21 ? 'Weeks 2-3 — Building Momentum' :
    state.currentDay <= 35 ? 'Danger Zone — Most People Quit Here' :
    state.currentDay <= 55 ? 'Forging Phase — Real Transformation' :
    'Final Stretch — Finish Line Visible';

  return `Iron75 ${mode} — Day ${state.currentDay}/75 (${phaseName}).

Athlete profile: ${state.streak}-day current streak, longest ever ${state.longestStreak} days, ${state.totalRestarts} restarts.${state.mode === 'workout' ? ` Freeze charges remaining: ${state.freezeCount}/5.` : ''}
Time of day: ${getTimeOfDay()}.

Today's progress:
- Gym workout: ${log?.gymWorkoutDone ? 'COMPLETE' : 'NOT DONE'}
- Outdoor walk: ${log?.outdoorWalkDone ? 'COMPLETE' : 'NOT DONE'}
- Water: ${(log?.waterLiters ?? 0).toFixed(1)}L of 3.8L goal ${log?.waterGoalMet ? '(GOAL MET)' : '(BELOW GOAL)'}
- Reading: ${log?.readingDone ? `COMPLETE — book: ${bookStr}` : 'NOT DONE'}
- Diet logged: ${dietStr}
- Mood: ${log?.moodEmoji ? MOOD_LABEL[log.moodEmoji] : 'not logged yet'}
- Energy: ${log?.energyLevel ?? '?'}/5 | Motivation: ${log?.motivationLevel ?? '?'}/5 | Soreness: ${log?.sorenessLevel ?? '?'}/5
${tasksRemaining.length > 0 ? `\nTasks still remaining today: ${tasksRemaining.join(', ')}` : '\nAll tasks complete today!'}

Write a 3-4 sentence coaching insight using the stats above. Prioritize any remaining tasks. End with 🔥.`;
}

function buildPatternPrompt(state: AppState, recentLogs: DailyLog[]): string {
  const n = recentLogs.length;
  if (n === 0) return 'Not enough data yet. Keep logging daily and come back in a few days for pattern analysis.';

  const moodMap: Record<string, number> = { great: 5, good: 4, meh: 3, bad: 2, terrible: 1 };
  const pct = (count: number) => Math.round((count / n) * 100);

  const gymDays       = recentLogs.filter((l) => l.gymWorkoutDone).length;
  const walkDays      = recentLogs.filter((l) => l.outdoorWalkDone).length;
  const readingDays   = recentLogs.filter((l) => l.readingDone).length;
  const waterGoalDays = recentLogs.filter((l) => l.waterGoalMet).length;
  const dietDays      = recentLogs.filter((l) => {
    const d = l.dietSlots;
    return d.breakfast || d.lunch || d.dinner || d.snacks;
  }).length;
  const completeDays  = recentLogs.filter((l) => l.allTasksComplete).length;

  const avgWater      = (recentLogs.reduce((s, l) => s + l.waterLiters, 0) / n).toFixed(1);
  const avgMood       = (recentLogs.reduce((s, l) => s + (moodMap[l.moodEmoji] ?? 3), 0) / n).toFixed(1);
  const avgEnergy     = (recentLogs.reduce((s, l) => s + l.energyLevel, 0) / n).toFixed(1);
  const avgSoreness   = (recentLogs.reduce((s, l) => s + l.sorenessLevel, 0) / n).toFixed(1);
  const avgMotivation = (recentLogs.reduce((s, l) => s + l.motivationLevel, 0) / n).toFixed(1);

  // Find weakest and strongest areas
  const rates = [
    { task: 'Gym', rate: pct(gymDays) },
    { task: 'Walk', rate: pct(walkDays) },
    { task: 'Reading', rate: pct(readingDays) },
    { task: 'Water', rate: pct(waterGoalDays) },
    { task: 'Diet logging', rate: pct(dietDays) },
  ];
  const weakest = rates.reduce((a, b) => a.rate < b.rate ? a : b);
  const strongest = rates.reduce((a, b) => a.rate > b.rate ? a : b);

  return `Iron75 ${state.mode === '75hard' ? '75 HARD' : 'Workout'} Mode — Performance Analysis: Last ${n} Days.

Overall: ${state.streak} current streak, Day ${state.currentDay}/75.

Task Completion Rates:
- Gym: ${gymDays}/${n} days (${pct(gymDays)}%)
- Outdoor walk: ${walkDays}/${n} days (${pct(walkDays)}%)
- Reading: ${readingDays}/${n} days (${pct(readingDays)}%)
- Water 3.8L goal: ${waterGoalDays}/${n} days (${pct(waterGoalDays)}%)
- Diet logging: ${dietDays}/${n} days (${pct(dietDays)}%)
- All-tasks-complete days: ${completeDays}/${n} (${pct(completeDays)}%)

Averages:
- Water: ${avgWater}L/day
- Mood: ${avgMood}/5 | Energy: ${avgEnergy}/5 | Motivation: ${avgMotivation}/5 | Soreness: ${avgSoreness}/5

Key finding: Weakest area is ${weakest.task} at ${weakest.rate}%. Strongest is ${strongest.task} at ${strongest.rate}%.

Give a 3-4 sentence analysis. Weakest: ${weakest.task} (${weakest.rate}%). Identify why it matters and one concrete action this week.`;
}

function buildMotivationPrompt(state: AppState): string {
  const phase =
    state.currentDay >= 60 ? 'final stretch — under 15 days left' :
    state.currentDay >= 45 ? 'elite territory — past the 60% mark' :
    state.currentDay >= 30 ? 'one full month in — momentum phase' :
    state.currentDay >= 14 ? 'second/third week — the point where most people quit' :
    'the brutal first two weeks — forging identity';

  const streakContext =
    state.streak >= 30 ? `${state.streak}-day streak — they are in the top 5% of attempts.` :
    state.streak >= 14 ? `${state.streak}-day streak — momentum is undeniable.` :
    state.streak >= 7  ? `${state.streak}-day streak — the habit is forming but still fragile.` :
    `${state.streak}-day streak — every single day counts right now.`;

  const daysLeft = 75 - state.currentDay;
  const percentComplete = Math.round((state.currentDay / 75) * 100);

  return `Iron75 ${state.mode === '75hard' ? '75 HARD' : 'Workout'} Mode.
Day ${state.currentDay}/75 — ${percentComplete}% complete — ${daysLeft} days remaining — ${phase}.
${streakContext}
${state.totalRestarts > 0 ? `They've restarted ${state.totalRestarts} time(s). They know what failure tastes like and chose to come back. That takes more guts than starting fresh.` : "Zero restarts. The streak is clean. They haven't broken once."}
${state.mode === 'workout' ? `Freeze charges: ${state.freezeCount}/5 remaining.` : ''}

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

  const protocol = state.mode === '75hard'
    ? 'two separate 45-min workouts per day (strict 75 Hard rules)'
    : 'one intense PPL gym session plus a daily 45-min outdoor walk';

  return `Iron75 athlete doing ${protocol}.
Current status: Day ${state.currentDay}/75, ${sorenessContext}, energy ${energy}/5.
Training frequency: 7 days/week, no rest days allowed by the challenge rules.

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

  return `Iron75 ${state.mode === '75hard' ? '75 HARD' : 'Workout'} Mode — Day ${state.currentDay}/75.

Today's actual meals: ${meals}
Water consumed: ${(log?.waterLiters ?? 0).toFixed(1)}L (goal: 3.8L)
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
const COACH_CACHE_PREFIX = 'iron75_coach_';

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

  const handleAsk = useCallback(async (challengeId: ChallengeId) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    setActiveChallenge(challengeId);

    // Synchronous cache check via ref — no setState side-effect hack needed
    if (responsesRef.current[challengeId]) return;

    setLoading(challengeId);
    const currentLog = logRef.current;

    let prompt = '';
    if (challengeId === 'pattern') {
      const recentLogs: DailyLog[] = [];
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const entry = getDailyLog(toLocalDateString(d));
        if (entry) recentLogs.push(entry);
        if (recentLogs.length >= 7) break;
      }
      prompt = buildPatternPrompt(currentState, recentLogs);
    } else if (challengeId === 'tip') {
      prompt = buildCoachPrompt(currentState, currentLog);
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
    setLoading(null);
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
                  setResponses((prev) => {
                    const next = { ...prev };
                    delete next[activeChallenge];
                    return next;
                  });
                  handleAsk(activeChallenge);
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
            { label: 'Challenge Day', value: `${state.currentDay}/75`, color: '#FF6B35' },
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
