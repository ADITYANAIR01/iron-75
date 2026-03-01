'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  saveDailyLog,
  getOrCreateTodayLog,
  checkAllTasksComplete,
} from '../lib/storage';
import { initializeStreakOnLoad, completeTodayStreak, getDaysToWedding, isPastTenPM } from '../lib/streakLogic';
import { DailyLog, AppState, MoodEmoji } from '../lib/types';
import WaterBottle from './WaterBottle';
import CelebrationOverlay from './CelebrationOverlay';
import { getDailyTip } from '../lib/aiTips';

// ─── Mood config ───────────────────────────────────────────────────────────────
const MOODS: { value: MoodEmoji; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'meh', emoji: '😐', label: 'Meh' },
  { value: 'bad', emoji: '😞', label: 'Bad' },
  { value: 'terrible', emoji: '😩', label: 'Terrible' },
];

// ─── Completion status ring SVG ────────────────────────────────────────────────
function StatusRing({ done, size = 28 }: { done: boolean; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#2a2a4a" strokeWidth="2.5" fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={done ? '#4ECDC4' : '#FF6B35'}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: done ? 0 : circ }}
        initial={{ strokeDashoffset: circ }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <AnimatePresence>
        {done && (
          <motion.text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.45}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            ✓
          </motion.text>
        )}
      </AnimatePresence>
    </svg>
  );
}

// ─── Simple Binary Checkbox Card ─────────────────────────────────────────────
interface SimpleCheckCardProps {
  icon: string;
  label: string;
  done: boolean;
  onToggle: () => void;
}

function SimpleCheckCard({ icon, label, done, onToggle }: SimpleCheckCardProps) {
  return (
    <motion.button
      layout
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
      style={{
        background: done
          ? 'linear-gradient(135deg, rgba(78,205,196,0.12) 0%, rgba(13,13,26,0.95) 100%)'
          : 'rgba(13,13,40,0.8)',
        border: `1px solid ${done ? '#4ECDC4' : '#2a2a4a'}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="text-2xl">{icon}</span>
      <span
        className="flex-1 font-semibold text-base text-left"
        style={{
          color: done ? '#4ECDC4' : '#e2e8f0',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.85 : 1,
          transition: 'color 0.3s, text-decoration 0.3s',
        }}
      >
        {label}
      </span>
      {/* Animated checkbox circle */}
      <motion.div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        animate={{
          background: done ? '#4ECDC4' : 'transparent',
          borderColor: done ? '#4ECDC4' : '#3a3a5a',
          scale: done ? [1, 1.3, 1] : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, scale: { duration: 0.3 } }}
        style={{ border: '2px solid #3a3a5a' }}
      >
        <AnimatePresence>
          {done && (
            <motion.svg
              width="14"
              height="11"
              viewBox="0 0 14 11"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 15 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <motion.path
                d="M1.5 5.5L5.5 9.5L12.5 1.5"
                stroke="#0D0D1A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}

// ─── Task card wrapper ─────────────────────────────────────────────────────────
interface CardProps {
  icon: string;
  label: string;
  done: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

function TaskCard({ icon, label, done, expanded, onToggleExpand, children }: CardProps) {
  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{
        background: done
          ? 'linear-gradient(135deg, rgba(78,205,196,0.08) 0%, rgba(13,13,26,0.95) 100%)'
          : 'rgba(13,13,40,0.8)',
        border: `1px solid ${done ? '#4ECDC4' : '#2a2a4a'}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl">{icon}</span>
        <span
          className="flex-1 font-semibold text-base"
          style={{ color: done ? '#4ECDC4' : '#e2e8f0' }}
        >
          {label}
        </span>
        <StatusRing done={done} />
        <motion.span
          style={{ color: '#64748b', fontSize: '12px' }}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Slider ────────────────────────────────────────────────────────────────────
function LabeledSlider({
  label,
  emoji,
  value,
  onChange,
  color,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{emoji} {label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full iron75-slider"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── Main TodayScreen ──────────────────────────────────────────────────────────
export default function TodayScreen({ onNavigateToWorkout }: { onNavigateToWorkout?: () => void }) {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [appState, setAppState] = useState<AppState>({
    streak: 0, currentDay: 1, startDate: '', longestStreak: 0, totalRestarts: 0,
  });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTenPMWarning, setShowTenPMWarning] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const celebrationFiredRef = useRef(false);

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const state = initializeStreakOnLoad();
    setAppState(state);

    const todayLog = getOrCreateTodayLog();
    setLog(todayLog);

    // If already celebrated today, don't show again
    celebrationFiredRef.current = todayLog.celebrationShown || false;
  }, []);

  // ── Persist log whenever it changes ──────────────────────────────────────
  const updateLog = useCallback(
    (updater: (prev: DailyLog) => DailyLog) => {
      setLog((prev) => {
        if (!prev) return prev;
        const updated = updater(prev);
        const allDone = checkAllTasksComplete(updated);
        updated.allTasksComplete = allDone;
        saveDailyLog(updated);
        return updated;
      });
    },
    []
  );

  // ── Celebration trigger ───────────────────────────────────────────────────
  useEffect(() => {
    if (!log || !mounted) return;
    if (log.allTasksComplete && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true;
      setShowCelebration(true);
      // Increment streak
      const newState = completeTodayStreak(appState);
      setAppState(newState);
      // Mark celebration shown
      updateLog((prev) => ({ ...prev, celebrationShown: true }));
    }
  }, [log?.allTasksComplete, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 10 PM warning check ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (isPastTenPM() && log && !log.allTasksComplete) {
        setShowTenPMWarning(true);
      } else {
        setShowTenPMWarning(false);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [log]);

  // ── Task handlers ─────────────────────────────────────────────────────────
  const toggleGymWorkout = () => {
    updateLog((p) => ({ ...p, gymWorkoutDone: !p.gymWorkoutDone }));
  };

  const toggleOutdoorWalk = () => {
    updateLog((p) => ({ ...p, outdoorWalkDone: !p.outdoorWalkDone }));
  };

  const addWater = () => {
    updateLog((p) => {
      const newLiters = Math.min(p.waterLiters + 0.5, 9.9);
      return { ...p, waterLiters: newLiters, waterGoalMet: newLiters >= 3.8 };
    });
  };

  const updateDiet = (slot: keyof DailyLog['dietSlots'], value: string) => {
    updateLog((p) => ({
      ...p,
      dietSlots: { ...p.dietSlots, [slot]: value },
    }));
  };

  const setMood = (emoji: MoodEmoji) => {
    updateLog((p) => ({ ...p, moodEmoji: emoji }));
  };

  const setSlider = (field: 'energyLevel' | 'motivationLevel' | 'sorenessLevel', value: number) => {
    updateLog((p) => ({ ...p, [field]: value }));
  };

  const toggleReading = () => {
    updateLog((p) => ({ ...p, readingDone: !p.readingDone }));
  };

  const setBookTitle = (title: string) => {
    updateLog((p) => ({ ...p, readingBook: title }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      updateLog((p) => ({ ...p, progressPhotoUrl: base64 }));
      // Also store separately with date key for Progress tab
      localStorage.setItem(`iron75_photo_${log?.date}`, base64);
    };
    reader.readAsDataURL(file);
  };

  const toggleCard = (id: string) =>
    setExpandedCard((prev) => (prev === id ? null : id));

  // ─── Guard: SSR ────────────────────────────────────────────────────────────
  if (!mounted || !log) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          🔥
        </motion.div>
      </div>
    );
  }

  const completedCount = [
    log.gymWorkoutDone,
    log.outdoorWalkDone,
    log.waterGoalMet,
    log.dietSlots.breakfast !== '' || log.dietSlots.lunch !== '' || log.dietSlots.dinner !== '' || log.dietSlots.snacks !== '',
    log.moodEmoji !== '',
    log.readingDone,
  ].filter(Boolean).length;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const daysToWedding = getDaysToWedding();

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* Celebration overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
        dayNumber={appState.currentDay}
        streak={appState.streak}
      />

      {/* ── 10 PM Warning ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTenPMWarning && (
          <motion.div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid #FF6B35', color: '#FFE66D' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span className="text-lg">⚠️</span>
            <span>Only until 11:59 PM! Complete remaining tasks — {6 - completedCount} left.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Streak Counter ─────────────────────────────────────────────────── */}
      <motion.div
        className="relative rounded-3xl p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a0a00 0%, #0D0D1A 60%, #001a12 100%)',
          border: '1px solid #FF6B3566',
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 30% 50%, #FF6B35 0%, transparent 60%)',
          }}
        />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: '#FF6B35', opacity: 0.8 }}>
              Current Streak
            </div>
            <motion.div
              className="flex items-center gap-2 mt-1"
              key={appState.streak}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <span className="text-5xl">🔥</span>
              <div>
                <span className="text-6xl font-black" style={{ color: '#FF6B35' }}>
                  {appState.streak}
                </span>
                <span className="text-2xl font-bold text-gray-400 ml-1">days</span>
              </div>
            </motion.div>
            <div className="mt-2 text-sm" style={{ color: '#4ECDC4' }}>
              Day {appState.currentDay} of 75
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">{dateStr}</div>
            {daysToWedding > 0 && (
              <div
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,230,109,0.15)', color: '#FFE66D', border: '1px solid rgba(255,230,109,0.3)' }}
              >
                💒 {daysToWedding}d to wedding
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Best: {appState.longestStreak} days
            </div>
          </div>
        </div>

        {/* Progress bar: tasks done today */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Today&apos;s progress</span>
            <span style={{ color: completedCount === 6 ? '#4ECDC4' : '#FF6B35' }}>
              {completedCount}/6 tasks
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#1a1a3a' }}>
            <motion.div
              className="h-2 rounded-full"
              style={{
                background: completedCount === 6
                  ? 'linear-gradient(90deg, #4ECDC4, #2EA89E)'
                  : 'linear-gradient(90deg, #FF6B35, #FFE66D)',
              }}
              animate={{ width: `${(completedCount / 6) * 100}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── 6 Required Task Cards ─────────────────────────────────────────── */}

      {/* 1. Gym Workout — single-tap binary checkbox */}
      <SimpleCheckCard
        icon="🏋️"
        label="Gym Workout (PPL Session)"
        done={log.gymWorkoutDone}
        onToggle={toggleGymWorkout}
      />

      {/* 2. Outdoor Walk — single-tap binary checkbox */}
      <SimpleCheckCard
        icon="🚶"
        label="Outdoor Walk / College Walk"
        done={log.outdoorWalkDone}
        onToggle={toggleOutdoorWalk}
      />

      {/* 3. Water */}
      <TaskCard
        icon="💧"
        label={
          log.waterGoalMet
            ? `Water Intake — ✅ ${log.waterLiters.toFixed(1)}L`
            : `Water Intake — ${log.waterLiters.toFixed(1)}L / 3.8L`
        }
        done={log.waterGoalMet}
        expanded={expandedCard === 'water'}
        onToggleExpand={() => toggleCard('water')}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          <WaterBottle liters={log.waterLiters} onAdd={addWater} />
        </div>
      </TaskCard>

      {/* 4. Diet Diary */}
      <TaskCard
        icon="🥗"
        label="Diet Diary (4 meal slots)"
        done={
          log.dietSlots.breakfast !== '' ||
          log.dietSlots.lunch !== '' ||
          log.dietSlots.dinner !== '' ||
          log.dietSlots.snacks !== ''
        }
        expanded={expandedCard === 'diet'}
        onToggleExpand={() => toggleCard('diet')}
      >
        <div className="flex flex-col gap-2">
          {(
            [
              { key: 'breakfast', icon: '🌅', placeholder: 'What did you eat for breakfast?' },
              { key: 'lunch', icon: '☀️', placeholder: 'Lunch?' },
              { key: 'dinner', icon: '🌙', placeholder: 'Dinner?' },
              { key: 'snacks', icon: '🍎', placeholder: 'Snacks / pre-workout?' },
            ] as const
          ).map(({ key, icon, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <input
                type="text"
                placeholder={placeholder}
                value={log.dietSlots[key]}
                onChange={(e) => updateDiet(key, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #2a2a4a',
                  color: '#e2e8f0',
                }}
              />
            </div>
          ))}
        </div>
      </TaskCard>

      {/* 5. Mood & Energy */}
      <TaskCard
        icon="😊"
        label={log.moodEmoji ? `Mood: ${MOODS.find((m) => m.value === log.moodEmoji)?.emoji ?? ''} ${log.moodEmoji}` : 'Mood & Energy Log'}
        done={log.moodEmoji !== ''}
        expanded={expandedCard === 'mood'}
        onToggleExpand={() => toggleCard('mood')}
      >
        <div className="flex flex-col gap-4">
          {/* Emoji picker */}
          <div>
            <p className="text-xs text-gray-400 mb-2">How are you feeling today?</p>
            <div className="flex gap-2 justify-center">
              {MOODS.map((m) => (
                <motion.button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl"
                  style={{
                    background: log.moodEmoji === m.value ? 'rgba(78,205,196,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${log.moodEmoji === m.value ? '#4ECDC4' : 'transparent'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-3">
            <LabeledSlider
              label="Energy"
              emoji="⚡"
              value={log.energyLevel}
              onChange={(v) => setSlider('energyLevel', v)}
              color="#FF6B35"
            />
            <LabeledSlider
              label="Motivation"
              emoji="🔥"
              value={log.motivationLevel}
              onChange={(v) => setSlider('motivationLevel', v)}
              color="#4ECDC4"
            />
            <LabeledSlider
              label="Soreness"
              emoji="💪"
              value={log.sorenessLevel}
              onChange={(v) => setSlider('sorenessLevel', v)}
              color="#FF6B6B"
            />
          </div>
        </div>
      </TaskCard>

      {/* 6. Reading */}
      <TaskCard
        icon="📖"
        label="10 Pages Read"
        done={log.readingDone}
        expanded={expandedCard === 'reading'}
        onToggleExpand={() => toggleCard('reading')}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-400">Read at least 10 pages of a non-fiction book.</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Book title (optional)"
              value={log.readingBook}
              onChange={(e) => setBookTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #2a2a4a',
                color: '#e2e8f0',
              }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleReading}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{
              background: log.readingDone ? 'rgba(78,205,196,0.2)' : 'rgba(255,107,53,0.2)',
              border: `1px solid ${log.readingDone ? '#4ECDC4' : '#FF6B35'}`,
              color: log.readingDone ? '#4ECDC4' : '#FF6B35',
            }}
          >
            {log.readingDone ? '✅ 10 Pages Done!' : '⬜ Mark as Read'}
          </motion.button>
        </div>
      </TaskCard>

      {/* ── Optional: Progress Photo ─────────────────────────────────────── */}
      <motion.div
        layout
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13,13,30,0.6)',
          border: '1.5px dashed #3a3a5a',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <button
          onClick={() => toggleCard('photo')}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <span className="text-2xl">📷</span>
          <span className="flex-1 font-semibold text-base" style={{ color: '#888' }}>
            Progress Photo
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#64748b', border: '1px solid #3a3a5a' }}
          >
            optional
          </span>
          {log.progressPhotoUrl && (
            <span className="text-base">✅</span>
          )}
          <motion.span
            style={{ color: '#64748b', fontSize: '12px' }}
            animate={{ rotate: expandedCard === 'photo' ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expandedCard === 'photo' && (
            <motion.div
              key="photo-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 flex flex-col gap-3">
                {log.progressPhotoUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={log.progressPhotoUrl}
                      alt="Today's progress"
                      className="w-32 h-40 object-cover rounded-xl"
                      style={{ border: '2px solid #4ECDC4' }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateLog((p) => ({ ...p, progressPhotoUrl: '' }))}
                      className="text-xs text-red-400 underline"
                    >
                      Remove photo
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <p className="text-sm text-gray-500 text-center">
                      Upload your daily progress photo. Private — stored locally.
                    </p>
                    <label
                      className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed #3a3a5a',
                        color: '#64748b',
                      }}
                    >
                      <span>📷 Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Gemini Daily Tip Card ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!tipDismissed && (
          <motion.div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(78,205,196,0.07)',
              border: '1px solid #4ECDC4',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#4ECDC4' }}>
                  AI Coach Tip — Day {appState.currentDay}
                </span>
              </div>
              <button
                onClick={() => setTipDismissed(true)}
                className="text-gray-500 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              {getDailyTip(appState.currentDay)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
