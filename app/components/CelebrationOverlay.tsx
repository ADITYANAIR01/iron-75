'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FireIcon from './FireIcon';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  vx: number;
  vy: number;
  shape: 'circle' | 'rect' | 'star';
}

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  dayNumber: number;
  streak: number;
}

const COLORS = [
  '#FF6B35', // orange
  '#4ECDC4', // teal
  '#FFE66D', // yellow
  '#FF6B6B', // red-pink
  '#A8EDEA', // light teal
  '#FED6E3', // pink
  '#96E6A1', // green
  '#D299C2', // purple
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // viewport %
    y: -10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 10 + 6,
    rotation: Math.random() * 360,
    vx: (Math.random() - 0.5) * 200,
    vy: Math.random() * 300 + 200,
    shape: ['circle', 'rect', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
  }));
}

function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"
        fill={color}
      />
    </svg>
  );
}

export default function CelebrationOverlay({
  visible,
  onDismiss,
  dayNumber,
  streak,
}: CelebrationOverlayProps) {
  const [particles] = useState(() => generateParticles(52));
  const audioPlayedRef = useRef(false);

  useEffect(() => {
    if (!visible || audioPlayedRef.current) return;
    audioPlayedRef.current = true;

    // Play a local WebAudio success tone (CSP-safe, offline-safe, no third-party requests).
    const playSound = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [880, 1046.5, 1318.5];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.0001, now + i * 0.14);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.14 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.13);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.14);
          osc.stop(now + i * 0.14 + 0.14);
        });
        setTimeout(() => {
          void ctx.close();
        }, 800);
      } catch {
        // Audio may be blocked by browser autoplay policy.
      }
    };

    playSound();
  }, [visible]);

  // Reset audio flag when overlay hides
  useEffect(() => {
    if (!visible) audioPlayedRef.current = false;
  }, [visible]);

  const badge = dayNumber >= 75 ? '👑' : dayNumber >= 50 ? '🏆' : dayNumber >= 25 ? '🌟' : dayNumber >= 14 ? '💪' : dayNumber >= 7 ? '⚡' : '🔥';
  const normalizedStreak = Math.max(0, streak);
  const currentMilestone = Math.floor(normalizedStreak / 7) * 7;
  const nextMilestone = Math.max(7, currentMilestone + 7);
  const milestoneSpan = nextMilestone - currentMilestone;
  const milestoneStep = Math.max(0, normalizedStreak - currentMilestone);
  const milestoneProgress = Math.max(0, Math.min(1, milestoneStep / milestoneSpan));
  const streakTier =
    streak >= 75 ? 'Legend streak' :
    streak >= 50 ? 'Elite streak' :
    streak >= 25 ? 'Unstoppable streak' :
    streak >= 14 ? 'Momentum streak' :
    streak >= 7 ? 'Locked-in streak' : 'Starter streak';

  return (
    <AnimatePresence>
      {visible && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(4,6,18,0.86)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-[12%] w-[420px] h-[420px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.25), rgba(255,107,53,0) 70%)' }}
                animate={{ opacity: [0.45, 0.9, 0.55], scale: [0.9, 1.08, 0.95] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-[18%] w-[280px] h-[280px] rounded-full"
                style={{ border: '1px solid rgba(255,230,109,0.3)' }}
                animate={{ scale: [0.85, 1.25], opacity: [0.65, 0] }}
                transition={{ duration: 1.25, repeat: Infinity, ease: 'easeOut' }}
              />
            </div>

            {/* Particle burst */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map((p) => (
                <motion.div
                key={p.id}
                className="absolute"
                style={{ left: `${p.x}%`, top: '-20px' }}
                animate={{
                  x: [0, p.vx * 0.55, p.vx * 0.35],
                  y: ['0vh', '42vh', '118vh'],
                  rotate: [p.rotation, p.rotation + 380],
                  opacity: [1, 0.9, 0],
                }}
                transition={{
                  duration: 2.05 + Math.random() * 1.05,
                  ease: 'easeIn',
                  delay: Math.random() * 0.32,
                }}
              >
                {p.shape === 'star' ? (
                  <StarShape size={p.size} color={p.color} />
                ) : (
                  <div
                    style={{
                      width: p.size,
                      height: p.shape === 'rect' ? p.size * 0.5 : p.size,
                      borderRadius: p.shape === 'circle' ? '50%' : '2px',
                      background: p.color,
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Central celebration card */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5 px-8 py-9 rounded-3xl text-center mx-4 w-[min(92vw,390px)]"
            style={{
              background: 'linear-gradient(160deg, rgba(11,14,42,0.98) 0%, rgba(16,24,60,0.95) 48%, rgba(20,20,54,0.98) 100%)',
              border: '1.5px solid rgba(255,107,53,0.85)',
              boxShadow: '0 24px 80px rgba(255,107,53,0.26), inset 0 1px 0 rgba(255,255,255,0.12)',
              backdropFilter: 'blur(18px)',
            }}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: '1px solid rgba(255,230,109,0.25)' }}
              animate={{ opacity: [0.4, 0.8, 0.45] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Badge + streak */}
            <motion.div
              animate={{ rotate: [0, -4, 4, -4, 4, 0], y: [0, -2, 0] }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative"
            >
              <div className="absolute -top-3 -right-3 text-2xl">{badge}</div>
              <FireIcon sizeClassName="text-7xl" />
            </motion.div>

            <div>
              <motion.h1
                className="text-3xl font-black"
                style={{ color: '#FF6B35', textShadow: '0 0 24px rgba(255,107,53,0.28)' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                DAY {dayNumber} COMPLETE!
              </motion.h1>
              <motion.p
                className="text-lg mt-1 font-semibold"
                style={{ color: '#67E8F9' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🔥 {streak} Day Streak
              </motion.p>
              <motion.p
                className="text-[11px] mt-1 uppercase tracking-wider font-bold"
                style={{ color: '#94A3B8' }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.38 }}
              >
                {streakTier}
              </motion.p>
            </div>

            <motion.div
              className="w-full max-w-[290px]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44 }}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                <span>Next milestone</span>
                <span>{milestoneStep}/{milestoneSpan} • {nextMilestone}d</span>
              </div>
              <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #FF6B35, #FFE66D, #67E8F9)',
                    minWidth: milestoneProgress > 0 ? 6 : 0,
                  }}
                  animate={{ width: `${milestoneProgress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
            </motion.div>

            {/* All 7 done indicator */}
            <motion.div
              className="flex gap-2 flex-wrap justify-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {['🏋️', '🚶', '💧', '🥗', '😊', '📖', '📷'].map((icon, i) => (
                <motion.span
                  key={i}
                  className="text-xl w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.07, 1] }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.45, ease: 'easeOut' }}
                >
                  {icon}
                </motion.span>
              ))}
            </motion.div>

            <motion.button
              onClick={onDismiss}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full font-black text-black mt-2 uppercase tracking-wide"
              style={{ background: 'linear-gradient(90deg, #FF6B35, #FFE66D)', boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Continue 🔥
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
