# @lyeve/cms-client

Framework-agnostic HTTP client for the LyEve CMS API. The foundation all other
SDK packages build on.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org)

```bash
pnpm add @lyeve/cms-client
```

```ts
import { createClient } from "@lyeve/cms-client";
import { getSchemas } from "@lyeve/cms-client-rest";

const client = createClient(fetch, { Authorization: "Bearer <token>" });
const schemas = await getSchemas(client);
```

Zero dependencies. Native `fetch`. One client, every transport.

---

## What's in the box

- **Typed HTTP client:** `get`, `post`, `put`, `patch`, `delete`. All generic, all typed end-to-end.
- **ApiError:** thrown on every non-OK response. `status` and `message` always available.
- **Automatic JSON:** `Content-Type: application/json` added by default. 15s timeout via `AbortSignal`.
- **PaginationIterator:** async iterator over cursor-paginated endpoints. One loop, every page.
- **QueryBuilder:** fluent `query(schema).where().orderBy().limit()` builder for content queries.
- **createRetryFetch:** automatic retry with configurable exponential backoff.
- **RequestDeduplicator:** coalesce in-flight duplicate requests into a single network call.
- **Shared types:** `Schema`, `Content`, `User`, `APIKey`, `Webhook`, and 20+ more.

## Requirements

- **Node 20** or newer

## Install

```bash
pnpm add @lyeve/cms-client
# or npm install @lyeve/cms-client
# or yarn add @lyeve/cms-client
```

## Use

```ts
import { createClient, PaginationIterator } from "@lyeve/cms-client";

const client = createClient(fetch, {
  Authorization: "Bearer <token>",
});

// GET
const data = await client.get<{ ok: boolean }>("/api/v1/health");

// POST
const result = await client.post<{ id: string }>("/api/v1/content", {
  title: "Hello",
});

// Pagination
for await (const page of new PaginationIterator((cursor) =>
  client.get(`/api/v1/items?after=${cursor}`),
)) {
  console.log(page.items);
}

// Retry
import { createRetryFetch } from "@lyeve/cms-client";
const resilient = createRetryFetch(fetch, {
  maxAttempts: 3,
  baseDelay: 200,
});
const retryClient = createClient(resilient);

// Dedup
import { RequestDeduplicator } from "@lyeve/cms-client";
const dedup = new RequestDeduplicator();
const [a, b] = await Promise.all([
  dedup.dedup("key-1", () => client.get("/api/v1/data")),
  dedup.dedup("key-1", () => client.get("/api/v1/data")), // reuses in-flight request
]);
```

## API

### createClient(fetchFn, defaultHeaders?)

Returns `{ get, post, put, patch, delete }`. Each method is a typed generic:

```ts
client.get<T>(url: string, init?: RequestInit): Promise<T>
client.post<T>(url: string, body?: unknown, init?: RequestInit): Promise<T>
client.put<T>(url: string, body?: unknown, init?: RequestInit): Promise<T>
client.patch<T>(url: string, body?: unknown, init?: RequestInit): Promise<T>
client.delete<T>(url: string, init?: RequestInit): Promise<T | undefined>
```

### ApiError

`new ApiError(status, message)`. Thrown on non-OK responses.

### Types

Schema, SchemaField, FieldType, Content, User, APIKey, CreateAPIKeyResponse,
Webhook, WebhookDelivery, WebhookTestResult, RetryDeliveryResult, RetryConfig,
RetryConfigInput, DeadLetter, DLQStatus, PaginatedResponse\<T\>, ListResponse\<T\>,
WebhookHealthStats, GlobalHealthStats, IncomingWebhook, OAuthProvider,
Permission, Entitlements

### Utilities

| Export                            | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `PaginationIterator<T>`           | Async iterator for cursor-paginated endpoints |
| `QueryBuilder` / `query(schema)`  | Fluent query builder for content queries      |
| `createRetryFetch(fetch, config)` | Auto-retry with exponential backoff           |
| `RequestDeduplicator`             | Deduplicate in-flight requests by key         |

## Local development

```bash
pnpm install            # install dependencies
pnpm test               # run unit tests
pnpm check              # type-check
pnpm build              # tsup + publint -> dist/
```

## Project layout

```
src/
  client.ts          # createClient
  index.ts           # public API
  types.ts           # shared TypeScript types
  pagination.ts      # PaginationIterator
  query-builder.ts   # query() / QueryBuilder
  retry.ts           # createRetryFetch
  dedupe.ts          # RequestDeduplicator
tests/               # vitest test suite
```

## Versioning

`@lyeve/cms-client` follows [SemVer](https://semver.org). While under `1.0`,
breaking changes bump the **minor** version; additive changes bump the **patch**.
Every release is logged in [`CHANGELOG.md`](CHANGELOG.md).

## Contributing

Bug reports and feature requests are welcome. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development setup and conventions.

## License

MIT. See [`LICENSE`](LICENSE).
