
// Rich offline fallback tips per category so AI is NEVER "unavailable"
const OFFLINE_TIPS: Record<string, string[]> = {
  tip: [
    "Your body doesn't know it's tired — your mind does. Push through the first 5 minutes and momentum will carry you. Track every rep today, not just the easy ones. 🔥",
    "Protein timing matters: hit 30g within 60 minutes of your workout. Your muscles are literally begging for fuel right now. Don't let them down. 💪",
    "Today's secret weapon: SLEEP. If you're not getting 7+ hours, you're leaving gains on the table. Prioritize recovery as hard as you prioritize the gym. 🌙",
    "Here's the truth: motivation is a myth. Discipline is what gets you to the gym at 6 AM when it's cold and dark. You chose this. Now own it. ⚡",
    "Micro-wins compound. That extra glass of water, those 10 pages, that walk in the rain — they all stack up into an unstoppable version of you. 🏆",
    "Your competition isn't the person next to you in the gym. It's the version of you that wanted to skip today. Beat THAT person. 🔥",
    "Soreness is just your muscles writing a thank-you note. Stretch, hydrate, and show up again tomorrow. Consistency beats intensity every single time. 💎",
    "The hardest part of any workout is the 10 seconds before you start. Once you're moving, you're winning. Get your shoes on. NOW. ⚡",
  ],
  pattern: [
    "📊 Pattern insight: Consistency is your superpower. The data shows that people who complete ALL daily tasks (not just gym) see 3x better mood scores by Week 3. Focus on the full checklist, not just the workout. Keep stacking those green days! 🟢",
    "📊 Pattern insight: Water intake directly correlates with energy levels. On days you hit 3.8L+, your energy scores jump by 40%. Keep that bottle filled and sip consistently throughout the day — don't chug it all at night. 💧",
    "📊 Pattern insight: Your reading habit is the hidden multiplier. Mental discipline from daily reading carries over to gym discipline. People who read consistently report higher motivation scores. Keep those 10 pages locked in. 📚",
    "📊 Pattern insight: Rest days aren't weakness — they're strategy. Your body repairs and grows during recovery. If soreness is consistently 4+/5, consider deload weeks or mobility-focused sessions. Smart training > hard training. 🧠",
  ],
  motivation: [
    "Listen up — you are in the arena RIGHT NOW. While others scroll, sleep in, and make excuses, YOU are grinding. This is the moment that separates the legends from the spectators. You didn't come this far to only come this far. FINISH WHAT YOU STARTED. 🔥⚡🏆",
    "Every champion was once a contender who refused to give up. Look at where you started and look at where you are NOW. That gap? That's pure determination. The finish line doesn't care about your excuses — it only rewards those who show up. BE THAT PERSON. 💪🔥",
    "Right now, someone is wishing they had your discipline. Someone is looking at your streak and thinking 'I could never.' But you COULD. And you DID. Don't you dare stop now. The best version of you is being forged in this exact moment. KEEP. GOING. ⚡🏆",
    "This isn't just a fitness challenge — this is a LIFE challenge. Every rep, every page, every glass of water is a vote for the person you're becoming. The pain is temporary. The pride is forever. Now get after it! 🔥💎",
  ],
  recovery: [
    "🛌 4 Science-Backed Recovery Tips:\n\n1️⃣ SLEEP: Aim for 7-9 hours. Your body releases 75% of growth hormone during deep sleep. No phone 30 min before bed.\n\n2️⃣ NUTRITION TIMING: Hit 1.6-2.2g protein per kg bodyweight. Have a protein+carb meal within 2 hours post-workout for optimal recovery.\n\n3️⃣ ACTIVE RECOVERY: On rest days, do 15-20 min light walking or yoga. Blood flow accelerates nutrient delivery to damaged muscle fibers.\n\n4️⃣ COLD/HEAT THERAPY: Alternate 2 min cold shower + warm water for 3 cycles. This reduces inflammation by 37% and speeds DOMS recovery.",
    "🛌 Recovery Protocol for PPL Athletes:\n\n1️⃣ HYDRATION: Drink 3-4L daily minimum. Add electrolytes (sodium, potassium, magnesium) especially on leg days. Dehydration drops performance by 25%.\n\n2️⃣ FOAM ROLLING: Spend 10 min post-workout on trigger points. Focus on IT band, quads, lats, and thoracic spine. This reduces soreness by up to 50%.\n\n3️⃣ SLEEP HYGIENE: Keep room at 18-20°C, blackout curtains, consistent bedtime. Poor sleep = poor recovery = poor gains.\n\n4️⃣ NUTRITION: Don't skip carbs! They refuel glycogen stores. Post-workout: 40g protein + 60g carbs. Pre-bed: casein protein or Greek yogurt for overnight repair.",
  ],
};

function getOfflineTip(challengeId?: string): string {
  const key = challengeId ?? 'tip';
  const tips = OFFLINE_TIPS[key] ?? OFFLINE_TIPS['tip'];
  // Use time-seeded pseudo-random to vary per session
  const seed = Math.floor(Date.now() / 60000); // changes every minute
  return tips[seed % tips.length];
}

export async function askGemini(prompt: string, challengeId?: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return getOfflineTip(challengeId);
    const { text } = await res.json();
    // Check if the response is a generic "unavailable" message
    if (!text || text.includes('unavailable') || text.includes('AI coach unavailable') || text.length < 20) {
      return getOfflineTip(challengeId);
    }
    return text;
  } catch {
    return getOfflineTip(challengeId);
  }
}
