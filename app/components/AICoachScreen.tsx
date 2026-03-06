'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getAppState, getDailyLog, getToday } from '../lib/storage';
import { useEffect, useState, useCallback } from 'react';
import { AppState, DailyLog } from '../lib/types';
import { askGemini } from '../lib/gemini';

function buildCoachPrompt(state: AppState, log: DailyLog | null): string {
  const moodMap: Record<string, string> = { great: 'great', good: 'good', meh: 'okay', bad: 'bad', terrible: 'terrible', '': 'unknown' };
  const tasks = [
    log?.gymWorkoutDone ? 'gym workout ✓' : 'gym workout ✗',
    log?.outdoorWalkDone ? 'outdoor walk ✓' : 'outdoor walk ✗',
    log?.waterGoalMet ? '3.8L water ✓' : `water ${(log?.waterLiters ?? 0).toFixed(1)}L (goal 3.8L) ✗`,
    log?.readingDone ? 'reading ✓' : 'reading ✗',
    log?.moodEmoji ? `mood: ${moodMap[log.moodEmoji]}` : 'mood: not logged',
  ].join(', ');

  return `You are an elite fitness & mindset coach for Iron75, a grueling 75-day transformation challenge. 
User stats: Day ${state.currentDay}/75, current streak ${state.streak} days, longest streak ${state.longestStreak}.
Today's tasks: ${tasks}.
Energy level: ${log?.energyLevel ?? 3}/5, Motivation: ${log?.motivationLevel ?? 3}/5, Soreness: ${log?.sorenessLevel ?? 3}/5.

Give a short, POWERFUL, personalized coaching insight (3-4 sentences). Be direct, motivating, and specific to their numbers. 
Use Duolingo-style energy — fun but tough. Add ONE practical tip. End with a fire emoji or motivational symbol. No fluff.`;
}

function buildPatternPrompt(state: AppState, recentLogs: DailyLog[]): string {
  const moodMap: Record<string, number> = { great: 5, good: 4, meh: 3, bad: 2, terrible: 1 };
  const avgMood = recentLogs.length
    ? (recentLogs.map((l) => moodMap[l.moodEmoji] ?? 3).reduce((a, b) => a + b, 0) / recentLogs.length).toFixed(1)
    : '?';
  const gymDays = recentLogs.filter((l) => l.gymWorkoutDone).length;
  const avgWater = recentLogs.length
    ? (recentLogs.reduce((s, l) => s + l.waterLiters, 0) / recentLogs.length).toFixed(1)
    : '?';
  const avgEnergy = recentLogs.length
    ? (recentLogs.reduce((s, l) => s + l.energyLevel, 0) / recentLogs.length).toFixed(1)
    : '?';

  return `You are an elite Iron75 coach analyzing the last ${recentLogs.length} days of data.
Stats: Day ${state.currentDay}/75, streak ${state.streak}, avg mood ${avgMood}/5, gym ${gymDays}/${recentLogs.length} days, avg water ${avgWater}L, avg energy ${avgEnergy}/5.

Identify ONE key pattern (positive or negative) and give a specific, actionable strategy to improve. 
Be brutally honest but encouraging. Use bold language. Max 4 sentences. Add relevant emoji.`;
}

const MOOD_EMOJI_MAP: Record<string, string> = {
  great: '😄', good: '🙂', meh: '😐', bad: '😞', terrible: '😩',
};

function getMoodEmoji(moodEmoji: string): string {
  return MOOD_EMOJI_MAP[moodEmoji] ?? '—';
}

const CHALLENGES = [
  { id: 'tip', icon: '🔥', label: 'Today\'s Power Tip', prompt: (s: AppState, l: DailyLog | null) => buildCoachPrompt(s, l) },
  { id: 'pattern', icon: '📈', label: 'Pattern Analysis', prompt: null },
  { id: 'motivation', icon: '⚡', label: 'Hype Me Up!', prompt: (s: AppState) => `Day ${s.currentDay}/75, streak ${s.streak} days. Give me a short, EXPLOSIVE motivational speech (3 sentences). Make it feel like a final-minutes-of-a-championship-game speech. Ultra intense. 🔥` },
  { id: 'recovery', icon: '🛌', label: 'Recovery Tips', prompt: () => 'Give me 4 science-backed recovery tips for someone doing daily intense PPL gym workouts plus a 45-min outdoor walk every day. Focus on sleep, nutrition timing, and soreness management. Be specific and practical.' },
];

export default function AICoachScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setState(getAppState());
    setLog(getDailyLog(getToday()));
  }, []);

  const handleAsk = useCallback(async (challengeId: string) => {
    if (!state) return;
    setActiveChallenge(challengeId);

    // Check cache via functional access to avoid stale closure
    const isCached = await new Promise<boolean>((resolve) => {
      setResponses((prev) => {
        resolve(!!prev[challengeId]);
        return prev;
      });
    });
    if (isCached) return;

    setLoading(challengeId);
    let prompt = '';

    if (challengeId === 'pattern') {
      // Load last 7 logs
      const recentLogs: DailyLog[] = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const log = getDailyLog(dateStr);
        if (log) recentLogs.push(log);
      }
      prompt = buildPatternPrompt(state, recentLogs);
    } else {
      const ch = CHALLENGES.find((c) => c.id === challengeId);
      if (ch?.prompt) {
        prompt = ch.prompt(state, log);
      }
    }

    const text = await askGemini(prompt, challengeId);
    setResponses((prev) => ({ ...prev, [challengeId]: text }));
    setLoading(null);
  }, [state, log]);

  // Auto-load today's tip on mount (runs once after state is ready)
  useEffect(() => {
    if (!mounted || !state) return;
    // Only auto-load if not already cached
    setActiveChallenge((prev) => prev ?? 'tip');
    if (!responses['tip']) {
      handleAsk('tip');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #00F5D4, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Coach 🤖</h1>
        <p className="text-xs text-gray-500 mt-0.5">Powered by Google Gemini — your personal Iron75 coach</p>
      </motion.div>

      {/* Challenge selector pills */}
      <motion.div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {CHALLENGES.map((ch) => {
          const isActive = activeChallenge === ch.id;
          return (
            <motion.button
              key={ch.id}
              onClick={() => handleAsk(ch.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap"
              style={{
              background: isActive ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
              color: isActive ? '#00F5D4' : '#64748b',
              boxShadow: isActive ? '0 0 16px rgba(0,245,212,0.12)' : 'none',
              }}
              whileTap={{ scale: 0.9 }}
            >
              {ch.icon} {ch.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Response area */}
      <AnimatePresence mode="wait">
        {CHALLENGES.map((ch) => {
          if (activeChallenge !== ch.id) return null;
          const isLoading = loading === ch.id;
          const text = responses[ch.id];
          return (
            <motion.div
              key={ch.id}
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.06), rgba(6,6,15,0.95))', border: '1px solid rgba(0,245,212,0.25)', boxShadow: '0 0 20px rgba(0,245,212,0.05)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{ch.icon}</span>
                <span className="font-bold text-sm uppercase tracking-wide" style={{ color: '#00F5D4' }}>{ch.label}</span>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <motion.span className="text-2xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚙️</motion.span>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-2 rounded-full animate-pulse" style={{ background: '#141432', width: '80%' }} />
                    <div className="h-2 rounded-full animate-pulse" style={{ background: '#141432', width: '60%' }} />
                    <div className="h-2 rounded-full animate-pulse" style={{ background: '#141432', width: '70%' }} />
                  </div>
                </div>
              ) : text ? (
                <motion.p
                  className="text-sm leading-relaxed text-gray-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {text}
                </motion.p>
              ) : null}

              {!isLoading && text && (
                <motion.button
                  onClick={() => {
                    setResponses((prev) => { const n = { ...prev }; delete n[ch.id]; return n; });
                    handleAsk(ch.id);
                  }}
                  className="mt-3 text-xs font-semibold"
                  style={{ color: '#00F5D4', opacity: 0.7 }}
                  whileTap={{ scale: 0.9 }}
                >
                  🔄 Refresh
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Day stats mini-cards */}
      {state && (
        <motion.div
          className="grid grid-cols-2 gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { label: 'Challenge Day', value: `${state.currentDay}/75`, color: '#FF6B35', icon: '📅' },
            { label: 'Streak', value: `${state.streak} 🔥`, color: '#FF6B35', icon: '🔥' },
            { label: 'Longest Streak', value: `${state.longestStreak} days`, color: '#00F5D4', icon: '🏆' },
            { label: 'Today\'s Mood', value: log?.moodEmoji ? getMoodEmoji(log.moodEmoji) : '—', color: '#FFE66D', icon: '😊' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-xl mb-0.5">{item.icon}</div>
              <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
