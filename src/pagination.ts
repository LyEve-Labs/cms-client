/**
 * Async iterator for cursor-based content pagination.
 *
 * Walks the Content API's cursor endpoint, yielding records one at a time.
 * Each call to `.next()` returns the next record.
 *
 * ## Usage
 * ```ts
 * const paginator = new PaginationIterator<MyRecord>({
 *   fetchPage: (cursor) => api.getPage(cursor),
 * });
 *
 * for await (const record of paginator) {
 *   console.log(record);
 * }
 *
 * // With AbortController:
 * const ac = new AbortController();
 * setTimeout(() => ac.abort(), 5000);
 * for await (const record of paginator.withSignal(ac.signal)) {
 *   // stops after 5 seconds
 * }
 * ```
 */

/** Response shape from a cursor-paginated endpoint. */
export interface CursorPage<T> {
	items: T[];
	/** Present when more pages are available. */
	next_cursor?: string;
}

/** Function that fetches a single cursor page. */
export type PageFetcher<T> = (cursor?: string) => Promise<CursorPage<T>>;

export interface PaginationConfig<T> {
	/** Function that fetches a single cursor page. */
	fetchPage: PageFetcher<T>;
}

/**
 * Async iterable iterator over paginated records.
 *
 * Implements `AsyncIterableIterator<T>` so it can be used directly in
 * `for await...of` loops. Also exposes `.withSignal()` for AbortController
 * integration.
 */
export class PaginationIterator<T> implements AsyncIterableIterator<T> {
	#fetchPage: PageFetcher<T>;
	#signal?: AbortSignal;

	// Internal paging state
	#buffer: T[] = [];
	#cursor: string | undefined = undefined;
	#exhausted = false;
	#fetching: Promise<void> | null = null;

	constructor(config: PaginationConfig<T>) {
		this.#fetchPage = config.fetchPage;
	}

	/**
	 * Return a new iterator sharing the same underlying state but with a
	 * different AbortSignal. Useful when the signal is only known at the
	 * call site, not at construction time.
	 */
	withSignal(signal: AbortSignal): PaginationIterator<T> {
		const clone = new PaginationIterator<T>({
			fetchPage: this.#fetchPage,
		});
		clone.#signal = signal;
		clone.#buffer = this.#buffer;
		clone.#cursor = this.#cursor;
		clone.#exhausted = this.#exhausted;
		clone.#fetching = this.#fetching;
		return clone;
	}

	// AsyncIterator protocol

	[Symbol.asyncIterator](): AsyncIterableIterator<T> {
		return this;
	}

	async next(): Promise<IteratorResult<T>> {
		this.#throwIfAborted();

		// Yield from buffer if we have cached records
		if (this.#buffer.length > 0) {
			const value = this.#buffer.shift()!;
			return { value, done: false };
		}

		// Done if exhausted
		if (this.#exhausted) {
			return { value: undefined, done: true };
		}

		// Fetch next page
		try {
			await this.#fetchPageInternal();
		} catch (err) {
			if (err instanceof Error) throw err;
			throw new Error(String(err));
		}

		if (this.#buffer.length > 0) {
			const value = this.#buffer.shift()!;
			return { value, done: false };
		}

		return { value: undefined, done: true };
	}

	return?(value?: unknown): Promise<IteratorResult<T>> {
		this.#exhausted = true;
		this.#buffer.length = 0;
		return Promise.resolve({
			value: value as T | undefined,
			done: true,
		});
	}

	throw?(e?: unknown): Promise<IteratorResult<T>> {
		this.#exhausted = true;
		this.#buffer.length = 0;
		return Promise.reject(e);
	}

	// Internal

	async #fetchPageInternal(): Promise<void> {
		if (this.#fetching) {
			await this.#fetching;
			return;
		}

		this.#throwIfAborted();

		this.#fetching = this.#fetchPage(this.#cursor)
			.then((page) => {
				this.#throwIfAborted();
				this.#buffer = [...page.items];
				if (page.next_cursor) {
					this.#cursor = page.next_cursor;
				} else {
					this.#exhausted = true;
				}
			})
			.finally(() => {
				this.#fetching = null;
			});

		await this.#fetching;
	}

	#throwIfAborted(): void {
		if (this.#signal?.aborted) {
			throw this.#signal.reason ?? new DOMException('Aborted', 'AbortError');
		}
	}
}
