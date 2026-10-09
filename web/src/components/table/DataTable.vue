<script setup lang="ts" generic="T extends RowData">
import { computed } from 'vue'
import {
  FlexRender,
  useTable,
  type Column,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/vue-table'
import { dataTableFeatures, type DataTableFeatures } from './features'

// Reusable table on TanStack Table (the engine reactable is built on). Pages pass rows and
// column definitions (see features.ts for dataTableColumns); this renders them with:
//   - sorting: click a header; Shift-click to add a second sort
//   - hover highlight, and single-row selection by click or Enter/Space (v-model:selected)
//   - optional expandable detail rows: provide a #detail slot
// The header is solid white, like the rows: frosted glass over scrolling rows let their text
// show through as a grey smudge.

const props = withDefaults(
  defineProps<{
    data: T[]
    // Keep stable: define once, not in a computed. `any` because each column holds a different
    // value type (dates, numbers...); it's the type TanStack's column helper returns.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: ColumnDef<DataTableFeatures, T, any>[]
    getRowId: (row: T) => string
    initialSorting?: SortingState
    caption?: string // describes the table for screen readers
  }>(),
  { initialSorting: () => [], caption: undefined },
)
const selected = defineModel<string | null>('selected', { default: null })
const slots = defineSlots<{ detail?(props: { row: T }): unknown }>()
const hasDetail = !!slots.detail

// Selection is owned by the parent (v-model), so it can drive other things, e.g. charts.
const rowSelection = computed<RowSelectionState>(() => (selected.value ? { [selected.value]: true } : {}))

const table = useTable({
  features: dataTableFeatures,
  columns: props.columns,
  data: computed(() => props.data),
  getRowId: (row: T) => props.getRowId(row),
  initialState: { sorting: props.initialSorting },
  enableSortingRemoval: false, // clicking cycles ascending <-> descending
  enableMultiRowSelection: false,
  getRowCanExpand: () => hasDetail,
  state: computed(() => ({ rowSelection: rowSelection.value })),
  onRowSelectionChange: (next) => {
    const value = typeof next === 'function' ? next(rowSelection.value) : next
    selected.value = Object.keys(value).find((id) => value[id]) ?? null
  },
})

// The rows in the order currently shown (after sorting), e.g. for an export that
// matches what's on screen. Call via a template ref: tableRef.value?.visibleRows()
defineExpose({ visibleRows: (): T[] => table.getRowModel().rows.map((r) => r.original) })

const columnCount = computed(() => table.getAllLeafColumns().length + (hasDetail ? 1 : 0))

const alignRight = (column: Column<DataTableFeatures, T, unknown>) => column.columnDef.meta?.align === 'right'

function ariaSort(column: Column<DataTableFeatures, T, unknown>) {
  const sorted = column.getIsSorted()
  return sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
}
</script>

<template>
  <table class="w-full tabular-nums">
    <caption v-if="caption" class="sr-only">{{ caption }}</caption>
    <thead class="sticky top-0 z-10 bg-page text-left text-ink-secondary">
      <tr v-for="group in table.getHeaderGroups()" :key="group.id" class="border-b border-line">
        <th v-if="hasDetail" class="w-7"><span class="sr-only">Details</span></th>
        <th
          v-for="header in group.headers"
          :key="header.id"
          :aria-sort="ariaSort(header.column)"
          class="py-1.5 pl-3 font-medium"
          :class="alignRight(header.column) ? 'text-right' : 'text-left'"
        >
          <button
            v-if="header.column.getCanSort()"
            type="button"
            class="inline-flex items-center gap-1 rounded hover:text-ink focus-visible:ring-2 focus-visible:ring-series-1/40 focus-visible:outline-none pointer-coarse:min-h-8"
            :class="{ 'flex-row-reverse': alignRight(header.column), 'text-ink': header.column.getIsSorted() }"
            :title="`Sort by ${header.column.columnDef.header}. Shift-click to add a second sort.`"
            @click="header.column.getToggleSortingHandler()?.($event)"
          >
            <FlexRender :header="header" />
            <!-- Sort direction; faint when not sorted, to show it can be -->
            <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true">
              <path d="M6 2.5 8.5 5h-5z" :class="header.column.getIsSorted() === 'asc' ? 'fill-ink' : 'fill-ink-muted/40'" />
              <path d="M6 9.5 3.5 7h5z" :class="header.column.getIsSorted() === 'desc' ? 'fill-ink' : 'fill-ink-muted/40'" />
            </svg>
            <!-- With more than one sort, number them -->
            <span v-if="table.atoms.sorting.get().length > 1 && header.column.getIsSorted()" class="text-[10px] text-ink-muted">
              {{ header.column.getSortIndex() + 1 }}
            </span>
          </button>
          <FlexRender v-else :header="header" />
        </th>
      </tr>
    </thead>

    <tbody>
      <template v-for="row in table.getRowModel().rows" :key="row.id">
        <tr
          tabindex="0"
          :aria-selected="row.getIsSelected()"
          class="cursor-pointer border-b border-line transition-colors outline-none last:border-0 focus-visible:bg-series-1/10"
          :class="
            row.getIsSelected()
              ? 'bg-series-1/15 shadow-[inset_3px_0_0_var(--color-series-1)]'
              : 'hover:bg-series-1/8'
          "
          @click="row.toggleSelected()"
          @keydown.enter.space.prevent="row.toggleSelected()"
        >
          <td v-if="hasDetail" class="py-1.5">
            <button
              type="button"
              class="grid size-5 place-items-center rounded text-ink-muted pointer-coarse:size-8 hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-series-1/40 focus-visible:outline-none"
              :aria-expanded="row.getIsExpanded()"
              :aria-label="row.getIsExpanded() ? 'Hide details' : 'Show details'"
              @click.stop="row.toggleExpanded()"
              @keydown.stop
            >
              <svg
                viewBox="0 0 12 12"
                class="size-3 transition-transform"
                :class="{ 'rotate-90': row.getIsExpanded() }"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path d="m4.5 3 3 3-3 3" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </td>
          <td
            v-for="cell in row.getAllCells()"
            :key="cell.id"
            class="py-1.5 pl-3 whitespace-nowrap"
            :class="alignRight(cell.column) ? 'text-right' : 'text-left'"
          >
            <FlexRender :cell="cell" />
          </td>
        </tr>

        <tr v-if="row.getIsExpanded()" class="border-b border-line bg-ink/[0.02]">
          <td :colspan="columnCount" class="px-7 py-2">
            <slot name="detail" :row="row.original" />
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
