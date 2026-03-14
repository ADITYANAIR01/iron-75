'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // exchangeCodeForSession picks up the `code` query param automatically
    supabase.auth.exchangeCodeForSession(
      new URLSearchParams(window.location.search).get('code') ?? ''
    ).then(({ error }) => {
      if (error) {
        router.replace('/login');
      } else {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: '#06060F' }}>
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-[#FF6B35]"
        aria-label="Loading"
      />
    </div>
  );
}
