// ─── Shared AI tips (placeholder until Gemini Lambda is live) ────────────────

const DAILY_TIPS = [
  'Start strong. Your first week sets the tone for all 75 days. Discipline outlasts motivation.',
  'Compound interest applies to fitness. Each session builds on the last. Trust the process.',
  'Hydration is half the battle. Water fuels focus, recovery, and fat-burning. Hit 3.8L.',
  'Log your diet every day. Awareness is the first step toward better choices.',
  'Mood determines output. Check in honestly — patterns reveal what your body needs.',
  'Reading 10 pages daily = 3,650 pages a year. Mind and body grow together.',
  'Progress photos feel awkward now — they become your most powerful motivator at Day 50.',
  'Rest is part of the plan. Soreness means growth. Log it honestly.',
  'You are building identity, not just habits. Each check feels more like "who you are".',
  'Consistency beats perfection. A 70% effort day still counts. Show up.',
  'Recovery matters as much as training. Sleep 7-8 hours. Eat protein. Hydrate.',
  'Visualize who you will be on Day 75. That version of you is already inside you.',
  'Small wins compound. Each check-mark today is a deposit in your future-self bank.',
  'The hardest workout is the one you start. Once inside the gym, momentum takes over.',
  'There are two types of pain: the pain of discipline and the pain of regret. Choose wisely.',
];

export function getDailyTip(day: number): string {
  return DAILY_TIPS[(day - 1) % DAILY_TIPS.length];
}
