import Image from 'next/image';
import Link from 'next/link';
import { Bebas_Neue, Manrope } from 'next/font/google';

const headingFont = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
});

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const featureCards = [
  {
    title: 'Daily Scoreboard',
    description:
      'Track every non-negotiable task in one view and know exactly what is still pending before midnight.',
    tag: 'Execution',
  },
  {
    title: 'Workout Intelligence',
    description:
      'Run your own custom workout routine, log sets quickly, and keep progression data organized day after day.',
    tag: 'Training',
  },
  {
    title: 'Weekly Reflection',
    description:
      'Get a clear end-of-week snapshot of adherence, momentum, and recovery trends to tighten your next week.',
    tag: 'Feedback',
  },
];

const processSteps = [
  {
    step: '01',
    title: 'Set your routine',
    text: 'Start tracking your workouts and daily habits with a clean baseline.',
  },
  {
    step: '02',
    title: 'Execute daily',
    text: 'Log what you finish, check off habits quickly, and keep your streak visible.',
  },
  {
    step: '03',
    title: 'Review and adapt',
    text: 'Use trends and weekly summaries to adjust training load, sleep quality, and focus habits.',
  },
];

const proofPoints = [
  'Local-first tracking with optional cloud sync',
  'Built for mobile and desktop routines',
  'No ads and no behavioral surveillance',
];

export default function LandingPage() {
  return (
    <div
      className={`${headingFont.variable} ${bodyFont.variable} relative min-h-dvh overflow-hidden bg-[#fff8ef] text-slate-900`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-[#ff8a5b]/35 blur-3xl" />
        <div className="absolute right-0 top-52 h-80 w-80 rounded-full bg-[#2ec4b6]/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#f4d35e]/30 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
          <Link href="/" className="landing-reveal flex items-center gap-3" style={{ animationDelay: '80ms' }}>
            <Image src="/grindos-logo.svg" alt="GrindOs" width={42} height={42} className="h-10 w-auto" priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">GrindOs</p>
              <p
                className="-mt-1 text-3xl uppercase leading-none text-slate-900"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Habit tracker + gym logger
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="landing-reveal rounded-full border border-slate-900 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-900 hover:text-[#fff8ef]"
            style={{ animationDelay: '160ms' }}
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-16 pt-4 md:px-10 md:pb-24 md:pt-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <p
              className="landing-reveal inline-flex rounded-full border border-slate-900/25 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-700"
              style={{ animationDelay: '220ms' }}
            >
              Habit + gym consistency system
            </p>

            <h1
              className="landing-reveal max-w-2xl text-[3.1rem] uppercase leading-[0.88] text-slate-900 sm:text-[4.2rem] md:text-[5.5rem]"
              style={{ fontFamily: 'var(--font-heading)', animationDelay: '300ms' }}
            >
              Build consistency.
              <span className="block text-[#f95738]">Track habits and training in one place.</span>
            </h1>

            <p className="landing-reveal max-w-xl text-base leading-relaxed text-slate-700 md:text-lg" style={{ animationDelay: '380ms' }}>
              GrindOs is a simple system for daily habit check-ins, gym logging, and long-term trend visibility.
              Stay consistent without overcomplicating your routine.
            </p>

            <div className="landing-reveal flex flex-wrap gap-3" style={{ animationDelay: '460ms' }}>
              <Link
                href="/dashboard"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-[#fff8ef] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start Tracking
              </Link>
              <Link
                href="#how"
                className="rounded-full border border-slate-900/20 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5"
              >
                Explore Features
              </Link>
            </div>

            <div className="landing-reveal grid max-w-xl gap-3 sm:grid-cols-3" style={{ animationDelay: '520ms' }}>
              <div className="rounded-2xl border border-slate-900/15 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Daily tasks</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">5 tracked</p>
              </div>
              <div className="rounded-2xl border border-slate-900/15 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Workout setup</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">Custom</p>
              </div>
              <div className="rounded-2xl border border-slate-900/15 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Weekly recap</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">Auto</p>
              </div>
            </div>
          </div>

          <aside className="landing-reveal relative" style={{ animationDelay: '600ms' }}>
            <div className="landing-float-card rounded-3xl border border-slate-900/15 bg-[#0f172a] p-6 text-slate-100 shadow-[0_28px_70px_rgba(15,23,42,0.35)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5eead4]">Today overview</p>
              <h2
                className="mt-4 text-4xl uppercase leading-none text-white md:text-5xl"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Day 24
              </h2>

              <div className="mt-7 space-y-3">
                {[
                  'Gym session logged',
                  'Outdoor walk or activity',
                  'Reading habit complete',
                  'Diet diary updated',
                  'Mood + energy check-in',
                  'Progress photos uploaded',
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                      index < 4
                        ? 'border-emerald-300/30 bg-emerald-300/15 text-emerald-100'
                        : 'border-white/15 bg-white/5 text-slate-300'
                    }`}
                  >
                    <span className="text-sm">{item}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide">{index < 4 ? 'Done' : 'Pending'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl border border-[#5eead4]/30 bg-[#0f766e]/15 p-4">
                <p className="text-xs uppercase tracking-wider text-[#99f6e4]">AI coach note</p>
                <p className="mt-2 text-sm text-[#ccfbf1]">Energy dipped after lunch. Move your outdoor session to 5:30 PM and front-load carbs before it.</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-6 py-4 md:px-10 md:py-10">
          <h2
            className="landing-reveal text-center text-[2.5rem] uppercase leading-none text-slate-900 md:text-[4rem]"
            style={{ fontFamily: 'var(--font-heading)', animationDelay: '120ms' }}
          >
            Built for follow-through
          </h2>
          <p className="landing-reveal mx-auto mt-4 max-w-2xl text-center text-slate-700" style={{ animationDelay: '200ms' }}>
            Every interface decision is engineered to reduce friction and make your next action obvious.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <article
                key={card.title}
                className="landing-reveal rounded-3xl border border-slate-900/15 bg-white/75 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                style={{ animationDelay: `${280 + index * 90}ms` }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f95738]">{card.tag}</p>
                <h3 className="mt-3 text-xl font-extrabold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[1fr_1fr]">
          <div className="landing-reveal rounded-3xl border border-slate-900/15 bg-white/75 p-7" style={{ animationDelay: '90ms' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h3
              className="mt-3 text-[2.5rem] uppercase leading-none text-slate-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Simple tracking. Clear momentum.
            </h3>
            <div className="mt-6 space-y-4">
              {processSteps.map((item) => (
                <div key={item.step} className="flex gap-4 rounded-2xl border border-slate-900/10 bg-white/80 p-4">
                  <span className="text-xl font-black text-[#f95738]">{item.step}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-reveal rounded-3xl border border-slate-900/15 bg-[#1e293b] p-7 text-slate-100" style={{ animationDelay: '180ms' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#facc15]">Why athletes choose it</p>
            <h3
              className="mt-3 text-[2.5rem] uppercase leading-none text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Focused, private, durable
            </h3>
            <ul className="mt-6 space-y-3">
              {proofPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
                  <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#5eead4]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-[#facc15]/35 bg-[#facc15]/10 p-4">
              <p className="text-sm text-[#fef08a]">
                "I stopped guessing. GrindOs made my routine measurable and easy to follow every day."
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[#fde68a]">Rohan, Day 56</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-20 md:px-10 md:pb-24">
          <div className="landing-reveal rounded-[2rem] border border-slate-900/15 bg-white/80 p-8 text-center shadow-[0_20px_50px_rgba(15,23,42,0.12)] md:p-12" style={{ animationDelay: '120ms' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Ready to start?</p>
            <h2
              className="mx-auto mt-3 max-w-3xl text-[2.6rem] uppercase leading-none text-slate-900 md:text-[4rem]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Start with a system built for long-term consistency.
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[#f95738] px-7 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#ed4626]"
              >
                Launch GrindOs
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-900/20 bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
              >
                Sign in and continue streak
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-900/10 bg-white/45 px-6 py-5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:px-10">
        GrindOs | Discipline over mood
      </footer>
    </div>
  );
}
