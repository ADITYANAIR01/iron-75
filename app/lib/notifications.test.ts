import { describe, expect, it } from 'vitest';
import {
  DAILY_REMINDER_DELIVERY_LOCK_KEY,
  DAILY_REMINDER_LAST_SENT_DATE_KEY,
  DAILY_REMINDER_SETTINGS_KEY,
  DEFAULT_DAILY_REMINDER_TIME,
  getDailyReminderSettings,
  getLastReminderSentDate,
  markReminderSentToday,
  getNextReminderTrigger,
  isNotificationApiSupported,
  normalizeReminderTime,
  parseReminderTime,
  requestNotificationPermission,
  saveDailyReminderSettings,
  shouldSendReminderNow,
  showReminderNotification,
  releaseReminderDeliveryLock,
  tryAcquireReminderDeliveryLock,
  type ReminderStorage,
} from './notifications';

function createMemoryStorage(
  initial: Record<string, string> = {},
  options: { throwOnSet?: boolean; throwOnGet?: boolean } = {}
): ReminderStorage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      if (options.throwOnGet) throw new Error('get failed');
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.throwOnSet) throw new Error('set failed');
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('notifications helpers', () => {
  it('parses valid reminder times and rejects invalid ones', () => {
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(parseReminderTime('24:00')).toBeNull();
    expect(parseReminderTime('9:30')).toBeNull();
  });

  it('normalizes reminder times with a safe fallback', () => {
    expect(normalizeReminderTime(' 07:30 ')).toBe('07:30');
    expect(normalizeReminderTime('invalid', '06:45')).toBe('06:45');
    expect(normalizeReminderTime('invalid', 'bad-fallback')).toBe(DEFAULT_DAILY_REMINDER_TIME);
  });

  it('computes next reminder trigger for same day and next day', () => {
    const morning = new Date(2026, 2, 12, 9, 15, 0, 0);
    const sameDay = getNextReminderTrigger('10:00', morning);
    expect(sameDay.getFullYear()).toBe(2026);
    expect(sameDay.getMonth()).toBe(2);
    expect(sameDay.getDate()).toBe(12);
    expect(sameDay.getHours()).toBe(10);
    expect(sameDay.getMinutes()).toBe(0);

    const lateNight = new Date(2026, 2, 12, 22, 15, 0, 0);
    const nextDay = getNextReminderTrigger('21:30', lateNight);
    expect(nextDay.getDate()).toBe(13);
    expect(nextDay.getHours()).toBe(21);
    expect(nextDay.getMinutes()).toBe(30);
  });

  it('uses safe defaults when persistence is unavailable or invalid', () => {
    expect(getDailyReminderSettings({ storage: null })).toEqual({
      enabled: false,
      time: DEFAULT_DAILY_REMINDER_TIME,
      updatedAt: '',
    });

    const malformedStorage = createMemoryStorage({
      [DAILY_REMINDER_SETTINGS_KEY]: '{not-json',
    });
    expect(getDailyReminderSettings({ storage: malformedStorage })).toEqual({
      enabled: false,
      time: DEFAULT_DAILY_REMINDER_TIME,
      updatedAt: '',
    });
  });

  it('normalizes persisted settings and survives storage write errors', () => {
    const failingStorage = createMemoryStorage({}, { throwOnSet: true });
    const now = new Date('2026-03-12T05:00:00.000Z');

    const persisted = saveDailyReminderSettings(
      {
        enabled: true,
        time: '99:99',
        updatedAt: '',
      },
      { storage: failingStorage, now }
    );

    expect(persisted.enabled).toBe(true);
    expect(persisted.time).toBe(DEFAULT_DAILY_REMINDER_TIME);
    expect(persisted.updatedAt).toBe('2026-03-12T05:00:00.000Z');
  });

  it('round-trips reminder settings through storage', () => {
    const storage = createMemoryStorage();
    const now = new Date('2026-03-12T07:15:00.000Z');
    const saved = saveDailyReminderSettings(
      {
        enabled: true,
        time: '07:45',
        updatedAt: '',
      },
      { storage, now }
    );

    expect(getDailyReminderSettings({ storage })).toEqual(saved);
  });

  it('detects unsupported notification environments safely', async () => {
    expect(isNotificationApiSupported({})).toBe(false);
    await expect(requestNotificationPermission({})).resolves.toBe('unsupported');
  });

  it('tracks reminder delivery date and sends only once per day after target time', () => {
    const storage = createMemoryStorage();
    const morning = new Date(2026, 2, 12, 8, 10, 0, 0);
    const evening = new Date(2026, 2, 12, 20, 10, 0, 0);

    expect(shouldSendReminderNow('09:00', morning, '')).toBe(false);
    expect(shouldSendReminderNow('09:00', evening, '')).toBe(true);

    const dateKey = markReminderSentToday({ storage, now: evening });
    expect(dateKey).toBe('2026-03-12');
    expect(getLastReminderSentDate({ storage })).toBe('2026-03-12');
    expect(shouldSendReminderNow('09:00', evening, dateKey)).toBe(false);
    expect(storage.getItem(DAILY_REMINDER_LAST_SENT_DATE_KEY)).toBe('2026-03-12');
  });

  it('uses a short-lived delivery lock to avoid duplicate reminders across tabs', () => {
    const storage = createMemoryStorage();
    const now = new Date('2026-03-12T22:00:00.000Z');

    expect(tryAcquireReminderDeliveryLock('tab-a', { storage, now, ttlMs: 30_000 })).toBe(true);
    expect(tryAcquireReminderDeliveryLock('tab-b', { storage, now, ttlMs: 30_000 })).toBe(false);

    releaseReminderDeliveryLock('tab-a', { storage });
    expect(storage.getItem(DAILY_REMINDER_DELIVERY_LOCK_KEY)).toBeNull();
    expect(tryAcquireReminderDeliveryLock('tab-b', { storage, now, ttlMs: 30_000 })).toBe(true);
  });

  it('shows reminders through service worker when available', async () => {
    const calls: Array<{ title: string; options: NotificationOptions }> = [];
    const target = {
      Notification: {
        permission: 'granted' as const,
        requestPermission: () => 'granted' as const,
      },
      navigator: {
        serviceWorker: {
          ready: Promise.resolve({
            showNotification: (title: string, options: NotificationOptions) => {
              calls.push({ title, options });
              return Promise.resolve();
            },
          }),
        },
      },
    };

    await expect(
      showReminderNotification(
        {
          title: 'GRINDOS reminder',
          body: 'Body',
          tag: 'daily',
        },
        target
      )
    ).resolves.toBe(true);
    expect(calls).toEqual([{ title: 'GRINDOS reminder', options: { body: 'Body', tag: 'daily' } }]);
  });

  it('falls back to Notification constructor when service worker notification is unavailable', async () => {
    const calls: Array<{ title: string; options: NotificationOptions | undefined }> = [];
    class NotificationMock {
      static permission: NotificationPermission = 'granted';
      static requestPermission = () => 'granted' as const;
      constructor(title: string, options?: NotificationOptions) {
        calls.push({ title, options });
      }
    }

    const target = {
      Notification: NotificationMock,
      navigator: {
        serviceWorker: {
          ready: Promise.resolve({}),
        },
      },
    };

    await expect(
      showReminderNotification(
        {
          title: 'GRINDOS reminder',
          body: 'Fallback body',
          tag: 'fallback',
        },
        target
      )
    ).resolves.toBe(true);
    expect(calls).toEqual([{ title: 'GRINDOS reminder', options: { body: 'Fallback body', tag: 'fallback' } }]);
  });
});
