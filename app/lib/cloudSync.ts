const CLOUD_SYNC_DISABLED_KEY = 'iron75_cloud_sync_disabled';

export type CloudSyncDisabledReason = 'missing_schema';

interface CloudSyncDisabledState {
  reason: CloudSyncDisabledReason;
  at: string;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseState(raw: string | null): CloudSyncDisabledState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CloudSyncDisabledState>;
    if (parsed.reason !== 'missing_schema') return null;
    if (typeof parsed.at !== 'string') return null;
    return { reason: parsed.reason, at: parsed.at };
  } catch {
    return null;
  }
}

export function getCloudSyncDisabledState(): CloudSyncDisabledState | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  return parseState(storage.getItem(CLOUD_SYNC_DISABLED_KEY));
}

export function isCloudSyncDisabled(): boolean {
  return getCloudSyncDisabledState() !== null;
}

export function disableCloudSync(reason: CloudSyncDisabledReason): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const state: CloudSyncDisabledState = { reason, at: new Date().toISOString() };
  storage.setItem(CLOUD_SYNC_DISABLED_KEY, JSON.stringify(state));
}

export function clearCloudSyncDisabled(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(CLOUD_SYNC_DISABLED_KEY);
}