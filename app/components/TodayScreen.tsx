'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  saveDailyLog,
  getOrCreateTodayLog,
  checkAllTasksComplete,
  isDietFullyLogged,
  uploadMultiplePhotos,
  uploadProgressPhoto,
  compressImage,
  getUserFocus,
  saveUserFocus,
} from '../lib/storage';
import { initializeStreakOnLoad, completeTodayStreak, isPastTenPM } from '../lib/streakLogic';
import { getProgressionState, saveProgressionState } from '../lib/progressionStorage';
import { applyProgressionUpdate, createDefaultProgressionState, DAILY_XP_CAP, getLevelProgress } from '../lib/progressionLogic';
import { DailyLog, AppState, MoodEmoji, UserFocus, ProgressionState, ProgressionSource } from '../lib/types';
import CelebrationOverlay from './CelebrationOverlay';
import QuestPath from './QuestPath';
import FireIcon from './FireIcon';
import { getDailyTip, getMotivationalQuote, fetchAIQuote, getTipCategory } from '../lib/aiTips';
import { askGemini } from '../lib/gemini';
import { recordTelemetryEvent } from '../lib/telemetry';

const MOODS: { value: MoodEmoji; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great', color: '#00F5D4' },
  { value: 'good', emoji: '🙂', label: 'Good', color: '#BAFF39' },
  { value: 'meh', emoji: '😐', label: 'Meh', color: '#FFE66D' },
  { value: 'bad', emoji: '😞', label: 'Bad', color: '#FF6B35' },
  { value: 'terrible', emoji: '😩', label: 'Terrible', color: '#FF4757' },
];

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

interface QuickLogActionProps {
  icon: string;
  label: string;
  done: boolean;
  accentColor: string;
  onClick: () => void;
}

function QuickLogAction({ icon, label, done, accentColor, onClick }: QuickLogActionProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center"
      style={{
        background: done ? `${accentColor}1A` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? `${accentColor}55` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: done ? `0 0 16px ${accentColor}22` : 'none',
      }}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[11px] font-bold leading-tight" style={{ color: done ? accentColor : '#CBD5E1' }}>
        {label}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: done ? accentColor : '#64748B' }}>
        {done ? 'Done' : 'Tap'}
      </span>
    </motion.button>
  );
}

interface MissionItem {
  id: 'workout' | 'walk' | 'diet' | 'mood' | 'reading';
  label: string;
  icon: string;
  done: boolean;
}

const FOCUS_ORDER: Record<UserFocus, MissionItem['id'][]> = {
  gym_first: ['workout', 'diet', 'walk', 'reading', 'mood'],
  habit_first: ['reading', 'mood', 'diet', 'walk', 'workout'],
  balanced: ['workout', 'walk', 'diet', 'mood', 'reading'],
};

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
  const [userFocus, setUserFocus] = useState<UserFocus>('balanced');
  const [showFocusOnboarding, setShowFocusOnboarding] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [aiQuote, setAiQuote] = useState<{ quote: string; author: string } | null>(null);
  const [progression, setProgression] = useState<ProgressionState>(() => createDefaultProgressionState(''));
  const celebrationFiredRef = useRef(false);
  // Monotonically increasing ID — incremented on every new photo upload and on
  // removal so we can detect and discard results from stale async uploads.
  const photoSessionRef = useRef(0);
  const missionTelemetryKeyRef = useRef('');

  useEffect(() => {
    setMounted(true);
    const state = initializeStreakOnLoad();
    setAppState(state);
    const todayLog = getOrCreateTodayLog();
    setLog(todayLog);
    setProgression(getProgressionState(todayLog.date));
    celebrationFiredRef.current = todayLog.celebrationShown || false;
    const focus = getUserFocus();
    setUserFocus(focus);
    setShowFocusOnboarding(localStorage.getItem('iron75_user_focus') === null);
  }, []);

  // Fetch AI-powered quote (shows static fallback instantly, upgrades async)
  useEffect(() => {
    if (!mounted || appState.currentDay < 1) return;
    fetchAIQuote(appState.currentDay, askGemini).then(setAiQuote).catch(() => {});
  }, [mounted, appState.currentDay]);

  useEffect(() => {
    if (!mounted || !log) return;

    const dietDone = isDietFullyLogged(log.dietSlots);
    const completedSources: ProgressionSource[] = [];
    if (log.gymWorkoutDone) completedSources.push('workout');
    if (log.outdoorWalkDone) completedSources.push('walk');
    if (dietDone) completedSources.push('diet');
    if (log.moodEmoji !== '') completedSources.push('mood');
    if (log.readingDone) completedSources.push('reading');

    const missionDoneById: Record<MissionItem['id'], boolean> = {
      workout: log.gymWorkoutDone,
      walk: log.outdoorWalkDone,
      diet: dietDone,
      mood: log.moodEmoji !== '',
      reading: log.readingDone,
    };
    const missionPathIds = FOCUS_ORDER[userFocus].slice(0, 3);
    const missionComplete = missionPathIds.every((id) => missionDoneById[id]);
    const missionTelemetryKey = `${log.date}:${userFocus}`;

    if (missionComplete && missionTelemetryKeyRef.current !== missionTelemetryKey) {
      missionTelemetryKeyRef.current = missionTelemetryKey;
      recordTelemetryEvent('mission_path_completed', {
        date: log.date,
        focus: userFocus,
        path: missionPathIds,
      });
    } else if (!missionComplete && missionTelemetryKeyRef.current === missionTelemetryKey) {
      missionTelemetryKeyRef.current = '';
    }

    const currentProgression = getProgressionState(log.date);
    const { state: nextProgression } = applyProgressionUpdate(currentProgression, {
      date: log.date,
      completedSources,
      missionCompleted: missionComplete,
    });

    const progressionChanged =
      nextProgression.totalXp !== currentProgression.totalXp ||
      nextProgression.level !== currentProgression.level ||
      nextProgression.daily.date !== currentProgression.daily.date ||
      nextProgression.daily.xpGained !== currentProgression.daily.xpGained ||
      nextProgression.daily.claimedSources.join('|') !== currentProgression.daily.claimedSources.join('|');

    if (progressionChanged) {
      saveProgressionState(nextProgression);
    }
    setProgression(nextProgression);
  }, [mounted, log, userFocus]);

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
    if (log.gymWorkoutDone && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true;
      setShowCelebration(true);
      // Use functional updater to avoid stale-closure over appState.
      setAppState((prev) => completeTodayStreak(prev));
      updateLog((prev) => ({ ...prev, celebrationShown: true }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.gymWorkoutDone, mounted]);

  useEffect(() => {
    const check = () => {
      if (isPastTenPM() && log && !log.gymWorkoutDone) {
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
  const updateDiet = (slot: keyof DailyLog['dietSlots'], value: string) => {
    updateLog((p) => ({ ...p, dietSlots: { ...p.dietSlots, [slot]: value } }));
  };
  const setMood = (emoji: MoodEmoji) => updateLog((p) => ({ ...p, moodEmoji: emoji }));
  const toggleReading = () => updateLog((p) => ({ ...p, readingDone: !p.readingDone }));
  const setBookTitle = (title: string) => updateLog((p) => ({ ...p, readingBook: title }));
  const trackQuickLogTap = (
    action: 'walk' | 'reading' | 'mood',
    nextDone: boolean,
    selectedMood?: Exclude<MoodEmoji, ''>
  ) => {
    recordTelemetryEvent('quick_log_tapped', {
      action,
      source: 'quick_log',
      nextDone,
      selectedMood,
    });
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  /** Helper: current photos list (normalised from new + legacy fields) */
  const currentPhotos = (log?.progressPhotos?.length ? log.progressPhotos : (log?.progressPhotoUrl ? [log.progressPhotoUrl] : []));
  const MAX_PHOTOS = 4;

  /** Upload a single photo (camera capture) */
  const handlePhotoSelected = async (file: File) => {
    if (currentPhotos.length >= MAX_PHOTOS) return;
    const session = ++photoSessionRef.current;
    setPhotoUploading(true);
    setShowPhotoOptions(false);
    try {
      const cloudUrl = await uploadProgressPhoto(file, log?.date ?? '', appState.currentDay, currentPhotos.length);
      if (session !== photoSessionRef.current) return;
      if (cloudUrl) {
        updateLog((p) => {
          const photos = [...(p.progressPhotos ?? []), cloudUrl].slice(0, MAX_PHOTOS);
          return { ...p, progressPhotos: photos, progressPhotoUrl: photos[0] ?? '' };
        });
      } else {
        let sourceBlob: Blob = file;
        try { sourceBlob = await compressImage(file); } catch { /* use original */ }
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (session !== photoSessionRef.current) { resolve(); return; }
            const base64 = ev.target?.result as string;
            updateLog((p) => {
              const photos = [...(p.progressPhotos ?? []), base64].slice(0, MAX_PHOTOS);
              return { ...p, progressPhotos: photos, progressPhotoUrl: photos[0] ?? '' };
            });
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

  /** Upload multiple photos from gallery (up to 4 total) */
  const handleGalleryFiles = async (files: File[]) => {
    const remaining = MAX_PHOTOS - currentPhotos.length;
    if (remaining <= 0) return;
    const batch = files.slice(0, remaining);
    const session = ++photoSessionRef.current;
    setPhotoUploading(true);
    setShowPhotoOptions(false);
    try {
      const urls = await uploadMultiplePhotos(batch, log?.date ?? '', appState.currentDay);
      if (session !== photoSessionRef.current) return;
      if (urls.length > 0) {
        updateLog((p) => {
          const photos = [...(p.progressPhotos ?? []), ...urls].slice(0, MAX_PHOTOS);
          return { ...p, progressPhotos: photos, progressPhotoUrl: photos[0] ?? '' };
        });
      } else {
        // Fallback to base64 for each file
        for (const file of batch) {
          let sourceBlob: Blob = file;
          try { sourceBlob = await compressImage(file); } catch { /* use original */ }
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (session !== photoSessionRef.current) { resolve(); return; }
              const base64 = ev.target?.result as string;
              updateLog((p) => {
                const photos = [...(p.progressPhotos ?? []), base64].slice(0, MAX_PHOTOS);
                return { ...p, progressPhotos: photos, progressPhotoUrl: photos[0] ?? '' };
              });
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(sourceBlob);
          });
        }
      }
    } finally {
      if (session === photoSessionRef.current) setPhotoUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    photoSessionRef.current++;
    updateLog((p) => {
      const photos = [...(p.progressPhotos ?? [])];
      photos.splice(index, 1);
      return { ...p, progressPhotos: photos, progressPhotoUrl: photos[0] ?? '' };
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelected(file);
    e.target.value = '';
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleGalleryFiles(Array.from(files));
    e.target.value = '';
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
        <FireIcon sizeClassName="text-5xl" />
      </div>
    );
  }

  const dietComplete = isDietFullyLogged(log.dietSlots);
  const completedCount = [
    log.gymWorkoutDone,
    log.outdoorWalkDone,
    dietComplete,
    log.moodEmoji !== '',
    log.readingDone,
  ].filter(Boolean).length;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const quote = aiQuote ?? getMotivationalQuote(appState.currentDay);
  const tipCategory = getTipCategory(appState.currentDay);
  const levelProgress = getLevelProgress(progression.totalXp);
  const todayXpGained = progression.daily.date === log.date ? progression.daily.xpGained : 0;
  const reachedDailyCap = todayXpGained >= DAILY_XP_CAP;
  const quickLogDoneCount = [
    log.outdoorWalkDone,
    log.readingDone,
    log.moodEmoji !== '',
  ].filter(Boolean).length;
  const selectedMood = MOODS.find((m) => m.value === log.moodEmoji);
  const dailyFlow = [
    {
      id: 'prep',
      icon: '🟢',
      title: 'Prep',
      subtitle: 'Prime your body + mind',
      done: quickLogDoneCount > 0 || log.moodEmoji !== '',
      doneColor: '#38BDF8',
    },
    {
      id: 'perform',
      icon: '🔥',
      title: 'Perform',
      subtitle: 'Finish your workout quest',
      done: log.gymWorkoutDone,
      doneColor: '#FF6B35',
    },
    {
      id: 'recover',
      icon: '🌙',
      title: 'Recover',
      subtitle: 'Log mood + recovery habits',
      done: log.gymWorkoutDone && (log.outdoorWalkDone || log.readingDone || log.moodEmoji !== ''),
      doneColor: '#00F5D4',
    },
  ] as const;
  const nextQuestStep = dailyFlow.find((step) => !step.done);
  const questHint = nextQuestStep
    ? `Next: ${nextQuestStep.title} — ${nextQuestStep.subtitle}`
    : 'Daily flow complete. Keep recovery consistent.';
  const momentumScore = Math.round(
    ((completedCount / 5) * 0.65 + Math.min(appState.streak, 30) / 30 * 0.35) * 100
  );
  const streakMilestone = appState.streak > 0 && appState.streak % 7 === 0;

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
            <span>Clock is ticking! <span className="font-bold text-white">Workout still pending</span> before midnight.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Card with Streak & Progress Ring ────────────────────────── */}
      <motion.div
        className="relative rounded-3xl p-6 overflow-hidden surface-2026"
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
                Day {appState.currentDay}
              </div>
              <div className="text-xs" style={{ color: '#64748B' }}>|</div>
              <div className="text-xs" style={{ color: '#A855F7' }}>
                Best: {appState.longestStreak}🏆
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: '#64748B' }}>
              ✅ Missed streak days reset to Day 1
            </div>
            {streakMilestone && (
              <motion.div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ background: 'rgba(255,230,109,0.12)', color: '#FFE66D', border: '1px solid rgba(255,230,109,0.4)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
              >
                ✨ Streak milestone · {appState.streak} days
              </motion.div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <ProgressRing progress={completedCount / 5} />
            <span className="text-[10px] font-bold" style={{ color: completedCount === 5 ? '#00F5D4' : '#64748B' }}>
              {completedCount}/5 habits
            </span>
          </div>
        </div>

        {/* Date & goal countdown */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs" style={{ color: '#64748B' }}>{dateStr}</span>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            📈 Momentum {momentumScore}
          </span>
        </div>

        {/* Animated progress bar */}
        <div className="mt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#141432' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: completedCount === 5
                  ? 'linear-gradient(90deg, #00F5D4, #38BDF8)'
                  : 'linear-gradient(90deg, #FF6B35, #A855F7, #FFE66D)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                width: `${(completedCount / 5) * 100}%`,
              }}
              transition={{
                width: { type: 'spring', stiffness: 80, damping: 15 },
              }}
            />
          </div>
        </div>
      </motion.div>

      <QuestPath
        title="Daily Quest Path"
        titleColor="#FFE66D"
        background="linear-gradient(135deg, rgba(255,230,109,0.08), rgba(255,107,53,0.06))"
        borderColor="rgba(255,230,109,0.2)"
        steps={dailyFlow.map((step) => ({ ...step }))}
        hint={questHint}
      />

      <motion.div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,245,212,0.08), rgba(56,189,248,0.06))',
          border: '1px solid rgba(0,245,212,0.2)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-black uppercase tracking-wider" style={{ color: '#00F5D4' }}>
            Level {levelProgress.level}
          </div>
          <div className="text-[10px] font-bold" style={{ color: '#38BDF8' }}>
            +{todayXpGained} XP today
          </div>
        </div>

        <div className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
          {levelProgress.xpIntoLevel}/{levelProgress.xpForNextLevel} XP • {levelProgress.xpToNextLevel} XP to Level {levelProgress.level + 1}
        </div>

        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #00F5D4, #38BDF8)' }}
            animate={{ width: `${Math.max(0, Math.min(1, levelProgress.progress)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 95, damping: 18 }}
          />
        </div>

        <div className="text-[10px] mt-2" style={{ color: reachedDailyCap ? '#FFE66D' : '#64748B' }}>
          {reachedDailyCap
            ? `Daily XP cap (${DAILY_XP_CAP}) reached — recovery still counts, no penalties.`
            : `Daily XP cap: ${DAILY_XP_CAP}. XP is never removed for unchecked tasks.`}
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(56,189,248,0.06))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black uppercase tracking-wider" style={{ color: '#F8FAFC' }}>
              Quick log
            </div>
            <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
              One tap for your most frequent check-ins.
            </p>
          </div>
          <span
            className="text-[10px] px-2 py-1 rounded-full font-bold"
            style={{
              background: quickLogDoneCount === 3 ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.06)',
              color: quickLogDoneCount === 3 ? '#00F5D4' : '#94A3B8',
              border: `1px solid ${quickLogDoneCount === 3 ? 'rgba(0,245,212,0.35)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            {quickLogDoneCount}/3
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <QuickLogAction
            icon="🚶"
            label="Walk"
            done={log.outdoorWalkDone}
            accentColor="#A855F7"
            onClick={() => {
              trackQuickLogTap('walk', !log.outdoorWalkDone);
              toggleOutdoorWalk();
            }}
          />
          <QuickLogAction
            icon="📚"
            label="Reading"
            done={log.readingDone}
            accentColor="#38BDF8"
            onClick={() => {
              trackQuickLogTap('reading', !log.readingDone);
              toggleReading();
            }}
          />
        </div>

        <div className="mt-2">
          <input
            type="text"
            placeholder="Book title (optional)"
            value={log.readingBook}
            onChange={(e) => setBookTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#F1F5F9' }}
          />
        </div>

        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#FF6B9D' }}>
              Quick mood
            </div>
            <span className="text-[10px] font-semibold" style={{ color: selectedMood ? selectedMood.color : '#64748B' }}>
              {selectedMood ? `${selectedMood.emoji} ${selectedMood.label}` : 'Not logged'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-2">
            {MOODS.map((mood) => {
              const isSelected = log.moodEmoji === mood.value;
              return (
                <motion.button
                  key={mood.value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    trackQuickLogTap('mood', true, mood.value === '' ? undefined : mood.value);
                    setMood(mood.value);
                  }}
                  className="rounded-xl px-1 py-2 flex flex-col items-center gap-1"
                  style={{
                    background: isSelected ? `${mood.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? mood.color : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelected ? `0 0 14px ${mood.color}20` : 'none',
                  }}
                  aria-label={`Set mood to ${mood.label}`}
                >
                  <span className="text-lg leading-none">{mood.emoji}</span>
                  <span className="text-[9px] font-semibold" style={{ color: isSelected ? mood.color : '#64748B' }}>
                    {mood.label}
                  </span>
                </motion.button>
              );
            })}
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

      <AnimatePresence>
        {showFocusOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,212,0.08), rgba(56,189,248,0.05))',
              border: '1px solid rgba(0,245,212,0.25)',
            }}
          >
            <div className="text-xs font-black uppercase tracking-wider" style={{ color: '#00F5D4' }}>
              Quick setup
            </div>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
              Pick your focus so daily progression prioritizes what matters most.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {([
                { value: 'gym_first', label: 'Gym-first', emoji: '🏋️' },
                { value: 'habit_first', label: 'Habit-first', emoji: '🧠' },
                { value: 'balanced', label: 'Balanced', emoji: '⚖️' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setUserFocus(option.value);
                    saveUserFocus(option.value);
                    setShowFocusOnboarding(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${userFocus === option.value ? '#00F5D4' : 'rgba(255,255,255,0.08)'}`,
                    color: userFocus === option.value ? '#00F5D4' : '#94A3B8',
                  }}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Task Cards ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <TaskCard
          icon="🏋️" label="Gym Workout Session" done={log.gymWorkoutDone}
          accentColor="#FF6B35" onToggle={toggleGymWorkout}
          subtitle={log.gymWorkoutDone ? 'Completed — great work!' : 'Tap to mark done'}
        />

        <TaskCard
          icon="🥗" label="Diet Diary" done={dietComplete}
          accentColor="#FFE66D"
          expandable expanded={expandedCard === 'diet'}
          onToggleExpand={() => toggleCard('diet')}
          subtitle="Log all 4 meals (use - if skipped)"
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
          <span className="flex-1 font-bold text-sm" style={{ color: '#64748B' }}>Progress Photos</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
            {currentPhotos.length}/{MAX_PHOTOS}
          </span>
          {currentPhotos.length > 0 && <span className="text-sm">✅</span>}
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
                {/* Photo grid — show existing photos */}
                {currentPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {currentPhotos.map((url, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden aspect-[3/4]"
                        style={{ border: '2px solid #00F5D4' }}>
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#00F5D4' }}>
                          Day {appState.currentDay} · #{idx + 1}
                        </div>
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'rgba(0,0,0,0.7)', color: '#ff4757' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add more / first photo buttons */}
                {currentPhotos.length < MAX_PHOTOS && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <p className="text-xs text-center" style={{ color: '#64748B' }}>
                      {currentPhotos.length === 0
                        ? 'Upload up to 4 daily progress pics — synced to cloud'
                        : `${MAX_PHOTOS - currentPhotos.length} more slot${MAX_PHOTOS - currentPhotos.length > 1 ? 's' : ''} available`}
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
                        📷 {currentPhotos.length === 0 ? 'Add Photos' : 'Add More'}
                      </motion.button>
                    ) : (
                      <motion.div
                        className="flex flex-col gap-2 w-full"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
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

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => galleryInputRef.current?.click()}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm w-full"
                          style={{
                            background: 'rgba(0,245,212,0.06)',
                            border: '1px solid rgba(0,245,212,0.2)',
                            color: '#00F5D4',
                          }}>
                          🖼️ Choose from Gallery (up to {MAX_PHOTOS - currentPhotos.length})
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowPhotoOptions(false)}
                          className="text-xs text-gray-500 py-1">
                          Cancel
                        </motion.button>

                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                          onChange={handleCameraCapture} className="hidden" />
                        <input ref={galleryInputRef} type="file" accept="image/*" multiple
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
