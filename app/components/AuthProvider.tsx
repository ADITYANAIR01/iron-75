'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createClient, getSupabaseConfigError } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [configError] = useState<string | null>(() => getSupabaseConfigError());
  const [loading, setLoading] = useState(configError === null);
  const hasLoggedConfigError = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current && !configError) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;
  const authUnavailableError =
    configError ??
    'Supabase auth is unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the app.';

  useEffect(() => {
    if (!supabase) {
      if (configError && !hasLoggedConfigError.current) {
        console.warn(configError);
        hasLoggedConfigError.current = true;
      }
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configError, supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: authUnavailableError };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [authUnavailableError, supabase]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: authUnavailableError };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error?.message ?? null };
    },
    [authUnavailableError, supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: authUnavailableError };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, [authUnavailableError, supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
