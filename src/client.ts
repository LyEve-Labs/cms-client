/**
 * Framework-agnostic HTTP client for the LyEve CMS API.
 *
 * The `createClient` factory accepts any `fetch`-compatible function
 * (globalThis.fetch, SvelteKit's event.fetch, a Node.js polyfill) and
 * returns a typed client with get/post/put/delete methods that handle
 * JSON serialization, error mapping, and timeout.
 */

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export type HttpClient = ReturnType<typeof createClient>;

export function createClient(
	fetchFn: typeof fetch,
	defaultHeaders: Record<string, string> = {}
) {
	async function request<T>(url: string, init?: RequestInit): Promise<T> {
		const res = await fetchFn(url, {
			...init,
			// Default 15 s timeout so a slow/unresponsive backend can't hang
			// the caller indefinitely. Callers may override by passing their
			// own AbortSignal.
			signal: init?.signal ?? AbortSignal.timeout(15_000),
			headers: {
				'Content-Type': 'application/json',
				...defaultHeaders,
				...init?.headers,
			},
		});

		if (!res.ok) {
			const text = await res.text();
			let message = text;
			try {
				const json = JSON.parse(text) as { error?: string };
				message = json.error ?? text;
			} catch {
				// use raw text
			}
			throw new ApiError(res.status, message);
		}

		if (res.status === 204) return undefined as T;
		return res.json() as Promise<T>;
	}

	return {
		get: <T>(url: string, init?: RequestInit) =>
			request<T>(url, { ...init, method: 'GET' }),
		post: <T>(url: string, body: unknown, init?: RequestInit) =>
			request<T>(url, { ...init, method: 'POST', body: JSON.stringify(body) }),
		put: <T>(url: string, body: unknown, init?: RequestInit) =>
			request<T>(url, { ...init, method: 'PUT', body: JSON.stringify(body) }),
		patch: <T>(url: string, body: unknown, init?: RequestInit) =>
			request<T>(url, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
		delete: <T>(url: string, init?: RequestInit) =>
			request<T>(url, { ...init, method: 'DELETE' }),
	};
}
