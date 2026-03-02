'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CustomSession,
  CustomExercise,
  DayAssignments,
  getCustomSessions,
  saveCustomSessions,
  getDayAssignments,
  saveDayAssignments,
  createBlankSession,
  createBlankExercise,
  SESSION_COLORS,
  SESSION_EMOJIS,
  MUSCLE_GROUPS,
  EXERCISE_EMOJIS,
} from '../lib/customWorkouts';
import { SESSIONS, DOW_TO_SESSION } from '../lib/pplData';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// ─── Quick Exercise Inline Row ────────────────────────────────────────────────
function QuickExerciseRow({
  exercise, index, color, onChange, onRemove,
}: {
  exercise: CustomExercise; index: number; color: string;
  onChange: (ex: CustomExercise) => void; onRemove: () => void;
}) {
  const emoji = EXERCISE_EMOJIS[exercise.targetMuscle] ?? '🏋️';
  return (
    <motion.div
      layout
      className="flex items-center gap-2 p-2 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
    >
      <span className="text-sm flex-shrink-0">{emoji}</span>
      <input
        type="text"
        placeholder={`Exercise ${index + 1}`}
        value={exercise.name}
        onChange={(e) => onChange({ ...exercise, name: e.target.value })}
        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20`, color: '#e2e8f0' }}
      />
      <div className="flex gap-1 flex-shrink-0">
        <input type="number" min={1} max={10} value={exercise.sets}
          onChange={(e) => onChange({ ...exercise, sets: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-10 px-1 py-1.5 rounded-lg text-xs text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}
          title="Sets"
        />
        <input type="text" placeholder="8-12" value={exercise.repRange}
          onChange={(e) => onChange({ ...exercise, repRange: e.target.value })}
          className="w-14 px-1 py-1.5 rounded-lg text-xs text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}
          title="Reps"
        />
      </div>
      {/* Muscle quick-select */}
      <select
        value={exercise.targetMuscle}
        onChange={(e) => onChange({ ...exercise, targetMuscle: e.target.value, emoji: EXERCISE_EMOJIS[e.target.value] ?? '🏋️' })}
        className="text-[10px] px-1 py-1.5 rounded-lg appearance-none cursor-pointer flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', maxWidth: 70 }}
      >
        {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <button onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-xs flex-shrink-0 px-1">✕</button>
    </motion.div>
  );
}

// ─── Inline Session Editor (compact panel) ───────────────────────────────────
function InlineSessionEditor({
  session, onSave, onCancel, assignments, onAssignmentsChange,
}: {
  session: CustomSession;
  onSave: (s: CustomSession) => void;
  onCancel: () => void;
  assignments: DayAssignments;
  onAssignmentsChange: (a: DayAssignments) => void;
}) {
  const [draft, setDraft] = useState<CustomSession>(() => ({
    ...session, exercises: session.exercises.map((e) => ({ ...e })),
  }));

  // Track which days this session is assigned to
  const selectedDays = new Set(
    Object.entries(assignments)
      .filter(([, sid]) => sid === session.id)
      .map(([dow]) => Number(dow)),
  );

  const toggleDay = (dow: number) => {
    const next = { ...assignments };
    if (selectedDays.has(dow)) {
      delete next[dow];
    } else {
      next[dow] = draft.id;
    }
    onAssignmentsChange(next);
  };

  const color = draft.color;
  const isValid = draft.name.trim().length > 0 && draft.exercises.length > 0 && draft.exercises.every((e) => e.name.trim());

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{ background: `${color}06`, border: `1px solid ${color}30` }}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Row 1: Name + Emoji */}
        <div className="flex items-center gap-2">
          {/* Emoji picker — tiny dropdown */}
          <div className="relative group">
            <button className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              {draft.emoji}
            </button>
            <div className="absolute left-0 top-full mt-1 z-50 hidden group-focus-within:flex flex-wrap gap-1 p-2 rounded-xl w-48"
              style={{ background: '#0C0C1E', border: '1px solid rgba(255,255,255,0.1)' }}>
              {SESSION_EMOJIS.map((e) => (
                <button key={e} onClick={() => setDraft((d) => ({ ...d, emoji: e }))}
                  className="w-8 h-8 rounded-lg text-sm flex items-center justify-center hover:bg-white/10"
                  style={{ background: draft.emoji === e ? color : 'transparent' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text" placeholder="Workout name..."
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}25`, color: '#e2e8f0' }}
          />
        </div>

        {/* Color strip */}
        <div className="flex gap-1.5">
          {SESSION_COLORS.map((c) => (
            <button key={c} onClick={() => setDraft((d) => ({ ...d, color: c }))}
              className="w-6 h-6 rounded-full transition-all" title={c}
              style={{ background: c, border: `2px solid ${draft.color === c ? '#fff' : 'transparent'}`, transform: draft.color === c ? 'scale(1.2)' : 'scale(1)' }}
            />
          ))}
        </div>

        {/* ── Day Assignment Row ──────────────────────────────── */}
        <div>
          <div className="text-xs font-bold text-gray-400 mb-1.5 flex items-center gap-1.5">
            📅 Schedule Days
            <span className="text-[10px] text-gray-600 font-normal">tap to toggle</span>
          </div>
          <div className="flex gap-1.5">
            {DAYS.map((day, dow) => {
              const active = selectedDays.has(dow);
              return (
                <button key={dow} onClick={() => toggleDay(dow)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-black transition-all"
                  style={{
                    background: active ? color : 'rgba(255,255,255,0.03)',
                    color: active ? '#06060F' : '#64748b',
                    border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: active ? `0 0 8px ${color}30` : 'none',
                  }}>
                  {day}
                </button>
              );
            })}
          </div>
          {selectedDays.size === 0 && (
            <p className="text-[10px] text-gray-600 mt-1">No days selected — uses PPL default rotation</p>
          )}
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color }}>Exercises ({draft.exercises.length})</span>
            <span className="text-[10px] text-gray-600">sets · reps · muscle</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {draft.exercises.map((ex, i) => (
              <QuickExerciseRow key={ex.id} exercise={ex} index={i} color={color}
                onChange={(updated) => setDraft((d) => ({ ...d, exercises: d.exercises.map((x, j) => j === i ? updated : x) }))}
                onRemove={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== i) }))}
              />
            ))}
          </div>
          <button
            onClick={() => setDraft((d) => ({ ...d, exercises: [...d.exercises, createBlankExercise()] }))}
            className="mt-2 w-full py-2 rounded-xl text-xs font-bold"
            style={{ background: `${color}10`, border: `1px dashed ${color}30`, color }}
          >
            + Add Exercise
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
            Cancel
          </button>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => isValid && onSave(draft)}
            className="flex-1 py-2.5 rounded-xl text-xs font-black"
            style={{
              background: isValid ? color : 'rgba(255,255,255,0.03)',
              color: isValid ? '#06060F' : '#475569',
              cursor: isValid ? 'pointer' : 'not-allowed',
              boxShadow: isValid ? `0 4px 16px ${color}30` : 'none',
            }}>
            {session.name ? '💾 Update' : '✨ Create'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main WorkoutPlanner ──────────────────────────────────────────────────────
export default function WorkoutPlanner({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<CustomSession[]>([]);
  const [assignments, setAssignments] = useState<DayAssignments>({});
  const [editingSession, setEditingSession] = useState<CustomSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSessions(getCustomSessions());
    setAssignments(getDayAssignments());
  }, []);

  const handleAssignmentsChange = useCallback((next: DayAssignments) => {
    saveDayAssignments(next);
    setAssignments(next);
  }, []);

  const handleSave = useCallback((session: CustomSession) => {
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === session.id);
      const next = exists ? prev.map((s) => (s.id === session.id ? session : s)) : [...prev, session];
      saveCustomSessions(next);
      return next;
    });
    setEditingSession(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveCustomSessions(next);
      return next;
    });
    setAssignments((prev) => {
      const next: DayAssignments = {};
      for (const [dow, sid] of Object.entries(prev)) {
        if (sid !== id) next[Number(dow)] = sid;
      }
      saveDayAssignments(next);
      return next;
    });
  }, []);

  if (!mounted) return null;

  const todayDow = new Date().getDay();

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-24">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ background: 'linear-gradient(135deg, #A855F7, #FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Workout Planner
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">Create workouts & assign them to days</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          ← Back
        </motion.button>
      </motion.div>

      {/* ── Weekly Overview (read-only strip) ───────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
          📅 This Week
          <span className="text-[10px] text-gray-600 font-normal">edit days inside session editor</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
            const assignedId = assignments[dow];
            const customMatch = assignedId ? sessions.find((s) => s.id === assignedId) : null;
            const pplKey = DOW_TO_SESSION[dow];
            const pplSession = SESSIONS[pplKey];
            const display = customMatch
              ? { emoji: customMatch.emoji, color: customMatch.color, name: customMatch.name }
              : { emoji: pplSession?.emoji ?? '🏋️', color: pplSession?.color ?? '#64748b', name: pplSession?.name ?? '?' };
            const isToday = dow === todayDow;
            return (
              <div key={dow} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg"
                style={{
                  background: isToday ? `${display.color}15` : 'rgba(12,12,30,0.5)',
                  border: `1px solid ${isToday ? display.color + '40' : 'rgba(255,255,255,0.04)'}`,
                }}>
                <span className="text-[9px] font-black" style={{ color: isToday ? display.color : '#64748b' }}>{DAYS[dow]}</span>
                <span className="text-sm leading-none">{display.emoji}</span>
                {!!customMatch && <span className="w-1 h-1 rounded-full" style={{ background: display.color }} />}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── My Custom Sessions ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="text-xs font-bold text-gray-400 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">🏋️ My Sessions ({sessions.length})</span>
          {!editingSession && (
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setEditingSession(createBlankSession())}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#A855F720', color: '#A855F7', border: '1px solid #A855F740' }}>
              + New
            </motion.button>
          )}
        </div>

        {/* Existing custom sessions — compact list */}
        {sessions.length > 0 && !editingSession && (
          <div className="flex flex-col gap-1.5 mb-3">
            {sessions.map((s) => {
              const assignedDays = Object.entries(assignments)
                .filter(([, sid]) => sid === s.id)
                .map(([dow]) => DAYS[Number(dow)]);
              return (
                <motion.div key={s.id} layout
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: `${s.color}06`, border: `1px solid ${s.color}20` }}>
                  <span className="text-lg">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{s.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {s.exercises.length} exercises
                      {assignedDays.length > 0 && <span style={{ color: s.color }}> · {assignedDays.join(', ')}</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditingSession(s)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    🗑️
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {sessions.length === 0 && !editingSession && (
          <div className="rounded-xl p-6 text-center mb-3"
            style={{ background: 'rgba(12,12,30,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-2xl mb-2">🏋️</div>
            <p className="text-xs text-gray-500">No custom sessions yet</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Tap &quot;+ New&quot; to create one</p>
          </div>
        )}

        {/* Inline editor */}
        <AnimatePresence>
          {editingSession && (
            <InlineSessionEditor
              session={editingSession}
              onSave={handleSave}
              onCancel={() => setEditingSession(null)}
              assignments={assignments}
              onAssignmentsChange={handleAssignmentsChange}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── PPL Quick Reference (collapsed) ────────────────────── */}
      <details className="group">
        <summary className="text-[10px] text-gray-600 cursor-pointer flex items-center gap-1 select-none">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Default PPL Sessions Reference
        </summary>
        <div className="mt-2 flex flex-col gap-1">
          {Object.values(SESSIONS).map((s) => (
            <div key={s.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(12,12,30,0.4)' }}>
              <span className="text-sm">{s.emoji}</span>
              <span className="text-[10px] font-bold text-gray-500">{s.name}</span>
              <span className="text-[9px] text-gray-700 ml-auto">{s.exercises.length} exercises · {s.muscles}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
