// ─── Iron75 Retry Utilities ───────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3). */
  attempts?: number;
  /** Base delay in milliseconds between attempts; multiplied by attempt index (default: 200). Async only. */
  delayMs?: number;
  /** Optional callback invoked after each failed attempt. */
  onError?: (error: unknown, attempt: number) => void;
  /** Called before each retry attempt (e.g. to free resources). Sync only. */
  onRetry?: () => void;
}

/**
 * Retries an async operation up to `attempts` times.
 * Waits `delayMs * attempt` milliseconds between retries (linear back-off).
 *
 * @example
 * const data = await withRetry(() => fetch('/api/tip').then(r => r.json()), { attempts: 3 });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { attempts = 3, delayMs = 200, onError } = options;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      onError?.(err, i + 1);
      if (i < attempts - 1 && delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Retries a synchronous operation up to `attempts` times.
 * `onRetry` is invoked before each retry so callers can perform clean-up.
 *
 * @example
 * withRetrySync(() => localStorage.setItem(key, value), {
 *   attempts: 3,
 *   onRetry: evictOldLogs,
 * });
 */
export function withRetrySync<T>(
  fn: () => T,
  options: Omit<RetryOptions, 'delayMs'> = {},
): T {
  const { attempts = 3, onError, onRetry } = options;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      onError?.(err, i + 1);
      if (i < attempts - 1) onRetry?.();
    }
  }

  throw lastError;
}
