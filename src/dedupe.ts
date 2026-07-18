/**
 * In-flight request deduplication.
 *
 * When multiple callers request the same URL+method+body combination
 * concurrently, only one network request is made. All callers receive
 * the same response (the promise is shared).
 *
 * Cache entries are evicted when the shared promise settles (success or
 * failure). Late subscribers that arrive after eviction start fresh.
 */

/**
 * Deduplicator for in-flight HTTP requests.
 *
 * ## Usage
 * ```ts
 * const dedupe = new RequestDeduplicator();
 *
 * async function fetchDeduped(url: string, init?: RequestInit): Promise<Response> {
 *   const method = init?.method ?? 'GET';
 *   const key = `${method}:${url}:${JSON.stringify(init?.body ?? '')}`;
 *   return dedupe.dedup(key, () => fetch(url, init), init?.signal);
 * }
 * ```
 */
export class RequestDeduplicator {
  #pending = new Map<string, Promise<unknown>>();

  /**
   * Execute `factory` once for the given key. Concurrent callers with
   * the same key receive the same promise. The entry is evicted after
   * the shared promise settles.
   *
   * @param key     - Unique request key (method + URL + stable body hash).
   * @param factory - The network operation to perform.
   * @param signal  - Optional AbortSignal. If it fires, this caller gets
   *                  an AbortError. The shared request continues.
   */
  async dedup<T>(
    key: string,
    factory: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const existing = this.#pending.get(key);
    if (existing !== undefined) {
      return this.#raceWithSignal(existing as Promise<T>, signal);
    }

    const promise = factory().finally(() => {
      this.#pending.delete(key);
    });
    this.#pending.set(key, promise);

    return this.#raceWithSignal(promise, signal);
  }

  /** How many unique requests are currently in flight. */
  get inflight(): number {
    return this.#pending.size;
  }

  /** Remove all pending deduplication entries. */
  clear(): void {
    this.#pending.clear();
  }

  /**
   * Race a promise against an AbortSignal. If the signal fires first,
   * the caller gets an AbortError but the promise still settles normally.
   */
  #raceWithSignal<T>(p: Promise<T>, s?: AbortSignal): Promise<T> {
    if (!s) return p;
    if (s.aborted) {
      return Promise.reject(
        s.reason ?? new DOMException("Aborted", "AbortError"),
      );
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        reject(s.reason ?? new DOMException("Aborted", "AbortError"));
      };
      s.addEventListener("abort", onAbort, { once: true });
      p.then(
        (v) => {
          s.removeEventListener("abort", onAbort);
          resolve(v);
        },
        (e) => {
          s.removeEventListener("abort", onAbort);
          reject(e);
        },
      );
    });
  }
}
