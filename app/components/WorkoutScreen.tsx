'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getToday } from '../lib/storage';

// ─── PPL Schedule data ─────────────────────────────────────────────────────────
const PPL_SCHEDULE: Record<number, { session: string; muscles: string; emoji: string }> = {
  0: { session: 'Mobility', muscles: 'Full body flexibility + stretch', emoji: '🧘' },
  1: { session: 'Push A', muscles: 'Chest, Front Delts, Triceps', emoji: '💪' },
  2: { session: 'Pull A', muscles: 'Back, Rear Delts, Biceps', emoji: '🏋️' },
  3: { session: 'Legs A', muscles: 'Quads, Hamstrings, Calves, Glutes', emoji: '🦵' },
  4: { session: 'Push B', muscles: 'Chest (incline), Shoulders, Triceps', emoji: '💪' },
  5: { session: 'Pull B', muscles: 'Back (row focus), Biceps variations', emoji: '🏋️' },
  6: { session: 'Legs B', muscles: 'Legs — posterior chain focus', emoji: '🦵' },
};

export default function WorkoutScreen() {
  const [todaySession, setTodaySession] = useState<{ session: string; muscles: string; emoji: string } | null>(null);

  useEffect(() => {
    const dow = new Date(getToday() + 'T12:00:00').getDay();
    setTodaySession(PPL_SCHEDULE[dow]);
  }, []);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* Header */}
      <motion.div
        className="rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, #1a0800 0%, #0D0D1A 100%)',
          border: '1px solid #FF6B3555',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#FF6B35', opacity: 0.7 }}>
          Today&apos;s Session
        </div>
        {todaySession && (
          <div className="flex items-center gap-3">
            <span className="text-5xl">{todaySession.emoji}</span>
            <div>
              <h1 className="text-3xl font-black" style={{ color: '#FF6B35' }}>
                {todaySession.session}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{todaySession.muscles}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Build notice */}
      <motion.div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-4xl mb-3">🏗️</div>
        <h2 className="text-lg font-bold text-white mb-2">Workout Module — Coming Next</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Full exercise list with set/rep tracking, warm-up section, and session timer are being built by the Background Agent.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500">
          <span>• Exercise cards for Push / Pull / Legs / Mobility</span>
          <span>• Individual set checkboxes with notes</span>
          <span>• Session complete → marks gymWorkoutDone ✅</span>
        </div>
      </motion.div>

      {/* Quick complete for today */}
      <motion.div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(78,205,196,0.06)', border: '1px solid #4ECDC455' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm text-gray-300 mb-3">
          For now, mark your workout complete from the <strong style={{ color: '#FF6B35' }}>Today</strong> tab.
        </p>
      </motion.div>
    </div>
  );
}
