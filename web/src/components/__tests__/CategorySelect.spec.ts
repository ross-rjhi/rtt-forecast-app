import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CategorySelect from '../CategorySelect.vue'

type FakeResponse = { ok: boolean; json: () => Promise<unknown> }

// What A01 has data for; the full list (no organisation) also includes Surgery.
const LIST = [
  { category_code: 'ALL', category_name: 'All categories' },
  { category_code: 'MED', category_name: 'Medicine' },
]
const ALL = [...LIST, { category_code: 'SUR', category_name: 'Surgery' }]

describe('CategorySelect', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<FakeResponse>>>

  beforeEach(() => {
    fetchMock = vi.fn<(url: string) => Promise<FakeResponse>>(async (url) => {
      const data = url.includes('org=') ? LIST : ALL
      return { ok: true, json: async () => ({ data, total: data.length }) }
    })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  async function mountSelect(modelValue: string, orgCode: string | null) {
    const wrapper = mount(CategorySelect, { props: { modelValue, orgCode } })
    await new Promise((r) => setTimeout(r, 0)) // let the 0ms debounce fire
    await flushPromises()
    return wrapper
  }

  const urls = () => fetchMock.mock.calls.map((c) => c[0])
  const labels = (wrapper: Awaited<ReturnType<typeof mountSelect>>) => wrapper.findAll('option').map((o) => o.text())

  it("asks for the chosen organisation's categories", async () => {
    const wrapper = await mountSelect('ALL', 'A01')
    expect(urls()).toContain('/api/categories?org=A01')
    expect(labels(wrapper)).toEqual(['All categories', 'Medicine'])
  })

  it('lists all categories before an organisation is picked', async () => {
    const wrapper = await mountSelect('ALL', null)
    expect(urls().every((u) => u === '/api/categories')).toBe(true)
    expect(labels(wrapper)).toEqual(['All categories', 'Medicine', 'Surgery'])
  })

  it('keeps a choice this organisation has no data for, and says so', async () => {
    const wrapper = await mountSelect('SUR', 'A01')
    expect(labels(wrapper)).toContain('Surgery (no data here)')
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('SUR')
  })

  it('updates the model when a category is chosen', async () => {
    const wrapper = await mountSelect('ALL', 'A01')
    await wrapper.find('select').setValue('MED')
    expect(wrapper.emitted('update:modelValue')).toEqual([['MED']])
  })
})
