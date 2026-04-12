'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  getAppState,
  getDailyLog,
  saveProfileName,
  generateExportHTML,
  deleteAllData,
  recoverStreakFromLogs,
  resetChallenge,
  getUserFocus,
  saveUserFocus,
} from '../lib/storage';
import { AppState, DailyLog, UserFocus } from '../lib/types';
import { getLocalDataHealthSnapshot, LocalDataHealthSnapshot } from '../lib/dataHealth';
import {
  AccountabilityCircleProfile,
  WeeklyAccountabilityStatus,
  buildWeeklyAccountabilityStatus,
  clearAccountabilityCircleProfile,
  createDefaultAccountabilityCircleProfile,
  getAccountabilityCircleProfile,
  getAccountabilityWeekWindow,
  parsePartnerNames,
  saveAccountabilityCircleProfile,
  syncAccountabilityCircleProfileToSupabase,
} from '../lib/accountability';
import {
  DailyReminderSettings,
  NotificationPermissionState,
  createDefaultDailyReminderSettings,
  formatReminderTimeLabel,
  getDailyReminderSettings,
  getMillisecondsUntilReminder,
  getNextReminderTrigger,
  getNotificationPermissionStatus,
  isNotificationApiSupported,
  normalizeReminderTime,
  requestNotificationPermission,
  saveDailyReminderSettings,
} from '../lib/notifications';
import { useAuth } from './AuthProvider';

const REMINDER_TIME_PRESETS = ['07:00', '12:00', '18:00', '22:00'] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateForDay(startDate: string, dayNumber: number): string {
  return addDays(startDate, Math.max(1, dayNumber) - 1);
}

function buildLocalWeeklyStatus(profile: AccountabilityCircleProfile): WeeklyAccountabilityStatus {
  const appState = getAppState();
  const referenceDate = getDateForDay(appState.startDate, appState.currentDay);
  const weekWindow = getAccountabilityWeekWindow(referenceDate);
  const logs = weekWindow.dates
    .map((date) => getDailyLog(date))
    .filter((log): log is DailyLog => Boolean(log));

  return buildWeeklyAccountabilityStatus({
    profile,
    logs,
    referenceDate,
  });
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [dataHealth, setDataHealth] = useState<LocalDataHealthSnapshot | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [name, setName] = useState('');
  const [userFocus, setUserFocus] = useState<UserFocus>('balanced');
  const [accountabilityProfile, setAccountabilityProfile] = useState<AccountabilityCircleProfile>(createDefaultAccountabilityCircleProfile());
  const [partnerInput, setPartnerInput] = useState('');
  const [accountabilityStatus, setAccountabilityStatus] = useState<WeeklyAccountabilityStatus | null>(null);
  const [dailyReminder, setDailyReminder] = useState<DailyReminderSettings>(createDefaultDailyReminderSettings());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('unsupported');
  const [toast, setToast] = useState('');
  const reminderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminderSettingsRef = useRef(dailyReminder);
  const accountabilityCloudSyncActive = Boolean(user);
  const accountabilityStorageBadge = accountabilityCloudSyncActive ? 'Cloud sync on' : 'Local only';
  const accountabilityStorageCopy = accountabilityCloudSyncActive
    ? 'Saved locally first, then synced to Supabase when online.'
    : 'Stored on this device only.';
  reminderSettingsRef.current = dailyReminder;

  useEffect(() => {
    setState(getAppState());
    setUserFocus(getUserFocus());
    setDataHealth(getLocalDataHealthSnapshot());
    const profile = getAccountabilityCircleProfile();
    setAccountabilityProfile(profile);
    setPartnerInput(profile.partnerNames.join(', '));
    setAccountabilityStatus(buildLocalWeeklyStatus(profile));
    // Auto-populate name from Google account if available and no local name saved
    const savedName = localStorage.getItem('iron75_user_name') ?? '';
    if (!savedName && user) {
      const googleName: string =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        '';
      if (googleName) {
        // Store locally so it persists on reload; user can edit and save to cloud later
        localStorage.setItem('iron75_user_name', googleName);
        setName(googleName);
      } else {
        setName('');
      }
    } else {
      setName(savedName);
    }
  }, [user]);

  useEffect(() => {
    setDailyReminder(getDailyReminderSettings());
    setNotificationPermission(getNotificationPermissionStatus());
  }, []);

  const showTransientToast = (message: string, durationMs = 2500) => {
    setToast(message);
    setTimeout(() => setToast(''), durationMs);
  };

  const clearReminderTimer = () => {
    if (reminderTimerRef.current !== null) {
      clearTimeout(reminderTimerRef.current);
      reminderTimerRef.current = null;
    }
  };

  const persistDailyReminder = (next: DailyReminderSettings) => {
    const saved = saveDailyReminderSettings(next);
    setDailyReminder(saved);
    return saved;
  };

  useEffect(() => {
    clearReminderTimer();
    let cancelled = false;

    if (!dailyReminder.enabled || notificationPermission !== 'granted' || !isNotificationApiSupported()) {
      return () => {
        cancelled = true;
        clearReminderTimer();
      };
    }

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = getMillisecondsUntilReminder(reminderSettingsRef.current.time);
      reminderTimerRef.current = setTimeout(() => {
        if (cancelled) return;

        const latestPermission = getNotificationPermissionStatus();
        setNotificationPermission(latestPermission);
        if (latestPermission !== 'granted' || !reminderSettingsRef.current.enabled || !isNotificationApiSupported()) {
          return;
        }

        const notification = new Notification('GRINDOS reminder', {
          body: 'Log today’s progress to protect your streak 🔥',
          tag: 'grindos-daily-reminder',
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearReminderTimer();
    };
  }, [dailyReminder.enabled, dailyReminder.time, notificationPermission]);

  const refreshDataHealth = () => {
    setDataHealth(getLocalDataHealthSnapshot());
  };

  const handleNameSave = () => {
    saveProfileName(name);
  };

  const handleFocusChange = (focus: UserFocus) => {
    setUserFocus(focus);
    saveUserFocus(focus);
    setToast(`Focus updated: ${focus === 'gym_first' ? 'Gym-first' : focus === 'habit_first' ? 'Habit-first' : 'Balanced'}`);
    setTimeout(() => setToast(''), 2000);
  };

  const handleSaveAccountability = () => {
    const saved = saveAccountabilityCircleProfile({
      ...accountabilityProfile,
      partnerNames: parsePartnerNames(partnerInput),
    });
    setAccountabilityProfile(saved);
    setPartnerInput(saved.partnerNames.join(', '));
    setAccountabilityStatus(buildLocalWeeklyStatus(saved));
    void syncAccountabilityCircleProfileToSupabase(saved);
    setToast(accountabilityCloudSyncActive ? 'Accountability profile saved. Syncing to cloud…' : 'Accountability profile saved locally.');
    setTimeout(() => setToast(''), 2500);
  };

  const handleToggleAccountability = (enabled: boolean) => {
    const saved = saveAccountabilityCircleProfile({
      ...accountabilityProfile,
      enabled,
      partnerNames: parsePartnerNames(partnerInput),
    });
    setAccountabilityProfile(saved);
    setPartnerInput(saved.partnerNames.join(', '));
    setAccountabilityStatus(buildLocalWeeklyStatus(saved));
    void syncAccountabilityCircleProfileToSupabase(saved);
    setToast(
      accountabilityCloudSyncActive
        ? `Accountability mode ${enabled ? 'enabled' : 'disabled'}. Syncing to cloud…`
        : `Accountability mode ${enabled ? 'enabled' : 'disabled'} (local only).`
    );
    setTimeout(() => setToast(''), 2500);
  };

  const handleClearAccountability = () => {
    clearAccountabilityCircleProfile();
    const resetProfile = createDefaultAccountabilityCircleProfile();
    setAccountabilityProfile(resetProfile);
    setPartnerInput('');
    setAccountabilityStatus(buildLocalWeeklyStatus(resetProfile));
    setToast(
      accountabilityCloudSyncActive
        ? 'Accountability profile cleared on this device. Cloud copy is unchanged.'
        : 'Accountability profile cleared on this device.'
    );
    setTimeout(() => setToast(''), 2500);
  };

  // Save name on unmount (in case user navigates away without blur)
  const nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    return () => { saveProfileName(nameRef.current); };
  }, []);

  const handleRestartChallenge = async () => {
    if (!state) return;
    const newState = await resetChallenge();
    setState(newState);
    setShowConfirmReset(false);
    setToast('Tracker restarted. Day 1 begins today!');
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportData = () => {
    try {
      const html = generateExportHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grindos_export_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast('Data exported successfully! 📁');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Export failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleDeleteAllData = async () => {
    setDeleting(true);
    try {
      await deleteAllData();
      setState(null);
      setName('');
      setAccountabilityProfile(createDefaultAccountabilityCircleProfile());
      setPartnerInput('');
      setAccountabilityStatus(null);
      setShowConfirmDelete(false);
      setToast('All data deleted permanently. 🗑️');
      setTimeout(() => {
        setToast('');
        window.location.reload();
      }, 2000);
    } catch {
      setToast('Delete failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setDeleting(false);
    }
  };

  const handleRecoverStreak = async () => {
    setRecovering(true);
    try {
      const recovered = await recoverStreakFromLogs();
      if (recovered) {
        setState(recovered);
        setToast(`Streak recovered! Day ${recovered.currentDay}, ${recovered.streak} streak 🔥`);
      } else {
        setToast('No completed days found in cloud — nothing to recover.');
      }
      setTimeout(() => setToast(''), 4000);
    } catch {
      setToast('Recovery failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setRecovering(false);
    }
  };

  const handleReminderTimeChange = (value: string) => {
    const normalizedTime = normalizeReminderTime(value, dailyReminder.time);
    if (normalizedTime === dailyReminder.time) return;
    persistDailyReminder({
      ...dailyReminder,
      time: normalizedTime,
    });
  };

  const handleRequestNotificationAccess = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showTransientToast('Browser notifications enabled.');
      return;
    }
    if (permission === 'denied') {
      showTransientToast('Notifications are blocked. Enable them in browser site settings.', 3500);
      return;
    }
    if (permission === 'default') {
      showTransientToast('Permission prompt dismissed. Reminders stay saved locally.', 3200);
      return;
    }
    showTransientToast('Notifications are unsupported in this browser.', 3200);
  };

  const handleToggleDailyReminder = async () => {
    if (!isNotificationApiSupported()) {
      setNotificationPermission('unsupported');
      showTransientToast('Notifications are unsupported in this browser.', 3200);
      return;
    }

    const nextEnabled = !dailyReminder.enabled;
    if (!nextEnabled) {
      persistDailyReminder({ ...dailyReminder, enabled: false });
      showTransientToast('Daily reminder disabled.');
      return;
    }

    let permission = getNotificationPermissionStatus();
    if (permission === 'default') {
      permission = await requestNotificationPermission();
    }
    setNotificationPermission(permission);
    persistDailyReminder({ ...dailyReminder, enabled: true });

    if (permission === 'granted') {
      showTransientToast('Daily reminder enabled.');
      return;
    }
    if (permission === 'denied') {
      showTransientToast('Reminder saved, but notifications are blocked in browser settings.', 3500);
      return;
    }
    showTransientToast('Reminder saved locally. Allow notifications to receive alerts.', 3500);
  };

  const handleSendTestReminder = () => {
    const permission = getNotificationPermissionStatus();
    setNotificationPermission(permission);
    if (permission !== 'granted' || !isNotificationApiSupported()) {
      showTransientToast('Allow notifications first to send a test reminder.', 3200);
      return;
    }

    const notification = new Notification('GRINDOS reminder', {
      body: `Test reminder set for ${formatReminderTimeLabel(dailyReminder.time)}.`,
      tag: 'grindos-daily-reminder-test',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    showTransientToast('Test reminder sent.');
  };

  const handleRefreshNotificationStatus = () => {
    const latest = getNotificationPermissionStatus();
    setNotificationPermission(latest);
  };

  const notificationsSupported = notificationPermission !== 'unsupported';
  const reminderIsScheduled = dailyReminder.enabled && notificationPermission === 'granted';
  const nextReminderTrigger = reminderIsScheduled ? getNextReminderTrigger(dailyReminder.time) : null;
  const nextReminderLabel = nextReminderTrigger
    ? `${nextReminderTrigger.toLocaleDateString(undefined, { weekday: 'short' })} ${nextReminderTrigger.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Not scheduled';
  const permissionBadge = notificationPermission === 'granted'
    ? { label: 'Allowed', color: '#00F5D4', background: 'rgba(0,245,212,0.1)', border: 'rgba(0,245,212,0.35)' }
    : notificationPermission === 'denied'
      ? { label: 'Blocked', color: '#FFE66D', background: 'rgba(255,230,109,0.12)', border: 'rgba(255,230,109,0.35)' }
      : notificationPermission === 'default'
        ? { label: 'Ask me', color: '#94A3B8', background: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)' }
        : { label: 'Unsupported', color: '#94A3B8', background: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.28)' };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #F1F5F9, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</h1>
      </motion.div>

      {/* Profile section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Profile</h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e2e8f0',
            }}
          />
          <p className="text-xs text-gray-500">Changes saved automatically.</p>
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-400 mb-2">Focus mode</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'gym_first', label: 'Gym-first', emoji: '🏋️' },
                { value: 'habit_first', label: 'Habit-first', emoji: '🧠' },
                { value: 'balanced', label: 'Balanced', emoji: '⚖️' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFocusChange(option.value)}
                  className="py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${userFocus === option.value ? '#00F5D4' : 'rgba(255,255,255,0.08)'}`,
                    color: userFocus === option.value ? '#00F5D4' : '#94A3B8',
                  }}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Accountability section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide">Accountability (Opt-in)</h2>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}
          >
            {accountabilityStorageBadge}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Private motivation support for your small circle. No public feed, no ranking, no shame mechanics. {accountabilityStorageCopy}
        </p>

        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-sm text-gray-300">Accountability mode</p>
            <p className="text-xs text-gray-500">Enable when you want shared weekly check-ins.</p>
          </div>
          <button
            onClick={() => handleToggleAccountability(!accountabilityProfile.enabled)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: accountabilityProfile.enabled ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${accountabilityProfile.enabled ? 'rgba(0,245,212,0.45)' : 'rgba(255,255,255,0.1)'}`,
              color: accountabilityProfile.enabled ? '#00F5D4' : '#94A3B8',
            }}
          >
            {accountabilityProfile.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="grid gap-2 mt-3">
          <input
            type="text"
            value={accountabilityProfile.teamLabel}
            onChange={(e) => setAccountabilityProfile((prev) => ({ ...prev, teamLabel: e.target.value }))}
            placeholder="Team label (optional): e.g. Morning Squad"
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          />
          <input
            type="text"
            value={partnerInput}
            onChange={(e) => setPartnerInput(e.target.value)}
            placeholder="Partner names (comma separated): Asha, Liam"
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          />
          <input
            type="text"
            value={accountabilityProfile.weeklyGoal.title}
            onChange={(e) =>
              setAccountabilityProfile((prev) => ({
                ...prev,
                weeklyGoal: {
                  ...prev.weeklyGoal,
                  title: e.target.value,
                },
              }))
            }
            placeholder="Shared weekly goal"
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          />
          <div
            className="rounded-lg px-3 py-2 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-gray-400">Workout target (1-7 days/week)</p>
            <input
              type="number"
              min={1}
              max={7}
              value={accountabilityProfile.weeklyGoal.targetWorkoutDays}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                setAccountabilityProfile((prev) => ({
                  ...prev,
                  weeklyGoal: {
                    ...prev.weeklyGoal,
                    targetWorkoutDays: Number.isFinite(parsed)
                      ? Math.min(7, Math.max(1, parsed))
                      : prev.weeklyGoal.targetWorkoutDays,
                  },
                }));
              }}
              className="w-16 px-2 py-1 rounded-md text-sm text-center"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveAccountability}
            className="py-2.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}
          >
            💾 Save Circle
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleClearAccountability}
            className="py-2.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}
          >
            🧹 Clear Local Data
          </motion.button>
        </div>

        {accountabilityStatus && (
          <div
            className="mt-3 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-gray-500">
              This week ({accountabilityStatus.weekStart} → {accountabilityStatus.weekEnd})
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: '#e2e8f0' }}>
              {accountabilityStatus.workoutDays}/{accountabilityStatus.targetWorkoutDays} workout days · {accountabilityStatus.checkInDays}/7 check-ins
            </p>
            <p className="text-xs text-gray-500 mt-1">{accountabilityStatus.encouragement}</p>
          </div>
        )}
      </motion.div>

      {/* Stats section */}
      {state && (
        <motion.div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Tracker Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Current Day', value: state.currentDay, color: '#FF6B35' },
              { label: 'Current Streak', value: `${state.streak} 🔥`, color: '#FF6B35' },
              { label: 'Longest Streak', value: state.longestStreak, color: '#00F5D4' },
              { label: 'Total Restarts', value: state.totalRestarts, color: '#FFE66D' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-2xl font-black" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Started: {state.startDate}
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Notifications</h2>
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-300">Daily reminder</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {dailyReminder.enabled
                  ? `${formatReminderTimeLabel(dailyReminder.time)} · ${nextReminderLabel}`
                  : 'One reminder per day while this app is open.'}
              </p>
            </div>
            <button
              onClick={handleToggleDailyReminder}
              disabled={!notificationsSupported}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: dailyReminder.enabled ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${dailyReminder.enabled ? 'rgba(0,245,212,0.45)' : 'rgba(255,255,255,0.1)'}`,
                color: dailyReminder.enabled ? '#00F5D4' : '#94A3B8',
                opacity: notificationsSupported ? 1 : 0.55,
                cursor: notificationsSupported ? 'pointer' : 'not-allowed',
              }}
            >
              {dailyReminder.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">Browser permission</p>
            <span
              className="px-2 py-1 rounded-full text-[11px] font-semibold"
              style={{ color: permissionBadge.color, background: permissionBadge.background, border: `1px solid ${permissionBadge.border}` }}
            >
              {permissionBadge.label}
            </span>
          </div>

          {notificationsSupported && (
            <>
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1.5">Reminder time</p>
                <input
                  type="time"
                  value={dailyReminder.time}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  step={60}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                />
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {REMINDER_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleReminderTimeChange(preset)}
                      className="py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{
                        background: dailyReminder.time === preset ? 'rgba(255,107,53,0.14)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${dailyReminder.time === preset ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.1)'}`,
                        color: dailyReminder.time === preset ? '#FF6B35' : '#94A3B8',
                      }}
                    >
                      {formatReminderTimeLabel(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {notificationPermission !== 'granted' ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRequestNotificationAccess}
                    className="py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}
                  >
                    Allow Notifications
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSendTestReminder}
                    className="py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}
                  >
                    Send Test
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRefreshNotificationStatus}
                  className="py-2 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
                >
                  Refresh Status
                </motion.button>
              </div>

              {notificationPermission === 'denied' && (
                <p className="text-xs mt-2" style={{ color: '#FFE66D' }}>
                  Browser access is blocked. Enable notifications for this site in browser settings.
                </p>
              )}
              {notificationPermission === 'default' && (
                <p className="text-xs text-gray-500 mt-2">
                  Notifications are optional. You can keep reminders saved and allow access anytime.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Reminders trigger only while this app stays open in your browser.
              </p>
            </>
          )}
          {!notificationsSupported && (
            <p className="text-xs text-gray-500 mt-3">
              This browser does not support Notification API reminders.
            </p>
          )}
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.19 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide">Data Health</h2>
          <button
            onClick={refreshDataHealth}
            className="px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
          >
            Refresh
          </button>
        </div>

        {dataHealth ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Local Storage', value: formatBytes(dataHealth.localStorageBytesEstimate), color: '#00F5D4' },
                { label: 'Storage Entries', value: dataHealth.localStorageEntryCount, color: '#94A3B8' },
                { label: 'Daily Logs', value: dataHealth.dailyLogCount, color: '#FF6B35' },
                { label: 'Photos Linked', value: dataHealth.photoCount, color: '#FF6B35' },
                { label: 'Photo Payload', value: formatBytes(dataHealth.photoPayloadBytesEstimate), color: '#FFE66D' },
                {
                  label: 'Pending Sync',
                  value: dataHealth.pendingSyncCount === undefined ? 'Unknown' : dataHealth.pendingSyncCount,
                  color: dataHealth.pendingSyncCount && dataHealth.pendingSyncCount > 0 ? '#FFE66D' : '#00F5D4',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-xl font-black" style={{ color: item.color }}>
                    {item.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Estimates from localStorage. Photo payload reflects locally stored photo URLs or legacy photo strings.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">Loading local data health…</p>
        )}
      </motion.div>

      {/* Data Management section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Data Management</h2>
        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleExportData}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.25)', color: '#00F5D4' }}
          >
            📊 Export All Data (HTML Report)
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRecoverStreak}
            disabled={recovering}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', opacity: recovering ? 0.6 : 1 }}
          >
            {recovering ? '⏳ Recovering...' : '🔄 Recover Streak from Cloud Logs'}
          </motion.button>
          <p className="text-xs text-gray-500">
            Downloads a beautiful HTML report with all your tracker stats, daily logs, and progress.
          </p>
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="font-bold text-sm text-red-400 uppercase tracking-wide mb-3">Danger Zone</h2>

        {!showConfirmReset ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirmReset(true)}
            className="w-full py-3 rounded-xl text-sm font-bold text-red-400"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            🔄 Restart Tracker (Day 1)
          </motion.button>
        ) : (
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
              <p className="text-sm text-red-300 mb-2">
                Are you sure? Streak resets to 0. Restart count increases. No undo.
              </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRestartChallenge}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'rgba(220,38,38,0.5)' }}
              >
                Yes, Restart
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Delete All Data */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(220,38,38,0.2)' }}>
          {!showConfirmDelete ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-red-400"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)' }}
            >
              🗑️ Delete All Data Permanently
            </motion.button>
          ) : (
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-red-300 mb-1 font-bold">⚠️ This CANNOT be undone!</p>
              <p className="text-xs text-red-300/70 mb-2">
                All your data will be permanently deleted from this device AND from Supabase cloud,
                including daily logs, progress photos, tracker stats, and profile info.
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteAllData}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'rgba(220,38,38,0.7)', opacity: deleting ? 0.5 : 1 }}
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Yes, Delete Everything'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Account section */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wide mb-3">Account</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Signed in as</p>
              <p className="text-xs mt-0.5" style={{ color: '#00F5D4' }}>{user?.email ?? 'Unknown'}</p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,245,212,0.1)', color: '#00F5D4', border: '1px solid rgba(0,245,212,0.3)' }}
            >
              Supabase
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Data syncs to cloud automatically. Works offline too.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={signOut}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          >
            🚪 Sign Out
          </motion.button>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(12,12,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-2xl mb-2">🔥</p>
        <p className="font-black text-lg" style={{ background: 'linear-gradient(135deg, #FF6B35, #FFE66D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GRINDOS</p>
        <p className="text-xs text-gray-500 mt-1">v0.3.0 — Neon Dark Redesign</p>
        <p className="text-xs text-gray-500">Next.js · TypeScript · Tailwind · Supabase · Framer Motion</p>
        <a
          href="https://github.com"
          className="text-xs mt-2 block underline"
          style={{ color: '#00F5D4' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub →
        </a>
      </motion.div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-bold text-center"
            style={{ background: '#FF6B35', color: '#06060F', boxShadow: '0 4px 20px rgba(255,107,53,0.4)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
