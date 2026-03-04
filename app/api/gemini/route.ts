// ─── Gemini AI Proxy Route (server-side only – key never exposed to client) ───
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

// ── Simple in-memory rate limiter (per-user, resets every 60 s) ─────────────
const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

// ── Authenticate via Supabase session cookie ────────────────────────────────
async function getAuthUser(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handler */ },
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ text: 'AI coach unavailable — add GEMINI_API_KEY to env.' }, { status: 200 });
  }

  // 1. Auth check
  const userId = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ text: 'Sign in to use the AI coach.' }, { status: 401 });
  }

  // 2. Rate limit
  if (isRateLimited(userId)) {
    return NextResponse.json({ text: 'Slow down — max 10 AI requests per minute. Try again shortly.' }, { status: 429 });
  }

  try {
    // 3. Input validation
    const body = await request.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.slice(0, 2000) : '';
    if (!prompt) {
      return NextResponse.json({ text: 'Empty prompt.' }, { status: 400 });
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.85 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini error:', err);
      return NextResponse.json({ text: 'AI tip unavailable right now. Keep grinding!' }, { status: 200 });
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Stay consistent. Every rep counts.';
    return NextResponse.json({ text });
  } catch (err) {
    console.error('Gemini route error:', err);
    return NextResponse.json({ text: 'Network error. Remember: no excuses, only results!' }, { status: 200 });
  }
}
