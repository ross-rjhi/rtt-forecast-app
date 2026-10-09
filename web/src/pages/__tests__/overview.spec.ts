import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useFiltersStore } from '@/stores/filters'
import OverviewPage from '../overview.vue'
import BandChart from '@/components/BandChart.vue'
import TrendChart from '@/components/TrendChart.vue'

const row = (period: string, total: number, within: number, band2: number, band3: number) => ({
  period,
  org_code: 'A01',
  org_name: 'Ashdown Health Services',
  category_code: 'ALL',
  category_name: 'All categories',
  total,
  within_target: within,
  pct_within_target: within / total,
  band_1: within,
  band_2: band2,
  band_3: band3,
})

describe('Overview page', () => {
  type FakeResponse = { ok: boolean; json: () => Promise<unknown> }
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<FakeResponse>>>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn<(url: string) => Promise<FakeResponse>>(async () => ({
      ok: true,
      json: async () => ({
        // Newest first, as the API returns it.
        data: [row('2026-07-01', 8281, 5426, 2469, 386), row('2026-06-01', 8124, 5215, 2499, 410)],
        page: 1,
        page_size: 500,
        total: 2,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // Mounts the page at `path` with an in-memory router (no real address bar in tests).
  async function mountPage(path = '/') {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: OverviewPage }] })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(OverviewPage, {
      global: {
        plugins: [createTestingPinia({ stubActions: false, createSpy: vi.fn }), router],
        // The pickers and charts have their own concerns (API, canvas); stub them here.
        stubs: {
          AppNavbar: true,
          OrganisationPicker: true,
          CategorySelect: true,
          TrendChart: true,
          TrendSparkline: true,
          BandChart: true,
        },
      },
    })
    return { wrapper, router }
  }

  async function settle() {
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
  }

  it('asks for an organisation before loading anything', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.text()).toContain('Pick an organisation')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the chosen organisation and shows its latest month with changes', async () => {
    const { wrapper } = await mountPage()
    useFiltersStore().orgCode = 'A01'
    await settle()

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/summary?org=A01&category=ALL&page_size=500')

    const text = wrapper.text()
    expect(text).toContain('Ashdown Health Services')
    expect(text).toContain('end of Jul 2026')
    expect(text).toContain('8,281')
    expect(text).toContain('+157') // total change vs Jun 2026
    expect(text).toContain('65.5%')
    expect(text).toContain('+1.3 pts')
    expect(text).toContain('−24') // over 12 weeks change

    // One-line card titles: "Title | detail"
    const oneLine = text.replace(/\s+/g, ' ')
    expect(oneLine).toContain('Within target | % of the total, Jun 2026 to Jul 2026')
    expect(oneLine).toContain('Total by band | Count, Jun 2026 to Jul 2026')
    expect(oneLine).toContain('Monthly figures | Click a month to highlight it in the charts')
  })

  it('passes the chosen category to the API and the URL', async () => {
    const { router } = await mountPage('/?org=A01')
    await settle()
    useFiltersStore().category = 'MED'
    await settle()
    expect(fetchMock.mock.lastCall![0]).toBe('/api/summary?org=A01&category=MED&page_size=500')
    expect(router.currentRoute.value.fullPath).toBe('/?org=A01&category=MED')
  })

  it('gives the charts their series', async () => {
    const { wrapper } = await mountPage('/?org=A01')
    await settle()
    expect(wrapper.findComponent(TrendChart).props()).toMatchObject({
      target: 0.75,
      rows: [
        { period: '2026-06-01', value: 5215 / 8124, detail: '5,215 of 8,124' },
        { period: '2026-07-01', value: 5426 / 8281, detail: '5,426 of 8,281' },
      ],
    })
    expect(wrapper.findComponent(BandChart).props()).toMatchObject({
      bands: ['Under 4 weeks', '4–12 weeks', 'Over 12 weeks'],
      rows: [
        { period: '2026-06-01', values: [5215, 2499, 410] },
        { period: '2026-07-01', values: [5426, 2469, 386] },
      ],
    })
  })

  it('links the selected month between the table and both charts', async () => {
    const { wrapper } = await mountPage('/?org=A01')
    await settle()
    const rowFor = (month: string) => wrapper.findAll('tbody tr').find((tr) => tr.text().startsWith(month))!
    const charts = () => [wrapper.findComponent(TrendChart), wrapper.findComponent(BandChart)]
    const selectedIn = (c: ReturnType<typeof charts>[number]) => (c.props() as { selected?: string | null }).selected

    // Table -> charts
    await rowFor('Jun 2026').trigger('click')
    expect(charts().map(selectedIn)).toEqual(['2026-06-01', '2026-06-01'])
    expect(wrapper.text()).toContain('Jun 2026 selected, click again to clear')

    // Chart -> table (and the other chart)
    charts()[1]!.vm.$emit('select', '2026-07-01')
    await flushPromises()
    expect(rowFor('Jul 2026').attributes('aria-selected')).toBe('true')
    expect(rowFor('Jun 2026').attributes('aria-selected')).toBe('false')
    expect(selectedIn(charts()[0]!)).toBe('2026-07-01')
  })

  describe('organisation in the URL', () => {
    it('loads the organisation named in the URL, tidying the code', async () => {
      const { router } = await mountPage('/?org=a01')
      await settle()
      expect(useFiltersStore().orgCode).toBe('A01')
      expect(fetchMock.mock.calls[0]![0]).toContain('org=A01')
      expect(router.currentRoute.value.fullPath).toBe('/?org=A01')
    })

    it('drops invalid values from the URL', async () => {
      const { router } = await mountPage('/?org=A01;DROP&from=2026-13')
      await settle()
      expect(useFiltersStore().orgCode).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(router.currentRoute.value.fullPath).toBe('/')
    })

    it('puts a newly picked organisation in the URL, as a history entry', async () => {
      const { router } = await mountPage()
      useFiltersStore().orgCode = 'A01'
      await settle()
      expect(router.currentRoute.value.fullPath).toBe('/?org=A01')

      useFiltersStore().orgCode = 'A02'
      await settle()
      expect(router.currentRoute.value.fullPath).toBe('/?org=A02')

      router.back() // what the browser Back button does
      await settle()
      expect(router.currentRoute.value.fullPath).toBe('/?org=A01')
      expect(useFiltersStore().orgCode).toBe('A01')
    })

    it('keeps other filters out of the URL while they are at their defaults', async () => {
      const { router } = await mountPage('/?org=A01&category=MED&from=2025-08')
      await settle()
      const filters = useFiltersStore()
      expect(filters.category).toBe('MED')
      expect(filters.from).toBe('2025-08')

      filters.category = 'ALL'
      filters.from = undefined
      await settle()
      expect(router.currentRoute.value.fullPath).toBe('/?org=A01')
    })
  })
})
