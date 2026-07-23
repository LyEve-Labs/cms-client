/**
 * Fluent query builder for LyEve CMS Content API queries.
 *
 * Produces ContentQuery objects with a chainable API.
 *
 * ## Usage
 * ```ts
 * import { query } from '@lyeve/cms-client';
 *
 * const q = query('posts')
 *   .where('status', 'eq:published')
 *   .sort('-created_at')
 *   .limit(20)
 *   .build();
 * ```
 */

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentQuery {
	/** Filter by status. */
	status?: ContentStatus;
	/** Max records per page. */
	limit?: number;
	/** Offset for offset-based pagination. Mutually exclusive with cursor. */
	offset?: number;
	/** Cursor for cursor-based pagination. Mutually exclusive with offset. */
	cursor?: string;
	/** Field-level filters in `field=op:value` format. */
	filters?: Record<string, string>;
	/** Sort field(s), comma-separated. Prefix with `-` for descending. */
	sort?: string;
}

/**
 * Builder for ContentQuery objects.
 *
 * Each field can only hold one filter (Record<string, string>). Calling
 * where() (or whereEq/whereGt etc.) with an already-set field name
 * overwrites the previous filter. For range queries on the same field,
 * use the server's range filter syntax in a single call.
 */
export class QueryBuilder {
	#schema: string;
	#status?: ContentStatus;
	#limit?: number;
	#offset?: number;
	#cursor?: string;
	#filters: Record<string, string> = {};
	#sort?: string;

	constructor(schema: string) {
		this.#schema = schema;
	}

	/** The schema/collection this query targets. */
	get schema(): string {
		return this.#schema;
	}

	/** Filter by content status (published, draft, archived). */
	whereStatus(s: ContentStatus | undefined): this {
		this.#status = s;
		return this;
	}

	/** Add a field filter in `op:value` format. */
	where(field: string, value: string): this {
		this.#filters[field] = value;
		return this;
	}

	/** Add a field-level equality filter. */
	whereEq(field: string, value: string | number | boolean): this {
		this.#filters[field] = `eq:${String(value)}`;
		return this;
	}

	/** Add a field-level "in" filter (value is a JSON array). */
	whereIn(field: string, values: (string | number)[]): this {
		this.#filters[field] = `in:${JSON.stringify(values)}`;
		return this;
	}

	/** Greater-than comparison. */
	whereGt(field: string, value: number): this {
		this.#filters[field] = `gt:${value}`;
		return this;
	}

	/** Greater-than-or-equal comparison. */
	whereGte(field: string, value: number): this {
		this.#filters[field] = `gte:${value}`;
		return this;
	}

	/** Less-than comparison. */
	whereLt(field: string, value: number): this {
		this.#filters[field] = `lt:${value}`;
		return this;
	}

	/** Less-than-or-equal comparison. */
	whereLte(field: string, value: number): this {
		this.#filters[field] = `lte:${value}`;
		return this;
	}

	/** Full-text search (if the schema supports it). */
	whereSearch(field: string, query: string): this {
		this.#filters[field] = `search:${query}`;
		return this;
	}

	/** Set the max records per page. */
	limit(n: number | undefined): this {
		this.#limit = n;
		return this;
	}

	/** Set the offset for offset-based pagination. Clears cursor. */
	offset(n: number | undefined): this {
		this.#offset = n;
		if (n !== undefined) this.#cursor = undefined;
		return this;
	}

	/** Set the cursor for cursor-based pagination. Clears offset. */
	cursor(c: string | undefined): this {
		this.#cursor = c;
		if (c !== undefined) this.#offset = undefined;
		return this;
	}

	/** Set sort fields. Prefix with `-` for descending. */
	sort(...fields: string[]): this {
		this.#sort = fields.join(',');
		return this;
	}

	/** Clear all filters, keeping only the schema name. */
	resetFilters(): this {
		this.#filters = {};
		this.#status = undefined;
		this.#sort = undefined;
		this.#limit = undefined;
		this.#offset = undefined;
		this.#cursor = undefined;
		return this;
	}

	/** Produce the ContentQuery object. */
	build(): ContentQuery {
		return {
			status: this.#status,
			limit: this.#limit,
			offset: this.#offset,
			cursor: this.#cursor,
			filters: Object.keys(this.#filters).length > 0
				? { ...this.#filters }
				: undefined,
			sort: this.#sort,
		};
	}
}

/**
 * Create a new query builder for the given schema.
 * Equivalent to `new QueryBuilder(schema)`.
 */
export function query(schema: string): QueryBuilder {
	return new QueryBuilder(schema);
}
