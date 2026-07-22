# @lyeve/cms-client

Framework-agnostic HTTP client for the LyEve CMS API. Zero dependencies; uses
native `fetch`.

## Install

```sh
pnpm add @lyeve/cms-client
```

## Usage

```ts
import { createClient } from '@lyeve/cms-client';
import { getSchemas } from '@lyeve/cms-client-rest';

const client = createClient(fetch, { Authorization: 'Bearer <token>' });
const schemas = await getSchemas(client);
```

## API

### createClient(fetchFn, defaultHeaders?)

Returns `{ get, post, put, patch, delete }`; each is a typed generic `get<T>(url, init?)`.

- Adds `Content-Type: application/json` automatically.
- Default 15s timeout via AbortSignal.
- Non-OK responses throw `ApiError` with `status` and `message`.
- 204 responses return `undefined`.

### ApiError

`new ApiError(status, message)`. Thrown on non-OK responses. Has `status: number` and `message: string`.

### Types

Schema, SchemaField, FieldType, Content, User, APIKey, CreateAPIKeyResponse,
Webhook, WebhookDelivery, WebhookTestResult, RetryDeliveryResult, RetryConfig,
RetryConfigInput, DeadLetter, DLQStatus, PaginatedResponse\<T\>, ListResponse\<T\>,
WebhookHealthStats, GlobalHealthStats, IncomingWebhook, OAuthProvider,
Permission, Entitlements

### Utilities

- `PaginationIterator<T>`: async iterator for cursor-paginated endpoints.
- `QueryBuilder` / `query(schema)`: fluent query builder for content queries.
- `createRetryFetch(fetch, config)`: automatic retry with exponential backoff.
- `RequestDeduplicator`: deduplicate in-flight requests by key.

## License

MIT
