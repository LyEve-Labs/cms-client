# Changelog

## [0.1.0] - 2026-07-22

### Added

- Initial release.
- Framework-agnostic `HttpClient` factory and typed `ApiError` for unified error handling across all protocol-specific packages.
- Domain type definitions covering schemas, content, users, API keys, webhooks, OAuth providers, permissions, and entitlements.
- `PaginationIterator` for cursor-based and offset-based pagination over any list endpoint.
- `QueryBuilder` for constructing content queries with filters, sorting, and status selection.
- `createRetryFetch` with exponential backoff and configurable retry behavior for transient failures.
- `RequestDeduplicator` to coalesce concurrent requests for the same resource across call sites.
