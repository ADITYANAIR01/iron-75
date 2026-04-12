import { isFeatureEnabled, type FeatureFlagName, type FeatureFlagOptions, type FeatureFlagStorage } from './featureFlags';
import type { ChallengeId, MoodEmoji, UserFocus } from './types';

export type QuickLogTelemetryAction = 'workout' | 'walk' | 'reading' | 'mood';
export type MissionPathStep = 'workout' | 'walk' | 'diet' | 'mood' | 'reading';

export type TelemetryEventName =
  | 'quick_log_tapped'
  | 'mission_path_completed'
  | 'ai_coach_request_started'
  | 'ai_coach_request_completed'
  | 'ai_coach_request_failed';

interface TelemetryPayloadMap {
  quick_log_tapped: {
    action: QuickLogTelemetryAction;
    source: 'quick_log';
    nextDone: boolean;
    selectedMood?: Exclude<MoodEmoji, ''>;
  };
  mission_path_completed: {
    date: string;
    focus: UserFocus;
    path: MissionPathStep[];
  };
  ai_coach_request_started: {
    challengeId: ChallengeId;
    source: 'ai_coach';
  };
  ai_coach_request_completed: {
    challengeId: ChallengeId;
    durationMs: number;
    fromCache: boolean;
  };
  ai_coach_request_failed: {
    challengeId: ChallengeId;
    durationMs: number;
    reason: 'request_error';
  };
}

export type TelemetryPayload<TName extends TelemetryEventName> = TelemetryPayloadMap[TName];

export interface LocalTelemetryEvent<TName extends TelemetryEventName = TelemetryEventName> {
  id: string;
  name: TName;
  ts: string;
  payload: TelemetryPayloadMap[TName];
}

interface TelemetryBaseOptions {
  storage?: FeatureFlagStorage | null;
}

export interface RecordTelemetryOptions extends TelemetryBaseOptions {
  maxEvents?: number;
  flagOverrides?: Partial<Record<FeatureFlagName, boolean>>;
}

const TELEMETRY_STORAGE_KEY = 'grindos_local_telemetry_v1';
const DEFAULT_MAX_EVENTS = 250;

const EVENT_GATES = {
  quick_log_tapped: 'telemetryQuickLogEvents',
  mission_path_completed: 'telemetryMissionEvents',
  ai_coach_request_started: 'telemetryAICoachEvents',
  ai_coach_request_completed: 'telemetryAICoachEvents',
  ai_coach_request_failed: 'telemetryAICoachEvents',
} as const satisfies Record<TelemetryEventName, FeatureFlagName>;

function resolveStorage(storage?: FeatureFlagStorage | null): FeatureFlagStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createEventId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return randomId;
  return `evt-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function parseStoredEvents(raw: string | null): LocalTelemetryEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalTelemetryEvent[];
  } catch {
    return [];
  }
}

function readEvents(storage: FeatureFlagStorage | null): LocalTelemetryEvent[] {
  if (!storage) return [];
  try {
    return parseStoredEvents(storage.getItem(TELEMETRY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeEvents(storage: FeatureFlagStorage, events: LocalTelemetryEvent[]): boolean {
  try {
    storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

function isEventEnabled(
  eventName: TelemetryEventName,
  storage: FeatureFlagStorage | null,
  flagOverrides?: Partial<Record<FeatureFlagName, boolean>>
): boolean {
  const flagOptions: FeatureFlagOptions = { storage, runtimeOverrides: flagOverrides };
  if (!isFeatureEnabled('telemetryEnabled', flagOptions)) return false;
  return isFeatureEnabled(EVENT_GATES[eventName], flagOptions);
}

export function recordTelemetryEvent<TName extends TelemetryEventName>(
  eventName: TName,
  payload: TelemetryPayload<TName>,
  options: RecordTelemetryOptions = {}
): LocalTelemetryEvent<TName> | null {
  try {
    const storage = resolveStorage(options.storage);
    if (!storage || !isEventEnabled(eventName, storage, options.flagOverrides)) return null;

    const event: LocalTelemetryEvent<TName> = {
      id: createEventId(),
      name: eventName,
      ts: new Date().toISOString(),
      payload,
    };

    const maxEvents = Math.max(1, options.maxEvents ?? DEFAULT_MAX_EVENTS);
    const existing = readEvents(storage);
    existing.push(event as LocalTelemetryEvent);
    const persisted = writeEvents(storage, existing.slice(-maxEvents));
    return persisted ? event : null;
  } catch {
    return null;
  }
}

export function getTelemetryEvents(options: TelemetryBaseOptions = {}): LocalTelemetryEvent[] {
  const storage = resolveStorage(options.storage);
  return readEvents(storage);
}

export function clearTelemetryEvents(options: TelemetryBaseOptions = {}): void {
  const storage = resolveStorage(options.storage);
  if (!storage) return;
  try {
    storage.removeItem(TELEMETRY_STORAGE_KEY);
  } catch {
    // Ignore storage-write failures.
  }
}
