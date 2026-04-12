'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TabId } from '../lib/types';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { syncFromSupabase, getAppState, isWrappedShown, markWrappedShown as markWrappedShownStorage, localDateString } from '../lib/storage';

const STALE_BUNDLE_RELOAD_KEY = 'iron75_stale_bundle_reload_once';

function recoverFromStaleBundle(error: unknown): Promise<never> {
  if (typeof window !== 'undefined') {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const isStaleBundleError = /module factory is not available|ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module/i.test(message);

    if (isStaleBundleError && sessionStorage.getItem(STALE_BUNDLE_RELOAD_KEY) !== '1') {
      sessionStorage.setItem(STALE_BUNDLE_RELOAD_KEY, '1');

      const clearCaches = 'caches' in window
        ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        : Promise.resolve();
      const clearWorkers = 'serviceWorker' in navigator
        ? navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        : Promise.resolve();

      void Promise.allSettled([clearCaches, clearWorkers]).finally(() => {
        window.location.reload();
      });

      // Keep suspense pending while the forced reload happens.
      return new Promise<never>(() => {});
    }
  }

  return Promise.reject(error instanceof Error ? error : new Error(String(error)));
}

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
const ProgressScreen = dynamic(
  () => import('../components/ProgressScreen').catch((error) => recoverFromStaleBundle(error)),
  { ssr: false }
);
const AICoachScreen = dynamic(() => import('../components/AICoachScreen'), { ssr: false });
const SettingsScreen = dynamic(() => import('../components/SettingsScreen'), { ssr: false });
const WeeklyWrapped = dynamic(() => import('../components/WeeklyWrapped'), { ssr: false });

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'today',   icon: '🏠', label: 'Today'   },
  { id: 'workout', icon: '💪', label: 'Workout'  },
  { id: 'progress',icon: '📊', label: 'Progress' },
  { id: 'ai',      icon: '🤖', label: 'Coach'    },
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

function getWrappedWeekNumber(currentDay: number): number | null {
  if (typeof window === 'undefined') return null;
  const completedDays = Math.max(0, currentDay - 1);
  if (completedDays < 7) return null;
  // Trigger when a full week has just been completed (7, 14, 21, …).
  const isWeekEnd = completedDays % 7 === 0;
  if (!isWeekEnd) return null;
  return Math.floor(completedDays / 7);
}

function getLatestWrappedWeekNumber(currentDay: number): number {
  const completedDays = Math.max(0, currentDay - 1);
  return Math.max(1, Math.floor(completedDays / 7));
}

function shouldShowWrapped(currentDay: number): boolean {
  const weekNum = getWrappedWeekNumber(currentDay);
  if (!weekNum) return false;
  return !isWrappedShown(weekNum);
}

function markWrappedShown(weekNum: number) {
  markWrappedShownStorage(weekNum);
}

function getWeekStartDate(weekNum: number, startDate: string): string {
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
        if (shouldShowWrapped(state.currentDay)) {
          const weekNum = getWrappedWeekNumber(state.currentDay) ?? 1;
          setWrappedWeek(weekNum);
          setWrappedStartDate(getWeekStartDate(weekNum, state.startDate));
          // slight delay so app loads first
          setTimeout(() => setShowWrapped(true), 1500);
        }
      });
  }, []);

  const handleDismissWrapped = () => {
    markWrappedShown(wrappedWeek);
    setShowWrapped(false);
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
            <img src="/logo.png" alt="GrindOs" className="h-8 w-auto object-contain" />
            <div>
              <p className="font-black text-sm text-white leading-none">GRINDOS</p>
              <p className="text-xs text-gray-500">Habit + Gym</p>
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
                  background: isActive ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0)',
                  border: `1px solid ${isActive ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0)'}`,
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
              <img src="/logo.png" alt="GrindOs logo" className="h-9 w-auto object-contain" />
            </div>
            <motion.button
              onClick={() => {
                const state = getAppState();
                const weekNum = getLatestWrappedWeekNumber(state.currentDay);
                setWrappedWeek(weekNum);
                setWrappedStartDate(getWeekStartDate(weekNum, state.startDate));
                setShowWrapped(true);
              }}
              whileTap={{ scale: 0.95 }}
              className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
              style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35' }}
            >
              📊 Weekly Wrapped
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
                onClick={() => {
                  const state = getAppState();
                  const weekNum = getLatestWrappedWeekNumber(state.currentDay);
                  setWrappedWeek(weekNum);
                  setWrappedStartDate(getWeekStartDate(weekNum, state.startDate));
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
              {activeTab === 'today' && <TodayScreen />}
              {activeTab === 'workout' && <WorkoutScreen />}
              {activeTab === 'progress' && <ProgressScreen />}
              {activeTab === 'ai' && <AICoachScreen />}
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

