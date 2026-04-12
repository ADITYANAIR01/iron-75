import { describe, expect, it } from 'vitest';
import {
  FEATURE_FLAG_DEFINITIONS,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  setFeatureFlagOverride,
  type FeatureFlagStorage,
} from './featureFlags';

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

describe('featureFlags', () => {
  it('returns safe defaults without browser storage', () => {
    expect(isFeatureEnabled('telemetryEnabled', { storage: null })).toBe(true);
    expect(isFeatureEnabled('experimentAdaptiveCoachPromptV2', { storage: null })).toBe(false);
  });

  it('supports local overrides and runtime override precedence', () => {
    const storage = createMemoryStorage();

    setFeatureFlagOverride('telemetryAICoachEvents', false, { storage });
    expect(isFeatureEnabled('telemetryAICoachEvents', { storage })).toBe(false);

    expect(
      isFeatureEnabled('telemetryAICoachEvents', {
        storage,
        runtimeOverrides: { telemetryAICoachEvents: true },
      })
    ).toBe(true);

    setFeatureFlagOverride('telemetryAICoachEvents', null, { storage });
    expect(isFeatureEnabled('telemetryAICoachEvents', { storage, identity: 'fixed-user' })).toBe(
      isFeatureEnabled('telemetryAICoachEvents', { storage, identity: 'fixed-user' })
    );
  });

  it('evaluates rollout deterministically for the same identity', () => {
    const storage = createMemoryStorage();
    const first = isFeatureEnabled('telemetryAICoachEvents', { storage, identity: 'alpha' });
    const second = isFeatureEnabled('telemetryAICoachEvents', { storage, identity: 'alpha' });
    expect(second).toBe(first);
  });

  it('returns a fully typed snapshot for all flags', () => {
    const snapshot = getFeatureFlagSnapshot({ storage: null });
    expect(Object.keys(snapshot).sort()).toEqual(Object.keys(FEATURE_FLAG_DEFINITIONS).sort());
  });
});
