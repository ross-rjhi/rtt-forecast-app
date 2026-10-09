import {
  createColumnHelper,
  createExpandedRowModel,
  createSortedRowModel,
  metaHelper,
  type RowData,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
} from '@tanstack/vue-table'

// The TanStack Table features every DataTable supports. In v9 features are opt-in: only
// what's registered here is bundled and available (sorting, single-row selection,
// expandable detail rows). Add e.g. rowPaginationFeature or globalFilteringFeature here
// when a table needs them.

// Extra per-column settings DataTable understands, set via a column's `meta`.
export interface DataTableColumnMeta {
  align?: 'left' | 'right'
}

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  rowSelectionFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
  columnMeta: metaHelper<DataTableColumnMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures

// Typed column builder for a DataTable, like reactable's colDef():
//   const col = dataTableColumns<MyRow>()
//   const columns = col.columns([col.accessor('name', { header: 'Name' })])
export function dataTableColumns<T extends RowData>() {
  return createColumnHelper<DataTableFeatures, T>()
}
