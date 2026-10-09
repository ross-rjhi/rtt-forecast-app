// Typed calls to the Node API (api/). Field names match the API's JSON exactly.

export interface Organisation {
  org_code: string
  org_name: string
  parent_code: string | null
  parent_name: string | null
}

export interface Category {
  category_code: string // "ALL" = all categories
  category_name: string
}

export interface SummaryRow {
  period: string // first day of the month, e.g. "2026-07-01"
  org_code: string
  org_name: string
  category_code: string
  category_name: string
  total: number
  within_target: number
  pct_within_target: number | null // 0-1; null when the total is 0
  band_1: number // ordered bands that add up to the total, e.g. under 4 weeks, 4-12, over 12
  band_2: number
  band_3: number
}

export interface ListResponse<T> {
  data: T[]
  total: number
}

export interface PagedResponse<T> extends ListResponse<T> {
  page: number
  page_size: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

type Params = Record<string, string | number | undefined>

async function getJson<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const url = query.size ? `${path}?${query}` : path
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status)
  }
  return res.json()
}

export function getOrganisations(signal?: AbortSignal) {
  return getJson<ListResponse<Organisation>>('/api/organisations', {}, signal)
}

export function getCategories(params: { org?: string }, signal?: AbortSignal) {
  return getJson<ListResponse<Category>>('/api/categories', params, signal)
}

export interface SummaryParams extends Params {
  org?: string // one code or a comma-separated list
  category?: string
  from?: string // YYYY-MM
  to?: string
  page?: number
  page_size?: number // up to 500
}

export function getSummary(params: SummaryParams, signal?: AbortSignal) {
  return getJson<PagedResponse<SummaryRow>>('/api/summary', params, signal)
}
