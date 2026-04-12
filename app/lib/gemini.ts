import type { ChallengeId } from './types';

// Rich offline fallback tips per category so AI is NEVER "unavailable"
const OFFLINE_TIPS: Record<ChallengeId, string[]> = {
  tip: [
    "Your body doesn't know it's tired — your mind does. Push through the first 5 minutes and momentum takes over. Track every rep today, not just the easy ones. 🔥",
    "Protein timing is non-negotiable: 30-40g within 60 minutes post-workout. Your muscles are in a 2-hour repair window right now. Don't waste it. 💪",
    "Sleep is the most anabolic thing you can do tonight. If you're under 7 hours, you're leaving 30% of your gains on the table. Dark room, cool temperature, phone off. 🌙",
    "Motivation is overrated — it visits when things are easy and leaves exactly when you need it. Discipline is the asset. You chose this path. Own it today. ⚡",
    "Micro-wins compound into macro-results. Those 10 pages, that walk when it was raining, that workout when motivation was low — they all stack into an unstoppable version of you. 🏆",
    "Your real competition is the version of you that wanted to skip today. Beat that person daily and watch who you become over time. 🔥",
    "High soreness means your muscles are rebuilding stronger. Foam roll the tight spots, increase protein to 2g/kg bodyweight today, and trust the process. 💎",
    "The first 10 seconds before you start a workout are the hardest. Once you're moving, inertia works for you. Shoes on. Now. ⚡",
    "Carbs are not the enemy. Post-workout, your glycogen stores need replenishment. 40-60g of quality carbs within 2 hours accelerates recovery by 40%. Eat them. 🍚",
    "Your sleep and meal timing determine your focus level more than motivation ever will. Lock those in and your training output rises fast. 😴",
    "There's a direct correlation between your outdoor walk and your mental performance for the next 4 hours. The walk isn't optional — it's your cognitive edge. 🚶",
    "The reading habit is building something invisible but irreversible: neural connections, vocabulary, perspective. 10 pages a day is 3,650 pages a year. Compounding. 📚",
  ],
  pattern: [
    "Pattern detected: the athletes who complete ALL six tasks — not just the gym — report 3x better mood by Week 3. Your checklist is a system. Work the system, not just the workouts. 🟢",
    "Data insight: workout consistency is your biggest performance lever. Days with early planning and fixed training windows produce far better adherence. 📅",
    "Your reading habit is the hidden multiplier most people overlook. The mental discipline it builds bleeds directly into gym discipline. If reading is slipping, it's a warning sign for the workouts too. 📚",
    "Recovery patterns matter more than workout patterns in Weeks 3-5. If soreness is consistently 4+/5, you're in a catabolic state. Add 8+ hours sleep and bump protein — you'll see gains accelerate, not stall. 🧠",
    "Morning-logged days consistently outperform evening-logged days by 25%. If you're not opening the app until night, your discipline is reactive. Shift to proactive. Check in at 7 AM. 📊",
    "Walk completion is the most underrated data point. People who skip walks report 2x more mood dips. The outdoor element isn't arbitrary — it's the mental reset that keeps everything else running. 🌿",
    "Diet logging behavior is a leading indicator. When people stop logging meals, gym performance drops within 3 days — not because nutrition changed, but because accountability did. Log everything. 📝",
    "Energy score trend is your early warning system. Three consecutive days below 3/5 signals overtraining or under-recovery. Don't push harder; recover smarter. Deload is a strategy, not a failure. ⚡",
  ],
  motivation: [
    "You are in the arena right now. While others scroll, sleep in, and rationalize, YOU are grinding through this. This exact moment — when it's hard and you don't feel like it — is what separates the people who transform from the people who wish they had. KEEP GOING. 🔥⚡🏆",
    "Every champion was once a contender who refused to quit on a hard day. Look at where you started. Look at where you are now. That gap is pure, compounded discipline. The finish line doesn't reward intentions — it rewards daily action. Be the person who acts. 💪🔥",
    "Someone right now is looking at what you've built and thinking 'I could never do that.' You said the same thing before Day 1. Prove to yourself what's possible in the days you have left. Don't you dare stop when you've already done the hardest part. ⚡🏆",
    "This isn't just fitness logging anymore — it's a character test. Every rep, every page, every walk is a vote for who you're becoming. The temporary discomfort is building permanent identity. Now move. 🔥💎",
    "Your nervous system physically changes with consistent training. Neural efficiency, hormone optimization, discipline pathways — all wiring right now. You are literally being rebuilt at a biological level. Don't interrupt the process. Show up. 🧠⚡",
    "The hardest days make the best athletes. Not the days you crushed it — the days you barely made it, showed up anyway, and checked every box. Those are the days that actually matter. Today might be one of those days. Make it count. 🏆🔥",
  ],
  recovery: [
    "4 Science-Backed Recovery Protocols:\n\n1. SLEEP ARCHITECTURE: You need 7-9 hours, but quality matters more than quantity. Keep your room at 18-20°C, eliminate blue light 45 min before bed. Growth hormone release peaks in your first 90-min deep sleep cycle — protect it.\n\n2. PROTEIN DISTRIBUTION: Don't stack all your protein in one meal. Spread 1.6-2.2g/kg across 4-5 meals. Pre-sleep: 30-40g casein (cottage cheese, Greek yogurt) for overnight muscle protein synthesis.\n\n3. ACTIVE RECOVERY: On high-soreness days, 20 min of light walking plus 10 min foam rolling outperforms full rest. Blood flow delivers nutrients to damaged fibers 3x faster than passive recovery.\n\n4. COLD EXPOSURE: Use 2-3 minutes of cold exposure post-shower. This spikes norepinephrine by 200-300%, reduces inflammation markers, and accelerates DOMS clearance by 24-36 hours.",
    "Recovery Protocol for High-Frequency Gym + Daily Walk Athletes:\n\n1. ELECTROLYTE MANAGEMENT: You're losing sodium, potassium, and magnesium through sweat every day. Supplement with 400mg magnesium glycinate pre-bed (improves deep sleep measurably) and include sodium/potassium-rich foods in recovery meals.\n\n2. MYOFASCIAL RELEASE: Spend 10-15 min with a foam roller post-workout. Priority zones: IT band, thoracic spine, hip flexors, lats. This reduces perceived soreness by up to 50% and improves next-session range of motion.\n\n3. INFLAMMATION MANAGEMENT: Omega-3s (2-3g EPA/DHA daily), tart cherry juice, and turmeric with black pepper all have research-backed anti-inflammatory effects. Add them to your protocol before reaching for NSAIDs.\n\n4. PROGRESSIVE DELOAD: Every 4th week, drop training volume by 40%. You don't get stronger during workouts — you get stronger during recovery. Planned deloads are how advanced athletes keep progressing for years.",
  ],
  nutrition: [
    "Nutrition for Peak Performance — 4 Principles:\n\n1. TOTAL PROTEIN: Minimum 1.6g per kg bodyweight, targeting 2.0-2.2g on heavy training days. Spread across meals every 3-4 hours to maximize muscle protein synthesis throughout the day.\n\n2. CARB TIMING: Pre-workout (30-60 min): 40-60g fast carbs for training fuel. Post-workout (within 2 hours): 40-60g carbs combined with protein to refill glycogen and kickstart repair.\n\n3. FAT INTAKE: Don't drop below 0.8g fat per kg bodyweight. Dietary fat regulates testosterone and cortisol. Low fat = disrupted hormones = worse performance and recovery.\n\n4. MEAL SPACING: Aim for 4-5 meals 3-4 hours apart rather than 2-3 large ones. Keeps blood sugar stable, reduces cortisol spikes, and delivers nutrients to muscles more consistently.",
    "Pre- and Post-Workout Nutrition That Actually Works:\n\n1. PRE-WORKOUT (60-90 min before): 30-40g protein + 40-60g complex carbs + 5g creatine. Avoid high fat and high fiber — they slow gastric emptying and reduce performance.\n\n2. DURING WORKOUT: Keep sessions focused and fuel as needed. If sessions exceed 60 min, add 20-30g fast carbs (banana, sports drink) to maintain intensity.\n\n3. POST-WORKOUT (within 45 min): 40g protein + 50-80g fast carbs. Your anabolic window is real but it's 2 hours, not 20 min. Don't skip this meal thinking you'll make it up later.\n\n4. BEFORE BED: 30-40g casein protein (cottage cheese, Greek yogurt, casein shake). This feeds your muscles during the 6-8 hours of fasted repair while you sleep. It's the most underused tool in body recomposition.",
  ],
};

function getOfflineTip(challengeId?: ChallengeId): string {
  const tips = OFFLINE_TIPS[challengeId ?? 'tip'];
  const seed = Math.floor(Date.now() / 60000);
  return tips[seed % tips.length];
}

export async function askGemini(prompt: string, challengeId?: ChallengeId): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    if (!res.ok) return getOfflineTip(challengeId);
    const { text } = await res.json();
    if (!text || text.includes('unavailable') || text.includes('AI coach unavailable') || text.length < 20) {
      return getOfflineTip(challengeId);
    }
    return text;
  } catch {
    return getOfflineTip(challengeId);
  } finally {
    clearTimeout(timeoutId);
  }
}
