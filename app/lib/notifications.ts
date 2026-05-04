export interface ReminderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface DailyReminderSettings {
  enabled: boolean;
  time: string;
  updatedAt: string;
}

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export const DAILY_REMINDER_SETTINGS_KEY = 'iron75_daily_reminder_settings';
export const DAILY_REMINDER_LAST_SENT_DATE_KEY = 'iron75_daily_reminder_last_sent_date';
export const DAILY_REMINDER_DELIVERY_LOCK_KEY = 'iron75_daily_reminder_delivery_lock';
export const DEFAULT_DAILY_REMINDER_TIME = '22:00';
const DEFAULT_REMINDER_LOCK_TTL_MS = 90_000;

interface NotificationApiLike {
  permission: NotificationPermission;
  requestPermission: (...args: never[]) => NotificationPermission | Promise<NotificationPermission>;
}

export interface ReminderNotificationPayload {
  title: string;
  body: string;
  tag: string;
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

function formatLocalDateKey(now: Date): string {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const year = safeNow.getFullYear();
  const month = String(safeNow.getMonth() + 1).padStart(2, '0');
  const day = String(safeNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLastReminderSentDate(options: { storage?: ReminderStorage | null } = {}): string {
  const storage = resolveStorage(options.storage);
  if (!storage) return '';
  try {
    const raw = storage.getItem(DAILY_REMINDER_LAST_SENT_DATE_KEY);
    if (!raw) return '';
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
  } catch {
    return '';
  }
}

export function markReminderSentToday(
  options: { storage?: ReminderStorage | null; now?: Date } = {}
): string {
  const now = options.now ?? new Date();
  const dateKey = formatLocalDateKey(now);
  const storage = resolveStorage(options.storage);
  if (storage) {
    try {
      storage.setItem(DAILY_REMINDER_LAST_SENT_DATE_KEY, dateKey);
    } catch {
      // Ignore local persistence failures.
    }
  }
  return dateKey;
}

export function shouldSendReminderNow(
  time: string,
  now: Date = new Date(),
  lastSentDate: string = ''
): boolean {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const parsed = parseReminderTime(normalizeReminderTime(time)) ?? parseReminderTime(DEFAULT_DAILY_REMINDER_TIME)!;
  const today = formatLocalDateKey(safeNow);
  if (lastSentDate === today) return false;
  const minutesNow = safeNow.getHours() * 60 + safeNow.getMinutes();
  const reminderMinutes = parsed.hour * 60 + parsed.minute;
  return minutesNow >= reminderMinutes;
}

interface ReminderDeliveryLock {
  ownerId: string;
  expiresAt: number;
}

function parseReminderDeliveryLock(raw: string | null): ReminderDeliveryLock | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReminderDeliveryLock>;
    if (typeof parsed.ownerId !== 'string') return null;
    if (typeof parsed.expiresAt !== 'number' || !Number.isFinite(parsed.expiresAt)) return null;
    return { ownerId: parsed.ownerId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function tryAcquireReminderDeliveryLock(
  ownerId: string,
  options: { storage?: ReminderStorage | null; now?: Date; ttlMs?: number } = {}
): boolean {
  if (!ownerId.trim()) return false;

  const storage = resolveStorage(options.storage);
  if (!storage) return true;

  const now = options.now ?? new Date();
  const nowMs = Number.isNaN(now.getTime()) ? Date.now() : now.getTime();
  const ttlMs = Math.max(10_000, options.ttlMs ?? DEFAULT_REMINDER_LOCK_TTL_MS);
  const current = parseReminderDeliveryLock(storage.getItem(DAILY_REMINDER_DELIVERY_LOCK_KEY));

  const isHeldByOther = current && current.ownerId !== ownerId && current.expiresAt > nowMs;
  if (isHeldByOther) return false;

  const next: ReminderDeliveryLock = {
    ownerId,
    expiresAt: nowMs + ttlMs,
  };
  try {
    storage.setItem(DAILY_REMINDER_DELIVERY_LOCK_KEY, JSON.stringify(next));
    const stored = parseReminderDeliveryLock(storage.getItem(DAILY_REMINDER_DELIVERY_LOCK_KEY));
    return stored?.ownerId === ownerId;
  } catch {
    return true;
  }
}

export function releaseReminderDeliveryLock(
  ownerId: string,
  options: { storage?: ReminderStorage | null } = {}
): void {
  const storage = resolveStorage(options.storage);
  if (!storage) return;
  const current = parseReminderDeliveryLock(storage.getItem(DAILY_REMINDER_DELIVERY_LOCK_KEY));
  if (!current || current.ownerId !== ownerId) return;
  try {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(DAILY_REMINDER_DELIVERY_LOCK_KEY);
    } else {
      storage.setItem(DAILY_REMINDER_DELIVERY_LOCK_KEY, '');
    }
  } catch {
    // Ignore local persistence failures.
  }
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

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T> | null | undefined)?.then === 'function';
}

export async function showReminderNotification(
  payload: ReminderNotificationPayload,
  target: unknown = globalThis
): Promise<boolean> {
  const source = asObject(target);
  if (!source) return false;

  const permission = getNotificationPermissionStatus(target);
  if (permission !== 'granted') return false;

  const navigatorLike = asObject(source.navigator);
  const serviceWorkerLike = asObject(navigatorLike?.serviceWorker);
  const ready = serviceWorkerLike?.ready;
  if (isPromiseLike<unknown>(ready)) {
    try {
      const registration = await ready;
      const registrationLike = asObject(registration);
      const showNotification = registrationLike?.showNotification;
      if (typeof showNotification === 'function') {
        await showNotification.call(registration, payload.title, {
          body: payload.body,
          tag: payload.tag,
        });
        return true;
      }
    } catch {
      // Fall back to Notification constructor when service worker notification fails.
    }
  }

  try {
    const NotificationCtor = source.Notification as
      | (new (title: string, options?: NotificationOptions) => Notification)
      | undefined;
    if (typeof NotificationCtor !== 'function') return false;
    new NotificationCtor(payload.title, {
      body: payload.body,
      tag: payload.tag,
    });
    return true;
  } catch {
    return false;
  }
}
