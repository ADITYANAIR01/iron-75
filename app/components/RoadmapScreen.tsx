'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAppState } from '../lib/storage';

const MILESTONES = [
  {
    day: 7,
    title: 'First Week Warrior',
    emoji: '⚡',
    description: 'You showed up 7 days straight. Most people quit here. You didn\'t.',
    color: '#FF6B35',
    badge: '🥉',
  },
  {
    day: 14,
    title: 'Two-Week Beast',
    emoji: '🔥',
    description: 'Habits are forming. Your brain is rewiring. This is where the magic begins.',
    color: '#FFE66D',
    badge: '🥈',
  },
  {
    day: 21,
    title: '21-Day Lock-In',
    emoji: '🧠',
    description: '21 days. Science says a new habit is cemented. You\'re not starting anymore — you\'re living it.',
    color: '#4ECDC4',
    badge: '🏅',
  },
  {
    day: 30,
    title: 'One Month Gladiator',
    emoji: '🏟️',
    description: 'A full month of iron discipline. Your body and mind have transformed beyond what you can see in the mirror.',
    color: '#A855F7',
    badge: '🥇',
  },
  {
    day: 50,
    title: 'Halfway Plus Hero',
    emoji: '💎',
    description: 'Past the halfway mark and then some. At Day 50 you have already outperformed 95% of people who started.',
    color: '#FF6B9D',
    badge: '💎',
  },
  {
    day: 75,
    title: 'IRON 75 COMPLETE',
    emoji: '🏆',
    description: 'You did it. 75 days of no excuses, no shortcuts, no compromises. You are built different now.',
    color: '#FF6B35',
    badge: '🏆',
  },
];

const PHASES = [
  {
    range: [1, 7],
    name: 'Foundation',
    icon: '🧱',
    color: '#FF6B35',
    description: 'Build the daily habit. Every action is a vote for who you are becoming.',
  },
  {
    range: [8, 21],
    name: 'Momentum',
    icon: '🚀',
    color: '#FFE66D',
    description: 'The groove forms. Soreness fades. Energy rises. Don\'t stop now.',
  },
  {
    range: [22, 40],
    name: 'Forging',
    icon: '🔥',
    color: '#00F5D4',
    description: 'You\'re being forged in the fire. Discipline is no longer an effort — it\'s identity.',
  },
  {
    range: [41, 60],
    name: 'Elite',
    icon: '💎',
    color: '#A855F7',
    description: 'You\'ve entered elite territory. Less than 10% of challengers make it here.',
  },
  {
    range: [61, 75],
    name: 'Legacy',
    icon: '🏆',
    color: '#FF6B9D',
    description: 'The final stretch. You are writing the story of your transformation.',
  },
];

const PHASE_QUOTES: Record<string, string> = {
  Foundation: '"The secret to getting ahead is getting started." — Mark Twain',
  Momentum: '"Success is the sum of small efforts, repeated day in and day out." — Robert Collier',
  Forging: '"We are what we repeatedly do. Excellence then is not an act, but a habit." — Aristotle',
  Elite: '"Champions aren\'t made in gyms. Champions are made from something deep inside them." — Muhammad Ali',
  Legacy: '"It\'s not about the destination. It\'s about who you become along the way." — Iron75',
};

function buildWeeks(currentDay: number) {
  const weeks = [];
  for (let w = 0; w < 11; w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min(startDay + 6, 75);
    const milestone = MILESTONES.find((m) => m.day >= startDay && m.day <= endDay);
    const phase = PHASES.find((p) => startDay >= p.range[0] && startDay <= p.range[1]);
    const weekStatus =
      endDay < currentDay ? 'complete' : startDay <= currentDay ? 'current' : 'future';
    weeks.push({ week: w + 1, startDay, endDay, milestone, phase, weekStatus });
  }
  return weeks;
}

export default function RoadmapScreen() {
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedMilestone, setSelectedMilestone] = useState<typeof MILESTONES[0] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = getAppState();
    setCurrentDay(state.currentDay);
  }, []);

  const weeks = buildWeeks(currentDay);
  const currentPhase = PHASES.find((p) => currentDay >= p.range[0] && currentDay <= p.range[1]) ?? PHASES[0];
  const nextMilestone = MILESTONES.find((m) => m.day >= currentDay);
  const daysToNextMilestone = nextMilestone ? nextMilestone.day - currentDay : 0;
  const completedMilestones = MILESTONES.filter((m) => m.day < currentDay);
  const progressPct = ((currentDay - 1) / 74) * 100;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="text-4xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          🗺️
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #FF6B35, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Roadmap 🗺️</h1>
        <p className="text-sm text-gray-400 mt-1">Your 75-day transformation journey</p>
      </motion.div>

      {/* ── Current Phase Banner ─────────────────────────────────────────── */}
      <motion.div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentPhase.color}15 0%, rgba(6,6,15,0.95) 100%)`,
          border: `1px solid ${currentPhase.color}40`,
          boxShadow: `0 0 40px ${currentPhase.color}08`,
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        <div className="absolute top-0 right-0 text-8xl opacity-10 -mr-4 -mt-2">{currentPhase.icon}</div>
        <div className="relative">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: currentPhase.color }}>
            Phase {PHASES.indexOf(currentPhase) + 1} of 5
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{currentPhase.icon}</span>
            <h2 className="text-2xl font-black text-white">Phase: {currentPhase.name}</h2>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">{currentPhase.description}</p>
          <p className="text-xs italic" style={{ color: currentPhase.color, opacity: 0.8 }}>
            {PHASE_QUOTES[currentPhase.name]}
          </p>
        </div>
      </motion.div>

      {/* ── Overall Progress ─────────────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="font-bold text-white">Overall Progress</span>
          <span className="font-black" style={{ color: '#FF6B35' }}>Day {currentDay} / 75</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden" style={{ background: '#141432' }}>
          <motion.div
            className="h-full rounded-full relative"
            style={{ background: 'linear-gradient(90deg, #FF6B35, #A855F7, #00F5D4)', boxShadow: '0 0 12px rgba(255,107,53,0.3)' }}
            animate={{ width: `${progressPct}%` }}
            initial={{ width: '0%' }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          >
            <div className="absolute right-0 top-0 h-full w-4 flex items-center justify-center text-xs">
              🔥
            </div>
          </motion.div>
        </div>
        <div className="flex justify-between text-xs mt-2 text-gray-500">
          <span>Day 1</span>
          {nextMilestone && (
            <span style={{ color: nextMilestone.color }}>
              {daysToNextMilestone === 0 ? '🎉 Milestone today!' : `${daysToNextMilestone}d → ${nextMilestone.title}`}
            </span>
          )}
          <span>Day 75</span>
        </div>
      </motion.div>

      {/* ── Earned Badges ─────────────────────────────────────────────────── */}
      {completedMilestones.length > 0 && (
        <motion.div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-bold text-white mb-3">🏅 Earned Badges</h3>
          <div className="flex flex-wrap gap-2">
            {completedMilestones.map((m) => (
              <motion.button
                key={m.day}
                onClick={() => setSelectedMilestone(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: `${m.color}22`,
                  border: `1px solid ${m.color}55`,
                  color: m.color,
                }}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <span>{m.badge}</span>
                <span>{m.title}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Week-by-Week Timeline ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-bold text-white mb-3">📅 Week-by-Week Journey</h3>
        <div className="flex flex-col gap-2">
          {weeks.map((week, idx) => {
            const isComplete = week.weekStatus === 'complete';
            const isCurrent = week.weekStatus === 'current';
            const isFuture = week.weekStatus === 'future';
            const phaseColor = week.phase?.color ?? '#4ECDC4';

            return (
              <motion.div
                key={week.week}
                className="rounded-2xl p-4"
                style={{
                  background: isComplete
                    ? `${phaseColor}10`
                    : isCurrent
                    ? `${phaseColor}12`
                    : 'rgba(12,12,30,0.5)',
                  border: `1px solid ${isComplete ? phaseColor + '35' : isCurrent ? phaseColor + '50' : 'rgba(255,255,255,0.04)'}`,
                  opacity: isFuture ? 0.5 : 1,
                  boxShadow: isCurrent ? `0 0 20px ${phaseColor}10` : 'none',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isFuture ? 0.55 : 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                      style={{
                        background: isComplete
                          ? phaseColor
                          : isCurrent
                          ? `${phaseColor}35`
                          : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${isComplete || isCurrent ? phaseColor : 'rgba(255,255,255,0.08)'}`,
                        color: isComplete ? '#06060F' : isCurrent ? phaseColor : '#4a4a6a',
                        boxShadow: isComplete ? `0 0 12px ${phaseColor}40` : 'none',
                      }}
                    >
                      {isComplete ? '✓' : isCurrent ? '▶' : week.week}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm" style={{ color: isFuture ? '#4a4a6a' : '#e2e8f0' }}>
                          Week {week.week}
                        </span>
                        {week.phase && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: `${phaseColor}22`, color: phaseColor }}
                          >
                            {week.phase.icon} {week.phase.name}
                          </span>
                        )}
                        {isCurrent && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
                            style={{ background: '#FF6B35', color: '#fff' }}
                          >
                            NOW
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Day {week.startDay}–{week.endDay}
                      </div>
                    </div>
                  </div>

                  {/* Milestone badge */}
                  {week.milestone && (
                    <motion.button
                      onClick={() => setSelectedMilestone(week.milestone!)}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl"
                      style={{
                        background: isComplete ? `${week.milestone.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isComplete ? week.milestone.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="text-xl">{week.milestone.badge}</span>
                      <span className="text-xs text-gray-500" style={{ maxWidth: '60px', textAlign: 'center', lineHeight: '1.2' }}>
                        Day {week.milestone.day}
                      </span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Milestone Detail Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMilestone && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMilestone(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{
                background: `linear-gradient(135deg, ${selectedMilestone.color}15, #06060F)`,
                border: `2px solid ${selectedMilestone.color}40`,
                boxShadow: `0 0 40px ${selectedMilestone.color}15`,
              }}
              initial={{ y: 80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-3">{selectedMilestone.badge}</div>
              <div className="text-lg font-black text-white mb-1">{selectedMilestone.title}</div>
              <div
                className="text-sm font-bold mb-4"
                style={{ color: selectedMilestone.color }}
              >
                Day {selectedMilestone.day} Milestone
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                {selectedMilestone.description}
              </p>
              <motion.button
                onClick={() => setSelectedMilestone(null)}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{
                  background: selectedMilestone.color,
                  color: '#06060F',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {selectedMilestone.day <= currentDay ? '🏅 Badge Earned!' : `${selectedMilestone.day - currentDay} days away`}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
