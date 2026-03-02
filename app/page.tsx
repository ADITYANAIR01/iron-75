'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TabId } from './lib/types';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { syncFromSupabase, getAppState } from './lib/storage';

// ─── Lazy-load screens ────────────────────────────────────────────────────────
const LoginScreen = dynamic(() => import('./components/LoginScreen'), { ssr: false });
const TodayScreen = dynamic(() => import('./components/TodayScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
    </div>
  ),
});
const WorkoutScreen = dynamic(() => import('./components/WorkoutScreen'), { ssr: false });
const ProgressScreen = dynamic(() => import('./components/ProgressScreen'), { ssr: false });
const AICoachScreen = dynamic(() => import('./components/AICoachScreen'), { ssr: false });
const RoadmapScreen = dynamic(() => import('./components/RoadmapScreen'), { ssr: false });
const SettingsScreen = dynamic(() => import('./components/SettingsScreen'), { ssr: false });
const WeeklyWrapped = dynamic(() => import('./components/WeeklyWrapped'), { ssr: false });

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'today',   icon: '🏠', label: 'Today'   },
  { id: 'workout', icon: '💪', label: 'Workout'  },
  { id: 'progress',icon: '📊', label: 'Progress' },
  { id: 'ai',      icon: '🤖', label: 'Coach'    },
  { id: 'roadmap', icon: '🗺️', label: 'Roadmap'  },
];

// ─── Root ─────────────────────────────────────────────────────────────────────
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
      <div className="flex items-center justify-center min-h-dvh" style={{ background: '#0D0D1A' }}>
        <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔥</motion.div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}

// ─── Weekly Wrapped trigger logic ─────────────────────────────────────────────
function shouldShowWrapped(currentDay: number): boolean {
  if (typeof window === 'undefined') return false;
  if (currentDay < 7) return false;
  if (currentDay % 7 !== 0) return false;
  const key = `iron75_wrapped_shown_week_${Math.floor(currentDay / 7)}`;
  return localStorage.getItem(key) !== '1';
}

function markWrappedShown(weekNum: number) {
  localStorage.setItem(`iron75_wrapped_shown_week_${weekNum}`, '1');
}

function getWeekStartDate(currentDay: number, startDate: string): string {
  const weekNum = Math.floor(currentDay / 7);
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d.toISOString().split('T')[0];
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedWeek, setWrappedWeek] = useState(1);
  const [wrappedStartDate, setWrappedStartDate] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect screen size for responsive layout
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync cloud → localStorage on mount + check for wrapped
  useEffect(() => {
    syncFromSupabase();
    const state = getAppState();
    if (shouldShowWrapped(state.currentDay)) {
      const weekNum = Math.floor(state.currentDay / 7);
      setWrappedWeek(weekNum);
      setWrappedStartDate(getWeekStartDate(state.currentDay, state.startDate));
      // slight delay so app loads first
      setTimeout(() => setShowWrapped(true), 1500);
    }
  }, []);

  const handleDismissWrapped = () => {
    markWrappedShown(wrappedWeek);
    setShowWrapped(false);
  };

  return (
    <div
      className="relative flex min-h-dvh w-full overflow-hidden"
      style={{ background: '#0D0D1A' }}
    >
      {/* ── Desktop side navigation ──────────────────────────────────────── */}
      {isDesktop && (
        <nav
          className="hidden md:flex flex-col gap-1 p-4 pt-6"
          style={{
            width: '220px',
            minWidth: '220px',
            background: 'rgba(13,13,26,0.97)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
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
                  background: isActive ? 'rgba(255,107,53,0.15)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(255,107,53,0.3)' : 'transparent'}`,
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
              background: 'rgba(13,13,26,0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,107,53,0.15)',
            }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Iron75 logo" className="h-9 w-auto object-contain" />
            </div>
            <div
              className="text-xs px-2 py-1 rounded-full font-bold"
              style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35' }}
            >
              75 Hard
            </div>
          </header>
        )}

        {/* Desktop top bar */}
        {isDesktop && (
          <header
            className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
            style={{
              background: 'rgba(13,13,26,0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <h1 className="text-xl font-black text-white capitalize">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setShowWrapped(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}
                whileTap={{ scale: 0.95 }}
              >
                �� Weekly Wrapped
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
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="min-h-full"
            >
              {activeTab === 'today' && <TodayScreen onNavigateToWorkout={() => setActiveTab('workout')} />}
              {activeTab === 'workout' && <WorkoutScreen />}
              {activeTab === 'progress' && <ProgressScreen />}
              {activeTab === 'ai' && <AICoachScreen />}
              {activeTab === 'roadmap' && <RoadmapScreen />}
              {activeTab === 'settings' && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom navigation (mobile only) */}
        {!isDesktop && (
          <nav
            className="sticky bottom-0 z-40 safe-bottom"
            style={{
              background: 'rgba(13,13,26,0.97)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
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
                      background: isActive ? 'rgba(255,107,53,0.1)' : 'transparent',
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
