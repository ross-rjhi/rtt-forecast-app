import { watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router'
import { useFiltersStore } from '@/stores/filters'

// Keeps the filters store and the page URL in step, both ways:
//   URL -> store: opening /?org=A01 (a shared link, a reload, Back/Forward) sets the filters.
//   store -> URL: picking an organisation updates the address bar, adding a history entry.
// Filters at their default are left out, so the plain page stays at "/".
// Query keys match the API's parameter names.
//
// Shiny analogy: bookmarkable state (enableBookmarking(store = "url")), kept live.

const DEFAULT_CATEGORY = 'ALL'
const CODE_RE = /^[A-Z0-9_]{1,12}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const KEYS = ['org', 'category', 'from', 'to'] as const

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v ?? undefined
}

function code(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const v = first(value)?.trim().toUpperCase()
  return v && CODE_RE.test(v) ? v : undefined
}

function month(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const v = first(value)?.trim()
  return v && MONTH_RE.test(v) ? v : undefined
}

export function useFiltersInUrl() {
  const route = useRoute()
  const router = useRouter()
  const filters = useFiltersStore()

  function applyQuery(query: LocationQuery) {
    filters.orgCode = code(query.org) ?? null
    filters.category = code(query.category) ?? DEFAULT_CATEGORY
    filters.from = month(query.from)
    filters.to = month(query.to)
  }

  // The filters as URL query values, keeping any unrelated query parameters.
  function filtersAsQuery(): LocationQuery {
    const query: LocationQuery = { ...route.query }
    for (const key of KEYS) delete query[key]
    if (filters.orgCode) query.org = filters.orgCode
    if (filters.category !== DEFAULT_CATEGORY) query.category = filters.category
    if (filters.from) query.from = filters.from
    if (filters.to) query.to = filters.to
    return query
  }

  const sameQuery = (a: LocationQuery, b: LocationQuery) =>
    JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

  // On arrival: take the filters from the URL, then tidy the URL (e.g. "a01" -> "A01",
  // invalid values dropped) without adding a history entry.
  applyQuery(route.query)
  if (!sameQuery(filtersAsQuery(), route.query)) {
    router.replace({ query: filtersAsQuery() })
  }

  // Back/Forward or an edited address: URL -> store.
  watch(
    () => route.query,
    (query) => applyQuery(query),
  )

  // Filter changed on the page: store -> URL. The check stops the two watchers
  // bouncing the same change back and forth.
  watch(
    () => [filters.orgCode, filters.category, filters.from, filters.to],
    () => {
      const query = filtersAsQuery()
      if (!sameQuery(query, route.query)) router.push({ query })
    },
  )
}
