'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SESSIONS, SessionSpec, ExerciseSpec } from '../lib/pplData';
import { getToday, saveDailyLog, getOrCreateTodayLog, getDayOfWeek, getWorkoutState, saveWorkoutState, isWorkoutComplete, markWorkoutComplete } from '../lib/storage';
import { getSessionForDow, getAllSessionSpecs, getSessionById } from '../lib/customWorkouts';
import WorkoutPlanner from './WorkoutPlanner';
import type { SetState, ExerciseState } from '../lib/types';

// ─── Storage helpers ──────────────────────────────────────────────────────────
function buildInitialExerciseState(ex: ExerciseSpec): ExerciseState {
  return {
    sets: Array.from({ length: ex.sets }, () => ({ done: false, reps: '' })),
    notes: '',
    expanded: false,
  };
}

function loadWorkoutState(date: string, session: SessionSpec): Record<string, ExerciseState> {
  const saved = getWorkoutState(date, session.key);
  if (saved && isWorkoutComplete(date, session.key)) {
    // Keep completed-session snapshots immutable so template edits don't rewrite past completed logs.
    return saved;
  }
  const next: Record<string, ExerciseState> = {};

  session.exercises.forEach((ex) => {
    const prev = saved?.[ex.name];
    if (!prev) {
      next[ex.name] = buildInitialExerciseState(ex);
      return;
    }

    next[ex.name] = {
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        done: prev.sets?.[i]?.done ?? false,
        reps: prev.sets?.[i]?.reps ?? '',
      })),
      notes: prev.notes ?? '',
      expanded: prev.expanded ?? false,
    };
  });

  if (saved && JSON.stringify(saved) !== JSON.stringify(next)) {
    saveWorkoutState(date, session.key, next, isWorkoutComplete(date, session.key));
  }

  return next;
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
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

// ─── Session selector pills ───────────────────────────────────────────────────
function SessionPills({ current, onSelect, allSpecs }: { current: string; onSelect: (key: string) => void; allSpecs: SessionSpec[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      {allSpecs.map((s) => {
        const isActive = s.key === current;
        const isCustom = s.key.startsWith('custom_');
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
            {s.emoji} {s.name} {isCustom ? '✦' : ''}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Warmup / Cooldown section ────────────────────────────────────────────────
function WarmCoolSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(12,12,30,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between p-3 text-left">
        <span className="text-sm font-bold" style={{ color }}>{title}</span>
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

// ─── Main WorkoutScreen ───────────────────────────────────────────────────────
export default function WorkoutScreen() {
  const today = getToday();
  const todayDow = getDayOfWeek(today);

  const [showPlanner, setShowPlanner] = useState(false);
  const [allSpecs, setAllSpecs] = useState<SessionSpec[]>([]);
  const [todaySessionKey, setTodaySessionKey] = useState('pushA');
  const [selectedSessionKey, setSelectedSessionKey] = useState('pushA');
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Resolve today's session from custom assignments or PPL default
  useEffect(() => {
    setMounted(true);
    const todaySess = getSessionForDow(todayDow);
    setTodaySessionKey(todaySess.key);
    setSelectedSessionKey(todaySess.key);
    setAllSpecs(getAllSessionSpecs());
  }, [todayDow]);

  // Refresh session list when planner is closed (in case user created new sessions)
  useEffect(() => {
    if (!showPlanner && mounted) {
      const todaySess = getSessionForDow(todayDow);
      setTodaySessionKey(todaySess.key);
      setAllSpecs(getAllSessionSpecs());
    }
  }, [showPlanner, mounted, todayDow]);

  // Resolve current session (handles both PPL keys and custom IDs)
  const session: SessionSpec = (() => {
    const found = getSessionById(selectedSessionKey);
    if (found) return found;
    return getSessionById('pushA') ?? SESSIONS['pushA'];
  })();

  useEffect(() => {
    if (!mounted) return;
    setExerciseStates(loadWorkoutState(today, session));
    setSessionComplete(isWorkoutComplete(today, session.key));
  }, [selectedSessionKey, mounted, today, session]);

  const updateExercise = useCallback(
    (exName: string, next: ExerciseState) => {
      setExerciseStates((prev) => {
        const updated = { ...prev, [exName]: next };
        saveWorkoutState(today, session.key, updated);
        return updated;
      });
    },
    [today, session.key]
  );

  // Auto-complete session when every set of every exercise is done
  useEffect(() => {
    if (sessionComplete || !mounted || session.exercises.length === 0) return;
    const allDone = session.exercises.every(
      (ex) =>
        (exerciseStates[ex.name]?.sets ?? []).length > 0 &&
        (exerciseStates[ex.name]?.sets ?? []).every((s) => s.done)
    );
    if (allDone) {
      if (!isWorkoutComplete(today, session.key)) {
        const log = getOrCreateTodayLog();
        saveDailyLog({ ...log, gymWorkoutDone: true });
        markWorkoutComplete(today, session.key);
        setSessionComplete(true);
      }
    }
  }, [exerciseStates, session.exercises, session.key, sessionComplete, today, mounted]);

  const totalSets = session.exercises.reduce((s, ex) => s + ex.sets, 0);
  const doneSets = session.exercises.reduce(
    (s, ex) => s + (exerciseStates[ex.name]?.sets.filter((st) => st.done).length ?? 0),
    0
  );
  const completedExercises = session.exercises.filter(
    (ex) => exerciseStates[ex.name]?.sets.every((s) => s.done)
  ).length;

  const handleCompleteSession = () => {
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
        <SessionPills current={selectedSessionKey} onSelect={setSelectedSessionKey} allSpecs={allSpecs} />
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
                  style={{ background: `linear-gradient(90deg, ${session.color}, ${session.color}99)`, boxShadow: `0 0 8px ${session.color}40` }}
                  animate={{ width: totalSets > 0 ? `${(doneSets / totalSets) * 100}%` : '0%' }}
                  transition={{ type: 'spring', stiffness: 80 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <WarmCoolSection title="🔥 Warm-up" items={session.warmup} color={session.color} />

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

      <WarmCoolSection title="❄️ Cool-down" items={session.cooldown} color="#00F5D4" />

      {sessionComplete ? (
        <motion.div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.08), rgba(6,6,15,0.95))', border: '1px solid rgba(0,245,212,0.4)', boxShadow: '0 0 30px rgba(0,245,212,0.1)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-4xl mb-2">✅</div>
          <p className="font-black text-lg" style={{ color: '#00F5D4' }}>Session Complete!</p>
          <p className="text-xs text-gray-400 mt-1">Gym workout marked done for today. 💪</p>
        </motion.div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleCompleteSession}
          className="w-full py-4 rounded-2xl font-black text-base"
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
      )}
    </div>
  );
}
