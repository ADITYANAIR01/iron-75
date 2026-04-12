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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function QuickExerciseRow({
  exercise,
  index,
  color,
  onChange,
  onRemove,
}: {
  exercise: CustomExercise;
  index: number;
  color: string;
  onChange: (exercise: CustomExercise) => void;
  onRemove: () => void;
}) {
  const emoji = EXERCISE_EMOJIS[exercise.targetMuscle] ?? '🏋️';

  return (
    <motion.div
      layout
      className="flex items-center gap-2 rounded-xl p-2"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <span className="flex-shrink-0 text-sm">{emoji}</span>
      <input
        type="text"
        placeholder={`Exercise ${index + 1}`}
        value={exercise.name}
        onChange={(event) => onChange({ ...exercise, name: event.target.value })}
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs font-bold"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20`, color: '#e2e8f0' }}
      />
      <div className="flex flex-shrink-0 gap-1">
        <input
          type="number"
          min={1}
          max={10}
          value={exercise.sets}
          onChange={(event) =>
            onChange({ ...exercise, sets: Math.max(1, parseInt(event.target.value, 10) || 1) })
          }
          className="w-10 rounded-lg px-1 py-1.5 text-center text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}
          title="Sets"
        />
        <input
          type="text"
          placeholder="8-12"
          value={exercise.repRange}
          onChange={(event) => onChange({ ...exercise, repRange: event.target.value })}
          className="w-14 rounded-lg px-1 py-1.5 text-center text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}
          title="Reps"
        />
      </div>
      <select
        value={exercise.targetMuscle}
        onChange={(event) =>
          onChange({
            ...exercise,
            targetMuscle: event.target.value,
            emoji: EXERCISE_EMOJIS[event.target.value] ?? '🏋️',
          })
        }
        className="cursor-pointer appearance-none rounded-lg px-1 py-1.5 text-[10px]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', maxWidth: 70 }}
      >
        {MUSCLE_GROUPS.map((muscle) => (
          <option key={muscle} value={muscle}>
            {muscle}
          </option>
        ))}
      </select>
      <button onClick={onRemove} className="flex-shrink-0 px-1 text-xs text-red-400/60 hover:text-red-400">
        ✕
      </button>
    </motion.div>
  );
}

function PhaseStepRow({
  value,
  index,
  color,
  placeholder,
  onChange,
  onRemove,
}: {
  value: string;
  index: number;
  color: string;
  placeholder: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      className="flex items-center gap-2 rounded-xl p-2"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black"
        style={{ background: `${color}20`, color }}
      >
        {index + 1}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20`, color: '#e2e8f0' }}
      />
      <button onClick={onRemove} className="flex-shrink-0 px-1 text-xs text-red-400/60 hover:text-red-400">
        ✕
      </button>
    </motion.div>
  );
}

function PhaseListEditor({
  title,
  subtitle,
  items,
  color,
  placeholder,
  addLabel,
  onChange,
}: {
  title: string;
  subtitle: string;
  items: string[];
  color: string;
  placeholder: string;
  addLabel: string;
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color }}>
          {title} ({items.length})
        </span>
        <span className="text-[10px] text-gray-600">{subtitle}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl px-3 py-2 text-[10px] text-gray-500" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          No steps added yet.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <PhaseStepRow
              key={`${title}-${index}`}
              value={item}
              index={index}
              color={color}
              placeholder={placeholder}
              onChange={(updatedItem) =>
                onChange(items.map((entry, entryIndex) => (entryIndex === index ? updatedItem : entry)))
              }
              onRemove={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => onChange([...items, ''])}
        className="mt-2 w-full rounded-xl py-2 text-xs font-bold"
        style={{ background: `${color}10`, border: `1px dashed ${color}30`, color }}
      >
        {addLabel}
      </button>
    </div>
  );
}

function InlineSessionEditor({
  session,
  onSave,
  onCancel,
  assignments,
  onAssignmentsChange,
}: {
  session: CustomSession;
  onSave: (session: CustomSession) => void;
  onCancel: () => void;
  assignments: DayAssignments;
  onAssignmentsChange: (assignments: DayAssignments) => void;
}) {
  const [draft, setDraft] = useState<CustomSession>(() => ({
    ...session,
    exercises: session.exercises.map((exercise) => ({ ...exercise })),
    warmup: [...(session.warmup ?? [])],
    cooldown: [...(session.cooldown ?? [])],
  }));

  const selectedDays = new Set(
    Object.entries(assignments)
      .filter(([, sessionId]) => sessionId === session.id)
      .map(([dow]) => Number(dow))
  );

  const toggleDay = (dow: number) => {
    const nextAssignments = { ...assignments };
    if (selectedDays.has(dow)) {
      delete nextAssignments[dow];
    } else {
      nextAssignments[dow] = draft.id;
    }
    onAssignmentsChange(nextAssignments);
  };

  const color = draft.color;
  const isValid =
    draft.name.trim().length > 0 &&
    draft.exercises.length > 0 &&
    draft.exercises.every((exercise) => exercise.name.trim().length > 0);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl"
      style={{ background: `${color}06`, border: `1px solid ${color}30` }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="group relative">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}
            >
              {draft.emoji}
            </button>
            <div
              className="absolute left-0 top-full z-50 mt-1 hidden w-48 flex-wrap gap-1 rounded-xl p-2 group-focus-within:flex"
              style={{ background: '#0C0C1E', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {SESSION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setDraft((prev) => ({ ...prev, emoji }))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm hover:bg-white/10"
                  style={{ background: draft.emoji === emoji ? color : 'transparent' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            placeholder="Workout name..."
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}25`, color: '#e2e8f0' }}
          />
        </div>

        <div className="flex gap-1.5">
          {SESSION_COLORS.map((sessionColor) => (
            <button
              key={sessionColor}
              onClick={() => setDraft((prev) => ({ ...prev, color: sessionColor }))}
              className="h-6 w-6 rounded-full transition-all"
              title={sessionColor}
              style={{
                background: sessionColor,
                border: `2px solid ${draft.color === sessionColor ? '#fff' : 'transparent'}`,
                transform: draft.color === sessionColor ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-400">
            📅 Schedule Days
            <span className="text-[10px] font-normal text-gray-600">tap to toggle</span>
          </div>
          <div className="flex gap-1.5">
            {DAYS.map((day, dow) => {
              const active = selectedDays.has(dow);
              return (
                <button
                  key={dow}
                  onClick={() => toggleDay(dow)}
                  className="flex-1 rounded-lg py-2 text-[10px] font-black transition-all"
                  style={{
                    background: active ? color : 'rgba(255,255,255,0.03)',
                    color: active ? '#06060F' : '#64748b',
                    border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: active ? `0 0 8px ${color}30` : 'none',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {selectedDays.size === 0 && <p className="mt-1 text-[10px] text-gray-600">No days selected yet.</p>}
        </div>

        <PhaseListEditor
          title="1) Pre-workout Warm-up + Dynamic Stretching"
          subtitle="prep + mobility"
          items={draft.warmup}
          color={color}
          placeholder="e.g. Dynamic leg swings x 20"
          addLabel="+ Add Warm-up Step"
          onChange={(warmup) => setDraft((prev) => ({ ...prev, warmup }))}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color }}>
              2) Main Workout Exercises ({draft.exercises.length})
            </span>
            <span className="text-[10px] text-gray-600">sets · reps · muscle</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {draft.exercises.map((exercise, index) => (
              <QuickExerciseRow
                key={exercise.id}
                exercise={exercise}
                index={index}
                color={color}
                onChange={(updated) =>
                  setDraft((prev) => ({
                    ...prev,
                    exercises: prev.exercises.map((row, rowIndex) => (rowIndex === index ? updated : row)),
                  }))
                }
                onRemove={() =>
                  setDraft((prev) => ({
                    ...prev,
                    exercises: prev.exercises.filter((_, rowIndex) => rowIndex !== index),
                  }))
                }
              />
            ))}
          </div>
          <button
            onClick={() => setDraft((prev) => ({ ...prev, exercises: [...prev.exercises, createBlankExercise()] }))}
            className="mt-2 w-full rounded-xl py-2 text-xs font-bold"
            style={{ background: `${color}10`, border: `1px dashed ${color}30`, color }}
          >
            + Add Exercise
          </button>
        </div>

        <PhaseListEditor
          title="3) Post-workout Static Stretching / Cool-down"
          subtitle="recovery + breathing"
          items={draft.cooldown}
          color="#00F5D4"
          placeholder="e.g. Hamstring stretch x 45s"
          addLabel="+ Add Cool-down Step"
          onChange={(cooldown) => setDraft((prev) => ({ ...prev, cooldown }))}
        />

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => isValid && onSave(draft)}
            className="flex-1 rounded-xl py-2.5 text-xs font-black"
            style={{
              background: isValid ? color : 'rgba(255,255,255,0.03)',
              color: isValid ? '#06060F' : '#475569',
              cursor: isValid ? 'pointer' : 'not-allowed',
              boxShadow: isValid ? `0 4px 16px ${color}30` : 'none',
            }}
          >
            {session.name ? '💾 Update' : '✨ Create'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

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

  const handleAssignmentsChange = useCallback((nextAssignments: DayAssignments) => {
    saveDayAssignments(nextAssignments);
    setAssignments(nextAssignments);
  }, []);

  const handleSave = useCallback((session: CustomSession) => {
    setSessions((prev) => {
      const existing = prev.find((entry) => entry.id === session.id);
      const nextSessions = existing
        ? prev.map((entry) => (entry.id === session.id ? session : entry))
        : [...prev, session];
      saveCustomSessions(nextSessions);
      return nextSessions;
    });
    setEditingSession(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSessions((prev) => {
      const nextSessions = prev.filter((session) => session.id !== id);
      saveCustomSessions(nextSessions);
      return nextSessions;
    });

    setAssignments((prev) => {
      const nextAssignments: DayAssignments = {};
      for (const [dow, sessionId] of Object.entries(prev)) {
        if (sessionId !== id) nextAssignments[Number(dow)] = sessionId;
      }
      saveDayAssignments(nextAssignments);
      return nextAssignments;
    });
  }, []);

  if (!mounted) return null;

  const todayDow = new Date().getDay();
  const isEditorOpen = editingSession !== null;

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ background: 'linear-gradient(135deg, #A855F7, #FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Workout Planner
          </h1>
          <p className="mt-0.5 text-[10px] text-gray-600">Create custom sessions and assign them to your week</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          ← Back
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-400">
          📅 This Week
          <span className="text-[10px] font-normal text-gray-600">assign days inside session editor</span>
        </div>
        <div className="flex gap-1">
          {DAYS.map((day, dow) => {
            const assignedId = assignments[dow];
            const assigned = assignedId ? sessions.find((session) => session.id === assignedId) : null;
            const display = assigned
              ? { emoji: assigned.emoji, color: assigned.color, name: assigned.name }
              : { emoji: '🛌', color: '#64748b', name: 'Rest' };
            const isToday = dow === todayDow;

            return (
              <div
                key={dow}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5"
                style={{
                  background: isToday ? `${display.color}15` : 'rgba(12,12,30,0.5)',
                  border: `1px solid ${isToday ? `${display.color}40` : 'rgba(255,255,255,0.04)'}`,
                }}
                title={display.name}
              >
                <span className="text-[9px] font-black" style={{ color: isToday ? display.color : '#64748b' }}>
                  {day}
                </span>
                <span className="text-sm leading-none">{display.emoji}</span>
                {assigned && <span className="h-1 w-1 rounded-full" style={{ background: display.color }} />}
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-400">
          <span className="flex items-center gap-2">🏋️ My Sessions ({sessions.length})</span>
          {!isEditorOpen && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setEditingSession(createBlankSession())}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background: '#A855F720', color: '#A855F7', border: '1px solid #A855F740' }}
            >
              + New
            </motion.button>
          )}
        </div>

        {sessions.length > 0 && !isEditorOpen && (
          <div className="mb-3 flex flex-col gap-1.5">
            {sessions.map((session) => {
              const assignedDays = Object.entries(assignments)
                .filter(([, sessionId]) => sessionId === session.id)
                .map(([dow]) => DAYS[Number(dow)]);

              return (
                <motion.div
                  key={session.id}
                  layout
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: `${session.color}06`, border: `1px solid ${session.color}20` }}
                >
                  <span className="text-lg">{session.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-white">{session.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {session.warmup.length} warm-up · {session.exercises.length} exercises · {session.cooldown.length} cool-down
                      {assignedDays.length > 0 && <span style={{ color: session.color }}> · {assignedDays.join(', ')}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingSession(session)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    🗑️
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {sessions.length === 0 && !isEditorOpen && (
          <div className="mb-3 rounded-xl p-6 text-center" style={{ background: 'rgba(12,12,30,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="mb-2 text-2xl">🏋️</div>
            <p className="text-xs text-gray-500">No custom sessions yet</p>
            <p className="mt-0.5 text-[10px] text-gray-600">Tap &quot;+ New&quot; to create your first routine</p>
          </div>
        )}

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
    </div>
  );
}
