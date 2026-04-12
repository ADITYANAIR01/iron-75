export interface ReminderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DailyReminderSettings {
  enabled: boolean;
  time: string;
  updatedAt: string;
}

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export const DAILY_REMINDER_SETTINGS_KEY = 'iron75_daily_reminder_settings';
export const DEFAULT_DAILY_REMINDER_TIME = '22:00';

interface NotificationApiLike {
  permission: NotificationPermission;
  requestPermission: (...args: never[]) => NotificationPermission | Promise<NotificationPermission>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  return value as Record<string, unknown>;
}

function resolveStorage(storage?: ReminderStorage | null): ReminderStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveNotificationApi(target: unknown): NotificationApiLike | null {
  const source = asObject(target);
  const notificationCandidate = asObject(source?.Notification);
  if (!notificationCandidate) return null;

  const permission = notificationCandidate.permission;
  const requestPermission = notificationCandidate.requestPermission;
  const validPermission = permission === 'granted' || permission === 'denied' || permission === 'default';
  if (!validPermission || typeof requestPermission !== 'function') return null;

  return notificationCandidate as unknown as NotificationApiLike;
}

export function parseReminderTime(value: string): { hour: number; minute: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
  };
}

export function normalizeReminderTime(value: unknown, fallback = DEFAULT_DAILY_REMINDER_TIME): string {
  if (typeof value === 'string' && parseReminderTime(value)) {
    return value.trim();
  }
  return parseReminderTime(fallback) ? fallback : DEFAULT_DAILY_REMINDER_TIME;
}

export function formatReminderTimeLabel(time: string): string {
  const parsed = parseReminderTime(normalizeReminderTime(time));
  if (!parsed) return '10:00 PM';
  const suffix = parsed.hour >= 12 ? 'PM' : 'AM';
  const twelveHour = parsed.hour % 12 || 12;
  return `${twelveHour}:${String(parsed.minute).padStart(2, '0')} ${suffix}`;
}

export function createDefaultDailyReminderSettings(): DailyReminderSettings {
  return {
    enabled: false,
    time: DEFAULT_DAILY_REMINDER_TIME,
    updatedAt: '',
  };
}

export function normalizeDailyReminderSettings(raw: unknown): DailyReminderSettings {
  const fallback = createDefaultDailyReminderSettings();
  const record = asObject(raw);
  if (!record) return fallback;

  const normalized: DailyReminderSettings = {
    enabled: record.enabled === true,
    time: normalizeReminderTime(record.time, fallback.time),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt.trim().slice(0, 40) : '',
  };

  return normalized;
}

export function getDailyReminderSettings(options: { storage?: ReminderStorage | null } = {}): DailyReminderSettings {
  const storage = resolveStorage(options.storage);
  if (!storage) return createDefaultDailyReminderSettings();

  try {
    const raw = storage.getItem(DAILY_REMINDER_SETTINGS_KEY);
    if (!raw) return createDefaultDailyReminderSettings();
    return normalizeDailyReminderSettings(JSON.parse(raw));
  } catch {
    return createDefaultDailyReminderSettings();
  }
}

export function saveDailyReminderSettings(
  settings: DailyReminderSettings,
  options: { storage?: ReminderStorage | null; now?: Date } = {}
): DailyReminderSettings {
  const normalized = normalizeDailyReminderSettings(settings);
  const now = options.now ?? new Date();
  const persisted: DailyReminderSettings = {
    ...normalized,
    updatedAt: Number.isNaN(now.getTime()) ? new Date().toISOString() : now.toISOString(),
  };

  const storage = resolveStorage(options.storage);
  if (storage) {
    try {
      storage.setItem(DAILY_REMINDER_SETTINGS_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore local persistence failures.
    }
  }

  return persisted;
}

export function getNextReminderTrigger(time: string, now: Date = new Date()): Date {
  const parsed = parseReminderTime(normalizeReminderTime(time)) ?? parseReminderTime(DEFAULT_DAILY_REMINDER_TIME)!;
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const next = new Date(safeNow.getTime());
  next.setHours(parsed.hour, parsed.minute, 0, 0);

  if (next.getTime() <= safeNow.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function getMillisecondsUntilReminder(time: string, now: Date = new Date()): number {
  const next = getNextReminderTrigger(time, now);
  const delta = next.getTime() - now.getTime();
  return Math.max(60_000, delta);
}

export function isNotificationApiSupported(target: unknown = globalThis): boolean {
  return resolveNotificationApi(target) !== null;
}

export function getNotificationPermissionStatus(target: unknown = globalThis): NotificationPermissionState {
  const api = resolveNotificationApi(target);
  return api ? api.permission : 'unsupported';
}

export async function requestNotificationPermission(target: unknown = globalThis): Promise<NotificationPermissionState> {
  const api = resolveNotificationApi(target);
  if (!api) return 'unsupported';

  try {
    const result = api.requestPermission();
    const permission = typeof (result as PromiseLike<NotificationPermission>)?.then === 'function'
      ? await (result as Promise<NotificationPermission>)
      : result;
    if (permission === 'granted' || permission === 'denied' || permission === 'default') {
      return permission;
    }
    return getNotificationPermissionStatus(target);
  } catch {
    return getNotificationPermissionStatus(target);
  }
}
