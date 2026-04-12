export interface FeatureFlagStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface FeatureFlagDefinition {
  defaultValue: boolean;
  rolloutPercentage: number;
  description: string;
}

export const FEATURE_FLAG_DEFINITIONS = {
  telemetryEnabled: {
    defaultValue: true,
    rolloutPercentage: 100,
    description: 'Master switch for local-only product telemetry capture.',
  },
  telemetryQuickLogEvents: {
    defaultValue: true,
    rolloutPercentage: 100,
    description: 'Captures quick-log tap behavior from the Today screen.',
  },
  telemetryMissionEvents: {
    defaultValue: true,
    rolloutPercentage: 100,
    description: 'Captures mission-path completion milestones.',
  },
  telemetryAICoachEvents: {
    defaultValue: true,
    rolloutPercentage: 50,
    description: 'Staged rollout for AI coach request telemetry.',
  },
  experimentAdaptiveCoachPromptV2: {
    defaultValue: false,
    rolloutPercentage: 0,
    description: 'Reserved experiment flag for future prompt tuning.',
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagName = keyof typeof FEATURE_FLAG_DEFINITIONS;
export type FeatureFlagSnapshot = Record<FeatureFlagName, boolean>;

const OVERRIDE_PREFIX = 'grindos_ff_override_';
const INSTALLATION_ID_KEY = 'grindos_installation_id';

export interface FeatureFlagOptions {
  storage?: FeatureFlagStorage | null;
  identity?: string | null;
  runtimeOverrides?: Partial<Record<FeatureFlagName, boolean>>;
}

function resolveStorage(storage?: FeatureFlagStorage | null): FeatureFlagStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseBooleanOverride(value: string | null): boolean | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) return false;
  return null;
}

function createAnonymousId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return randomId;
  return `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getOrCreateInstallationId(storage: FeatureFlagStorage | null): string | null {
  if (!storage) return null;
  try {
    const existing = storage.getItem(INSTALLATION_ID_KEY);
    if (existing) return existing;
    const generated = createAnonymousId();
    try {
      storage.setItem(INSTALLATION_ID_KEY, generated);
    } catch {
      // Ignore storage-write failures and still return generated ID for in-memory use.
    }
    return generated;
  } catch {
    return null;
  }
}

function readLocalOverride(flagName: FeatureFlagName, storage: FeatureFlagStorage | null): boolean | null {
  if (!storage) return null;
  try {
    return parseBooleanOverride(storage.getItem(`${OVERRIDE_PREFIX}${flagName}`));
  } catch {
    return null;
  }
}

function hashToPercent(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

function evaluateRollout(flagName: FeatureFlagName, rolloutPercentage: number, identity: string | null): boolean {
  const rollout = Math.max(0, Math.min(100, rolloutPercentage));
  if (rollout <= 0) return false;
  if (rollout >= 100) return true;
  if (!identity) return false;
  return hashToPercent(`${flagName}:${identity}`) < rollout;
}

export function isFeatureEnabled(flagName: FeatureFlagName, options: FeatureFlagOptions = {}): boolean {
  const definition = FEATURE_FLAG_DEFINITIONS[flagName];

  try {
    const storage = resolveStorage(options.storage);
    const runtimeOverride = options.runtimeOverrides?.[flagName];
    if (typeof runtimeOverride === 'boolean') return runtimeOverride;

    const localOverride = readLocalOverride(flagName, storage);
    if (localOverride !== null) return localOverride;

    if (!definition.defaultValue) return false;
    const identity = options.identity ?? getOrCreateInstallationId(storage);
    return evaluateRollout(flagName, definition.rolloutPercentage, identity);
  } catch {
    return definition.defaultValue;
  }
}

export function getFeatureFlagSnapshot(options: FeatureFlagOptions = {}): FeatureFlagSnapshot {
  const snapshot = {} as FeatureFlagSnapshot;
  (Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagName[]).forEach((flagName) => {
    snapshot[flagName] = isFeatureEnabled(flagName, options);
  });
  return snapshot;
}

export function setFeatureFlagOverride(
  flagName: FeatureFlagName,
  value: boolean | null,
  options: FeatureFlagOptions = {}
): void {
  const storage = resolveStorage(options.storage);
  if (!storage) return;

  const key = `${OVERRIDE_PREFIX}${flagName}`;
  try {
    if (value === null) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, value ? 'on' : 'off');
  } catch {
    // Ignore storage-write failures.
  }
}
