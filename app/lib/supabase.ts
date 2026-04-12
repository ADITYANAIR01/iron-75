import { createBrowserClient } from '@supabase/ssr';

const REQUIRED_SUPABASE_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type RequiredSupabaseEnvVar = (typeof REQUIRED_SUPABASE_ENV_VARS)[number];

function getMissingSupabaseEnvVars(): RequiredSupabaseEnvVar[] {
  const missing: RequiredSupabaseEnvVar[] = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length === 0) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length === 0) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return missing;
}

export function getSupabaseConfigError(): string | null {
  const missing = getMissingSupabaseEnvVars();
  if (missing.length === 0) return null;

  return `Supabase is not configured. Missing ${missing.join(', ')}. Set these in .env.local and restart the app.`;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigError() === null;
}

export function createClient() {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
