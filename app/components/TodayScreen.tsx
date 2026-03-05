'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  saveDailyLog,
  getOrCreateTodayLog,
  checkAllTasksComplete,
  uploadProgressPhoto,
  compressImage,
} from '../lib/storage';
import { initializeStreakOnLoad, completeTodayStreak, getDaysToGoal, isPastTenPM } from '../lib/streakLogic';
import { DailyLog, AppState, MoodEmoji } from '../lib/types';
import WaterBottle from './WaterBottle';
import CelebrationOverlay from './CelebrationOverlay';
import { getDailyTip, getMotivationalQuote, getTipCategory } from '../lib/aiTips';

// ─── Mood config ───────────────────────────────────────────────────────────────
const MOODS: { value: MoodEmoji; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great', color: '#00F5D4' },
  { value: 'good', emoji: '🙂', label: 'Good', color: '#BAFF39' },
  { value: 'meh', emoji: '😐', label: 'Meh', color: '#FFE66D' },
  { value: 'bad', emoji: '😞', label: 'Bad', color: '#FF6B35' },
  { value: 'terrible', emoji: '😩', label: 'Terrible', color: '#FF4757' },
];

// ─── Animated progress ring ───────────────────────────────────────────────────
function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const gradientId = `ring-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#00F5D4" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#141432" strokeWidth="4" fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={`url(#${gradientId})`}
        strokeWidth="4" fill="none" strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: offset }}
        initial={{ strokeDashoffset: circ }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.28} fontWeight="900" fill="#F1F5F9">
        {Math.round(progress * 100)}%
      </text>
    </svg>
  );
}

// ─── Task Card with neon accent ─────────────────────────────────────────────
interface TaskCardProps {
  icon: string;
  label: string;
  done: boolean;
  accentColor: string;
  onToggle?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
  subtitle?: string;
}

function TaskCard({ icon, label, done, accentColor, onToggle, expandable, expanded, onToggleExpand, children, subtitle }: TaskCardProps) {
  const handleClick = expandable ? onToggleExpand : onToggle;
  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{
        background: done
          ? `linear-gradient(135deg, ${accentColor}12 0%, rgba(6,6,15,0.95) 100%)`
          : 'rgba(12,12,30,0.8)',
        border: `1px solid ${done ? accentColor + '40' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: done ? `0 0 20px ${accentColor}15` : 'none',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Icon with glow bg */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{
              background: done ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${done ? accentColor + '50' : 'rgba(255,255,255,0.08)'}`,
            }}
            animate={done ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {icon}
          </motion.div>
          {done && (
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: accentColor }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#06060F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="font-bold text-sm leading-tight block"
            style={{
              color: done ? accentColor : '#F1F5F9',
              textDecoration: done ? 'line-through' : 'none',
              opacity: done ? 0.9 : 1,
            }}
          >
            {label}
          </span>
          {subtitle && (
            <span className="text-xs mt-0.5 block" style={{ color: '#64748B' }}>{subtitle}</span>
          )}
        </div>

        {expandable && (
          <motion.span
            style={{ color: '#64748b', fontSize: '11px' }}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        )}
      </button>

      {expandable && (
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
      )}
    </motion.div>
  );
}

// ─── Slider with visual track ──────────────────────────────────────────────────
function LabeledSlider({
  label, emoji, value, onChange, color,
}: {
  label: string; emoji: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: '#94A3B8' }}>{emoji} {label}</span>
        <div className="flex gap-1 items-center">
          {[1, 2, 3, 4, 5].map((v) => (
            <div
              key={v}
              className="w-2 h-2 rounded-full transition-all duration-200"
              style={{
                background: v <= value ? color : '#141432',
                boxShadow: v <= value ? `0 0 6px ${color}60` : 'none',
              }}
            />
          ))}
          <span className="ml-1.5 font-bold" style={{ color }}>{value}/5</span>
        </div>
      </div>
      <input
        type="range" min={1} max={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full iron75-slider"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── Main TodayScreen ──────────────────────────────────────────────────────────
export default function TodayScreen() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [appState, setAppState] = useState<AppState>({
    streak: 0, currentDay: 1, startDate: '', longestStreak: 0, totalRestarts: 0,
  });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTenPMWarning, setShowTenPMWarning] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const celebrationFiredRef = useRef(false);
  // Monotonically increasing ID — incremented on every new photo upload and on
  // removal so we can detect and discard results from stale async uploads.
  const photoSessionRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const state = initializeStreakOnLoad();
    setAppState(state);
    const todayLog = getOrCreateTodayLog();
    setLog(todayLog);
    celebrationFiredRef.current = todayLog.celebrationShown || false;
  }, []);

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

  useEffect(() => {
    if (!log || !mounted) return;
    if (log.allTasksComplete && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true;
      setShowCelebration(true);
      // Use functional updater to avoid stale-closure over appState.
      setAppState((prev) => completeTodayStreak(prev));
      updateLog((prev) => ({ ...prev, celebrationShown: true }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.allTasksComplete, mounted]);

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

  const toggleGymWorkout = () => updateLog((p) => ({ ...p, gymWorkoutDone: !p.gymWorkoutDone }));
  const toggleOutdoorWalk = () => updateLog((p) => ({ ...p, outdoorWalkDone: !p.outdoorWalkDone }));
  const addWater = () => {
    updateLog((p) => {
      const newLiters = Math.min(p.waterLiters + 0.5, 9.9);
      return { ...p, waterLiters: newLiters, waterGoalMet: newLiters >= 3.8 };
    });
  };
  const updateDiet = (slot: keyof DailyLog['dietSlots'], value: string) => {
    updateLog((p) => ({ ...p, dietSlots: { ...p.dietSlots, [slot]: value } }));
  };
  const setMood = (emoji: MoodEmoji) => updateLog((p) => ({ ...p, moodEmoji: emoji }));
  const setSlider = (field: 'energyLevel' | 'motivationLevel' | 'sorenessLevel', value: number) => {
    updateLog((p) => ({ ...p, [field]: value }));
  };
  const toggleReading = () => updateLog((p) => ({ ...p, readingDone: !p.readingDone }));
  const setBookTitle = (title: string) => updateLog((p) => ({ ...p, readingBook: title }));

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handlePhotoSelected = async (file: File) => {
    const session = ++photoSessionRef.current;
    setPhotoUploading(true);
    setShowPhotoOptions(false);
    try {
      const cloudUrl = await uploadProgressPhoto(file, log?.date ?? '', appState.currentDay);
      // Discard result if user removed/replaced photo while upload was in flight.
      if (session !== photoSessionRef.current) return;
      if (cloudUrl) {
        updateLog((p) => ({ ...p, progressPhotoUrl: cloudUrl }));
        if (log?.date) localStorage.setItem(`iron75_photo_${log.date}`, cloudUrl);
      } else {
        // Fallback: compress the image first to avoid low-memory errors when
        // storing a large base64 data URL in localStorage.
        let sourceBlob: Blob = file;
        try { sourceBlob = await compressImage(file); } catch { /* use original */ }
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (session !== photoSessionRef.current) { resolve(); return; }
            const base64 = ev.target?.result as string;
            updateLog((p) => ({ ...p, progressPhotoUrl: base64 }));
            if (log?.date) localStorage.setItem(`iron75_photo_${log.date}`, base64);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(sourceBlob);
        });
      }
    } finally {
      if (session === photoSessionRef.current) setPhotoUploading(false);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelected(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelected(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const toggleCard = (id: string) => {
    setExpandedCard((prev) => {
      if (prev === id) {
        // Collapsing — reset photo options picker
        if (id === 'photo') setShowPhotoOptions(false);
        return null;
      }
      return id;
    });
  };

  if (!mounted || !log) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="text-5xl" animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
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
  const daysToGoal = getDaysToGoal();
  const quote = getMotivationalQuote(appState.currentDay);
  const tipCategory = getTipCategory(appState.currentDay);

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
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
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(255,71,87,0.15), rgba(255,107,53,0.15))',
              border: '1px solid rgba(255,71,87,0.4)',
              color: '#FFE66D',
            }}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <motion.span className="text-xl" animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}>⚠️</motion.span>
            <span>Clock is ticking! <span className="font-bold text-white">{6 - completedCount} tasks</span> remaining before midnight.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Card with Streak & Progress Ring ────────────────────────── */}
      <motion.div
        className="relative rounded-3xl p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a0800 0%, #0a0020 35%, #06060F 65%, #001510 100%)',
          border: '1px solid rgba(255,107,53,0.2)',
          boxShadow: '0 0 40px rgba(255,107,53,0.08), 0 0 80px rgba(168,85,247,0.05)',
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)', top: '-10%', left: '10%' }}
            animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', bottom: '-5%', right: '15%' }}
            animate={{ x: [0, -15, 0], y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: '#FF6B35' }}>
              Current Streak
            </div>
            <motion.div
              className="flex items-center gap-2 mt-1"
              key={appState.streak}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <span className="text-4xl" style={{ animation: 'float 3s ease-in-out infinite' }}>🔥</span>
              <div>
                <span className="text-5xl font-black" style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FFE66D)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {appState.streak}
                </span>
                <span className="text-lg font-bold ml-1" style={{ color: '#64748B' }}>days</span>
              </div>
            </motion.div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#00F5D4' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00F5D4', boxShadow: '0 0 6px #00F5D4' }} />
                Day {appState.currentDay} of 75
              </div>
              <div className="text-xs" style={{ color: '#64748B' }}>|</div>
              <div className="text-xs" style={{ color: '#A855F7' }}>
                Best: {appState.longestStreak}🏆
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <ProgressRing progress={completedCount / 6} />
            <span className="text-[10px] font-bold" style={{ color: completedCount === 6 ? '#00F5D4' : '#64748B' }}>
              {completedCount}/6 done
            </span>
          </div>
        </div>

        {/* Date & goal countdown */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs" style={{ color: '#64748B' }}>{dateStr}</span>
          {daysToGoal > 0 && (
            <motion.div
              className="text-[10px] px-2.5 py-1 rounded-full font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(255,230,109,0.15), rgba(255,107,53,0.1))',
                color: '#FFE66D',
                border: '1px solid rgba(255,230,109,0.25)',
              }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🎯 {daysToGoal}d to goal
            </motion.div>
          )}
        </div>

        {/* Animated progress bar */}
        <div className="mt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#141432' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: completedCount === 6
                  ? 'linear-gradient(90deg, #00F5D4, #38BDF8)'
                  : 'linear-gradient(90deg, #FF6B35, #A855F7, #FFE66D)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                width: `${(completedCount / 6) * 100}%`,
              }}
              transition={{
                width: { type: 'spring', stiffness: 80, damping: 15 },
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Motivational Quote ────────────────────────────────────────────── */}
      <motion.div
        className="rounded-xl px-4 py-3 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(255,107,53,0.04))',
          border: '1px solid rgba(168,85,247,0.15)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-xs italic leading-relaxed" style={{ color: '#94A3B8' }}>
          &ldquo;{quote.quote}&rdquo;
        </p>
        <p className="text-[10px] mt-1 font-semibold" style={{ color: '#A855F7' }}>— {quote.author}</p>
      </motion.div>

      {/* ── Task Cards ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <TaskCard
          icon="🏋️" label="Gym Workout (PPL Session)" done={log.gymWorkoutDone}
          accentColor="#FF6B35" onToggle={toggleGymWorkout}
          subtitle={log.gymWorkoutDone ? 'Completed — great work!' : 'Tap to mark done'}
        />

        <TaskCard
          icon="🚶" label="Outdoor Walk / Activity" done={log.outdoorWalkDone}
          accentColor="#A855F7" onToggle={toggleOutdoorWalk}
          subtitle={log.outdoorWalkDone ? 'Walk done — fresh air!' : '45 min minimum'}
        />

        <TaskCard
          icon="💧" label={log.waterGoalMet ? `Water — ✅ ${log.waterLiters.toFixed(1)}L` : `Water — ${log.waterLiters.toFixed(1)}L / 3.8L`}
          done={log.waterGoalMet} accentColor="#00F5D4"
          expandable expanded={expandedCard === 'water'}
          onToggleExpand={() => toggleCard('water')}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            <WaterBottle liters={log.waterLiters} onAdd={addWater} />
          </div>
        </TaskCard>

        <TaskCard
          icon="🥗" label="Diet Diary" done={
            log.dietSlots.breakfast !== '' || log.dietSlots.lunch !== '' ||
            log.dietSlots.dinner !== '' || log.dietSlots.snacks !== ''
          }
          accentColor="#FFE66D"
          expandable expanded={expandedCard === 'diet'}
          onToggleExpand={() => toggleCard('diet')}
          subtitle="Log your 4 meals"
        >
          <div className="flex flex-col gap-2.5">
            {([
              { key: 'breakfast', icon: '🌅', placeholder: 'Breakfast — e.g., Oats + banana' },
              { key: 'lunch', icon: '☀️', placeholder: 'Lunch — e.g., Chicken + rice' },
              { key: 'dinner', icon: '🌙', placeholder: 'Dinner — e.g., Dal + roti' },
              { key: 'snacks', icon: '🍎', placeholder: 'Snacks — e.g., Protein shake' },
            ] as const).map(({ key, icon, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-lg w-7 text-center">{icon}</span>
                <input
                  type="text" placeholder={placeholder}
                  value={log.dietSlots[key]}
                  onChange={(e) => updateDiet(key, e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-transparent outline-none transition-all"
                  style={{
                    background: log.dietSlots[key] ? 'rgba(255,230,109,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${log.dietSlots[key] ? 'rgba(255,230,109,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    color: '#F1F5F9',
                  }}
                />
                {log.dietSlots[key] && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm">✅</motion.span>
                )}
              </div>
            ))}
          </div>
        </TaskCard>

        <TaskCard
          icon="😊" label={log.moodEmoji ? `Mood: ${MOODS.find(m => m.value === log.moodEmoji)?.emoji ?? ''} ${log.moodEmoji}` : 'Mood & Energy Log'}
          done={log.moodEmoji !== ''} accentColor="#FF6B9D"
          expandable expanded={expandedCard === 'mood'}
          onToggleExpand={() => toggleCard('mood')}
          subtitle="How are you feeling today?"
        >
          <div className="flex flex-col gap-5">
            {/* Mood selector */}
            <div className="flex gap-2 justify-center">
              {MOODS.map((m) => {
                const isSelected = log.moodEmoji === m.value;
                return (
                  <motion.button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    whileTap={{ scale: 0.85 }}
                    className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl transition-all"
                    style={{
                      background: isSelected ? `${m.color}20` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isSelected ? m.color : 'transparent'}`,
                      boxShadow: isSelected ? `0 0 16px ${m.color}25` : 'none',
                    }}
                  >
                    <motion.span className="text-3xl" animate={isSelected ? { scale: [1, 1.2, 1] } : {}}>{m.emoji}</motion.span>
                    <span className="text-[10px] font-semibold" style={{ color: isSelected ? m.color : '#64748B' }}>{m.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-3">
              <LabeledSlider label="Energy" emoji="⚡" value={log.energyLevel} onChange={(v) => setSlider('energyLevel', v)} color="#FF6B35" />
              <LabeledSlider label="Motivation" emoji="🔥" value={log.motivationLevel} onChange={(v) => setSlider('motivationLevel', v)} color="#A855F7" />
              <LabeledSlider label="Soreness" emoji="💪" value={log.sorenessLevel} onChange={(v) => setSlider('sorenessLevel', v)} color="#FF4757" />
            </div>
          </div>
        </TaskCard>

        <TaskCard
          icon="📖" label="10 Pages Read" done={log.readingDone}
          accentColor="#38BDF8"
          expandable expanded={expandedCard === 'reading'}
          onToggleExpand={() => toggleCard('reading')}
          subtitle={log.readingDone ? 'Knowledge gained!' : 'Non-fiction, 10 pages minimum'}
        >
          <div className="flex flex-col gap-3">
            <input
              type="text" placeholder="What are you reading? (optional)"
              value={log.readingBook}
              onChange={(e) => setBookTitle(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#F1F5F9' }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleReading}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{
                background: log.readingDone
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(0,245,212,0.1))'
                  : 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.05))',
                border: `1px solid ${log.readingDone ? '#38BDF8' : 'rgba(56,189,248,0.3)'}`,
                color: log.readingDone ? '#38BDF8' : '#94A3B8',
              }}
            >
              {log.readingDone ? '✅ 10 Pages Done!' : '📚 Mark as Read'}
            </motion.button>
          </div>
        </TaskCard>
      </div>

      {/* ── Progress Photo (Optional) ─────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12,12,30,0.6)',
          border: '1.5px dashed rgba(255,255,255,0.08)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => toggleCard('photo')}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            📷
          </div>
          <span className="flex-1 font-bold text-sm" style={{ color: '#64748B' }}>Progress Photo</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
            optional
          </span>
          {log.progressPhotoUrl && <span className="text-sm">✅</span>}
          <motion.span style={{ color: '#64748b', fontSize: '11px' }}
            animate={{ rotate: expandedCard === 'photo' ? 180 : 0 }}>▼</motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expandedCard === 'photo' && (
            <motion.div
              key="photo-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 flex flex-col gap-3">
                {log.progressPhotoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative rounded-2xl overflow-hidden" style={{ border: '2px solid #00F5D4' }}>
                      <img src={log.progressPhotoUrl} alt="Today&apos;s progress" className="w-32 h-40 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold"
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#00F5D4' }}>
                        Day {appState.currentDay}
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        // Invalidate any in-flight upload and clear photo cache key
                        photoSessionRef.current++;
                        if (log?.date) localStorage.removeItem(`iron75_photo_${log.date}`);
                        updateLog((p) => ({ ...p, progressPhotoUrl: '' }));
                      }}
                      className="text-xs text-red-400 underline">
                      Remove photo
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-3">
                    <p className="text-xs text-center" style={{ color: '#64748B' }}>
                      Snap your daily transformation pic — stored to Supabase cloud
                    </p>
                    {photoUploading ? (
                      <div className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'rgba(0,245,212,0.06)', border: '1.5px solid rgba(0,245,212,0.2)', color: '#00F5D4' }}>
                        <span className="animate-spin">⏳</span> Uploading...
                      </div>
                    ) : !showPhotoOptions ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPhotoOptions(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm cursor-pointer"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1.5px dashed rgba(255,255,255,0.1)',
                          color: '#64748b',
                        }}>
                        📷 Add Photo
                      </motion.button>
                    ) : (
                      <motion.div
                        className="flex flex-col gap-2 w-full"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {/* Take Photo (Camera) */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm w-full"
                          style={{
                            background: 'rgba(255,107,53,0.08)',
                            border: '1px solid rgba(255,107,53,0.25)',
                            color: '#FF6B35',
                          }}>
                          📸 Take Photo
                        </motion.button>

                        {/* Upload from Gallery */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => galleryInputRef.current?.click()}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm w-full"
                          style={{
                            background: 'rgba(0,245,212,0.06)',
                            border: '1px solid rgba(0,245,212,0.2)',
                            color: '#00F5D4',
                          }}>
                          🖼️ Choose from Gallery
                        </motion.button>

                        {/* Cancel */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowPhotoOptions(false)}
                          className="text-xs text-gray-500 py-1">
                          Cancel
                        </motion.button>

                        {/* Hidden inputs */}
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                          onChange={handleCameraCapture} className="hidden" />
                        <input ref={galleryInputRef} type="file" accept="image/*"
                          onChange={handleGalleryPick} className="hidden" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Smart AI Tip Card ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!tipDismissed && (
          <motion.div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${tipCategory.color}08, rgba(6,6,15,0.9))`,
              border: `1px solid ${tipCategory.color}30`,
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${tipCategory.color}, transparent)` }} />
            
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-2">
                <motion.span className="text-lg" animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>🤖</motion.span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] block" style={{ color: tipCategory.color }}>
                    {tipCategory.icon} AI Coach · {tipCategory.category}
                  </span>
                  <span className="text-[10px]" style={{ color: '#64748B' }}>Day {appState.currentDay} insight</span>
                </div>
              </div>
              <button onClick={() => setTipDismissed(true)} aria-label="Dismiss tip" className="text-gray-600 hover:text-gray-400 text-lg leading-none p-1">✕</button>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
              {getDailyTip(appState.currentDay, {
                streak: appState.streak,
                waterLiters: log.waterLiters,
                energyLevel: log.energyLevel,
                sorenessLevel: log.sorenessLevel,
                moodEmoji: log.moodEmoji,
                gymDone: log.gymWorkoutDone,
                walkDone: log.outdoorWalkDone,
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
