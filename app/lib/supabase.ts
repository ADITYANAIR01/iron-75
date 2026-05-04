import { createBrowserClient } from '@supabase/ssr';

type RequiredSupabaseEnvVar = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

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
