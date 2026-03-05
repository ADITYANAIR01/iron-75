'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { getAppState, saveAppState, getToday, saveProfileName, generateExportHTML, deleteAllData, resetForFreshStart } from '../lib/storage';
import { AppState } from '../lib/types';
import { useAuth } from './AuthProvider';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmFreshStart, setShowConfirmFreshStart] = useState(false);
  const [freshStartUsed, setFreshStartUsed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setState(getAppState());
    // Auto-populate name from Google account if available and no local name saved
    const savedName = localStorage.getItem('iron75_user_name') ?? '';
    if (!savedName && user) {
      const googleName: string =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        '';
      if (googleName) {
        setName(googleName);
        saveProfileName(googleName);
      } else {
        setName('');
      }
    } else {
      setName(savedName);
    }
    setFreshStartUsed(localStorage.getItem('iron75_fresh_start_used') === 'true');
  }, [user]);

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

  const handleFreshStartTomorrow = async () => {
    setResetting(true);
    try {
      // Tomorrow's date in local timezone
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${y}-${m}-${d}`;

      await resetForFreshStart(tomorrowStr);
      setState(getAppState());
      setFreshStartUsed(true);
      setShowConfirmFreshStart(false);
      setToast(`All data wiped! Day 1 starts ${tomorrowStr} 🔥`);
      setTimeout(() => {
        setToast('');
        window.location.reload();
      }, 3000);
    } catch {
      setToast('Reset failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setResetting(false);
    }
  };

  const handleExportData = () => {
    try {
      const html = generateExportHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iron75_export_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast('Data exported successfully! 📁');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Export failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleDeleteAllData = async () => {
    setDeleting(true);
    try {
      await deleteAllData();
      setState(null);
      setName('');
      setShowConfirmDelete(false);
      setToast('All data deleted permanently. 🗑️');
      setTimeout(() => {
        setToast('');
        window.location.reload();
      }, 2000);
    } catch {
      setToast('Delete failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setDeleting(false);
    }
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

      {/* Data Management section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Data Management</h2>
        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleExportData}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.25)', color: '#00F5D4' }}
          >
            📊 Export All Data (HTML Report)
          </motion.button>
          <p className="text-xs text-gray-500">
            Downloads a beautiful HTML report with all your challenge stats, daily logs, and progress.
          </p>
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

        {/* Fresh Start Tomorrow — one-time only */}
        <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(220,38,38,0.2)' }}>
          {freshStartUsed ? (
            <div
              className="w-full py-3 px-4 rounded-xl text-sm flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-bold text-gray-400 text-xs">Already Used</p>
                <p className="text-gray-500 text-xs mt-0.5">Fresh start was applied. This action can only be done once.</p>
              </div>
            </div>
          ) : !showConfirmFreshStart ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConfirmFreshStart(true)}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.5)', color: '#FF6B35' }}
            >
              🚀 Reset Everything & Start Fresh Tomorrow
            </motion.button>
          ) : (
            <motion.div className="flex flex-col gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-sm font-bold" style={{ color: '#FF6B35' }}>⚠️ This wipes ALL test data!</p>
              <p className="text-xs text-red-300/70 mb-2">
                All daily logs, streaks, and progress photos will be permanently deleted from this
                device and Supabase. Your account stays. Day 1 will be set to tomorrow.
                This can only be done <strong>once</strong>.
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFreshStartTomorrow}
                  disabled={resetting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'rgba(255,107,53,0.6)', opacity: resetting ? 0.5 : 1 }}
                >
                  {resetting ? '⏳ Resetting...' : '🚀 Yes, Fresh Start Tomorrow'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmFreshStart(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

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

        {/* Delete All Data */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(220,38,38,0.2)' }}>
          {!showConfirmDelete ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-red-400"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)' }}
            >
              🗑️ Delete All Data Permanently
            </motion.button>
          ) : (
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-red-300 mb-1 font-bold">⚠️ This CANNOT be undone!</p>
              <p className="text-xs text-red-300/70 mb-2">
                All your data will be permanently deleted from this device AND from Supabase cloud,
                including daily logs, progress photos, challenge stats, and profile info.
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteAllData}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'rgba(220,38,38,0.7)', opacity: deleting ? 0.5 : 1 }}
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Yes, Delete Everything'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
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
