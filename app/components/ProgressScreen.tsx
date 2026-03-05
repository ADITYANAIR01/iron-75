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

// ─── Internal types ────────────────────────────────────────────────────────────
interface DayStatus {
  day: number;
  date: string;
  status: 'complete' | 'failed' | 'future';
  tasksCompleted: number; // 0–7
  log: DailyLog | null;
}

type ChartRow = {
  day: string;
  mood: number;
  energy: number;
  motivation: number;
  soreness: number;
  water: number;
  tasks: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function countTasks(log: DailyLog): number {
  let n = 0;
  if (log.gymWorkoutDone) n++;
  if (log.outdoorWalkDone) n++;
  if (log.waterGoalMet) n++;
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

function buildDayStatuses(startDate: string, currentDay: number): DayStatus[] {
  const days: DayStatus[] = [];
  for (let i = 0; i < 75; i++) {
    const dayNum = i + 1;
    const date = addDays(startDate, i);
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
        status: log.allTasksComplete ? 'complete' : isToday ? 'future' : 'failed',
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
      water: parseFloat(d.log!.waterLiters.toFixed(2)),
      tasks: d.tasksCompleted,
    }));
}

// ─── Color helpers ─────────────────────────────────────────────────────────────
const COMPLETE_COLOR = '#00F5D4';
const FAILED_COLOR = '#FF6B35';
const FUTURE_COLOR = '#141432';

function statusColor(s: DayStatus['status']): string {
  if (s === 'complete') return COMPLETE_COLOR;
  if (s === 'failed') return FAILED_COLOR;
  return FUTURE_COLOR;
}

function ringFillColor(pct: number, isFuture: boolean): string {
  if (isFuture) return FUTURE_COLOR;
  if (pct >= 1) return COMPLETE_COLOR;
  if (pct >= 0.57) return '#BAFF39';
  if (pct > 0) return FAILED_COLOR;
  return '#FF4757';
}

function taskBarColor(tasks: number): string {
  if (tasks === 6) return '#00F5D4';
  if (tasks >= 3) return '#FF6B35';
  return '#FF4757';
}

// ─── GitHub Heatmap Grid ───────────────────────────────────────────────────────
function HeatmapGrid({ days }: { days: DayStatus[] }) {
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
        {days.map((d) => (
          <motion.div
            key={d.day}
            className="aspect-square rounded-[4px] cursor-default"
            style={{
              background: statusColor(d.status),
              boxShadow: d.status === 'complete' ? `0 0 8px ${COMPLETE_COLOR}30` : d.status === 'failed' ? `0 0 6px ${FAILED_COLOR}20` : 'none',
            }}
            title={`Day ${d.day} (${d.date}) — ${d.status}${d.status !== 'future' ? `: ${d.tasksCompleted}/6 tasks` : ''}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: d.day * 0.005,
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

// ─── Ring / Circular View ──────────────────────────────────────────────────────
function RingView({ days }: { days: DayStatus[] }) {
  const SIZE = 32;
  const R = 11;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
      {days.map((d) => {
        const pct = d.status === 'future' ? 0 : d.tasksCompleted / 6;
        const color = ringFillColor(pct, d.status === 'future');
        const offset = CIRC * (1 - pct);
        return (
          <motion.div
            key={d.day}
            className="flex items-center justify-center"
            title={`Day ${d.day}: ${d.tasksCompleted}/6 tasks`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: d.day * 0.005,
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
                  delay: d.day * 0.008,
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

// ─── Chart helpers ─────────────────────────────────────────────────────────────
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'charts'>('overview');
  const [heatmapView, setHeatmapView] = useState<'grid' | 'rings'>('grid');
  const [days, setDays] = useState<DayStatus[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const appSt = getAppState();
    const startDate = appSt.startDate;
    const currentDay = appSt.currentDay;
    const d = buildDayStatuses(startDate, currentDay);
    setDays(d);
    setChartData(buildChartData(d));
  }, []);

  const TABS = ['overview', 'photos', 'charts'] as const;
  const TAB_LABELS: Record<string, string> = {
    overview: 'Overview',
    photos: 'Photos',
    charts: 'Charts',
  };

  const completeCount = days.filter((d) => d.status === 'complete').length;
  const failedCount = days.filter((d) => d.status === 'failed').length;
  const futureCount = days.filter((d) => d.status === 'future').length;

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #00F5D4, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Progress
        </h1>
        <p className="text-sm text-gray-400 mt-1">Your 75-day journey visualized</p>
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
                  75-Day Heatmap
                </span>
                <span className="text-xs" style={{ color: '#64748b' }}>
                  {completeCount} / 75 complete
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
                    <HeatmapGrid days={days} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="rings"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <RingView days={days} />
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
                      ['6/6 Complete', COMPLETE_COLOR],
                    ['4–5/6', '#BAFF39'],
                    ['1–3/6', FAILED_COLOR],
                    ['0/6', '#FF4757'],
                      ['Future', FUTURE_COLOR],
                    ] as [string, string][]
                  ).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ borderColor: color, background: 'transparent' }}
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
            {/* Photo grid */}
            {(() => {
              const photos: { date: string; url: string; day: number }[] = [];
              const appSt = getAppState();
              const startDate = appSt.startDate;
              const currentDay = appSt.currentDay;
              for (let i = 0; i < currentDay && i < 75; i++) {
                const d = new Date(startDate + 'T12:00:00');
                d.setDate(d.getDate() + i);
                const y = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                const date = `${y}-${mo}-${da}`;
                // Prefer the daily log URL (cleared on removal) over the cache key.
                const url = (() => {
                  const log = getDailyLog(date);
                  if (log?.progressPhotoUrl) return log.progressPhotoUrl;
                  return typeof window !== 'undefined' ? localStorage.getItem(`iron75_photo_${date}`) : null;
                })();
                if (url) photos.push({ date, url, day: i + 1 });
              }

              if (photos.length === 0) {
                return (
                  <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-5xl mb-3">📸</div>
                    <p className="text-sm font-bold text-white mb-1">No photos yet</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      Upload your daily progress photo from the Today tab — it uploads to Supabase cloud storage.
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-bold text-white mb-1">{photos.length} Progress Photos</p>
                    <p className="text-xs text-gray-500">Your transformation in pictures</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <motion.div
                        key={p.date}
                        className="relative rounded-xl overflow-hidden aspect-[3/4]"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        whileHover={{ scale: 1.03 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Day ${p.day}`} className="w-full h-full object-cover" />
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center text-xs font-bold"
                          style={{ background: 'rgba(0,0,0,0.6)', color: '#FF6B35' }}
                        >
                          Day {p.day}
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

                {/* Chart 3 — Water intake */}
                <ChartCard title="💧 Daily Water Intake (L)">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barCategoryGap="30%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID_COLOR}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={{ stroke: GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 6]}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                        tickFormatter={(v: number) => `${v}L`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        y={3.8}
                        stroke="#FFE66D"
                        strokeDasharray="5 5"
                        strokeOpacity={0.9}
                        label={{
                          value: '3.8L goal',
                          fill: '#FFE66D',
                          fontSize: 9,
                          position: 'insideTopRight',
                        }}
                      />
                      <Bar
                        dataKey="water"
                        name="Water (L)"
                        fill="#00F5D4"
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Chart 4 — Tasks per day, colour-coded */}
                <ChartCard title="✅ Tasks Completed per Day (out of 6)">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barCategoryGap="30%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID_COLOR}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={{ stroke: GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 6]}
                        ticks={[0, 1, 2, 3, 4, 5, 6]}
                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={22}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        y={6}
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
                      ['6/6', '#00F5D4'],
                      ['3–5', '#FF6B35'],
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
