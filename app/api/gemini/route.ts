// ─── Gemini AI Proxy Route (server-side only – key never exposed to client) ───
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ text: 'AI coach unavailable — add GEMINI_API_KEY to env.' }, { status: 200 });
  }

  try {
    const { prompt } = await request.json();
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
      return NextResponse.json({ text: 'AI tip unavailable right now. Keep grinding! 💪' }, { status: 200 });
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Stay consistent. Every rep counts. 🔥';
    return NextResponse.json({ text });
  } catch (err) {
    console.error('Gemini route error:', err);
    return NextResponse.json({ text: 'Network error. Remember: no excuses, only results! 💪' }, { status: 200 });
  }
}
