'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import LoginScreen from '../components/LoginScreen';

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginGate />
    </AuthProvider>
  );
}

function LoginGate() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: '#06060F' }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-[#FF6B35]"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <LoginScreen />;
}

