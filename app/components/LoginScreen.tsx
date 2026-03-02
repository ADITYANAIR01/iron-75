'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';

// ─── Login / Sign-Up Screen ────────────────────────────────────────────────
export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'login') {
      const { error } = await signInWithEmail(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess('Check your email for a confirmation link!');
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#06060F' }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.3) 0%, transparent 70%)', top: '-10%', left: '-10%', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)', bottom: '10%', right: '-5%', animation: 'float 6s ease-in-out infinite reverse' }} />
        <div className="absolute w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(0,245,212,0.3) 0%, transparent 70%)', top: '40%', left: '60%', animation: 'float 10s ease-in-out infinite' }} />
      </div>
      <motion.div
        className="w-full max-w-sm flex flex-col gap-6 relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Logo & Title */}
        <div className="text-center">
          <motion.div
            className="text-6xl mb-3"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            🔥
          </motion.div>
          <h1 className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #FF6B35, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IRON75</h1>
          <p className="text-sm text-gray-500 mt-1">75 Hard Challenge Tracker</p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(12,12,30,0.8)' }}
        >
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
                setSuccess(null);
              }}
              className="flex-1 py-2.5 text-sm font-bold transition-all capitalize"
              style={{
              background: mode === m ? 'linear-gradient(135deg, #FF6B35, #FF8F5E)' : 'transparent',
              color: mode === m ? '#fff' : '#64748b',
              }}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Email / Password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e2e8f0',
            }}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e2e8f0',
            }}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                className="text-xs text-red-400 px-1"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                className="text-xs px-1"
                style={{ color: '#00F5D4' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{
              background: loading
                ? 'rgba(255,107,53,0.3)'
                : 'linear-gradient(135deg, #FF6B35, #FF8F5E)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.3)',
            }}
          >
            {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-xs text-gray-500">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Google OAuth */}
        <motion.button
          onClick={handleGoogleLogin}
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </motion.button>

        <p className="text-center text-xs text-gray-600 mt-2">
          Your data is securely stored with Supabase.
        </p>
      </motion.div>
    </div>
  );
}
