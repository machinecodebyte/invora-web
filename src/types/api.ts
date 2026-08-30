/**
 * Transport-level API contracts shared by every feature module.
 *
 * These mirror the backend's response envelope without describing any business
 * resource. Resource payloads are declared by the feature that owns them.
 */

/** HTTP verbs exposed by the API client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Primitive that can be serialized into a query string. */
export type QueryParamValue = string | number | boolean | Date | null | undefined;

/** Query string input accepted by the API client. */
export type QueryParams = Record<string, QueryParamValue | readonly QueryParamValue[]>;

/** Successful backend envelope: `{ "success": true, "data": { ... } }`. */
export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

/** Single field-level validation problem, normalized from the backend. */
export interface ApiValidationIssue {
  /** Dot-path of the offending field when the backend reports one. */
  field: string | null;
  message: string;
}

/** Error payload nested inside a failed backend envelope. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: readonly ApiValidationIssue[];
}

/** Failed backend envelope: `{ "success": false, "error": { ... } }`. */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

/** Either side of the backend envelope. */
export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

/** Offset/limit request parameters, matching the backend pagination contract. */
export interface OffsetPaginationParams {
  limit: number;
  offset: number;
}

/**
 * Offset/limit pagination metadata.
 *
 * The backend returns collections under a resource-specific key (for example
 * `data.products`) alongside these counters; each feature normalizes its own
 * payload into {@link OffsetPaginatedList}.
 */
export interface PaginationMeta extends OffsetPaginationParams {
  total: number;
}

/** Feature-agnostic normalized page of records. */
export interface OffsetPaginatedList<TItem> extends PaginationMeta {
  items: readonly TItem[];
}

/** True when more records exist after the current page. */
export function hasMorePages(meta: PaginationMeta): boolean {
  return meta.offset + meta.limit < meta.total;
}

/** 1-based page number derived from offset/limit counters. */
export function currentPageNumber(meta: PaginationMeta): number {
  if (meta.limit <= 0) {
    return 1;
  }
  return Math.floor(meta.offset / meta.limit) + 1;
}

/** Total number of pages implied by the counters. */
export function totalPageCount(meta: PaginationMeta): number {
  if (meta.limit <= 0) {
    return 0;
  }
  return Math.ceil(meta.total / meta.limit);
}
