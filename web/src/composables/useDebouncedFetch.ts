import { onScopeDispose, ref, shallowRef, watch, type Ref, type WatchSource } from 'vue'

export interface DebouncedFetch<T> {
  data: Ref<T | undefined>
  loading: Ref<boolean>
  error: Ref<string | null>
}

/**
 * Re-runs `fetcher` whenever `params` changes, waiting `delay` ms after the last change
 * so rapid edits (typing, dragging a range) send one request, not dozens. A request
 * still in flight when a newer one starts is cancelled, so an old, slow response can
 * never overwrite a newer one. Return `null` from `params` to skip fetching (e.g. no
 * organisation picked yet).
 *
 * Shiny analogy: `reactive()` + `debounce()`, with stale requests cancelled.
 */
export function useDebouncedFetch<P, T>(
  params: WatchSource<P | null>,
  fetcher: (params: P, signal: AbortSignal) => Promise<T>,
  delay = 300,
): DebouncedFetch<T> {
  const data = shallowRef<T>()
  const loading = ref(false)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined

  async function run(value: P) {
    controller?.abort()
    const current = (controller = new AbortController())
    loading.value = true
    error.value = null
    try {
      const result = await fetcher(value, current.signal)
      if (!current.signal.aborted) data.value = result
    } catch (e) {
      if (current.signal.aborted) return
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (controller === current) loading.value = false
    }
  }

  watch(
    params,
    (value) => {
      clearTimeout(timer)
      if (value === null) {
        controller?.abort()
        data.value = undefined
        loading.value = false
        return
      }
      loading.value = true
      timer = setTimeout(() => run(value), delay)
    },
    { immediate: true, deep: true },
  )

  onScopeDispose(() => {
    clearTimeout(timer)
    controller?.abort()
  })

  return { data, loading, error }
}
