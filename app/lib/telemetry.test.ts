import { describe, expect, it } from 'vitest';
import type { FeatureFlagStorage } from './featureFlags';
import { clearTelemetryEvents, getTelemetryEvents, recordTelemetryEvent } from './telemetry';

function createMemoryStorage(initial: Record<string, string> = {}): FeatureFlagStorage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe('telemetry', () => {
  it('records local events when telemetry is enabled', () => {
    const storage = createMemoryStorage();
    const event = recordTelemetryEvent(
      'quick_log_tapped',
      { action: 'workout', source: 'quick_log', nextDone: true },
      { storage }
    );

    expect(event).not.toBeNull();
    expect(getTelemetryEvents({ storage })).toHaveLength(1);
    expect(getTelemetryEvents({ storage })[0].name).toBe('quick_log_tapped');
  });

  it('is a no-op when telemetry is disabled', () => {
    const storage = createMemoryStorage();
    const event = recordTelemetryEvent(
      'quick_log_tapped',
      { action: 'walk', source: 'quick_log', nextDone: true },
      { storage, flagOverrides: { telemetryEnabled: false } }
    );

    expect(event).toBeNull();
    expect(getTelemetryEvents({ storage })).toHaveLength(0);
  });

  it('keeps only the most recent events when maxEvents is set', () => {
    const storage = createMemoryStorage();

    for (let i = 0; i < 5; i++) {
      recordTelemetryEvent(
        'quick_log_tapped',
        { action: 'reading', source: 'quick_log', nextDone: i % 2 === 0 },
        { storage, maxEvents: 3 }
      );
    }

    const events = getTelemetryEvents({ storage });
    expect(events).toHaveLength(3);
    expect(events[0].payload).toEqual({ action: 'reading', source: 'quick_log', nextDone: true });
  });

  it('clears recorded events safely', () => {
    const storage = createMemoryStorage();
    recordTelemetryEvent(
      'mission_path_completed',
      { date: '2026-01-01', focus: 'balanced', path: ['workout', 'walk', 'diet'] },
      { storage }
    );
    expect(getTelemetryEvents({ storage })).toHaveLength(1);

    clearTelemetryEvents({ storage });
    expect(getTelemetryEvents({ storage })).toHaveLength(0);
  });

  it('never throws when storage is unavailable or failing', () => {
    const brokenStorage: FeatureFlagStorage = {
      getItem() {
        throw new Error('read failed');
      },
      setItem() {
        throw new Error('write failed');
      },
      removeItem() {
        throw new Error('remove failed');
      },
    };

    expect(
      recordTelemetryEvent(
        'quick_log_tapped',
        { action: 'mood', source: 'quick_log', nextDone: true, selectedMood: 'good' },
        { storage: brokenStorage }
      )
    ).toBeNull();
    expect(getTelemetryEvents({ storage: brokenStorage })).toEqual([]);
    expect(() => clearTelemetryEvents({ storage: brokenStorage })).not.toThrow();
  });
});
