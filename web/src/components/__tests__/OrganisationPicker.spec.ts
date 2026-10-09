import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

type FakeResponse = { ok: boolean; json: () => Promise<unknown> }

const ORGANISATIONS = [
  { org_code: 'A05', org_name: 'Elmstead Health Partners', parent_code: 'P02', parent_name: 'Central Partnership' },
  { org_code: 'A01', org_name: 'Ashdown Health Services', parent_code: 'P01', parent_name: 'North Partnership' },
  { org_code: 'A02', org_name: 'Brookfield Care Group', parent_code: 'P01', parent_name: 'North Partnership' },
]

describe('OrganisationPicker', () => {
  let respond: () => void // releases the pending organisation list request
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<FakeResponse>>>

  beforeEach(() => {
    vi.resetModules() // the picker shares one organisation list per page load; start each test fresh
    fetchMock = vi.fn<(url: string) => Promise<FakeResponse>>(
      () =>
        new Promise((resolve) => {
          respond = () => resolve({ ok: true, json: async () => ({ data: ORGANISATIONS, total: 3 }) })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  async function mountPicker(modelValue: string | null) {
    const { default: OrganisationPicker } = await import('../OrganisationPicker.vue')
    return mount(OrganisationPicker, { props: { modelValue }, attachTo: document.body })
  }

  it("keeps what the user typed if the list arrives afterwards", async () => {
    const wrapper = await mountPicker('A01')
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('elm')

    respond()
    await flushPromises()
    expect((input.element as HTMLInputElement).value).toBe('elm')
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual([
      expect.stringContaining('Elmstead Health Partners'),
    ])
  })

  it("selects the current organisation's name when the list arrives while the box has focus, so typing replaces it", async () => {
    const wrapper = await mountPicker('A01')
    const input = wrapper.find('input').element as HTMLInputElement
    input.focus()

    respond()
    await flushPromises()
    expect(input.value).toBe('Ashdown Health Services')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length])
  })

  it('selects the name when focused before it is filled in (a panel opening with the list already loaded)', async () => {
    await mountPicker(null) // loads and shares the list
    respond()
    await flushPromises()

    const wrapper = await mountPicker('A01')
    const input = wrapper.find('input').element as HTMLInputElement
    input.focus() // straight away, while the box is still empty
    await flushPromises()
    expect(input.value).toBe('Ashdown Health Services')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length])
  })

  it('gives the drop-down list its own dark text, so it stays readable inside the white-text sidebar', async () => {
    const wrapper = await mountPicker(null)
    expect(wrapper.find('[role="listbox"]').classes()).toEqual(expect.arrayContaining(['bg-surface', 'text-ink']))
  })

  it('loads the organisation list once, however many pickers there are', async () => {
    await mountPicker(null)
    await mountPicker(null)
    respond()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('groups options under their parent, A-Z', async () => {
    const wrapper = await mountPicker(null)
    respond()
    await flushPromises()
    await wrapper.find('input').trigger('focus')
    // Group headings, then each option's name (its code sits beside it in a second span)
    const items = wrapper
      .findAll('[role="listbox"] li')
      .map((li) => (li.find('span').exists() ? li.find('span').text() : li.text()))
    expect(items).toEqual([
      'Central Partnership',
      'Elmstead Health Partners',
      'North Partnership',
      'Ashdown Health Services',
      'Brookfield Care Group',
    ])
  })

  it('chooses an option from the keyboard', async () => {
    const wrapper = await mountPicker(null)
    respond()
    await flushPromises()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('brook')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['A02']])
  })
})
