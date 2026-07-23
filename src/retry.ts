/**
 * Automatic retry with exponential backoff and jitter.
 *
 * Wraps fetch to retry on transient errors (429, 5xx, network failures).
 * Uses "full jitter" backoff: `random(0, min(cap, base * 2^attempt))`.
 *
 * Usage:
 *   const fetchWithRetry = createRetryFetch(fetch, {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     maxDelay: 30000,
 *     retryOn: [429, 500, 502, 503, 504],
 *     onRetry: (attempt, err, delay) => console.warn(`Retry ${attempt} in ${delay}ms`),
 *   });
 *   const res = await fetchWithRetry(url, init);
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 1000). */
  baseDelay?: number;
  /** Maximum delay in ms between retries (default: 30000). */
  maxDelay?: number;
  /** HTTP status codes that trigger a retry (default: [429, 500, 502, 503, 504]). */
  retryOn?: number[];
  /** If true, retry on network/abort errors as well (default: true). */
  retryOnNetworkError?: boolean;
  /** Called before each retry with (attempt, error, delayMs). */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_RETRY_ON = [429, 500, 502, 503, 504];

function jitter(cap: number): number {
  return Math.floor(Math.random() * cap);
}

function backoff(attempt: number, base: number, max: number): number {
  return jitter(Math.min(max, base * Math.pow(2, attempt)));
}

/** Sleep for `ms` milliseconds, respecting an AbortSignal. */
async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Create a fetch wrapper that automatically retries on transient failures.
 *
 * Retry logic:
 * 1. If the response status is in `retryOn`, read+discard the body, then retry.
 * 2. If the request threw a network/abort error and `retryOnNetworkError` is true,
 *    retry.
 * 3. Exponential backoff with full jitter.
 * 4. Respects AbortSignal : aborts cancel the current attempt and skip remaining
 *    retries.
 */
export function createRetryFetch(
  fetchImpl: typeof globalThis.fetch,
  config?: RetryConfig,
): typeof globalThis.fetch {
  const maxRetries = config?.maxRetries ?? 3;
  const baseDelay = config?.baseDelay ?? 1000;
  const maxDelay = config?.maxDelay ?? 30000;
  const retryOn = config?.retryOn ?? DEFAULT_RETRY_ON;
  const retryOnNetworkError = config?.retryOnNetworkError ?? true;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    let lastError: unknown;
    const signal = init?.signal;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let resolvedInit = init;
        if (attempt > 0 && init?.body) {
          resolvedInit = { ...init, body: await cloneBody(init.body) };
        }

        const res = await fetchImpl(input, resolvedInit);

        if (!retryOn.includes(res.status) || attempt === maxRetries) {
          return res;
        }

        // Drain the body so the connection can be reused
        await drainBody(res);
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        if (signal?.aborted) throw err;

        if (!retryOnNetworkError || attempt === maxRetries) throw err;
        lastError = err;
      }

      const delay = backoff(attempt, baseDelay, maxDelay);
      config?.onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay, signal ?? undefined);
    }

    throw lastError;
  };
}

async function cloneBody(body: BodyInit | null): Promise<BodyInit | null> {
  if (body === null || body === undefined) return null;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return new URLSearchParams(body);
  if (body instanceof FormData) return body;
  if (body instanceof Blob) return body;
  if (body instanceof ArrayBuffer) return body.slice(0);
  if (body instanceof ReadableStream) {
    throw new Error(
      "Cannot retry a request with a ReadableStream body. Use string or JSON.",
    );
  }
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(
      body.buffer,
      body.byteOffset,
      body.byteLength,
    ).slice();
  }
  return body;
}

async function drainBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // Best effort
  }
}
