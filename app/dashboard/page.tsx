'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TabId, AppMode } from '../lib/types';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { syncFromSupabase, getAppState, saveAppState, isWrappedShown, markWrappedShown as markWrappedShownStorage, localDateString } from '../lib/storage';

const LoginScreen = dynamic(() => import('../components/LoginScreen'), { ssr: false });
const TodayScreen = dynamic(() => import('../components/TodayScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
    </div>
  ),
});
const WorkoutScreen = dynamic(() => import('../components/WorkoutScreen'), { ssr: false });
const ProgressScreen = dynamic(() => import('../components/ProgressScreen'), { ssr: false });
const AICoachScreen = dynamic(() => import('../components/AICoachScreen'), { ssr: false });
const RoadmapScreen = dynamic(() => import('../components/RoadmapScreen'), { ssr: false });
const SettingsScreen = dynamic(() => import('../components/SettingsScreen'), { ssr: false });
const WeeklyWrapped = dynamic(() => import('../components/WeeklyWrapped'), { ssr: false });

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'today',   icon: '🏠', label: 'Today'   },
  { id: 'workout', icon: '💪', label: 'Workout'  },
  { id: 'progress',icon: '📊', label: 'Progress' },
  { id: 'ai',      icon: '🤖', label: 'Coach'    },
  { id: 'roadmap', icon: '🗺️', label: 'Roadmap'  },
];

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh" style={{ background: '#06060F' }}>
        <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}

function shouldShowWrapped(currentDay: number): boolean {
  if (typeof window === 'undefined') return false;
  if (currentDay < 7) return false;
  // Trigger at weekly milestones (7, 14, 21, …) and also at challenge end (75).
  const isWeekEnd = currentDay % 7 === 0;
  const isChallengeEnd = currentDay >= 75;
  if (!isWeekEnd && !isChallengeEnd) return false;
  const weekNum = isWeekEnd ? Math.floor(currentDay / 7) : Math.ceil(currentDay / 7);
  return !isWrappedShown(weekNum);
}

function markWrappedShown(weekNum: number) {
  markWrappedShownStorage(weekNum);
}

function getWeekStartDate(currentDay: number, startDate: string): string {
  const weekNum = Math.floor(currentDay / 7);
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return localDateString(d);
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedWeek, setWrappedWeek] = useState(1);
  const [wrappedStartDate, setWrappedStartDate] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('workout');
  const [modeKey, setModeKey] = useState(0);
  const [showModeModal, setShowModeModal] = useState(false);
  const [targetMode, setTargetMode] = useState<AppMode>('workout');
  const [streakTooLow, setStreakTooLow] = useState(false);

  // Detect screen size for responsive layout
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync cloud → localStorage FIRST, then check for wrapped.
  // Awaiting the sync prevents TodayScreen from initializing with stale local
  // state and pushing a blank log back to the cloud.
  useEffect(() => {
    syncFromSupabase()
      .catch(() => {})
      .finally(() => {
        setSyncReady(true);
        const state = getAppState();
        setAppMode(state.mode);
        if (shouldShowWrapped(state.currentDay)) {
          const isWeekEnd = state.currentDay % 7 === 0;
          const weekNum = isWeekEnd ? Math.floor(state.currentDay / 7) : Math.ceil(state.currentDay / 7);
          setWrappedWeek(weekNum);
          setWrappedStartDate(getWeekStartDate(state.currentDay, state.startDate));
          // slight delay so app loads first
          setTimeout(() => setShowWrapped(true), 1500);
        }
      });
  }, []);

  const handleDismissWrapped = () => {
    markWrappedShown(wrappedWeek);
    setShowWrapped(false);
  };

  const handleModeToggleClick = () => {
    const currentState = getAppState();
    if (appMode === 'workout') {
      if (currentState.streak < 10) {
        setStreakTooLow(true);
        return;
      }
      setTargetMode('75hard');
    } else {
      setTargetMode('workout');
    }
    setShowModeModal(true);
  };

  const handleModeConfirm = () => {
    const currentState = getAppState();
    const updated = {
      ...currentState,
      mode: targetMode,
      // Restore at least 3 freezes when returning to workout mode
      freezeCount: targetMode === 'workout' ? Math.max(currentState.freezeCount, 3) : currentState.freezeCount,
    };
    saveAppState(updated);
    setAppMode(targetMode);
    setShowModeModal(false);
    setModeKey((k) => k + 1); // remount TodayScreen with fresh state
  };

  return (
    <div
      className="relative flex h-dvh min-h-dvh w-full overflow-hidden"
      style={{ background: '#06060F' }}
    >
      {/* ── Desktop side navigation ──────────────────────────────────────── */}
      {isDesktop && (
        <nav
          className="hidden md:flex flex-col gap-1 p-4 pt-6"
          style={{
            width: '220px',
            minWidth: '220px',
            background: 'rgba(6,6,15,0.97)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Iron75" className="h-8 w-auto object-contain" />
            <div>
              <p className="font-black text-sm text-white leading-none">IRON75</p>
              <p className="text-xs text-gray-500">75 Hard</p>
            </div>
          </div>

          {/* Nav items */}
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all"
                style={{
                  background: isActive ? 'rgba(255,107,53,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(255,107,53,0.25)' : 'transparent'}`,
                  color: isActive ? '#FF6B35' : '#64748b',
                }}
                whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#FF6B35' }}
                    layoutId="sidebar-dot"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Settings at bottom */}
          <div className="mt-auto">
            <motion.button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left w-full"
              style={{
                background: activeTab === 'settings' ? 'rgba(255,107,53,0.15)' : 'transparent',
                color: activeTab === 'settings' ? '#FF6B35' : '#64748b',
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-xl">⚙️</span>
              <span>Settings</span>
            </motion.button>
          </div>
        </nav>
      )}

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top header (only on mobile) */}
        {!isDesktop && (
          <header
            className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
            style={{
              background: 'rgba(6,6,15,0.95)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,107,53,0.12)',
            }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Iron75 logo" className="h-9 w-auto object-contain" />
            </div>
            <motion.button
              onClick={handleModeToggleClick}
              whileTap={{ scale: 0.95 }}
              className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
              style={
                appMode === '75hard'
                  ? { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#A855F7' }
                  : { background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35' }
              }
            >
              {appMode === '75hard' ? '🔒 75 Hard' : '🏋️ Workout'}
            </motion.button>
          </header>
        )}

        {/* Desktop top bar */}
        {isDesktop && (
          <header
            className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
            style={{
              background: 'rgba(6,6,15,0.95)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div>
              <h1 className="text-xl font-black text-white capitalize">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleModeToggleClick}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={
                  appMode === '75hard'
                    ? { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7' }
                    : { background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }
                }
              >
                {appMode === '75hard' ? '🔒 75 Hard Mode' : '🏋️ Workout Mode'}
              </motion.button>
              <motion.button
                onClick={() => {
                  // Derive startDate on-demand if the milestone path didn't set it.
                  if (!wrappedStartDate) {
                    const state = getAppState();
                    const day = Math.max(7, state.currentDay);
                    const weekNum = Math.floor(day / 7);
                    setWrappedWeek(weekNum);
                    setWrappedStartDate(getWeekStartDate(day, state.startDate));
                  }
                  setShowWrapped(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}
                whileTap={{ scale: 0.95 }}
              >
                📊 Weekly Wrapped
              </motion.button>
            </div>
          </header>
        )}

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            maxWidth: isDesktop ? '780px' : undefined,
            margin: isDesktop ? '0 auto' : undefined,
            width: '100%',
            paddingBottom: isDesktop ? undefined : 'calc(84px + env(safe-area-inset-bottom, 16px))',
          }}
        >
          {!syncReady ? (
            <div className="flex items-center justify-center h-64">
              <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
            </div>
          ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="min-h-full"
            >
              {activeTab === 'today' && <TodayScreen key={modeKey} />}
              {activeTab === 'workout' && <WorkoutScreen />}
              {activeTab === 'progress' && <ProgressScreen />}
              {activeTab === 'ai' && <AICoachScreen />}
              {activeTab === 'roadmap' && <RoadmapScreen />}
              {activeTab === 'settings' && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
          )}
        </main>

        {/* Bottom navigation (mobile only) */}
        {!isDesktop && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(6,6,15,0.97)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-around px-1 pt-2 pb-1">
              {[...TABS, { id: 'settings' as TabId, icon: '⚙️', label: 'Settings' }].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileTap={{ scale: 0.85 }}
                    className="flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl relative"
                    style={{
                      background: isActive ? 'rgba(255,107,53,0.08)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    aria-label={tab.label}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute top-1 left-1/2"
                        style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF6B35', transform: 'translateX(-50%)' }}
                        layoutId="nav-dot"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <motion.span
                      className="text-xl leading-none"
                      animate={{
                        filter: isActive ? 'drop-shadow(0 0 6px rgba(255,107,53,0.7))' : 'none',
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {tab.icon}
                    </motion.span>
                    <span
                      className="font-medium leading-none"
                      style={{ color: isActive ? '#FF6B35' : '#475569', fontSize: '9px' }}
                    >
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* ── Mode Confirmation Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showModeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
              style={{ background: '#0e0e22', border: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              {targetMode === '75hard' ? (
                <>
                  <div className="text-2xl text-center">🔒</div>
                  <h2 className="text-lg font-black text-white text-center">Switching to 75 Hard Mode</h2>
                  <ul className="flex flex-col gap-2 text-sm" style={{ color: '#94A3B8' }}>
                    <li>• No streak freezes — any missed day resets the challenge</li>
                    <li>• You must complete 75 consecutive days</li>
                    <li>• Your current streak becomes your challenge progress</li>
                  </ul>
                  <div className="rounded-xl px-4 py-3 text-sm font-bold text-center"
                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7' }}>
                    Your current streak carries over when you switch modes
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl text-center">🏋️</div>
                  <h2 className="text-lg font-black text-white text-center">Leaving 75 Hard Mode</h2>
                  <ul className="flex flex-col gap-2 text-sm" style={{ color: '#94A3B8' }}>
                    <li>• Streak freezes re-enabled (min. 3 freezes restored)</li>
                    <li>• You can miss days without losing your streak if freezes remain</li>
                    <li>• Your workout progress and logs are preserved</li>
                  </ul>
                </>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowModeModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleModeConfirm}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={
                    targetMode === '75hard'
                      ? { background: 'rgba(168,85,247,0.2)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.4)' }
                      : { background: 'rgba(255,107,53,0.2)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.4)' }
                  }
                >
                  Switch Mode
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Streak Too Low Error Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {streakTooLow && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
              style={{ background: '#0e0e22', border: '1px solid rgba(255,71,87,0.3)' }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="text-3xl text-center">⚠️</div>
              <h2 className="text-lg font-black text-white text-center">Not Enough Streak</h2>
              <p className="text-sm text-center" style={{ color: '#94A3B8' }}>
                You need at least a <span className="font-bold text-white">10-day streak</span> to enter 75 Hard Mode.
              </p>
              <p className="text-sm text-center" style={{ color: '#64748B' }}>
                Current streak: <span className="font-bold" style={{ color: '#FF6B35' }}>{getAppState().streak} days</span>
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setStreakTooLow(false)}
                className="py-3 rounded-xl font-bold text-sm mt-2"
                style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.3)' }}
              >
                Keep Building Streak
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Weekly Wrapped overlay ────────────────────────────────────────── */}
      {showWrapped && (
        <WeeklyWrapped
          visible={showWrapped}
          onDismiss={handleDismissWrapped}
          weekNumber={wrappedWeek}
          startDate={wrappedStartDate}
        />
      )}
    </div>
  );
}

