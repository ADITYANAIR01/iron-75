'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DailyLog } from '../lib/types';
import { getDailyLog, getAppState } from '../lib/storage';
import {
  WeeklyAccountabilityStatus,
  buildWeeklyAccountabilityStatus,
  getAccountabilityCircleProfile,
  getAccountabilityWeekWindow,
} from '../lib/accountability';
import { useAuth } from './AuthProvider';

interface DayStatus {
  day: number;
  date: string;
  status: 'complete' | 'failed' | 'future';
  tasksCompleted: number; // 0–5 optional habits
  log: DailyLog | null;
}

type ChartRow = {
  day: string;
  mood: number;
  energy: number;
  motivation: number;
  soreness: number;
  tasks: number;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateForDay(startDate: string, dayNumber: number): string {
  return addDays(startDate, dayNumber - 1);
}

function countTasks(log: DailyLog): number {
  let n = 0;
  if (log.gymWorkoutDone) n++;
  if (log.outdoorWalkDone) n++;
  if (
    log.dietSlots.breakfast ||
    log.dietSlots.lunch ||
    log.dietSlots.dinner ||
    log.dietSlots.snacks
  )
    n++;
  if (log.moodEmoji) n++;
  if (log.readingDone) n++;
  return n;
}

function moodValue(mood: string): number {
  const MAP: Record<string, number> = {
    terrible: 1,
    bad: 2,
    meh: 3,
    good: 4,
    great: 5,
  };
  return MAP[mood] ?? 0;
}

function buildDayStatuses(startDate: string, currentDay: number, windowDays: number): DayStatus[] {
  const days: DayStatus[] = [];
  const startDay = Math.max(1, currentDay - windowDays + 1);
  for (let i = 0; i < windowDays; i++) {
    const dayNum = startDay + i;
    const date = getDateForDay(startDate, dayNum);
    if (dayNum > currentDay) {
      days.push({ day: dayNum, date, status: 'future', tasksCompleted: 0, log: null });
      continue;
    }
    const isToday = dayNum === currentDay;
    const log = getDailyLog(date);
    if (log) {
      const tasks = countTasks(log);
      days.push({
        day: dayNum,
        date,
        log,
        status: log.gymWorkoutDone ? 'complete' : isToday ? 'future' : 'failed',
        tasksCompleted: tasks,
      });
    } else {
      days.push({ day: dayNum, date, status: isToday ? 'future' : 'failed', tasksCompleted: 0, log: null });
    }
  }
  return days;
}

function buildChartData(days: DayStatus[]): ChartRow[] {
  return days
    .filter((d) => d.log !== null && d.status !== 'future')
    .map((d) => ({
      day: `D${d.day}`,
      mood: moodValue(d.log!.moodEmoji),
      energy: d.log!.energyLevel,
      motivation: d.log!.motivationLevel,
      soreness: d.log!.sorenessLevel,
      tasks: d.tasksCompleted,
    }));
}

const COMPLETE_COLOR = '#00F5D4';
const FAILED_COLOR = '#FF6B35';
const FUTURE_COLOR = '#141432';
const WINDOW_OPTIONS = [10, 30, 75, 150, 300] as const;

function statusColor(s: DayStatus['status']): string {
  if (s === 'complete') return COMPLETE_COLOR;
  if (s === 'failed') return FAILED_COLOR;
  return FUTURE_COLOR;
}

function ringFillColor(pct: number, isFuture: boolean): string {
  if (isFuture) return FUTURE_COLOR;
  if (pct >= 1) return COMPLETE_COLOR;
  if (pct >= 0.6) return '#BAFF39';
  if (pct > 0) return FAILED_COLOR;
  return '#FF4757';
}

function taskBarColor(tasks: number): string {
  if (tasks === 5) return '#00F5D4';
  if (tasks >= 3) return '#FF6B35';
  return '#FF4757';
}

function HeatmapGrid({ days, columns = 11 }: { days: DayStatus[]; columns?: number }) {
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {days.map((d, idx) => (
          <motion.div
            key={d.day}
            className="aspect-square rounded-[4px] cursor-default"
            style={{
              background: statusColor(d.status),
              boxShadow: d.status === 'complete' ? `0 0 8px ${COMPLETE_COLOR}30` : d.status === 'failed' ? `0 0 6px ${FAILED_COLOR}20` : 'none',
            }}
            title={`Day ${d.day} (${d.date}) — ${d.status}${d.status !== 'future' ? `: ${d.tasksCompleted}/5 habits` : ''}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: idx * 0.005,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            whileHover={{ scale: 1.35, zIndex: 10, position: 'relative' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {(
          [
            ['Complete', COMPLETE_COLOR],
            ['Failed', FAILED_COLOR],
            ['Future', '#2a2a4a'],
          ] as [string, string][]
        ).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px]" style={{ background: color }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RingView({ days, columns = 11 }: { days: DayStatus[]; columns?: number }) {
  const SIZE = 32;
  const R = 11;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {days.map((d, idx) => {
        const pct = d.status === 'future' ? 0 : d.tasksCompleted / 5;
        const color = ringFillColor(pct, d.status === 'future');
        const offset = CIRC * (1 - pct);
        return (
          <motion.div
            key={d.day}
            className="flex items-center justify-center"
            title={`Day ${d.day}: ${d.tasksCompleted}/5 habits`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: idx * 0.005,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            whileHover={{ scale: 1.4 }}
          >
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke="#141432"
                strokeWidth="3"
                fill="none"
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={color}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                animate={{ strokeDashoffset: offset }}
                initial={{ strokeDashoffset: CIRC }}
                transition={{
                  duration: 0.7,
                  delay: idx * 0.008,
                  ease: 'easeOut',
                }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fill="#666"
              >
                {d.day}
              </text>
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

const GRID_COLOR = '#1a1a40';
const AXIS_COLOR = '#64748b';

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{ background: 'rgba(12,12,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', backdropFilter: 'blur(8px)' }}
    >
      <p className="font-bold mb-1" style={{ color: '#00F5D4' }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl">📊</span>
      <p className="text-center text-sm" style={{ color: '#64748b' }}>
        No data yet — complete Day 1 to see your trends
      </p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'charts'>('overview');
  const [heatmapView, setHeatmapView] = useState<'grid' | 'rings'>('grid');
  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(75);
  const [days, setDays] = useState<DayStatus[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [accountabilityStatus, setAccountabilityStatus] = useState<WeeklyAccountabilityStatus | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const appSt = getAppState();
    const startDate = appSt.startDate;
    const currentDay = appSt.currentDay;
    const d = buildDayStatuses(startDate, currentDay, windowDays);
    setDays(d);
    setChartData(buildChartData(d));
    const referenceDate = getDateForDay(startDate, currentDay);
    const weekWindow = getAccountabilityWeekWindow(referenceDate);
    const weeklyLogs = weekWindow.dates
      .map((date) => getDailyLog(date))
      .filter((log): log is DailyLog => Boolean(log));
    setAccountabilityStatus(buildWeeklyAccountabilityStatus({
      profile: getAccountabilityCircleProfile(),
      logs: weeklyLogs,
      referenceDate,
    }));
  }, [mounted, windowDays]);

  const TABS = ['overview', 'photos', 'charts'] as const;
  const TAB_LABELS: Record<string, string> = {
    overview: 'Overview',
    photos: 'Photos',
    charts: 'Charts',
  };

  const completeCount = days.filter((d) => d.status === 'complete').length;
  const failedCount = days.filter((d) => d.status === 'failed').length;
  const futureCount = days.filter((d) => d.status === 'future').length;
  const xAxisInterval = windowDays >= 300 ? 29 : windowDays >= 150 ? 14 : windowDays >= 75 ? 9 : 0;
  const heatmapColumns = windowDays >= 300 ? 15 : windowDays >= 150 ? 13 : 11;

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #00F5D4, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Progress
        </h1>
        <p className="text-sm text-gray-400 mt-1">Your consistency trends visualized</p>
      </motion.div>

      {/* Tab row */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
            style={{
              background:
                activeTab === tab ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeTab === tab ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
              color: activeTab === tab ? '#00F5D4' : '#64748b',
              boxShadow: activeTab === tab ? '0 0 12px rgba(0,245,212,0.15)' : 'none',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-500">Window</span>
        {WINDOW_OPTIONS.map((option) => {
          const active = option === windowDays;
          return (
            <button
              key={option}
              onClick={() => setWindowDays(option)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: active ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#c4b5fd' : '#64748b',
              }}
            >
              {option}d
            </button>
          );
        })}
      </div>

      {accountabilityStatus && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">🤝 Weekly Accountability</h3>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: accountabilityStatus.enabled ? 'rgba(0,245,212,0.14)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${accountabilityStatus.enabled ? 'rgba(0,245,212,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: accountabilityStatus.enabled ? '#00F5D4' : '#94A3B8',
                }}
              >
                {accountabilityStatus.enabled ? 'Mode on' : 'Mode off'}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: user ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${user ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: user ? '#38BDF8' : '#94A3B8',
                }}
              >
                {user ? 'Cloud sync' : 'Local only'}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Week {accountabilityStatus.weekStart} → {accountabilityStatus.weekEnd}
          </p>
          {accountabilityStatus.teamLabel && (
            <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>
              Team: {accountabilityStatus.teamLabel}
            </p>
          )}

          {accountabilityStatus.enabled ? (
            <>
              <p className="text-sm mt-2" style={{ color: '#e2e8f0' }}>
                Goal: {accountabilityStatus.goalTitle}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  {
                    label: 'Workouts',
                    value: `${accountabilityStatus.workoutDays}/${accountabilityStatus.targetWorkoutDays}`,
                    color: '#00F5D4',
                  },
                  {
                    label: 'Check-ins',
                    value: `${accountabilityStatus.checkInDays}/7`,
                    color: '#A855F7',
                  },
                  {
                    label: 'Remaining',
                    value: accountabilityStatus.workoutsRemaining,
                    color: '#FF6B35',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-lg font-black" style={{ color: item.color }}>
                      {item.value}
                    </div>
                    <div className="text-[10px] text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
              {accountabilityStatus.partnerNames.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Circle: {accountabilityStatus.partnerNames.join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Accountability mode is currently off. You can enable it in Settings anytime.
            </p>
          )}

          <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
            {accountabilityStatus.encouragement}
          </p>
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && mounted && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            {/* Heatmap view toggle */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(12,12,30,0.8)' }}
            >
              {(['grid', 'rings'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setHeatmapView(view)}
                  className="flex-1 py-2.5 text-xs font-bold transition-all"
                  style={{
                    background: heatmapView === view ? '#00F5D4' : 'transparent',
                    color: heatmapView === view ? '#06060F' : '#64748b',
                  }}
                >
                  {view === 'grid' ? '⬛ Grid' : '⭕ Progress Rings'}
                </button>
              ))}
            </div>

            {/* Heatmap panel */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                  {windowDays}-Day Activity Window
                </span>
                <span className="text-xs" style={{ color: '#64748b' }}>
                  {completeCount} complete days
                </span>
              </div>

              <AnimatePresence mode="wait">
                {heatmapView === 'grid' ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <HeatmapGrid days={days} columns={heatmapColumns} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="rings"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <RingView days={days} columns={heatmapColumns} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Complete', value: completeCount, color: COMPLETE_COLOR },
                  { label: 'Failed', value: failedCount, color: FAILED_COLOR },
                  { label: 'Remaining', value: futureCount, color: '#888' },
                ] as { label: string; value: number; color: string }[]
              ).map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    className="text-2xl font-black"
                    style={{ color }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    {value}
                  </motion.div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Ring legend */}
            <AnimatePresence>
              {heatmapView === 'rings' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-3 px-1"
                >
                  {(
                    [
                      ['5/5 Complete', COMPLETE_COLOR],
                      ['3–4/5', '#BAFF39'],
                      ['1–2/5', FAILED_COLOR],
                      ['0/5', '#FF4757'],
                      ['Future', FUTURE_COLOR],
                    ] as [string, string][]
                  ).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ borderColor: color, background: 'rgba(255,255,255,0)' }}
                      />
                    <span className="text-xs" style={{ color: '#64748b' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── PHOTOS TAB ── */}
        {activeTab === 'photos' && mounted && (
          <motion.div
            key="photos"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-4"
          >
            {(() => {
              type PhotoEntry = { date: string; urls: string[]; day: number };
              const allDays: PhotoEntry[] = [];
              const appSt = getAppState();
              const startDate = appSt.startDate;
              const currentDay = appSt.currentDay;
              const startDay = Math.max(1, currentDay - windowDays + 1);
              for (let dayNum = startDay; dayNum <= currentDay; dayNum++) {
                const date = getDateForDay(startDate, dayNum);
                const log = getDailyLog(date);
                const urls = log?.progressPhotos?.length
                  ? log.progressPhotos
                  : log?.progressPhotoUrl ? [log.progressPhotoUrl] : [];
                if (urls.length > 0) allDays.push({ date, urls, day: dayNum });
              }
              const totalPhotos = allDays.reduce((s, d) => s + d.urls.length, 0);
              const MAX_PHOTO_CELLS = 120;
              const flatPhotos = allDays.flatMap((entry) =>
                entry.urls.map((url, idx) => ({ entry, url, idx }))
              );
              const visiblePhotos =
                flatPhotos.length > MAX_PHOTO_CELLS
                  ? flatPhotos.slice(flatPhotos.length - MAX_PHOTO_CELLS)
                  : flatPhotos;

              if (allDays.length === 0) {
                return (
                  <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-5xl mb-3">📸</div>
                    <p className="text-sm font-bold text-white mb-1">No photos yet</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      Upload up to 4 daily progress photos from the Today tab.
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-bold text-white mb-1">{totalPhotos} Progress Photos</p>
                    <p className="text-xs text-gray-500">Across {allDays.length} days in the selected window</p>
                    {flatPhotos.length > MAX_PHOTO_CELLS && (
                      <p className="mt-1 text-[10px] text-gray-500">Showing latest {MAX_PHOTO_CELLS} photos for faster loading.</p>
                    )}
                  </div>

                  {/* Before / After comparison */}
                  {allDays.length >= 2 && (
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(0,245,212,0.15)' }}>
                      <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: '#00F5D4' }}>Before &amp; After</p>
                      <div className="flex gap-3">
                        {/* First day photo */}
                        <div className="flex-1 relative rounded-xl overflow-hidden aspect-[3/4]"
                          style={{ border: '1px solid rgba(255,107,53,0.4)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={allDays[0].urls[0]} alt="Before" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#FF6B35' }}>
                            Day {allDays[0].day}
                          </div>
                          <div className="absolute bottom-0 inset-x-0 py-1 text-center text-xs font-bold"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#FF6B35' }}>
                            Before
                          </div>
                        </div>
                        {/* Latest day photo */}
                        <div className="flex-1 relative rounded-xl overflow-hidden aspect-[3/4]"
                          style={{ border: '1px solid rgba(0,245,212,0.4)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={allDays[allDays.length - 1].urls[0]} alt="After" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#00F5D4' }}>
                            Day {allDays[allDays.length - 1].day}
                          </div>
                          <div className="absolute bottom-0 inset-x-0 py-1 text-center text-xs font-bold"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#00F5D4' }}>
                            After
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All photos grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {visiblePhotos.map(({ entry, url, idx }) => (
                      <motion.div
                        key={`${entry.date}-${idx}`}
                        className="relative rounded-xl overflow-hidden aspect-[3/4]"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        whileHover={{ scale: 1.03 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Day ${entry.day} #${idx + 1}`} className="w-full h-full object-cover" />
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center text-xs font-bold"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#FF6B35' }}
                        >
                          Day {entry.day}
                          {entry.urls.length > 1 ? ` · #${idx + 1}` : ''}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* ── CHARTS TAB ── */}
        {activeTab === 'charts' && mounted && (
          <motion.div
            key="charts"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            {chartData.length === 0 ? (
              <div
                className="rounded-2xl"
                style={{ background: 'rgba(13,13,40,0.8)', border: '1px solid #2a2a4a' }}
              >
                <EmptyState />
              </div>
            ) : (
              <>
                {/* Chart 1 — Mood trend */}
                <ChartCard title="😊 Daily Mood Trend">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis
                        dataKey="day"
                        interval={xAxisInterval}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={{ stroke: GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={22}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        y={3}
                        stroke="#FFE66D"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        name="Mood"
                        stroke="#FF6B35"
                        strokeWidth={2.5}
                        dot={{ fill: '#FF6B35', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#FF6B35' }}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                    terrible=1 · bad=2 · meh=3 · good=4 · great=5&nbsp;&nbsp;|&nbsp;&nbsp;
                    <span style={{ color: '#FFE66D' }}>— baseline 3</span>
                  </p>
                </ChartCard>

                {/* Chart 2 — Energy / Motivation / Soreness */}
                <ChartCard title="⚡ Energy · Motivation · Soreness">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis
                        dataKey="day"
                        interval={xAxisInterval}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={{ stroke: GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={22}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 10, color: AXIS_COLOR, paddingTop: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="energy"
                        name="Energy"
                        stroke="#FF6B35"
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, fill: '#FF6B35' }}
                        animationDuration={800}
                      />
                      <Line
                        type="monotone"
                        dataKey="motivation"
                        name="Motivation"
                        stroke="#A855F7"
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, fill: '#A855F7' }}
                        animationDuration={900}
                      />
                      <Line
                        type="monotone"
                        dataKey="soreness"
                        name="Soreness"
                        stroke="#FF4757"
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, fill: '#FF4757' }}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Chart 3 — Habits per day, colour-coded */}
                <ChartCard title="✅ Habits Logged per Day (out of 5)">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barCategoryGap="30%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID_COLOR}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        interval={xAxisInterval}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={{ stroke: GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={22}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        y={5}
                        stroke="#00F5D4"
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                      />
                      <Bar
                        dataKey="tasks"
                        name="Tasks"
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={taskBarColor(entry.tasks)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2">
                    {(
                      [
                        ['5/5', '#00F5D4'],
                        ['3–4', '#FF6B35'],
                        ['0–2', '#FF4757'],
                      ] as [string, string][]
                    ).map(([label, color]) => (
                      <div key={label} className="flex items-center gap-1">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: color }}
                        />
                        <span className="text-xs" style={{ color: '#888' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
