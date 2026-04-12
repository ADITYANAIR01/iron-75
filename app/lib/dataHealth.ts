export interface LocalDataHealthSnapshot {
  localStorageBytesEstimate: number;
  localStorageEntryCount: number;
  dailyLogCount: number;
  photoCount: number;
  photoPayloadBytesEstimate: number;
  pendingSyncCount?: number;
}

const DAILY_LOG_PREFIX = 'iron75_dailylog_';
const PENDING_SYNC_KEY = 'iron75_pending_sync';

function estimateStorageBytes(value: string): number {
  return value.length * 2;
}

function addPhotoEntry(entries: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  entries.add(trimmed);
}

function extractPhotoEntries(log: unknown): string[] {
  if (typeof log !== 'object' || log === null) return [];
  const record = log as Record<string, unknown>;
  const entries = new Set<string>();

  const photoArrays = [record.progressPhotos, record.progress_photos];
  for (const arrayValue of photoArrays) {
    if (!Array.isArray(arrayValue)) continue;
    for (const item of arrayValue) addPhotoEntry(entries, item);
  }

  addPhotoEntry(entries, record.progressPhotoUrl);
  addPhotoEntry(entries, record.progress_photo_url);

  return Array.from(entries);
}

function readPendingSyncCount(storage: Storage): number | undefined {
  const raw = storage.getItem(PENDING_SYNC_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    return undefined;
  }
}

export function getLocalDataHealthSnapshot(): LocalDataHealthSnapshot {
  if (typeof window === 'undefined') {
    return {
      localStorageBytesEstimate: 0,
      localStorageEntryCount: 0,
      dailyLogCount: 0,
      photoCount: 0,
      photoPayloadBytesEstimate: 0,
      pendingSyncCount: undefined,
    };
  }

  let localStorageBytesEstimate = 0;
  let localStorageEntryCount = 0;
  let dailyLogCount = 0;
  let photoCount = 0;
  let photoPayloadBytesEstimate = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) ?? '';
    localStorageEntryCount += 1;
    localStorageBytesEstimate += estimateStorageBytes(key) + estimateStorageBytes(value);

    if (!key.startsWith(DAILY_LOG_PREFIX)) continue;

    dailyLogCount += 1;
    try {
      const parsed = JSON.parse(value);
      const photos = extractPhotoEntries(parsed);
      photoCount += photos.length;
      photoPayloadBytesEstimate += photos.reduce((sum, photo) => sum + estimateStorageBytes(photo), 0);
    } catch {
      // Ignore malformed legacy entries.
    }
  }

  return {
    localStorageBytesEstimate,
    localStorageEntryCount,
    dailyLogCount,
    photoCount,
    photoPayloadBytesEstimate,
    pendingSyncCount: readPendingSyncCount(localStorage),
  };
}
