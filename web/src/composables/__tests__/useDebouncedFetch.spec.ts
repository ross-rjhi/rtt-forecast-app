import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDebouncedFetch } from '../useDebouncedFetch'

describe('useDebouncedFetch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Composables need a Vue "scope" to run in; components provide one automatically.
  function setup<P>(initial: P | null, fetcher: (p: P, s: AbortSignal) => Promise<string>) {
    const params = ref(initial) as { value: P | null }
    const scope = effectScope()
    const result = scope.run(() => useDebouncedFetch(() => params.value, fetcher, 300))!
    return { params, scope, ...result }
  }

  it('waits for changes to settle, then fetches once with the latest value', async () => {
    const fetcher = vi.fn<(p: string) => Promise<string>>(async (p) => `result for ${p}`)
    const { params, data, loading } = setup<string>('a', fetcher)

    params.value = 'ab'
    await nextTick()
    params.value = 'abc'
    await nextTick()
    expect(loading.value).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]![0]).toBe('abc')
    expect(data.value).toBe('result for abc')
    expect(loading.value).toBe(false)
  })

  it('cancels a slow request when a newer one starts, so its result is ignored', async () => {
    const signals: AbortSignal[] = []
    const fetcher = vi.fn<(p: string, signal: AbortSignal) => Promise<string>>(
      (p: string, signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          signals.push(signal)
          setTimeout(() => resolve(`result for ${p}`), p === 'slow' ? 1000 : 10)
        }),
    )
    const { params, data } = setup<string>('slow', fetcher)
    await vi.advanceTimersByTimeAsync(300) // 'slow' request starts

    params.value = 'fast'
    await nextTick()
    await vi.advanceTimersByTimeAsync(2000) // both would have resolved by now

    expect(signals[0]!.aborted).toBe(true)
    expect(data.value).toBe('result for fast')
  })

  it('skips fetching and clears data when params are null', async () => {
    const fetcher = vi.fn<(p: string) => Promise<string>>(async (p) => p)
    const { params, data, loading } = setup<string>('a', fetcher)
    await vi.advanceTimersByTimeAsync(300)
    expect(data.value).toBe('a')

    params.value = null
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(data.value).toBeUndefined()
    expect(loading.value).toBe(false)
  })

  it('exposes errors as a message', async () => {
    const { error, data } = setup('a', async () => {
      throw new Error('Unknown parameter(s): x')
    })
    await vi.advanceTimersByTimeAsync(300)
    expect(error.value).toBe('Unknown parameter(s): x')
    expect(data.value).toBeUndefined()
  })
})
