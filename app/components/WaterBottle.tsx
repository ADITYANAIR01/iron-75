'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface WaterBottleProps {
  liters: number; // 0 to 4+
  goal?: number;  // default 3.8
  onAdd?: () => void;
}

const MAX_DISPLAY = 4.0;
// Increment steps for the fill dots
const STEPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 3.8, 4.0];

export default function WaterBottle({
  liters,
  goal = 3.8,
  onAdd,
}: WaterBottleProps) {
  const fillPercent = Math.min((liters / MAX_DISPLAY) * 100, 100);
  const goalLinePercent = Math.min((goal / MAX_DISPLAY) * 100, 100);
  const isGoalMet = liters >= goal;

  const fillColor   = isGoalMet ? '#4ECDC4' : '#38BDF8';
  const accentColor = isGoalMet ? '#4ECDC4' : '#FF6B35';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* ── Bottle visual (pure CSS/div — no SVG animation) ───────────── */}
      <div className="flex gap-6 items-end justify-center">

        {/* The bottle */}
        <div className="relative flex flex-col items-center">
          {/* Goal-met badge */}
          <AnimatePresence>
            {isGoalMet && (
              <motion.div
                className="absolute -top-6 text-xl"
                initial={{ scale: 0, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                ✅
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cap */}
          <div
            className="w-6 h-2.5 rounded-t-sm mb-0"
            style={{ background: isGoalMet ? '#4ECDC4' : '#475569' }}
          />

          {/* Bottle body — clipped container */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 56,
              height: 120,
              borderRadius: '6px 6px 14px 14px',
              background: '#12122e',
              border: `2px solid ${isGoalMet ? '#4ECDC4' : '#2a2a5a'}`,
              boxShadow: isGoalMet
                ? '0 0 12px rgba(78,205,196,0.25)'
                : 'inset 0 0 8px rgba(0,0,0,0.4)',
            }}
          >
            {/* Water fill — animates via scaleY from bottom */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{
                transformOrigin: 'bottom',
                background: `linear-gradient(to top, ${fillColor}cc, ${fillColor}55)`,
              }}
              animate={{ height: `${fillPercent}%` }}
              initial={{ height: '0%' }}
              transition={{ type: 'spring', stiffness: 60, damping: 14 }}
            >
              {/* Wave shimmer */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-2 opacity-60"
                style={{ background: `${fillColor}99` }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>

            {/* Goal line */}
            <div
              className="absolute left-0 right-0"
              style={{
                bottom: `${goalLinePercent}%`,
                height: 2,
                background: isGoalMet ? '#4ECDC4' : '#FF6B35',
                opacity: 0.7,
              }}
            >
              <span
                className="absolute right-1 text-[9px] font-bold leading-none"
                style={{ color: isGoalMet ? '#4ECDC4' : '#FF6B35', top: -10 }}
              >
                {goal}L
              </span>
            </div>
          </div>
        </div>

        {/* Right-side step markers */}
        <div className="flex flex-col-reverse gap-1 pb-0.5">
          {STEPS.map((step) => {
            const reached = liters >= step;
            return (
              <motion.div
                key={step}
                className="flex items-center gap-1.5"
                animate={{ opacity: reached ? 1 : 0.35 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: reached ? fillColor : '#1e1e40',
                    border: `1.5px solid ${reached ? fillColor : '#3a3a6a'}`,
                    boxShadow: reached ? `0 0 5px ${fillColor}88` : 'none',
                  }}
                />
                <span
                  className="text-[10px] font-semibold w-6"
                  style={{ color: reached ? fillColor : '#3a3a6a' }}
                >
                  {step}L
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Liter readout ────────────────────────────────────────────── */}
      <div className="text-center">
        <motion.span
          className="text-3xl font-black"
          style={{ color: accentColor }}
          key={liters}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          {liters.toFixed(1)}L
        </motion.span>
        <p className="text-xs text-gray-400 mt-0.5">
          {isGoalMet
            ? '🎉 Goal reached!'
            : `${(goal - liters).toFixed(1)}L to go`}
        </p>
      </div>

      {/* ── +0.5L tap button ─────────────────────────────────────────── */}
      {onAdd && (
        <motion.button
          onClick={onAdd}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm"
          style={{
            background: isGoalMet
              ? 'rgba(78,205,196,0.15)'
              : 'rgba(56,189,248,0.15)',
            border: `1.5px solid ${fillColor}`,
            color: fillColor,
          }}
        >
          <span>+0.5L</span>
          <span>💧</span>
        </motion.button>
      )}
    </div>
  );
}
