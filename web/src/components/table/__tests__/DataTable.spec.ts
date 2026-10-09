import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '../DataTable.vue'
import { dataTableColumns } from '../features'

type Row = { id: string; name: string; score: number }
const DATA: Row[] = [
  { id: 'a', name: 'Alpha', score: 20 },
  { id: 'b', name: 'Bravo', score: 30 },
  { id: 'c', name: 'Charlie', score: 10 },
]
const col = dataTableColumns<Row>()
const COLUMNS = col.columns([
  col.accessor('name', { header: 'Name' }),
  col.accessor('score', { header: 'Score', meta: { align: 'right' } }),
])

// Mounts the table with its selection wired back in, as a page's v-model:selected would.
function mountTable(options: { selected?: string | null; detail?: boolean } = {}) {
  const wrapper = mount(DataTable<Row>, {
    props: {
      data: DATA,
      columns: COLUMNS,
      getRowId: (r: Row) => r.id,
      selected: options.selected ?? null,
      'onUpdate:selected': (id: string | null) => wrapper.setProps({ selected: id }),
    },
    slots: options.detail ? { detail: '<template #detail="{ row }">Details for {{ row.name }}</template>' } : {},
    attachTo: document.body,
  })
  return wrapper
}

// The most recent value the table sent back through v-model:selected.
const lastEmitted = (w: ReturnType<typeof mountTable>) => {
  const events = w.emitted('update:selected')!
  return events[events.length - 1]
}
const names = (w: ReturnType<typeof mountTable>) => w.findAll('tbody tr').map((tr) => tr.find('td').text())
const header = (w: ReturnType<typeof mountTable>, name: string) => w.findAll('th').find((th) => th.text().startsWith(name))!

describe('DataTable', () => {
  it('renders the rows and columns it is given', () => {
    const wrapper = mountTable()
    expect(names(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    expect(header(wrapper, 'Score').classes()).toContain('text-right')
  })

  it('sorts when a header is clicked, and reports the order to screen readers', async () => {
    const wrapper = mountTable()
    await header(wrapper, 'Score').find('button').trigger('click')
    const firstClick = names(wrapper)
    const firstSort = header(wrapper, 'Score').attributes('aria-sort')
    await header(wrapper, 'Score').find('button').trigger('click')

    // One click sorts one way, the next the other way (numbers start high-to-low).
    expect([firstClick, firstSort]).toEqual([['Bravo', 'Alpha', 'Charlie'], 'descending'])
    expect(names(wrapper)).toEqual(['Charlie', 'Alpha', 'Bravo'])
    expect(header(wrapper, 'Score').attributes('aria-sort')).toBe('ascending')
  })

  it('selects a row on click, and clears it on a second click', async () => {
    const wrapper = mountTable()
    const row = () => wrapper.findAll('tbody tr')[1]!
    await row().trigger('click')
    expect(lastEmitted(wrapper)).toEqual(['b'])
    expect(row().attributes('aria-selected')).toBe('true')

    await row().trigger('click')
    expect(lastEmitted(wrapper)).toEqual([null])
    expect(row().attributes('aria-selected')).toBe('false')
  })

  it('selects only one row at a time', async () => {
    const wrapper = mountTable({ selected: 'a' })
    await wrapper.findAll('tbody tr')[2]!.trigger('click')
    expect(lastEmitted(wrapper)).toEqual(['c'])
    expect(wrapper.findAll('tbody tr').map((tr) => tr.attributes('aria-selected'))).toEqual(['false', 'false', 'true'])
  })

  it('selects with the keyboard (Enter or Space)', async () => {
    const wrapper = mountTable()
    await wrapper.findAll('tbody tr')[0]!.trigger('keydown', { key: 'Enter' })
    expect(lastEmitted(wrapper)).toEqual(['a'])
  })

  it('follows selection set from outside (e.g. a chart click)', async () => {
    const wrapper = mountTable()
    await wrapper.setProps({ selected: 'c' })
    expect(wrapper.findAll('tbody tr')[2]!.attributes('aria-selected')).toBe('true')
  })

  it('expands a detail row without selecting the row', async () => {
    const wrapper = mountTable({ detail: true })
    expect(wrapper.text()).not.toContain('Details for Bravo')
    const expander = wrapper.findAll('tbody tr')[1]!.find('button')
    await expander.trigger('click')

    expect(expander.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Details for Bravo')
    expect(wrapper.emitted('update:selected')).toBeUndefined()
  })
})
