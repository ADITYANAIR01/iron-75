
interface SmartTip {
  text: string;
  category: 'motivation' | 'nutrition' | 'recovery' | 'mindset' | 'science' | 'strategy';
  icon: string;
  minDay?: number;
  maxDay?: number;
}

const SMART_TIPS: SmartTip[] = [
  // ── Week 1 (Days 1–7) ─────────────────────────────────────────────────────
  { text: 'The first 72 hours are neurologically the hardest. Your prefrontal cortex is overriding years of baseline habit. Push through — the resistance is proof the rewiring is happening.', category: 'mindset', icon: '🧠', maxDay: 3 },
  { text: 'Start strong. Research shows first-week completion rate predicts long-term consistency. The tone you set now compounds over time.', category: 'motivation', icon: '⚡', maxDay: 7 },
  { text: 'DOMS (delayed onset soreness) peaks at 24-48 hours and diminishes each subsequent week as your muscles develop protective adaptation. What hurts now will feel normal by Week 3.', category: 'science', icon: '🔬', maxDay: 7 },
  { text: 'Meal prep the night before — every night. Decision fatigue is real: the more choices you face, the worse each one becomes. Remove food decisions; make results automatic.', category: 'strategy', icon: '🎯', maxDay: 10 },
  { text: 'Front-load protein in your first two meals. Hitting 60-80g before 2 PM makes evening adherence easier and keeps workout recovery on track.', category: 'nutrition', icon: '🥗', maxDay: 7 },
  { text: 'Log your starting photos now if you haven\'t. The person looking back at you today will be unrecognizable to you by Day 40. Documentation is motivation.', category: 'strategy', icon: '📸', maxDay: 5 },

  // ── Weeks 2-3 (Days 8–21) — Building momentum ─────────────────────────────
  { text: 'Compound interest applies to fitness identically to money. Each workout doesn\'t just build muscle — it builds the neural pattern that makes the next workout easier to start.', category: 'motivation', icon: '📈', minDay: 8, maxDay: 21 },
  { text: 'Post-workout protein timing: 30-40g within 30-60 minutes maximizes muscle protein synthesis. After that window your muscles are still receptive but the rate drops 30%.', category: 'nutrition', icon: '🥩', minDay: 8, maxDay: 21 },
  { text: 'At Day 14, your brain\'s reward system physically shifts. Dopamine now spikes in anticipation of working out, not just during it. The habit loop is wiring.', category: 'science', icon: '🧬', minDay: 12, maxDay: 16 },
  { text: 'Sleep quality is your #1 performance variable. Slow-wave sleep is when growth hormone is released — at near-zero body fat levels, this is when you actually change shape.', category: 'recovery', icon: '😴', minDay: 10, maxDay: 25 },
  { text: 'The "21-day habit" claim is a myth. A 2010 UCL study found 66 days is the actual mean for complex behaviors. You\'re building something that will last. Keep going.', category: 'science', icon: '📊', minDay: 19, maxDay: 23 },
  { text: 'Your outdoor walk isn\'t cardio — it\'s cortisol regulation, vitamin D synthesis, and mental clarity. Post-workout BDNF (brain-derived neurotrophic factor) is highest during moderate outdoor activity.', category: 'science', icon: '🌿', minDay: 8, maxDay: 21 },

  // ── Danger Zone (Days 22–35) — Boredom & resistance ─────────────────────
  { text: 'Week 3-5 is statistically where most people quit new routines. The novelty fades. Motivation is absent. This is the crucible — the people forged here are different from those who quit.', category: 'mindset', icon: '🔥', minDay: 22, maxDay: 35 },
  { text: 'Creatine monohydrate: 5g/day, no loading phase needed. Most studied supplement in history — over 500 peer-reviewed studies. Improves power output 10-15% in the first 4 weeks.', category: 'nutrition', icon: '💊', minDay: 20, maxDay: 45 },
  { text: 'Active recovery outperforms full rest for soreness by 40%. Light walking, dynamic stretching, and foam rolling increase blood flow to damaged fiber without adding training stress.', category: 'recovery', icon: '🧘', minDay: 20, maxDay: 40 },
  { text: 'You\'ve proven it\'s possible by now. The question has shifted from "can I do this?" to "who is the person who does this?" Identity-based habits are exponentially stickier than goal-based ones.', category: 'mindset', icon: '🪞', minDay: 30, maxDay: 40 },
  { text: 'Visualization works neurologically. Your motor cortex activates identically when you vividly visualize a movement vs physically performing it. Spend 5 minutes seeing your next milestone.', category: 'mindset', icon: '🎬', minDay: 25, maxDay: 40 },

  // ── Month 1+ (Days 36–55) — Forging ──────────────────────────────────────
  { text: 'Day 40+: your body has fully adapted to this training volume. Progressive overload now: add 2.5-5% to your primary lifts weekly. Without it, adaptation plateaus.', category: 'strategy', icon: '📈', minDay: 40, maxDay: 55 },
  { text: 'Planned deloads every 4-6 weeks reduce volume 40-50% for one week. This resets neural fatigue, restores anabolic hormone levels, and typically results in a strength PR the following week.', category: 'recovery', icon: '🔄', minDay: 35, maxDay: 55 },
  { text: 'Your cortisol:testosterone ratio has measurably improved by now. Cognitive function, mood stability, and focus are all tied to this ratio. You literally think and process better.', category: 'science', icon: '🧪', minDay: 40, maxDay: 60 },
  { text: 'Midpoint reflection: compare your energy levels, sleep quality, and mood to Day 1. The delta you can measure now is what real long-term transformation looks like. You\'re in it.', category: 'mindset', icon: '🔭', minDay: 35, maxDay: 45 },
  { text: 'At this point, the people who haven\'t changed lifestyle are noticing you. Your discipline is visible. People will question it — that\'s signal you\'re doing something rare.', category: 'mindset', icon: '💎', minDay: 40, maxDay: 55 },

  // ── Elite territory (Days 50–65) ──────────────────────────────────────────
  { text: 'Day 50 milestone: very few people sustain this level of consistency. What you\'ve built in the last 50 days is a new default.', category: 'motivation', icon: '🏆', minDay: 49, maxDay: 52 },
  { text: 'Omega-3 supplementation (2-3g EPA/DHA daily) measurably reduces exercise-induced inflammation and accelerates recovery. Best sources: fatty fish, algae oil, or quality fish oil capsules.', category: 'nutrition', icon: '🐟', minDay: 45, maxDay: 65 },
  { text: 'Your tendon strength is still catching up to your muscle strength — tendons take 3-6 months to fully adapt. Don\'t let ego-loading create an injury in the final stretch.', category: 'science', icon: '⚠️', minDay: 50, maxDay: 65 },

  // ── Final stretch (Days 60–75) ────────────────────────────────────────────
  { text: 'The final 15 days define character. This is where you find out whether you built real discipline or just sustained motivation. Don\'t coast — finish with violence.', category: 'motivation', icon: '🏁', minDay: 60 },
  { text: 'Post-milestone: what you maintain after a big streak determines whether this was an event or a real lifestyle shift. Start planning now.', category: 'strategy', icon: '📋', minDay: 65 },
  { text: 'Quantify your work so far: training hours, pages read, and walks completed. Seeing the numbers makes your progress undeniable.', category: 'science', icon: '🏅', minDay: 70 },
  { text: 'Last mile mentality: marathon runners who quit do it between mile 20-24, never at mile 26. You are at mile 24. The finish line is real. The pain is temporary. Push.', category: 'mindset', icon: '🎯', minDay: 68 },

  // ── Universal (any day) ────────────────────────────────────────────────────
  { text: 'Nutritional consistency beats perfection. Repeating simple, high-protein meals 80% of the time outperforms random “perfect days” that never sustain.', category: 'nutrition', icon: '🥗' },
  { text: 'Diet logging builds nutritional awareness—even rough tracking helps. Studies show people who log food consume 15-20% fewer calories and make significantly better food choices over time.', category: 'nutrition', icon: '📝' },
  { text: 'Mood tracking is data, not feelings. Patterns in your mood scores over 2 weeks reveal your optimal training times, rest needs, and dietary triggers most people never identify.', category: 'mindset', icon: '🎭' },
  { text: 'Reading 10 pages daily = 12-15 books per year. The true ROI isn\'t just knowledge — it\'s the sustained attention span you\'re rebuilding in a world optimized to destroy it.', category: 'mindset', icon: '📖' },
  { text: 'Progress photos compound in value. The Day 1 photo feels useless until Day 30 when the delta becomes undeniable evidence. Take them consistently, even on bad days.', category: 'strategy', icon: '📷' },
  { text: 'You are building identity, not just habits. Every task completed is a vote for the person you\'re becoming. Identity change is the only change that compounds without willpower.', category: 'mindset', icon: '🪞' },
  { text: 'Consistency at 80% effort beats perfection at 100% effort attempted once a week. A slightly subpar workout still trains the completion habit — the most important habit you\'re building.', category: 'motivation', icon: '✊' },
  { text: 'Cold exposure (2-3 min cold shower) spikes norepinephrine 200-300%, increases dopamine baseline 250%, and reduces inflammation markers. It\'s the highest ROI biohack that costs nothing.', category: 'science', icon: '🥶' },
  { text: 'Magnesium glycinate before bed (200-400mg) measurably improves deep sleep architecture, reduces cortisol, and helps with muscle relaxation. It\'s one of the most common deficiencies in athletes.', category: 'nutrition', icon: '💊' },
  { text: 'A 10-minute walk after meals reduces postprandial blood glucose spikes by 30% and improves insulin sensitivity. Your outdoor walk isn\'t just completing a checkbox — it\'s metabolic medicine.', category: 'science', icon: '🚶' },
  { text: 'Track your primary lifts. The most motivating data point in strength training isn\'t aesthetics — it\'s measurable strength gain. A new PR delivers the clearest evidence of progress.', category: 'strategy', icon: '📊' },
  { text: 'The two types of pain: discipline and regret. One is temporary and self-chosen. The other is permanent and chosen for you by your past decisions. You already know which one to pick.', category: 'mindset', icon: '⚖️' },
  { text: 'RPE (rate of perceived exertion) should be 7-8/10 on working sets. If everything feels easy, you\'re not in the hypertrophy range. If everything feels maximal, you\'re in injury territory.', category: 'strategy', icon: '🏋️' },
  { text: 'Gut health affects training performance via the gut-brain axis. Consistency in your diet — even imperfect consistency — stabilizes the microbiome and reduces inflammation within 2-3 weeks.', category: 'science', icon: '🦠' },
];

const TIME_TIPS: { hours: [number, number]; tip: string; icon: string }[] = [
  { hours: [5,  8],  tip: 'Morning check-in: get sunlight and 5-10 minutes of movement right after waking. It stabilizes circadian rhythm and improves workout energy later.', icon: '🌅' },
  { hours: [8,  11], tip: 'Pre-workout window: consume 30-40g protein and 40-60g complex carbs 60-90 min before training. Carbs are muscle fuel — don\'t train fasted if you want performance.', icon: '☀️' },
  { hours: [11, 14], tip: 'Midday check: lock in your next meal now (protein + quality carbs) so evening training doesn\'t get derailed by decision fatigue.', icon: '🌤️' },
  { hours: [14, 17], tip: 'Afternoon cortisol dip? 10 min of brisk walking outside resets your alertness hormones without disrupting sleep later. It\'s also your best midday cognitive booster.', icon: '☕' },
  { hours: [17, 20], tip: 'Evening training window: research shows afternoon/evening sessions produce 20% higher peak force output than morning sessions. If you train now, push harder.', icon: '🌇' },
  { hours: [20, 22], tip: 'Final tasks window: reading happens best now — cortisol is low, you\'re winding down, and retention is actually higher in evening reading for long-form content. Log your mood too.', icon: '🌙' },
  { hours: [22, 24], tip: 'Late night? Get everything done and prioritize 7-8 hours. Every hour of sleep deprivation costs you 15-20% of the recovery gains from today\'s training.', icon: '🌑' },
];

interface StatContext {
  streak?: number;
  energyLevel?: number;
  sorenessLevel?: number;
  moodEmoji?: string;
  gymDone?: boolean;
  walkDone?: boolean;
}

function getStatBasedTip(context: StatContext): string | null {
  // Milestone streaks
  if (context.streak && context.streak > 0 && context.streak % 7 === 0) {
    const weeks = context.streak / 7;
    return `🔥 ${context.streak}-day streak (${weeks} week${weeks > 1 ? 's' : ''} straight). You are in rare consistency territory. Don't stop here.`;
  }
  // Non-7 milestones
  if (context.streak === 10) return '🎯 10-day streak. You\'ve crossed the threshold where habits start feeling automatic. Neuroscience calls this "automaticity onset." Use the momentum.';
  if (context.streak === 30) return '💎 30-day streak. One full month of unbroken discipline. Your brain\'s baseline has physically shifted — this is no longer a challenge, it\'s your standard.';
  if (context.streak === 50) return '🏆 50-day streak. You\'ve already won the mental battle that stops 95% of people. The last 25 days are a formality for someone who\'s come this far.';

  // High soreness
  if (context.sorenessLevel !== undefined && context.sorenessLevel >= 5) {
    return '🚨 Soreness at maximum. Scale today\'s gym intensity to 60-70%. Focus on movement quality, not load. Eat an extra 20-30g protein and prioritize 8+ hours sleep tonight — this is how you avoid injury in the final weeks.';
  }
  if (context.sorenessLevel !== undefined && context.sorenessLevel >= 4) {
    return '⚠️ High soreness detected. Foam roll for 10 min before training, reduce working weight 15-20%, and increase protein intake today. Recovery IS training — ignoring this leads to forced rest, which is worse.';
  }

  // Low energy
  if (context.energyLevel !== undefined && context.energyLevel <= 1) {
    return '🔋 Critical energy low. Check the basics: Have you eaten 30g+ protein today? Slept 7+ hours? Taken a short walk for circulation? Address it before the workout, not after.';
  }
  if (context.energyLevel !== undefined && context.energyLevel <= 2) {
    return '⚡ Low energy today. Most likely cause: insufficient carbohydrates or poor sleep. Eat 40-50g fast carbs now, wait 30 min, then train. Output will be significantly better than training in this state.';
  }

  // Mood-based
  if (context.moodEmoji === 'terrible') {
    return '💛 Terrible day? Good. Your discipline on the bad days is your real streak — anyone can show up when they feel great. Log everything, complete the minimum viable tasks, and know this passes.';
  }
  if (context.moodEmoji === 'bad') {
    return '💙 Not feeling it today. That\'s information, not an excuse. Low mood is often a sleep or recovery signal. Complete your workout first, then reassess — action reliably precedes motivation.';
  }

  // Both workouts done
  if (context.gymDone && context.walkDone) {
    return '🔥 Both workouts locked in. Your anabolic window is open — prioritize 30-40g protein and 40-50g carbs in the next 90 min. Then focus on reading and sleep setup to finish strong.';
  }

  // Just gym done
  if (context.gymDone && !context.walkDone) {
    return '💪 Gym done. Don\'t let the walk slide — it\'s the most commonly skipped task and the one that separates good days from complete days. 45 min outside also resets cortisol after training.';
  }

  return null;
}

function getSmartTipForDay(day: number): SmartTip {
  const filtered = SMART_TIPS.filter(t =>
    (!t.minDay || day >= t.minDay) && (!t.maxDay || day <= t.maxDay)
  );
  const pool = filtered.length > 0 ? filtered : SMART_TIPS;
  return pool[(day - 1) % pool.length];
}

export function getDailyTip(day: number, context?: StatContext): string {
  // Priority 1: Stat-based contextual tips (most relevant)
  if (context) {
    const statTip = getStatBasedTip(context);
    if (statTip) return statTip;
  }

  // Priority 2: Time-of-day tips (shown when hour matches and day is divisible by 3)
  const hour = new Date().getHours();
  const timeTip = TIME_TIPS.find(t => hour >= t.hours[0] && hour < t.hours[1]);
  if (timeTip && day % 3 === 0) {
    return `${timeTip.icon} ${timeTip.tip}`;
  }

  // Priority 3: Day-range-specific tips
  const tip = getSmartTipForDay(day);
  return `${tip.icon} ${tip.text}`;
}

export function getTipCategory(day: number): { category: string; color: string; icon: string } {
  const categories: Record<string, { color: string; icon: string }> = {
    motivation: { color: '#FF6B35', icon: '⚡' },
    nutrition:  { color: '#00F5D4', icon: '🥗' },
    recovery:   { color: '#A855F7', icon: '💤' },
    mindset:    { color: '#FFE66D', icon: '🧠' },
    science:    { color: '#38BDF8', icon: '🔬' },
    strategy:   { color: '#FF6B9D', icon: '🎯' },
  };

  const tip = getSmartTipForDay(day);
  return { category: tip.category, ...categories[tip.category] };
}

export function getMotivationalQuote(day: number): { quote: string; author: string } {
  const QUOTES = [
    // ── Week 1: Starting strong ──────────────────────────────────────
    { quote: 'The only bad workout is the one that didn\'t happen.', author: 'Unknown' },
    { quote: 'Discipline is choosing between what you want NOW and what you want MOST.', author: 'Abraham Lincoln' },
    { quote: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
    { quote: 'Strength does not come from winning. It comes from struggle.', author: 'Arnold Schwarzenegger' },
    { quote: 'You don\'t have to be extreme, just consistent.', author: 'GrindOs' },
    { quote: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Arnold Schwarzenegger' },
    { quote: 'Success isn\'t always about greatness. It\'s about consistency.', author: 'Dwayne Johnson' },

    // ── Week 2: Building momentum ────────────────────────────────────
    { quote: 'Champions aren\'t made in gyms. They\'re made from something deep inside.', author: 'Muhammad Ali' },
    { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { quote: 'I hated every minute of training, but I said, don\'t quit.', author: 'Muhammad Ali' },
    { quote: 'What hurts today makes you stronger tomorrow.', author: 'Jay Cutler' },
    { quote: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
    { quote: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
    { quote: 'Your body can stand almost anything. It\'s your mind you have to convince.', author: 'Unknown' },

    // ── Week 3: Pushing through ──────────────────────────────────────
    { quote: 'Don\'t count the days, make the days count.', author: 'Muhammad Ali' },
    { quote: 'It never gets easier. You just get stronger.', author: 'Unknown' },
    { quote: 'Motivation gets you started. Habit keeps you going.', author: 'Jim Ryun' },
    { quote: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', author: 'Aristotle' },
    { quote: 'The difference between a successful person and others is not lack of strength, but rather lack in will.', author: 'Vince Lombardi' },
    { quote: 'If it doesn\'t challenge you, it doesn\'t change you.', author: 'Fred DeVito' },
    { quote: 'The last three or four reps is what makes the muscle grow.', author: 'Arnold Schwarzenegger' },

    // ── Week 4: Identity shift ───────────────────────────────────────
    { quote: 'You don\'t find willpower. You build it.', author: 'GrindOs' },
    { quote: 'The goal is not to be better than the other man, but your previous self.', author: 'Dalai Lama' },
    { quote: 'Take care of your body. It\'s the only place you have to live.', author: 'Jim Rohn' },
    { quote: 'First, forget inspiration. Habit is more dependable.', author: 'Octavia Butler' },
    { quote: 'To keep the body in good health is a duty.', author: 'Buddha' },
    { quote: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
    { quote: 'No man has the right to be an amateur in the matter of physical training.', author: 'Socrates' },

    // ── Week 5: Mental fortitude ─────────────────────────────────────
    { quote: 'Suffer the pain of discipline or suffer the pain of regret.', author: 'Jim Rohn' },
    { quote: 'The hard days are the best because that\'s when champions are made.', author: 'Gabby Douglas' },
    { quote: 'The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.', author: 'Arnold Schwarzenegger' },
    { quote: 'Training gives us an outlet for suppressed energies created by stress and thus tones the spirit just as exercise conditions the body.', author: 'Arnold Schwarzenegger' },
    { quote: 'The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.', author: 'Arnold Schwarzenegger' },
    { quote: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
    { quote: 'The clock is ticking. Are you becoming the person you want to be?', author: 'Greg Plitt' },

    // ── Week 6: No shortcuts ─────────────────────────────────────────
    { quote: 'There are no shortcuts. Everything is reps, reps, reps.', author: 'Arnold Schwarzenegger' },
    { quote: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
    { quote: 'You must expect great things of yourself before you can do them.', author: 'Michael Jordan' },
    { quote: 'The only way to define your limits is by going beyond them.', author: 'Arthur C. Clarke' },
    { quote: 'Obsessed is a word the lazy use to describe the dedicated.', author: 'Unknown' },
    { quote: 'Be stronger than your strongest excuse.', author: 'Unknown' },
    { quote: 'The iron never lies to you. Two hundred pounds is always two hundred pounds.', author: 'Henry Rollins' },

    // ── Week 7: Proving it ───────────────────────────────────────────
    { quote: 'Strive for progress, not perfection.', author: 'Unknown' },
    { quote: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
    { quote: 'You were given this life because you are strong enough to live it.', author: 'Unknown' },
    { quote: 'When you feel like quitting, think about why you started.', author: 'Unknown' },
    { quote: 'Dead last is greater than did not finish, which trumps did not start.', author: 'Unknown' },
    { quote: 'Once you learn to quit, it becomes a habit.', author: 'Vince Lombardi' },
    { quote: 'The real workout starts when you want to stop.', author: 'Ronnie Coleman' },

    // ── Week 8: Forging iron ─────────────────────────────────────────
    { quote: 'Nothing will work unless you do.', author: 'Maya Angelou' },
    { quote: 'Everybody wants to be a bodybuilder, but don\'t nobody want to lift no heavy weights.', author: 'Ronnie Coleman' },
    { quote: 'What we do in life echoes in eternity.', author: 'Marcus Aurelius' },
    { quote: 'The pain of today is the victory of tomorrow.', author: 'Unknown' },
    { quote: 'Good things come to those who sweat.', author: 'Unknown' },
    { quote: 'Pain is temporary. Quitting lasts forever.', author: 'Lance Armstrong' },
    { quote: 'A year from now, you will wish you had started today.', author: 'Karen Lamb' },

    // ── Week 9: Character built ──────────────────────────────────────
    { quote: 'Strength does not come from the physical capacity. It comes from an indomitable will.', author: 'Mahatma Gandhi' },
    { quote: 'Our greatest glory is not in never falling, but in rising every time we fall.', author: 'Confucius' },
    { quote: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius' },
    { quote: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
    { quote: 'The best project you will ever work on is you.', author: 'Unknown' },
    { quote: 'Don\'t wish it were easier. Wish you were better.', author: 'Jim Rohn' },
    { quote: 'Some people want it to happen, some wish it would happen, others make it happen.', author: 'Michael Jordan' },

    // ── Week 10: Unstoppable ─────────────────────────────────────────
    { quote: 'It\'s not about perfect. It\'s about effort. When you bring that effort every single day, transformation happens.', author: 'Jillian Michaels' },
    { quote: 'The body is the servant of the mind. It obeys the operations of the mind.', author: 'James Allen' },
    { quote: 'Success is what comes after you stop making excuses.', author: 'Luis Galarza' },
    { quote: 'You can have results or excuses, not both.', author: 'Arnold Schwarzenegger' },
    { quote: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },

    // ── Week 11: The final push ──────────────────────────────────────
    { quote: 'Hard work beats talent when talent doesn\'t work hard.', author: 'Tim Notke' },
    { quote: 'Your only limit is you.', author: 'Unknown' },
    { quote: 'The finish line is just the beginning of a whole new race.', author: 'Unknown' },
    { quote: 'I am not what happened to me. I am what I choose to become.', author: 'Carl Jung' },
    { quote: 'You have survived 100% of your worst days. You\'re doing great.', author: 'Unknown' },
    { quote: 'The ones who are crazy enough to think they can change the world are the ones that do.', author: 'Steve Jobs' },
    { quote: 'Every champion was once a contender that refused to give up.', author: 'Rocky Balboa' },
  ];
  return QUOTES[(day - 1) % QUOTES.length];
}

const QUOTE_CACHE_KEY = 'iron75_ai_quote';
const QUOTE_CACHE_DATE_KEY = 'iron75_ai_quote_date';
// Tracks whether we already attempted (and failed) today — prevents retrying on every mount
const QUOTE_FAILED_KEY = 'iron75_ai_quote_failed_date';

/**
 * Fetches a fresh motivational quote via Gemini for the given day.
 * Returns a cached version if already fetched today. If the API call
 * fails, records the failure date so subsequent mounts skip the API
 * call and go straight to the local pool (avoids hammering quota).
 */
export async function fetchAIQuote(
  day: number,
  askGeminiFn: (prompt: string) => Promise<string>
): Promise<{ quote: string; author: string }> {
  if (typeof window === 'undefined') return getMotivationalQuote(day);

  const today = new Date().toISOString().split('T')[0];

  // Return cached success
  const cachedDate = localStorage.getItem(QUOTE_CACHE_DATE_KEY);
  const cachedQuote = localStorage.getItem(QUOTE_CACHE_KEY);
  if (cachedDate === today && cachedQuote) {
    try { return JSON.parse(cachedQuote); } catch { /* fall through */ }
  }

  // Skip if we already failed today (quota exhausted, network error, etc.)
  if (localStorage.getItem(QUOTE_FAILED_KEY) === today) {
    return getMotivationalQuote(day);
  }

  try {
    const prompt = `Day ${day} GrindOs routine log. Return ONLY JSON: {"quote":"<discipline quote>","author":"<name or GrindOs>"}`;
    const raw = await askGeminiFn(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*?"quote"[\s\S]*?"author"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.quote && parsed.author) {
        const result = { quote: parsed.quote, author: parsed.author };
        localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(result));
        localStorage.setItem(QUOTE_CACHE_DATE_KEY, today);
        return result;
      }
    }
  } catch { /* fall through */ }

  // Record failure so we don't retry until tomorrow
  localStorage.setItem(QUOTE_FAILED_KEY, today);
  return getMotivationalQuote(day);
}

