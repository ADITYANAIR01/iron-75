'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface FireIconProps {
  className?: string;
  sizeClassName?: string;
}

const EMBERS = [
  { id: 1, x: -20, delay: 0, size: 3.2 },
  { id: 2, x: -11, delay: 0.24, size: 2.8 },
  { id: 3, x: -3, delay: 0.5, size: 2.4 },
  { id: 4, x: 7, delay: 0.14, size: 3.1 },
  { id: 5, x: 16, delay: 0.42, size: 2.7 },
  { id: 6, x: 24, delay: 0.62, size: 2.9 },
];

export default function FireIcon({ className = '', sizeClassName = 'text-6xl' }: FireIconProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} aria-hidden="true">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 144,
          height: 92,
          transform: 'translateY(10px)',
          background: 'radial-gradient(ellipse at center, rgba(255,132,54,0.55) 0%, rgba(255,107,53,0.24) 45%, rgba(255,107,53,0) 78%)',
          filter: 'blur(5px)',
        }}
        animate={reduceMotion ? { opacity: 0.74 } : { opacity: [0.5, 0.95, 0.58], scale: [0.95, 1.14, 0.99] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className={`${sizeClassName} relative leading-none`}
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,107,53,0.55)) drop-shadow(0 0 24px rgba(255,230,109,0.25))' }}
        animate={
          reduceMotion
            ? { scale: 1 }
            : {
                y: [0, -1.8, -0.4, -2.4, 0],
                x: [0, 0.5, -0.6, 0.5, 0],
                rotate: [0, 2.2, -1.9, 1.4, 0],
                scale: [1, 1.02, 0.99, 1.02, 1],
              }
        }
        transition={{ duration: 0.95, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 64 64" width="1em" height="1em" fill="none">
          <defs>
            <linearGradient id="fire-outer" x1="32" y1="4" x2="32" y2="61" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF3D2E" />
              <stop offset="45%" stopColor="#FF6B35" />
              <stop offset="75%" stopColor="#FF9E2C" />
              <stop offset="100%" stopColor="#FFD166" />
            </linearGradient>
            <linearGradient id="fire-inner" x1="32" y1="13" x2="32" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF9E2C" />
              <stop offset="55%" stopColor="#FFC34D" />
              <stop offset="100%" stopColor="#FFE99A" />
            </linearGradient>
            <linearGradient id="fire-core" x1="32" y1="24" x2="32" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF7CC" />
              <stop offset="100%" stopColor="#FFE066" />
            </linearGradient>
            <linearGradient id="coal-bed" x1="32" y1="44" x2="32" y2="61" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#8A2A16" />
            </linearGradient>
            <linearGradient id="log-wood" x1="12" y1="52" x2="52" y2="57" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5A2D1A" />
              <stop offset="100%" stopColor="#7A3E23" />
            </linearGradient>
          </defs>

          <ellipse cx="32" cy="56.8" rx="22.5" ry="6.4" fill="url(#coal-bed)" opacity="0.66" />

          <motion.path
            d="M32 7C26 12 17 20.5 14.8 30.8c-2 9.7 6.8 17.8 17.2 22 10.4-4.2 19.2-12.3 17.2-22C47 20.5 38 12 32 7Z"
            fill="url(#fire-outer)"
            animate={reduceMotion ? {} : { scaleY: [1, 1.04, 0.97, 1.03, 1], scaleX: [1, 1.03, 0.97, 1.02, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '32px 42px' }}
          />

          <motion.path
            d="M32 15C27.5 19.8 22.2 24.8 21.4 32.2c-.7 6.7 5.4 12 10.6 14.8 5.2-2.8 11.3-8.1 10.6-14.8-.8-7.4-6.1-12.4-10.6-17.2Z"
            fill="url(#fire-inner)"
            animate={reduceMotion ? {} : { y: [0, -1.1, 0.5, -0.8, 0], scaleY: [1, 1.05, 0.98, 1.02, 1], scaleX: [1, 1.03, 0.97, 1.02, 1] }}
            transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.path
            d="M32 24.4C29.4 27.6 27 30.8 27 34.8c0 3.9 3.1 6.9 5 8.7 1.9-1.8 5-4.8 5-8.7 0-4-2.4-7.2-5-10.4Z"
            fill="url(#fire-core)"
            animate={reduceMotion ? {} : { opacity: [0.88, 1, 0.9], scale: [1, 1.04, 0.98, 1] }}
            transition={{ duration: 0.62, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '32px 36px' }}
          />

          {!reduceMotion && (
            <>
              <motion.path
                d="M26.5 30.5c-2.8 3.5-4.1 6.5-4.2 9.8 1.8-1.8 3.5-3.7 5.7-5.2"
                fill="#FF8A41"
                animate={{ y: [0, -0.8, 0.5, 0], rotate: [0, -6, 0] }}
                transition={{ duration: 0.64, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '26px 36px' }}
              />
              <motion.path
                d="M37.5 30.5c2.8 3.5 4.1 6.5 4.2 9.8-1.8-1.8-3.5-3.7-5.7-5.2"
                fill="#FF8A41"
                animate={{ y: [0, -0.8, 0.5, 0], rotate: [0, 6, 0] }}
                transition={{ duration: 0.64, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
                style={{ transformOrigin: '38px 36px' }}
              />
              <motion.path
                d="M17 33c-2.6 3.4-2.8 7.4-.8 10.4.2-2.9 1.6-5.8 4.2-8.1"
                fill="#FF7A3F"
                animate={{ rotate: [0, -7, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '18px 39px' }}
              />
              <motion.path
                d="M47 33c2.6 3.4 2.8 7.4.8 10.4-.2-2.9-1.6-5.8-4.2-8.1"
                fill="#FF7A3F"
                animate={{ rotate: [0, 7, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.14 }}
                style={{ transformOrigin: '46px 39px' }}
              />
            </>
          )}

          <g opacity={0.92}>
            <rect x="9" y="52" width="21" height="5.3" rx="2.65" fill="url(#log-wood)" transform="rotate(15 9 52)" />
            <rect x="33" y="52.4" width="21" height="5.3" rx="2.65" fill="url(#log-wood)" transform="rotate(-15 33 52.4)" />
            <rect x="22" y="54.4" width="20" height="4.7" rx="2.35" fill="#6A341E" />
          </g>
        </svg>
      </motion.div>

      {!reduceMotion &&
        EMBERS.map((ember) => (
          <motion.span
            key={ember.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `calc(50% + ${ember.x}px)`,
              bottom: 15,
              width: ember.size,
              height: ember.size,
              background: 'radial-gradient(circle, #FFE38A 0%, #FF9E2C 70%, transparent 100%)',
              boxShadow: '0 0 8px rgba(255,186,66,0.55)',
            }}
            animate={{
              y: [0, -16, -36],
              opacity: [0, 0.9, 0],
              scale: [0.7, 1, 0.45],
              x: [0, ember.x > 0 ? 4 : -4, ember.x > 0 ? 8 : -8],
            }}
            transition={{ duration: 1.0, repeat: Infinity, delay: ember.delay, ease: 'easeOut' }}
          />
        ))}
    </div>
  );
}
