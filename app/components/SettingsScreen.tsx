'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { getAppState, saveAppState, getToday, saveProfileName } from '../lib/storage';
import { AppState } from '../lib/types';
import { useAuth } from './AuthProvider';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setState(getAppState());
    const savedName = localStorage.getItem('iron75_user_name') ?? '';
    setName(savedName);
  }, []);

  const handleNameSave = () => {
    saveProfileName(name);
  };

  // Save name on unmount (in case user navigates away without blur)
  const nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    return () => { saveProfileName(nameRef.current); };
  }, []);

  const handleRestartChallenge = () => {
    if (!state) return;
    const newState: AppState = {
      ...state,
      streak: 0,
      currentDay: 1,
      startDate: getToday(),
      totalRestarts: state.totalRestarts + 1,
    };
    saveAppState(newState);
    setState(newState);
    setShowConfirmReset(false);
    setToast('Challenge restarted. Day 1 begins today! 🔥');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #F1F5F9, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</h1>
      </motion.div>

      {/* Profile section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Profile</h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e2e8f0',
            }}
          />
          <p className="text-xs text-gray-500">Changes saved automatically.</p>
        </div>
      </motion.div>

      {/* Stats section */}
      {state && (
        <motion.div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Challenge Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Current Day', value: state.currentDay, color: '#FF6B35' },
              { label: 'Current Streak', value: `${state.streak} 🔥`, color: '#FF6B35' },
              { label: 'Longest Streak', value: state.longestStreak, color: '#00F5D4' },
              { label: 'Total Restarts', value: state.totalRestarts, color: '#FFE66D' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-2xl font-black" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Started: {state.startDate}
          </div>
        </motion.div>
      )}

      {/* Notifications placeholder */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">10 PM daily reminder</p>
            <p className="text-xs text-gray-500 mt-0.5">Push notifications — coming soon</p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs"
              style={{ background: 'rgba(255,107,53,0.1)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}
          >
            Pending
          </div>
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="font-bold text-sm text-red-400 uppercase tracking-wide mb-3">Danger Zone</h2>

        {!showConfirmReset ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirmReset(true)}
            className="w-full py-3 rounded-xl text-sm font-bold text-red-400"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            🔄 Restart Challenge (Day 1)
          </motion.button>
        ) : (
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm text-red-300 mb-2">
              Are you sure? Streak resets to 0. Restart count increases. No undo.
            </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRestartChallenge}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'rgba(220,38,38,0.5)' }}
              >
                Yes, Restart
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Account section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Account</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Signed in as</p>
              <p className="text-xs mt-0.5" style={{ color: '#00F5D4' }}>{user?.email ?? 'Unknown'}</p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,245,212,0.1)', color: '#00F5D4', border: '1px solid rgba(0,245,212,0.3)' }}
            >
              Supabase
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Data syncs to cloud automatically. Works offline too.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={signOut}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          >
            🚪 Sign Out
          </motion.button>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-2xl mb-2">🔥</p>
        <p className="font-black text-lg" style={{ background: 'linear-gradient(135deg, #FF6B35, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IRON75</p>
        <p className="text-xs text-gray-500 mt-1">v0.3.0 — Neon Dark Redesign</p>
        <p className="text-xs text-gray-500">Next.js · TypeScript · Tailwind · Supabase · Framer Motion</p>
        <a
          href="https://github.com"
          className="text-xs mt-2 block underline"
          style={{ color: '#00F5D4' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub →
        </a>
      </motion.div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-bold text-center"
            style={{ background: '#FF6B35', color: '#06060F', boxShadow: '0 4px 20px rgba(255,107,53,0.4)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
