'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TabId } from './lib/types';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { syncFromSupabase } from './lib/storage';

// ─── Lazy-load screens (avoids SSR issues with localStorage) ─────────────────
const LoginScreen = dynamic(() => import('./components/LoginScreen'), { ssr: false });
const TodayScreen = dynamic(() => import('./components/TodayScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <motion.div
        className="text-5xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        🔥
      </motion.div>
    </div>
  ),
});

const WorkoutScreen = dynamic(() => import('./components/WorkoutScreen'), { ssr: false });
const ProgressScreen = dynamic(() => import('./components/ProgressScreen'), { ssr: false });
const AICoachScreen = dynamic(() => import('./components/AICoachScreen'), { ssr: false });
const SettingsScreen = dynamic(() => import('./components/SettingsScreen'), { ssr: false });

// ─── Navigation tabs config ───────────────────────────────────────────────────
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'today', icon: '🏠', label: 'Today' },
  { id: 'workout', icon: '💪', label: 'Workout' },
  { id: 'progress', icon: '📊', label: 'Progress' },
  { id: 'ai', icon: '🤖', label: 'AI Coach' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

// ─── App Shell ─────────────────────────────────────────────────────────────────
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
        <motion.div
          className="text-5xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          🔥
        </motion.div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return <AppShell />;
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  // Sync cloud → localStorage on mount
  useEffect(() => {
    syncFromSupabase();
  }, []);

  return (
    <div
      className="relative flex flex-col min-h-dvh w-full max-w-lg mx-auto overflow-hidden"
      style={{ background: '#0D0D1A' }}
    >
      {/* ── Top header bar ───────────────────────────────────────────────── */}
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
          <img
            src="/logo.png"
            alt="Iron75 logo"
            className="h-9 w-auto object-contain"
          />
        </div>
        <div
          className="text-xs px-2 py-1 rounded-full font-bold"
          style={{
            background: 'rgba(255,107,53,0.15)',
            border: '1px solid rgba(255,107,53,0.4)',
            color: '#FF6B35',
          }}
        >
          75 Hard
        </div>
      </header>

      {/* ── Tab content area ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="min-h-full"
          >
            {activeTab === 'today' && (
              <TodayScreen onNavigateToWorkout={() => setActiveTab('workout')} />
            )}
            {activeTab === 'workout' && <WorkoutScreen />}
            {activeTab === 'progress' && <ProgressScreen />}
            {activeTab === 'ai' && <AICoachScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom navigation ─────────────────────────────────────────────── */}
      <nav
        className="sticky bottom-0 z-40 safe-bottom"
        style={{
          background: 'rgba(13,13,26,0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-around px-1 pt-2 pb-1">
          {TABS.map((tab) => {
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
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#FF6B35',
                      transform: 'translateX(-50%)',
                    }}
                    layoutId="nav-dot"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <motion.span
                  className="text-xl leading-none"
                  animate={{
                    filter: isActive
                      ? 'drop-shadow(0 0 6px rgba(255,107,53,0.7))'
                      : 'none',
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {tab.icon}
                </motion.span>

                <span
                  className="font-medium leading-none"
                  style={{
                    color: isActive ? '#FF6B35' : '#475569',
                    fontSize: '10px',
                  }}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
