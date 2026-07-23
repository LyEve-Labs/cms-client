# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.1.0] - 2026-07-23

### Added

- Initial release.
- Framework-agnostic `HttpClient` factory and typed `ApiError` for unified error handling across all protocol-specific packages.
- Domain type definitions covering schemas, content, users, API keys, webhooks, OAuth providers, permissions, and entitlements.
- `PaginationIterator` for cursor-based and offset-based pagination over any list endpoint.
- `QueryBuilder` for constructing content queries with filters, sorting, and status selection.
- `createRetryFetch` with exponential backoff and configurable retry behavior for transient failures.
- `RequestDeduplicator` to coalesce concurrent requests for the same resource across call sites.