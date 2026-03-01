'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyLog } from '../lib/types';

interface WeeklyWrappedProps {
  visible: boolean;
  onDismiss: () => void;
  weekNumber: number;   // e.g. 1, 2, 3 …
  startDate: string;    // YYYY-MM-DD of week start
}

// ─── Helper — load 7 logs ────────────────────────────────────────────────────
function loadWeekLogs(startDate: string): DailyLog[] {
  const logs: DailyLog[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const date = d.toISOString().split('T')[0];
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`iron75_dailylog_${date}`) : null;
    if (raw) {
      try { logs.push(JSON.parse(raw)); } catch { /* skip */ }
    }
  }
  return logs;
}

// ─── Personality titles based on score ───────────────────────────────────────
function getWeekTitle(score: number): { title: string; emoji: string; desc: string } {
  if (score === 7) return {
    title: 'The Iron Legend',
    emoji: '🏆',
    desc: 'Perfect week. Absolute beast mode. Nothing could stop you.',
  };
  if (score >= 6) return {
    title: 'The Relentless Grinder',
    emoji: '🔥',
    desc: 'One slip, six wins. Your consistency is a weapon.',
  };
  if (score >= 5) return {
    title: 'The Comeback Kid',
    emoji: '⚡',
    desc: 'Not perfect, but you kept showing up. That\'s the real flex.',
  };
  if (score >= 4) return {
    title: 'The Silent Warrior',
    emoji: '🛡️',
    desc: 'Battled your demons and won more than you lost. Keep fighting.',
  };
  if (score >= 3) return {
    title: 'The Phoenix Rising',
    emoji: '🦅',
    desc: 'You fell, but you\'re still in the game. Tomorrow rewrites the story.',
  };
  return {
    title: 'The Underdog',
    emoji: '💪',
    desc: 'Every champion was once where you are now. Your comeback starts NOW.',
  };
}

// ─── Fun stat generator ────────────────────────────────────────────────────────
function buildStats(logs: DailyLog[]) {
  const totalWater = logs.reduce((s, l) => s + l.waterLiters, 0);
  const gymDays = logs.filter((l) => l.gymWorkoutDone).length;
  const walkDays = logs.filter((l) => l.outdoorWalkDone).length;
  const readDays = logs.filter((l) => l.readingDone).length;
  const completeDays = logs.filter((l) => l.allTasksComplete).length;

  const moodMap: Record<string, number> = { great: 5, good: 4, meh: 3, bad: 2, terrible: 1 };
  const moodScores = logs.filter((l) => l.moodEmoji).map((l) => moodMap[l.moodEmoji] ?? 3);
  const avgMood = moodScores.length ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 3;

  const avgEnergy = logs.length ? logs.reduce((s, l) => s + l.energyLevel, 0) / logs.length : 3;
  const avgMotivation = logs.length ? logs.reduce((s, l) => s + l.motivationLevel, 0) / logs.length : 3;

  // Fun translations
  const waterCups = Math.round(totalWater * 4); // 1L ≈ 4 cups
  const waterBaths = (totalWater / 150).toFixed(2); // avg bath ≈ 150L
  const stepsEstimate = walkDays * 6000;

  // Best streak in the week
  let bestStreak = 0, cur = 0;
  logs.forEach((l) => {
    if (l.allTasksComplete) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  });

  // Most common mood
  const moodCounts: Record<string, number> = {};
  logs.forEach((l) => { if (l.moodEmoji) moodCounts[l.moodEmoji] = (moodCounts[l.moodEmoji] ?? 0) + 1; });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'meh';
  const moodEmojis: Record<string, string> = { great: '😄', good: '🙂', meh: '😐', bad: '😞', terrible: '😩' };

  return {
    totalWater: totalWater.toFixed(1),
    waterCups,
    waterBaths,
    gymDays,
    walkDays,
    readDays,
    completeDays,
    avgMood: avgMood.toFixed(1),
    avgEnergy: avgEnergy.toFixed(1),
    avgMotivation: avgMotivation.toFixed(1),
    stepsEstimate: stepsEstimate.toLocaleString(),
    bestStreak,
    dominantMood,
    dominantMoodEmoji: moodEmojis[dominantMood] ?? '😐',
    score: completeDays,
  };
}

// ─── Slide types ──────────────────────────────────────────────────────────────
type Slide = {
  id: string;
  bg: string;
  content: (stats: ReturnType<typeof buildStats>, weekNum: number) => React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: 'title',
    bg: 'linear-gradient(135deg, #1a0800 0%, #0D0D1A 60%, #001a08 100%)',
    content: (stats, weekNum) => {
      const { title, emoji, desc } = getWeekTitle(stats.score);
      return (
        <div className="flex flex-col items-center text-center gap-4 h-full justify-center px-6">
          <motion.div
            className="text-8xl"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            {emoji}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">Week {weekNum} Wrapped</div>
            <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
            <p className="text-sm text-gray-300 leading-relaxed">{desc}</p>
          </motion.div>
          <motion.div
            className="flex gap-2 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: i < stats.score ? '#FF6B35' : '#2a2a4a' }}
              />
            ))}
          </motion.div>
          <motion.p className="text-xs text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            Swipe to see your stats →
          </motion.p>
        </div>
      );
    },
  },
  {
    id: 'water',
    bg: 'linear-gradient(135deg, #001a2a 0%, #0D0D1A 100%)',
    content: (stats) => (
      <div className="flex flex-col items-center text-center gap-4 h-full justify-center px-6">
        <motion.div className="text-6xl" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
          💧
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="text-xs uppercase tracking-widest text-blue-400 mb-2">Hydration Report</div>
          <div className="text-6xl font-black mb-1" style={{ color: '#4ECDC4' }}>{stats.totalWater}L</div>
          <div className="text-sm text-gray-400 mb-4">of water drank this week</div>
        </motion.div>
        <motion.div className="flex flex-col gap-2 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(78,205,196,0.1)', border: '1px solid rgba(78,205,196,0.3)' }}>
            <div className="text-2xl font-black text-white">{stats.waterCups}</div>
            <div className="text-xs text-gray-400">cups of water ≈</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}>
            <div className="text-lg font-black text-white">{stats.waterBaths}x</div>
            <div className="text-xs text-gray-400">of a bathtub (wild right? 😂)</div>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'workouts',
    bg: 'linear-gradient(135deg, #1a0500 0%, #0D0D1A 100%)',
    content: (stats) => (
      <div className="flex flex-col items-center text-center gap-4 h-full justify-center px-6">
        <motion.div className="text-6xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
          🏋️
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="text-xs uppercase tracking-widest" style={{ color: '#FF6B35' }}>Gym Sessions</div>
          <div className="text-7xl font-black my-2" style={{ color: '#FF6B35' }}>{stats.gymDays}</div>
          <div className="text-sm text-gray-400">out of 7 days</div>
        </motion.div>
        <motion.div className="grid grid-cols-2 gap-3 w-full mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)' }}>
            <div className="text-3xl font-black text-white">{stats.walkDays}</div>
            <div className="text-xs text-gray-400">🚶 Walk days</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,230,109,0.1)', border: '1px solid rgba(255,230,109,0.3)' }}>
            <div className="text-3xl font-black text-white">~{stats.stepsEstimate}</div>
            <div className="text-xs text-gray-400">👟 Est. steps</div>
          </div>
          <div className="rounded-2xl p-3 col-span-2" style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}>
            <div className="text-3xl font-black" style={{ color: '#4ECDC4' }}>{stats.readDays}</div>
            <div className="text-xs text-gray-400">📖 Days you read 10+ pages</div>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'mood',
    bg: 'linear-gradient(135deg, #0a001a 0%, #0D0D1A 100%)',
    content: (stats) => {
      const moodLabels: Record<string, string> = { great: 'Great', good: 'Good', meh: 'Meh', bad: 'Bad', terrible: 'Rough' };
      const moodColors: Record<string, string> = { great: '#4ECDC4', good: '#A78BFA', meh: '#FFE66D', bad: '#FF6B35', terrible: '#FF6B6B' };
      return (
        <div className="flex flex-col items-center text-center gap-4 h-full justify-center px-6">
          <motion.div className="text-6xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
            {stats.dominantMoodEmoji}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="text-xs uppercase tracking-widest text-purple-400 mb-1">Your Vibe This Week</div>
            <div className="text-4xl font-black mb-1" style={{ color: moodColors[stats.dominantMood] ?? '#A78BFA' }}>
              {moodLabels[stats.dominantMood] ?? 'Mixed'}
            </div>
            <div className="text-sm text-gray-400">was your dominant mood</div>
          </motion.div>
          <motion.div className="grid grid-cols-3 gap-2 w-full mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)' }}>
              <div className="text-2xl font-black" style={{ color: '#FF6B35' }}>{stats.avgEnergy}</div>
              <div className="text-xs text-gray-500">⚡ Avg energy</div>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(78,205,196,0.1)', border: '1px solid rgba(78,205,196,0.25)' }}>
              <div className="text-2xl font-black" style={{ color: '#4ECDC4' }}>{stats.avgMotivation}</div>
              <div className="text-xs text-gray-500">🔥 Motivation</div>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,230,109,0.1)', border: '1px solid rgba(255,230,109,0.25)' }}>
              <div className="text-2xl font-black" style={{ color: '#FFE66D' }}>{stats.avgMood}</div>
              <div className="text-xs text-gray-500">😊 Avg mood</div>
            </div>
          </motion.div>
          {parseFloat(stats.avgEnergy) < 2.5 && (
            <motion.p className="text-xs text-yellow-400 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              ⚠️ Energy was low — prioritize sleep & nutrition next week
            </motion.p>
          )}
        </div>
      );
    },
  },
  {
    id: 'perfect',
    bg: 'linear-gradient(135deg, #001a10 0%, #0D0D1A 100%)',
    content: (stats, weekNum) => (
      <div className="flex flex-col items-center text-center gap-4 h-full justify-center px-6">
        <motion.div
          className="text-7xl"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 1, delay: 0.3, repeat: 1 }}
        >
          {stats.completeDays === 7 ? '🏆' : stats.completeDays >= 5 ? '⭐' : '💪'}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="text-xs uppercase tracking-widest text-green-400 mb-2">Complete Days</div>
          <div className="text-7xl font-black" style={{ color: stats.completeDays === 7 ? '#FFE66D' : '#4ECDC4' }}>
            {stats.completeDays}
          </div>
          <div className="text-sm text-gray-400 mt-1">perfect days out of 7</div>
          {stats.completeDays === 7 && (
            <motion.div
              className="mt-3 text-sm font-bold px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,230,109,0.2)', border: '1px solid rgba(255,230,109,0.4)', color: '#FFE66D' }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🔥 FLAWLESS WEEK {weekNum}! 🔥
            </motion.div>
          )}
          {stats.bestStreak > 1 && (
            <div className="mt-3 text-xs text-gray-400">
              Best streak within week: <span style={{ color: '#FF6B35', fontWeight: 700 }}>{stats.bestStreak} days</span>
            </div>
          )}
        </motion.div>
        <motion.div
          className="text-sm text-gray-300 rounded-2xl p-4 mt-2"
          style={{ background: 'rgba(78,205,196,0.07)', border: '1px solid rgba(78,205,196,0.2)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {stats.completeDays >= 6
            ? '"You are not building a workout habit. You are building an unbreakable identity."'
            : '"Every day you showed up was a victory. Even imperfect action beats perfect inaction."'}
        </motion.div>
      </div>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WeeklyWrapped({ visible, onDismiss, weekNumber, startDate }: WeeklyWrappedProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [stats, setStats] = useState<ReturnType<typeof buildStats> | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setSlideIndex(0);
      const logs = loadWeekLogs(startDate);
      setStats(buildStats(logs));
    }
  }, [visible, startDate]);

  const nextSlide = () => setSlideIndex((p) => Math.min(p + 1, SLIDES.length - 1));
  const prevSlide = () => setSlideIndex((p) => Math.max(p - 1, 0));

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -40) nextSlide();
    else if (dx > 40) prevSlide();
    setTouchStartX(null);
  };

  if (!visible || !stats) return null;

  const currentSlide = SLIDES[slideIndex];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* ── Slide card ── */}
        <motion.div
          className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden"
          style={{ height: '75vh', maxHeight: '600px', background: currentSlide.bg }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {/* Progress dots */}
          <div className="absolute top-4 left-0 right-0 flex gap-1.5 px-4 z-10">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i <= slideIndex ? '#FF6B35' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-6 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            ✕
          </button>

          {/* Slide content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              className="w-full h-full pt-12"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {currentSlide.content(stats, weekNumber)}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6">
            <motion.button
              onClick={prevSlide}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: slideIndex === 0 ? 'transparent' : '#fff',
                pointerEvents: slideIndex === 0 ? 'none' : 'auto',
              }}
              whileTap={{ scale: 0.9 }}
            >
              ← Back
            </motion.button>

            {slideIndex < SLIDES.length - 1 ? (
              <motion.button
                onClick={nextSlide}
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#FF6B35', color: '#fff' }}
                whileTap={{ scale: 0.9 }}
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                onClick={onDismiss}
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#4ECDC4', color: '#0D0D1A' }}
                whileTap={{ scale: 0.9 }}
              >
                Let&apos;s go! 🔥
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
