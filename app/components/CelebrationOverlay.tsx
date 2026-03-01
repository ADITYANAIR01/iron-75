'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [particles] = useState(() => generateParticles(80));
  const audioPlayedRef = useRef(false);

  useEffect(() => {
    if (!visible || audioPlayedRef.current) return;
    audioPlayedRef.current = true;

    // Play success sound via Howler.js
    const playSound = async () => {
      try {
        const { Howl } = await import('howler');
        const sound = new Howl({
          // Free CDN success sound
          src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'],
          volume: 0.7,
          onloaderror: () => {
            // Fallback: Web Audio API beep
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.8);
            } catch {
              // silent fail
            }
          },
        });
        sound.play();
      } catch {
        // Howler load failed — silent fail
      }
    };

    playSound();
  }, [visible]);

  // Reset audio flag when overlay hides
  useEffect(() => {
    if (!visible) audioPlayedRef.current = false;
  }, [visible]);

  const badge = dayNumber >= 75 ? '👑' : dayNumber >= 50 ? '🏆' : dayNumber >= 25 ? '🌟' : dayNumber >= 14 ? '💪' : dayNumber >= 7 ? '⚡' : '🔥';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          {/* Particle burst */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute"
                style={{ left: `${p.x}%`, top: '-20px' }}
                animate={{
                  x: p.vx * 1.5,
                  y: p.vy * 3 + window.innerHeight,
                  rotate: p.rotation + 720,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2.5 + Math.random() * 1.5,
                  ease: 'easeIn',
                  delay: Math.random() * 0.5,
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
            className="relative z-10 flex flex-col items-center gap-5 px-8 py-10 rounded-3xl text-center mx-4"
            style={{
              background: 'linear-gradient(135deg, #0D0D2A 0%, #1a1a4a 100%)',
              border: '2px solid #FF6B35',
              boxShadow: '0 0 60px rgba(255,107,53,0.4)',
            }}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge + streak */}
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-6xl"
            >
              {badge}
            </motion.div>

            <div>
              <motion.h1
                className="text-3xl font-black"
                style={{ color: '#FF6B35' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                DAY {dayNumber} COMPLETE!
              </motion.h1>
              <motion.p
                className="text-lg mt-1 font-semibold"
                style={{ color: '#4ECDC4' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🔥 {streak} Day Streak
              </motion.p>
            </div>

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
                  className="text-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 300 }}
                >
                  {icon}
                </motion.span>
              ))}
            </motion.div>

            <motion.button
              onClick={onDismiss}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full font-bold text-black mt-2"
              style={{ background: 'linear-gradient(90deg, #FF6B35, #FFE66D)' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              LET&apos;S GOOO! 💪
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
