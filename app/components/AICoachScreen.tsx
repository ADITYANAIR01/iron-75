'use client';

import { motion } from 'framer-motion';
import { getAppState } from '../lib/storage';
import { getDailyTip } from '../lib/aiTips';
import { useEffect, useState } from 'react';
import { AppState } from '../lib/types';

export default function AICoachScreen() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    setState(getAppState());
  }, []);

  const tip = state ? getDailyTip(state.currentDay) : '';

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ color: '#4ECDC4' }}>AI Coach</h1>
        <p className="text-xs text-gray-500 mt-0.5">Powered by Google Gemini Flash (Supabase Edge Functions)</p>
      </motion.div>

      {/* Daily insight */}
      {tip && (
        <motion.div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid #4ECDC4' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: '#4ECDC4' }}>
              Daily Insight — Day {state?.currentDay}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
        </motion.div>
      )}

      {/* Pattern alerts placeholder */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📊</span>
          <span className="font-bold text-sm" style={{ color: '#FF6B35' }}>Pattern Analysis</span>
        </div>
        <p className="text-sm text-gray-400">
          When you have 7+ days of data, Gemini will analyze patterns via Supabase Edge Functions — low mood streaks, declining energy, missed workouts — and give you targeted advice.
        </p>
      </motion.div>

    </div>
  );
}
