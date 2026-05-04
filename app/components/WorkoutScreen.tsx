'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionSpec, ExerciseSpec } from '../lib/pplData';
import { getToday, saveDailyLog, getOrCreateTodayLog, getDayOfWeek, getWorkoutState, saveWorkoutState, isWorkoutComplete, markWorkoutComplete } from '../lib/storage';
import { getSessionForDow, getAllSessionSpecs } from '../lib/customWorkouts';
import { buildWorkoutProgressionReport } from '../lib/workoutProgression';
import { dispatchDashboardTab } from '../lib/uiEvents';
import WorkoutPlanner from './WorkoutPlanner';
import QuestPath from './QuestPath';
import type { ExerciseState, SetState } from '../lib/types';

function buildInitialExerciseState(ex: ExerciseSpec): ExerciseState {
  const setCount = Number.isFinite(ex.sets) ? Math.max(1, Math.floor(ex.sets)) : 1;
  return {
    sets: Array.from({ length: setCount }, () => ({ done: false, reps: '' })),
    notes: '',
    expanded: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeRepsValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function sanitizeSet(set: unknown): SetState {
  if (!isRecord(set)) return { done: false, reps: '' };
  return {
    done: set.done === true,
    reps: sanitizeRepsValue(set.reps),
  };
}

function sanitizeExerciseState(state: unknown, fallbackSetCount: number, useSavedLength = false): ExerciseState {
  const source = isRecord(state) ? state : {};
  const sourceSets = Array.isArray(source.sets) ? source.sets : [];
  const normalizedFallback = Number.isFinite(fallbackSetCount) ? Math.max(1, Math.floor(fallbackSetCount)) : 1;
  const setCount = useSavedLength && sourceSets.length > 0 ? sourceSets.length : normalizedFallback;

  return {
    sets: Array.from({ length: setCount }, (_, index) => sanitizeSet(sourceSets[index])),
    notes: typeof source.notes === 'string' ? source.notes : '',
    expanded: source.expanded === true,
  };
}

function buildHistoryFromLocalStorage(sessionKey: string) {
  if (typeof window === 'undefined') return [];

  const history: Array<{
    date: string;
    sessionKey: string;
    completed: boolean;
    exercises: Record<string, ExerciseState>;
  }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('iron75_workout_state_')) continue;

    const suffix = key.replace('iron75_workout_state_', '');
    const date = suffix.slice(0, 10);
    const storedSessionKey = suffix.slice(11);
    if (!date || !storedSessionKey || storedSessionKey !== sessionKey) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Record<string, ExerciseState>;
      if (!isRecord(parsed)) continue;
      history.push({
        date,
        sessionKey: storedSessionKey,
        completed: localStorage.getItem(`iron75_workout_complete_${date}_${storedSessionKey}`) === '1',
        exercises: parsed,
      });
    } catch {
      // Ignore malformed entries and continue building history.
    }
  }

  return history.sort((a, b) => a.date.localeCompare(b.date));
}

function loadWorkoutState(date: string, session: SessionSpec): Record<string, ExerciseState> {
  const saved = getWorkoutState(date, session.key);
  const isComplete = isWorkoutComplete(date, session.key);
  const savedRecord = saved && isRecord(saved) ? saved : null;
  const next: Record<string, ExerciseState> = {};

  session.exercises.forEach((ex) => {
    const prev = savedRecord?.[ex.name];
    next[ex.name] = prev
      ? sanitizeExerciseState(prev, ex.sets, isComplete)
      : buildInitialExerciseState(ex);
  });

  if (!isComplete && saved && JSON.stringify(saved) !== JSON.stringify(next)) {
    saveWorkoutState(date, session.key, next, false);
  }

  return next;
}

function ExerciseCard({
  exercise,
  state,
  sessionColor,
  onChange,
}: {
  exercise: ExerciseSpec;
  state: ExerciseState;
  sessionColor: string;
  onChange: (next: ExerciseState) => void;
}) {
  const allDone = state.sets.every((s) => s.done);
  const doneSets = state.sets.filter((s) => s.done).length;

  const toggleSet = (i: number) => {
    const sets = state.sets.map((s, idx) => idx === i ? { ...s, done: !s.done } : s);
    onChange({ ...state, sets });
  };

  const setReps = (i: number, reps: string) => {
    const sets = state.sets.map((s, idx) => idx === i ? { ...s, reps } : s);
    onChange({ ...state, sets });
  };

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{
        background: allDone
          ? `linear-gradient(135deg, ${sessionColor}12 0%, rgba(6,6,15,0.95) 100%)`
          : 'rgba(12,12,30,0.8)',
        border: `1px solid ${allDone ? sessionColor + '50' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: allDone ? `0 0 20px ${sessionColor}10` : 'none',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 22 }}
    >
      <button
        onClick={() => onChange({ ...state, expanded: !state.expanded })}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl flex-shrink-0">{exercise.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight" style={{ color: allDone ? sessionColor : '#e2e8f0' }}>
            {exercise.name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {exercise.sets} sets × {exercise.repRange} · {exercise.rest} rest · {exercise.targetMuscle}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {state.sets.map((s, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{ background: s.done ? sessionColor : '#141432', boxShadow: s.done ? `0 0 6px ${sessionColor}60` : 'none' }} />
          ))}
        </div>
        <motion.span style={{ color: '#64748b', fontSize: '11px', flexShrink: 0 }} animate={{ rotate: state.expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>▼</motion.span>
      </button>

      <AnimatePresence initial={false}>
        {state.expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div
                className="flex items-start gap-2 p-3 rounded-xl mb-3 text-xs text-gray-300 leading-relaxed"
                style={{ background: `${sessionColor}10`, border: `1px solid ${sessionColor}30` }}
              >
                <span className="text-base flex-shrink-0">💡</span>
                <span>{exercise.tip}</span>
              </div>

              <div className="flex flex-col gap-2">
                {state.sets.map((s, i) => (
                  <motion.div key={i} className="flex items-center gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <motion.button
                      onClick={() => toggleSet(i)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{
                        background: s.done ? sessionColor : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${s.done ? sessionColor : 'rgba(255,255,255,0.08)'}`,
                        color: s.done ? '#06060F' : '#64748b',
                        boxShadow: s.done ? `0 0 12px ${sessionColor}30` : 'none',
                      }}
                      whileTap={{ scale: 0.85 }}
                    >
                      {s.done ? '✓' : i + 1}
                    </motion.button>
                    <span className="text-xs text-gray-400 flex-shrink-0 w-16">Set {i + 1} · {exercise.repRange}</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      placeholder="reps"
                      value={s.reps}
                      onChange={(e) => setReps(i, e.target.value)}
                      className="px-3 py-2 rounded-lg text-sm text-center"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${s.done ? sessionColor + '40' : 'rgba(255,255,255,0.06)'}`,
                        color: '#e2e8f0',
                        width: '70px',
                      }}
                    />
                    <span className="text-xs text-gray-500">reps</span>
                  </motion.div>
                ))}
              </div>

              <input
                type="text"
                placeholder="Notes (weight, how it felt...)"
                value={state.notes}
                onChange={(e) => onChange({ ...state, notes: e.target.value })}
                className="mt-3 w-full px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{doneSets}/{exercise.sets} sets done</span>
                <span>{exercise.rest} rest between sets</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SessionPills({ current, onSelect, allSpecs }: { current: string; onSelect: (key: string) => void; allSpecs: SessionSpec[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      {allSpecs.map((s) => {
        const isActive = s.key === current;
        return (
          <motion.button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap"
            style={{
              background: isActive ? s.color : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActive ? s.color : 'rgba(255,255,255,0.08)'}`,
              color: isActive ? '#06060F' : '#64748b',
              boxShadow: isActive ? `0 0 16px ${s.color}30` : 'none',
            }}
            whileTap={{ scale: 0.9 }}
          >
            {s.emoji} {s.name}
          </motion.button>
        );
      })}
    </div>
  );
}

function WarmCoolSection({
  phase,
  title,
  subtitle,
  items,
  color,
  defaultOpen = true,
}: {
  phase: string;
  title: string;
  subtitle: string;
  items: string[];
  color: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(12,12,30,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between p-3 text-left">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500">{phase}</div>
          <div className="text-sm font-bold" style={{ color }}>{title}</div>
          <div className="text-[10px] text-gray-500">{subtitle}</div>
        </div>
        <motion.span style={{ fontSize: '11px', color: '#64748b' }} animate={{ rotate: open ? 180 : 0 }}>▼</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 pb-3 flex flex-col gap-1"
          >
            {items.map((item, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                <span style={{ color }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkoutScreen() {
  const today = getToday();
  const todayDow = getDayOfWeek(today);

  const [showPlanner, setShowPlanner] = useState(false);
  const [allSpecs, setAllSpecs] = useState<SessionSpec[]>([]);
  const [todaySessionKey, setTodaySessionKey] = useState<string | null>(null);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null);
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPreAnimation, setShowPreAnimation] = useState(false);
  const [showPostAnimation, setShowPostAnimation] = useState(false);
  const preAnimationFiredRef = useRef(false);
  const postAnimationFiredRef = useRef(false);
  const goToToday = () => dispatchDashboardTab('today');

  const refreshSessions = useCallback(() => {
    const sessions = getAllSessionSpecs();
    const todaySession = getSessionForDow(todayDow);
    setAllSpecs(sessions);
    setTodaySessionKey(todaySession?.key ?? null);
    setSelectedSessionKey((prev) => {
      if (prev && sessions.some((session) => session.key === prev)) return prev;
      if (todaySession && sessions.some((session) => session.key === todaySession.key)) return todaySession.key;
      return sessions[0]?.key ?? null;
    });
  }, [todayDow]);

  useEffect(() => {
    setMounted(true);
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!showPlanner && mounted) {
      refreshSessions();
    }
  }, [showPlanner, mounted, refreshSessions]);

  const session = allSpecs.find((entry) => entry.key === selectedSessionKey) ?? allSpecs[0] ?? null;
  const sessionKey = session?.key ?? '';

  useEffect(() => {
    if (!mounted || !session) {
      setExerciseStates({});
      setSessionComplete(false);
      return;
    }
    setExerciseStates(loadWorkoutState(today, session));
    setSessionComplete(isWorkoutComplete(today, sessionKey));
  }, [mounted, session, sessionKey, today]);

  const updateExercise = useCallback(
    (exName: string, next: ExerciseState) => {
      if (!session) return;
      const expectedSets = session.exercises.find((exercise) => exercise.name === exName)?.sets ?? next.sets.length;
      const sanitizedNext = sanitizeExerciseState(next, expectedSets);
      setExerciseStates((prev) => {
        const updated = { ...prev, [exName]: sanitizedNext };
        const allDone = session.exercises.every((ex) => {
          const sets = updated[ex.name]?.sets ?? [];
          return sets.length > 0 && sets.every((s) => s.done);
        });
        if (!allDone && sessionComplete) {
          setSessionComplete(false);
        }
        saveWorkoutState(today, session.key, updated, allDone);
        return updated;
      });
    },
    [today, session, sessionComplete]
  );

  // Auto-complete session when every set of every exercise is done
  useEffect(() => {
    if (sessionComplete || !mounted || !session || session.exercises.length === 0) return;
    const allDone = session.exercises.every(
      (ex) =>
        (exerciseStates[ex.name]?.sets ?? []).length > 0 &&
        (exerciseStates[ex.name]?.sets ?? []).every((s) => s.done)
    );
    if (allDone) {
      const log = getOrCreateTodayLog();
      if (!log.gymWorkoutDone) {
        saveDailyLog({ ...log, gymWorkoutDone: true });
      }
      markWorkoutComplete(today, session.key);
      setSessionComplete(true);
    }
  }, [exerciseStates, mounted, session, sessionComplete, today]);

  const totalSets = session?.exercises.reduce((s, ex) => s + ex.sets, 0) ?? 0;
  const doneSets = session?.exercises.reduce(
    (s, ex) => s + (exerciseStates[ex.name]?.sets.filter((st) => st.done).length ?? 0),
    0
  ) ?? 0;
  const sessionProgress = totalSets > 0 ? Math.max(0, Math.min(1, doneSets / totalSets)) : 0;
  const completedExercises = session?.exercises.filter(
    (ex) => exerciseStates[ex.name]?.sets.every((s) => s.done)
  ).length ?? 0;
  const progressionReport = session
    ? buildWorkoutProgressionReport(buildHistoryFromLocalStorage(session.key))
    : null;
  const nextTargets = progressionReport?.nextTargets ?? [];
  const recentPrs = progressionReport?.prs.slice(-3) ?? [];

  useEffect(() => {
    if (doneSets > 0 && !preAnimationFiredRef.current) {
      preAnimationFiredRef.current = true;
      setShowPreAnimation(true);
      const timer = window.setTimeout(() => setShowPreAnimation(false), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [doneSets]);

  useEffect(() => {
    preAnimationFiredRef.current = false;
    setShowPreAnimation(false);
  }, [today, sessionKey]);

  useEffect(() => {
    if (sessionComplete && !postAnimationFiredRef.current) {
      postAnimationFiredRef.current = true;
      setShowPostAnimation(true);
      const timer = window.setTimeout(() => setShowPostAnimation(false), 2200);
      return () => window.clearTimeout(timer);
    }
    if (!sessionComplete) {
      postAnimationFiredRef.current = false;
    }
  }, [sessionComplete]);

  const phasePath = [
    {
      id: 'pre',
      title: 'Pre',
      subtitle: 'Warm-up',
      icon: '🟢',
      done: doneSets > 0 || sessionComplete,
      active: doneSets === 0 && !sessionComplete,
      color: '#38BDF8',
    },
    {
      id: 'main',
      title: 'Main',
      subtitle: 'Lift sets',
      icon: '🏋️',
      done: sessionComplete,
      active: doneSets > 0 && !sessionComplete,
      color: session?.color ?? '#A855F7',
    },
    {
      id: 'post',
      title: 'Post',
      subtitle: 'Cool-down',
      icon: '❄️',
      done: sessionComplete,
      active: sessionComplete,
      color: '#00F5D4',
    },
  ] as const;
  const nextPhase = phasePath.find((phase) => !phase.done);
  const phaseHint = nextPhase
    ? `Next: ${nextPhase.title} — ${nextPhase.subtitle}`
    : 'All phases complete. Recovery logged.';

  const handleCompleteSession = () => {
    if (!session) return;
    const log = getOrCreateTodayLog();
    saveDailyLog({ ...log, gymWorkoutDone: true });
    markWorkoutComplete(today, session.key);
    saveWorkoutState(today, session.key, exerciseStates, true);
    setSessionComplete(true);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="text-4xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🏋️</motion.div>
      </div>
    );
  }

  if (showPlanner) {
    return <WorkoutPlanner onClose={() => setShowPlanner(false)} />;
  }

  if (!session) {
    const setupSteps = [
      { icon: '🧭', title: 'Open Planner', detail: 'Create a quick 3-exercise session.' },
      { icon: '📅', title: 'Assign a day', detail: 'Pick today so it shows up instantly.' },
      { icon: '🔥', title: 'Log your sets', detail: 'First completion starts the streak.' },
    ];
    return (
      <div className="flex flex-col gap-4 px-4 pt-5 pb-24">
        <div
          className="rounded-3xl p-6 text-center"
          style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-2 text-4xl">🧩</div>
            <p className="text-sm font-bold text-white">Build your first workout plan</p>
            <p className="mt-1 text-xs text-gray-400">It only takes a minute to unlock streaks and rewards.</p>
          </motion.div>
          <div className="mt-4 grid gap-2 text-left">
            {setupSteps.map((step, idx) => (
              <motion.div
                key={step.title}
                className="flex items-start gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + idx * 0.08 }}
              >
                <span className="text-lg">{step.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white">{step.title}</div>
                  <div className="text-[10px] text-gray-500">{step.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPlanner(true)}
              className="rounded-full px-4 py-2 text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #A855F7, #FF6B9D)', color: '#06060F' }}
            >
              📋 Open Planner
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToToday}
              className="rounded-full px-4 py-2 text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0' }}
            >
              🧭 Go to Today
            </motion.button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['Day 1: streak ignites', 'Day 3: momentum boost', 'Week 1: Weekly Wrapped'].map((label) => (
              <div
                key={label}
                className="rounded-full px-3 py-1 text-[10px] font-bold"
                style={{ background: 'rgba(0,245,212,0.12)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-24">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest" style={{ color: session.color, opacity: 0.8 }}>Select Session</div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPlanner(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg, #A855F720, #FF6B9D20)', border: '1px solid #A855F740', color: '#A855F7' }}
          >
            📋 Planner
          </motion.button>
        </div>
        <SessionPills current={selectedSessionKey ?? session.key} onSelect={(key) => setSelectedSessionKey(key)} allSpecs={allSpecs} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={session.key}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${session.color}15 0%, #06060F 100%)`,
            border: `1px solid ${session.color}35`,
            boxShadow: `0 0 40px ${session.color}08`,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
        >
          <div className="absolute right-4 top-4 text-7xl opacity-10">{session.emoji}</div>
          <div className="relative">
            {selectedSessionKey === todaySessionKey && (
              <div className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full mb-2" style={{ background: '#FF6B3533', color: '#FF6B35', border: '1px solid #FF6B3544' }}>
                📅 Today&apos;s Session
              </div>
            )}
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: session.color, opacity: 0.7 }}>{session.muscles}</div>
            <h1 className="text-2xl font-black text-white mb-1">{session.fullName}</h1>
            <p className="text-sm text-gray-400 italic">&quot;{session.tagline}&quot;</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{completedExercises}/{session.exercises.length} exercises</span>
                <span style={{ color: session.color }}>{doneSets}/{totalSets} sets</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: '#141432' }}>
                <motion.div
                  className="h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${session.color}, ${session.color}99)`,
                    boxShadow: `0 0 8px ${session.color}40`,
                    minWidth: sessionProgress > 0 ? 6 : 0,
                  }}
                  animate={{ width: `${sessionProgress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 80 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showPreAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="rounded-xl px-3 py-2 text-xs font-bold surface-2026-soft"
            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', color: '#38BDF8' }}
          >
            ⚡ Pre-work complete. Main phase activated.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPostAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.9 }}
            className="rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest surface-2026-soft"
            style={{ background: 'rgba(0,245,212,0.12)', border: '1px solid rgba(0,245,212,0.35)', color: '#00F5D4' }}
          >
            🎉 Post-workout complete. Streak protected.
          </motion.div>
        )}
      </AnimatePresence>

      <QuestPath
        title="Session Quest Path"
        titleColor="#CBD5E1"
        background="rgba(12,12,30,0.7)"
        borderColor="rgba(255,255,255,0.08)"
        hint={phaseHint}
        steps={phasePath.map((phase) => ({
          id: phase.id,
          icon: phase.icon,
          title: phase.title,
          subtitle: phase.subtitle,
          done: phase.done,
          active: phase.active,
          doneColor: phase.color,
        }))}
      />

      <div className="rounded-2xl px-3 py-2 text-[10px] text-gray-500" style={{ background: 'rgba(12,12,30,0.55)', border: '1px solid rgba(255,255,255,0.05)' }}>
        Session Flow: Phase 1 warm-up + dynamic stretch → Phase 2 main workout → Phase 3 static stretch cool-down.
      </div>

      {(nextTargets.length > 0 || recentPrs.length > 0) && (
        <div
          className="rounded-2xl p-3"
          style={{ background: 'rgba(12,12,30,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-[10px] uppercase tracking-widest text-gray-500">Progression Coach</div>
          {nextTargets.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {nextTargets.slice(0, 3).map((target) => {
                const actionColor =
                  target.action === 'push' ? '#00F5D4' : target.action === 'ease' ? '#FFE66D' : '#94A3B8';
                return (
                  <div
                    key={target.exerciseName}
                    className="rounded-xl px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-200">{target.exerciseName}</span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: actionColor }}>
                        {target.action}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      Target reps: {target.targetRepsBySet.join(' / ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {recentPrs.length > 0 && (
            <div className="mt-3 text-[11px] text-gray-400">
              Recent PRs: {recentPrs.map((pr) => `${pr.exerciseName} (${pr.metric.replace('_', ' ')} +${pr.improvement})`).join(' · ')}
            </div>
          )}
        </div>
      )}

      <WarmCoolSection
        phase="Phase 1"
        title="🔥 Pre-workout Warm-up + Dynamic Stretching"
        subtitle="Prepare your body before lifting."
        items={session.warmup}
        color={session.color}
      />

      <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(12,12,30,0.55)', border: `1px solid ${session.color}25` }}>
        <div className="text-[10px] uppercase tracking-widest text-gray-500">Phase 2</div>
        <div className="text-sm font-bold text-white">🏋️ Main Workout of the Day</div>
        <div className="text-[10px] text-gray-500">{session.exercises.length} exercise blocks</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={session.key + '-exercises'} className="flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {session.exercises.map((ex) => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              state={exerciseStates[ex.name] ?? {
                sets: Array.from({ length: ex.sets }, () => ({ done: false, reps: '' })),
                notes: '',
                expanded: false,
              }}
              sessionColor={session.color}
              onChange={(next) => updateExercise(ex.name, next)}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      <WarmCoolSection
        phase="Phase 3"
        title="❄️ Post-workout Static Stretching / Cool-down"
        subtitle="Recover and downshift after training."
        items={session.cooldown}
        color="#00F5D4"
        defaultOpen={false}
      />

      {sessionComplete ? (
        <motion.div
          className="rounded-2xl p-5 text-center surface-2026"
          style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.08), rgba(6,6,15,0.95))', border: '1px solid rgba(0,245,212,0.4)', boxShadow: '0 0 30px rgba(0,245,212,0.1)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-4xl mb-2">✅</div>
          <p className="font-black text-lg" style={{ color: '#00F5D4' }}>Session Complete!</p>
          <p className="text-xs text-gray-400 mt-1">Gym workout marked done for today. 💪</p>
        </motion.div>
      ) : (
        <div className="sticky bottom-3 z-20">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleCompleteSession}
            className="w-full py-4 rounded-2xl font-black text-base interactive-press"
            style={{
              background: `linear-gradient(135deg, ${session.color}, ${session.color}cc)`,
              color: '#06060F',
              boxShadow: `0 4px 24px ${session.color}40, 0 0 60px ${session.color}15`,
            }}
          >
            {doneSets >= Math.floor(totalSets * 0.8)
              ? '🏆 Finish Session & Log Workout!'
              : `Complete Session — ${doneSets}/${totalSets} sets done`}
          </motion.button>
        </div>
      )}
    </div>
  );
}
