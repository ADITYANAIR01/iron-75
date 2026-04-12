'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getSupabaseConfigError } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      console.warn(configError);
      router.replace('/login');
      return;
    }

    try {
      const supabase = createClient();
      const code = new URLSearchParams(window.location.search).get('code') ?? '';

      // exchangeCodeForSession picks up the `code` query param automatically
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            router.replace('/login');
          } else {
            router.replace('/dashboard');
          }
        })
        .catch((error) => {
          console.warn('Supabase exchangeCodeForSession failed:', error);
          router.replace('/login');
        });
    } catch (error) {
      console.warn('Supabase auth callback failed:', error);
      router.replace('/login');
    }
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
