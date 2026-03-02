// ─── Gemini client helper (calls our server-side proxy) ─────────────────────

export async function askGemini(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return 'Keep pushing. Your future self will thank you! 🔥';
    const { text } = await res.json();
    return text ?? 'Stay consistent. You have this! 💪';
  } catch {
    return 'Offline mode: trust the process, log daily, win always. 🏆';
  }
}
