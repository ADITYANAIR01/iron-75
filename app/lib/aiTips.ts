// ─── Shared AI tips (placeholder until Gemini via Supabase Edge Functions) ───

// ─── Categorized Smart Tips Database ─────────────────────────────────────────
interface SmartTip {
  text: string;
  category: 'motivation' | 'nutrition' | 'recovery' | 'mindset' | 'science' | 'strategy';
  icon: string;
  minDay?: number;
  maxDay?: number;
}

const SMART_TIPS: SmartTip[] = [
  // Week 1 — Foundation
  { text: 'First 72 hours are the hardest. Your brain is fighting change. Override it. Show up.', category: 'mindset', icon: '🧠', maxDay: 3 },
  { text: 'Start strong. Your first week sets the tone for Day 75. Discipline outlasts motivation.', category: 'motivation', icon: '⚡', maxDay: 7 },
  { text: 'Your muscles are adapting. DOMS (delayed onset soreness) peaks at 24–48h. It lessens weekly.', category: 'science', icon: '🔬', maxDay: 7 },
  { text: 'Pro tip: Prep meals the night before. Decision fatigue kills diets faster than cravings.', category: 'strategy', icon: '🎯', maxDay: 10 },

  // Week 2-3 — Building momentum
  { text: 'Compound interest applies to fitness. Each session builds on the last. Trust the process.', category: 'motivation', icon: '📈', minDay: 8, maxDay: 21 },
  { text: 'Protein timing matters: 20-30g within 30 min post-workout maximizes muscle protein synthesis.', category: 'nutrition', icon: '🥩', minDay: 8, maxDay: 21 },
  { text: 'At Day 14, your neural pathways are physically rewiring. The habit loop is forming.', category: 'science', icon: '🧬', minDay: 12, maxDay: 16 },
  { text: 'Sleep is when you grow. Growth hormone peaks during deep sleep — aim for 7-8 hours.', category: 'recovery', icon: '😴', minDay: 10, maxDay: 25 },
  { text: 'The 21-day myth is partially true — simple habits solidify, but complex ones take 66 days.', category: 'science', icon: '📊', minDay: 19, maxDay: 23 },

  // Month 1+ — Forging
  { text: 'You\'re in the danger zone. Week 3-5 boredom hits hardest. Novelty fades. Discipline carries.', category: 'mindset', icon: '🔥', minDay: 22, maxDay: 35 },
  { text: 'Creatine (3-5g/day) is the most studied supplement. Safe, effective, backed by 500+ studies.', category: 'nutrition', icon: '💊', minDay: 20, maxDay: 45 },
  { text: 'Active recovery > full rest. Light walks, stretching, and foam rolling reduce soreness 40% faster.', category: 'recovery', icon: '🧘', minDay: 20, maxDay: 40 },
  { text: 'You\'re past the halfway mark mentally. Visualization: see yourself on Day 75. Feel it.', category: 'mindset', icon: '🎬', minDay: 35, maxDay: 45 },

  // Elite territory
  { text: 'Day 40+: Your body has adapted. Time to progressive overload — add weight, reps, or sets.', category: 'strategy', icon: '📈', minDay: 40, maxDay: 55 },
  { text: 'Deload weeks matter. Every 4-6 weeks, reduce volume 40-50% to prevent overtraining.', category: 'recovery', icon: '🔄', minDay: 35, maxDay: 55 },
  { text: 'Your cortisol-to-testosterone ratio improves with consistent training. You literally think clearer.', category: 'science', icon: '🧪', minDay: 40, maxDay: 60 },

  // Legacy / Final stretch
  { text: 'The finish line is in sight. Don\'t coast. The final 15 days define your character.', category: 'motivation', icon: '🏁', minDay: 60 },
  { text: 'Post-challenge plan matters. 75 Hard built the foundation; now build the lifestyle.', category: 'strategy', icon: '📋', minDay: 65 },
  { text: 'At Day 75, you will have trained 225+ hours, read 750+ pages, and drunk 285+ liters of water.', category: 'science', icon: '🏆', minDay: 70 },

  // Universal tips (no day restriction)
  { text: 'Hydration is half the battle. Water fuels focus, recovery, and fat-burning. Hit 3.8L.', category: 'nutrition', icon: '💧' },
  { text: 'Log your diet every day. Awareness is the first step toward better choices.', category: 'nutrition', icon: '📝' },
  { text: 'Mood determines output. Check in honestly — patterns reveal what your body needs.', category: 'mindset', icon: '🎭' },
  { text: 'Reading 10 pages daily = 3,650 pages a year. Mind and body grow together.', category: 'mindset', icon: '📖' },
  { text: 'Progress photos feel awkward now — they become your most powerful motivator at Day 50.', category: 'strategy', icon: '📷' },
  { text: 'Rest is part of the plan. Soreness means growth. Log it honestly.', category: 'recovery', icon: '💤' },
  { text: 'You are building identity, not just habits. Each check is a vote for who you are.', category: 'mindset', icon: '🪞' },
  { text: 'Consistency beats perfection. A 70% effort day still counts. Show up.', category: 'motivation', icon: '✊' },
  { text: 'Small wins compound. Each check-mark today is a deposit in your future-self bank.', category: 'motivation', icon: '🏦' },
  { text: 'The hardest workout is the one you start. Once in the gym, momentum takes over.', category: 'motivation', icon: '🚀' },
  { text: 'Two types of pain: discipline and regret. Choose wisely.', category: 'mindset', icon: '⚖️' },
  { text: 'Cold showers: 2-3 min boosts norepinephrine 200-300%. Instant energy and mood lift.', category: 'science', icon: '🥶' },
  { text: 'Magnesium before bed improves sleep quality. 200-400mg glycinate is ideal.', category: 'nutrition', icon: '💊' },
  { text: 'Walk outside for 10 min after meals. Reduces blood sugar spikes by 30%.', category: 'science', icon: '🚶' },
  { text: 'Track your PR lifts. Seeing strength gains is the most addictive form of progress.', category: 'strategy', icon: '📊' },
];

// ─── Time-of-day contextual tips ────────────────────────────────────────────
const TIME_TIPS: { hours: [number, number]; tip: string; icon: string }[] = [
  { hours: [5, 8], tip: 'Morning check-in: hydrate first thing. 500ml water kickstarts your metabolism.', icon: '🌅' },
  { hours: [8, 11], tip: 'Pre-workout window: eat 30-60 min before training. Carbs + protein = fuel.', icon: '☀️' },
  { hours: [11, 14], tip: 'Midday check: have you logged breakfast and started hydrating? Stay ahead.', icon: '🌤️' },
  { hours: [14, 17], tip: 'Afternoon slump? Walk for 10 min. It resets cortisol and boosts focus.', icon: '☕' },
  { hours: [17, 20], tip: 'Evening session? Your muscles are 20% stronger in the PM. Push hard.', icon: '🌇' },
  { hours: [20, 22], tip: 'Winding down? Check remaining tasks. Read your 10 pages. Log your mood.', icon: '🌙' },
  { hours: [22, 24], tip: 'Late night? Sleep is your #1 recovery tool. Complete tasks and rest well.', icon: '🌑' },
];

// ─── Stat-based conditional tips ────────────────────────────────────────────
interface StatContext {
  streak?: number;
  waterLiters?: number;
  energyLevel?: number;
  sorenessLevel?: number;
  moodEmoji?: string;
  gymDone?: boolean;
  walkDone?: boolean;
}

function getStatBasedTip(context: StatContext): string | null {
  if (context.streak && context.streak >= 7 && context.streak % 7 === 0) {
    return `🎯 ${context.streak}-day streak! You're in the top 5% of people who attempt 75 Hard. Keep stacking.`;
  }
  if (context.sorenessLevel && context.sorenessLevel >= 4) {
    return '⚠️ High soreness detected. Consider a lighter session today. Foam roll, stretch, and eat extra protein. Recovery IS progress.';
  }
  if (context.energyLevel && context.energyLevel <= 2) {
    return '⚡ Low energy? Check: Did you sleep 7+ hours? Eat enough carbs? Drink 2L+ water by now? Address the root cause.';
  }
  if (context.moodEmoji === 'terrible' || context.moodEmoji === 'bad') {
    return '💛 Tough day? That\'s okay. Even showing up to log your mood counts. Discipline is doing it when you DON\'T feel like it.';
  }
  if (context.waterLiters !== undefined && context.waterLiters < 1.0) {
    return '💧 Your water intake is low. Dehydration drops performance by 25%. Take 3 big sips right now.';
  }
  if (context.gymDone && context.walkDone) {
    return '🔥 Both workouts done! You\'re crushing it. Refuel with protein within 30 min for max recovery.';
  }
  return null;
}

// ─── Main exported functions ────────────────────────────────────────────────
export function getDailyTip(day: number, context?: StatContext): string {
  // Priority 1: Stat-based contextual tips
  if (context) {
    const statTip = getStatBasedTip(context);
    if (statTip) return statTip;
  }

  // Priority 2: Time-of-day tips (deterministic: show if hour matches and day is even)
  const hour = new Date().getHours();
  const timeTip = TIME_TIPS.find(t => hour >= t.hours[0] && hour < t.hours[1]);
  if (timeTip && day % 3 === 0) {
    return `${timeTip.icon} ${timeTip.tip}`;
  }

  // Priority 3: Day-specific tips
  const daySpecific = SMART_TIPS.filter(t => {
    if (t.minDay && day < t.minDay) return false;
    if (t.maxDay && day > t.maxDay) return false;
    return true;
  });

  // Use a deterministic selection based on day (so it's stable per day)
  const pool = daySpecific.length > 0 ? daySpecific : SMART_TIPS;
  const tip = pool[(day - 1) % pool.length];
  return `${tip.icon} ${tip.text}`;
}

export function getTipCategory(day: number): { category: string; color: string; icon: string } {
  const categories: Record<string, { color: string; icon: string }> = {
    motivation: { color: '#FF6B35', icon: '⚡' },
    nutrition: { color: '#00F5D4', icon: '🥗' },
    recovery: { color: '#A855F7', icon: '💤' },
    mindset: { color: '#FFE66D', icon: '🧠' },
    science: { color: '#38BDF8', icon: '🔬' },
    strategy: { color: '#FF6B9D', icon: '🎯' },
  };

  const daySpecific = SMART_TIPS.filter(t => {
    if (t.minDay && day < t.minDay) return false;
    if (t.maxDay && day > t.maxDay) return false;
    return true;
  });

  const pool = daySpecific.length > 0 ? daySpecific : SMART_TIPS;
  const tip = pool[(day - 1) % pool.length];
  return { category: tip.category, ...categories[tip.category] };
}

export function getMotivationalQuote(day: number): { quote: string; author: string } {
  const QUOTES = [
    { quote: 'The only bad workout is the one that didn\'t happen.', author: 'Unknown' },
    { quote: 'Discipline is choosing between what you want NOW and what you want MOST.', author: 'Abraham Lincoln' },
    { quote: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
    { quote: 'Strength does not come from winning. It comes from struggle.', author: 'Arnold Schwarzenegger' },
    { quote: 'You don\'t have to be extreme, just consistent.', author: 'Iron75' },
    { quote: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Arnold Schwarzenegger' },
    { quote: 'Success isn\'t always about greatness. It\'s about consistency.', author: 'Dwayne Johnson' },
    { quote: 'Champions aren\'t made in gyms. They\'re made from something deep inside.', author: 'Muhammad Ali' },
    { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { quote: 'I hated every minute of training, but I said, don\'t quit.', author: 'Muhammad Ali' },
    { quote: 'What hurts today makes you stronger tomorrow.', author: 'Jay Cutler' },
    { quote: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
    { quote: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
    { quote: 'Your body can stand almost anything. It\'s your mind you have to convince.', author: 'Unknown' },
    { quote: 'Don\'t count the days, make the days count.', author: 'Muhammad Ali' },
  ];
  return QUOTES[(day - 1) % QUOTES.length];
}
