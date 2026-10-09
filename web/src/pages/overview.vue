<script setup lang="ts">
import { computed, h, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { getSummary, type SummaryRow } from '@/api/client'
import { useDebouncedFetch } from '@/composables/useDebouncedFetch'
import { useFiltersInUrl } from '@/composables/useFiltersInUrl'
import { useFiltersStore } from '@/stores/filters'
import { formatMonth, formatNumber, formatPct } from '@/utils/format'
import { aboutSheet, downloadXlsx, periodToDate, safeFileName, tableSheet, XLSX_FORMAT, type XlsxColumn } from '@/utils/xlsx'
import BandChart from '@/components/BandChart.vue'
import CardTitle from '@/components/CardTitle.vue'
import CategorySelect from '@/components/CategorySelect.vue'
import DashboardLayout from '@/components/DashboardLayout.vue'
import DownloadButton from '@/components/DownloadButton.vue'
import OrganisationPicker from '@/components/OrganisationPicker.vue'
import RailPopover from '@/components/RailPopover.vue'
import StatTile from '@/components/StatTile.vue'
import TrendChart from '@/components/TrendChart.vue'
import DataTable from '@/components/table/DataTable.vue'
import DeltaCell from '@/components/table/DeltaCell.vue'
import PctBarCell from '@/components/table/PctBarCell.vue'
import { dataTableColumns } from '@/components/table/features'

// The example dashboard: every building block of the template on the made-up data, laid out
// the RJHI way. Copy this page as the starting point for a new app's main page, then swap
// in your own measures. Shiny analogy: the server function plus the UI for one page.

const TARGET = 0.75 // the example standard: 75% within target
// The three ordered bands in the data (band_1 is "within target"), bottom of the stack first.
const BANDS = ['Under 4 weeks', '4–12 weeks', 'Over 12 weeks']

const filters = useFiltersStore()
const { orgCode, category } = storeToRefs(filters)
useFiltersInUrl() // e.g. /overview?org=A01 - shareable, survives reload, Back/Forward work

// Filters -> API parameters. null until an organisation is picked, which skips the request.
const params = computed(() =>
  filters.orgCode
    ? { org: filters.orgCode, category: filters.category, from: filters.from, to: filters.to, page_size: 500 }
    : null,
)
const { data, loading, error } = useDebouncedFetch(params, getSummary)

// The API returns newest first; charts and comparisons want oldest first.
const rows = computed<SummaryRow[]>(() => [...(data.value?.data ?? [])].reverse())
const latest = computed(() => rows.value[rows.value.length - 1])
const previous = computed(() => rows.value[rows.value.length - 2])

// Change vs the previous month, for a value box: ▲/▼ plus words, coloured good or bad.
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')
function change(key: 'total' | 'band_2' | 'band_3', higherIsBetter: boolean) {
  if (!latest.value || !previous.value) return undefined
  const amount = latest.value[key] - previous.value[key]
  return {
    amount,
    text: `${sign(amount)}${formatNumber(Math.abs(amount))}`,
    comparedTo: formatMonth(previous.value.period),
    higherIsBetter,
  }
}
const pctChange = computed(() => {
  if (!latest.value || !previous.value) return undefined
  const points = ((latest.value.pct_within_target ?? 0) - (previous.value.pct_within_target ?? 0)) * 100
  const rounded = Math.round(points * 10) / 10
  return {
    amount: rounded,
    text: `${sign(rounded)}${Math.abs(rounded).toFixed(1)} pts`,
    comparedTo: formatMonth(previous.value.period),
    higherIsBetter: true,
  }
})

// Value-box sparklines: one series per figure, oldest month first.
const months = computed(() => rows.value.map((r) => formatMonth(r.period)))
function trend(values: (number | null)[], format: (n: number) => string) {
  return { labels: months.value, values, format }
}

const monthRange = computed(() =>
  rows.value.length ? `${formatMonth(rows.value[0]!.period)} to ${formatMonth(rows.value[rows.value.length - 1]!.period)}` : '',
)

// ---- Charts ----
const trendPoints = computed(() =>
  rows.value.map((r) => ({
    period: r.period,
    value: r.pct_within_target,
    detail: `${formatNumber(r.within_target)} of ${formatNumber(r.total)}`,
  })),
)
const bandRows = computed(() => rows.value.map((r) => ({ period: r.period, values: [r.band_1, r.band_2, r.band_3] })))

// ---- Monthly figures table (TanStack Table via DataTable) ----
// Each row carries the month before it, for the change arrows. Precomputed, so sorting the
// table doesn't change what "previous month" means.
type MonthRow = SummaryRow & { prev?: SummaryRow }
const tableRows = computed<MonthRow[]>(() => rows.value.map((r, i) => ({ ...r, prev: rows.value[i - 1] })))

// Like reactable's columns = list(...): header, value, and how to draw each cell.
const col = dataTableColumns<MonthRow>()
const right = { align: 'right' } as const
const changeCell = (key: 'total' | 'band_3', higherIsBetter: boolean) => (ctx: { row: { original: MonthRow } }) => {
  const r = ctx.row.original
  return h(DeltaCell, {
    value: r[key],
    previous: r.prev?.[key],
    comparedTo: r.prev ? formatMonth(r.prev.period) : undefined,
    higherIsBetter,
  })
}
const columns = col.columns([
  col.accessor('period', { header: 'Month', cell: (ctx) => formatMonth(ctx.getValue()) }),
  col.accessor('total', { header: 'Total', meta: right, cell: changeCell('total', false) }),
  col.accessor('within_target', { header: 'Within target', meta: right, cell: (ctx) => formatNumber(ctx.getValue()) }),
  col.accessor('pct_within_target', {
    header: '% within target',
    meta: right,
    sortUndefined: 'last',
    cell: (ctx) => h(PctBarCell, { value: ctx.getValue(), target: TARGET }),
  }),
  col.accessor('band_2', { header: BANDS[1], meta: right, cell: (ctx) => formatNumber(ctx.getValue()) }),
  col.accessor('band_3', { header: BANDS[2], meta: right, cell: changeCell('band_3', false) }),
])

// The expandable detail under a month: each band's share of the total.
function details(r: MonthRow) {
  const share = (n: number) => (r.total ? formatPct(n / r.total) : '–')
  return BANDS.map((label, k) => ({ label: `${label} (share)`, value: share([r.band_1, r.band_2, r.band_3][k]!) }))
}

// ---- Excel download of the monthly figures ----
// The table's columns, as real numbers and dates, plus an "About" sheet.
const count = (header: string, value: (r: MonthRow) => number): XlsxColumn<MonthRow> => ({
  header,
  value,
  format: XLSX_FORMAT.count,
})
const exportColumns: XlsxColumn<MonthRow>[] = [
  { header: 'Month', value: (r) => periodToDate(r.period), format: XLSX_FORMAT.month, width: 10 },
  count('Total', (r) => r.total),
  count('Within target', (r) => r.within_target),
  { header: '% within target', value: (r) => r.pct_within_target, format: XLSX_FORMAT.pct },
  count(BANDS[0]!, (r) => r.band_1),
  count(BANDS[1]!, (r) => r.band_2),
  count(BANDS[2]!, (r) => r.band_3),
]

// Rows in the order the table currently shows them, so the file matches the screen.
const tableRef = useTemplateRef<{ visibleRows: () => MonthRow[] }>('table')

function downloadMonthlyFigures() {
  const l = latest.value!
  const downloaded = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  return downloadXlsx(safeFileName(`Example ${l.org_code} ${l.category_name} ${monthRange.value}.xlsx`), [
    tableSheet('Monthly figures', tableRef.value?.visibleRows() ?? tableRows.value, exportColumns),
    aboutSheet([
      ['Organisation', `${l.org_name} (${l.org_code})`],
      ['Category', l.category_name],
      ['Months', monthRange.value],
      ['Target', `${formatPct(TARGET, 0)} within target`],
      ['Downloaded', downloaded],
      ['Source', 'Made-up example data (RJHI dashboard template)'],
    ]),
  ])
}

// The selected month, shared by the table and both charts (clicking any of them sets it).
const selectedPeriod = ref<string | null>(null)
const tableHint = computed(() =>
  selectedPeriod.value
    ? `${formatMonth(selectedPeriod.value)} selected, click again to clear`
    : 'Click a month to highlight it in the charts',
)

// Current choices in words, for the collapsed sidebar's icon tooltips.
const orgName = computed(() => latest.value?.org_name ?? filters.orgCode ?? 'none chosen')
const categoryName = computed(() => latest.value?.category_name ?? filters.category)
</script>

<template>
  <DashboardLayout title="Example dashboard" subtitle="Made-up data, for the template">
    <template #sidebar>
      <OrganisationPicker v-model="orgCode" />
      <CategorySelect v-model="category" :org-code="orgCode" />
    </template>
    <!-- Sidebar collapsed: the same filters behind icon buttons. Each closes once a choice is made. -->
    <template #rail>
      <RailPopover label="Organisation" :summary="orgName" :active="!!orgCode">
        <template #icon>
          <!-- Hospital: a cross in a square -->
          <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="3.25" y="3.25" width="13.5" height="13.5" rx="2" />
            <path d="M10 6.5v7M6.5 10h7" stroke-linecap="round" />
          </svg>
        </template>
        <template #default="{ close }">
          <OrganisationPicker v-model="orgCode" @update:model-value="close" />
        </template>
      </RailPopover>
      <RailPopover label="Category" :summary="categoryName" :active="category !== 'ALL'">
        <template #icon>
          <!-- Filter: lines narrowing downwards -->
          <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M3.5 6h13M6 10h8M8.5 14h3" stroke-linecap="round" />
          </svg>
        </template>
        <template #default="{ close }">
          <CategorySelect v-model="category" :org-code="orgCode" @update:model-value="close" />
        </template>
      </RailPopover>
    </template>

    <template #sidebar-footer>
      <p class="text-xs text-white/80">Source: made-up example data (api/scripts/seed.js), for the template only.</p>
    </template>

    <!-- Nothing chosen yet: the key input sits in the middle of the page. -->
    <div v-if="!orgCode" class="grid flex-1 place-items-center p-8">
      <div class="w-full max-w-md">
        <p class="mb-4 text-center text-ink-secondary">Pick an organisation to see its figures.</p>
        <OrganisationPicker v-model="orgCode" />
      </div>
    </div>

    <p v-else-if="error" role="alert" class="p-4 text-bad">Couldn't load the figures: {{ error }}</p>

    <section
      v-else-if="latest"
      :class="{ 'opacity-60': loading }"
      class="flex flex-col gap-6 transition-opacity md:min-h-0 md:flex-1"
      :aria-busy="loading"
    >
      <header>
        <h2 class="text-xl font-semibold">{{ latest.org_name }}</h2>
        <p class="text-sm text-ink-secondary">
          {{ latest.category_name }} · figures at the end of {{ formatMonth(latest.period) }}
        </p>
      </header>

      <div class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total"
          :value="formatNumber(latest.total)"
          :change="change('total', false)"
          :trend="trend(rows.map((r) => r.total), formatNumber)"
        />
        <StatTile
          label="Within target"
          :note="`target ${formatPct(TARGET, 0)}`"
          :value="formatPct(latest.pct_within_target)"
          :change="pctChange"
          :trend="trend(rows.map((r) => r.pct_within_target), (n) => formatPct(n))"
        />
        <StatTile
          :label="BANDS[1]!"
          :value="formatNumber(latest.band_2)"
          :change="change('band_2', false)"
          :trend="trend(rows.map((r) => r.band_2), formatNumber)"
        />
        <StatTile
          :label="BANDS[2]!"
          :value="formatNumber(latest.band_3)"
          :change="change('band_3', false)"
          :trend="trend(rows.map((r) => r.band_3), formatNumber)"
        />
      </div>

      <!-- Two columns: charts (40%) and the table (60%). Each fills the remaining height. grid-cols-1 on
           phones stops the wide table stretching the page: it scrolls sideways inside its own box. -->
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 md:min-h-0 md:flex-1 md:max-lg:grid-rows-2 lg:grid-cols-5">
        <!-- Tablets (md to lg): the charts side by side above the table, so they keep a useful height -->
        <div class="flex flex-col gap-6 md:min-h-0 md:max-lg:flex-row lg:col-span-2">
          <figure class="flex min-w-0 flex-col md:min-h-0 md:flex-1">
            <figcaption class="mb-1">
              <CardTitle title="Within target" :detail="`% of the total, ${monthRange}`" />
            </figcaption>
            <div class="h-64 md:h-auto md:min-h-36 md:flex-1">
              <TrendChart
                :rows="trendPoints"
                name="within target"
                :target="TARGET"
                :target-label="`${formatPct(TARGET, 0)} target`"
                :selected="selectedPeriod"
                @select="selectedPeriod = $event"
              />
            </div>
          </figure>

          <figure class="flex min-w-0 flex-col md:min-h-0 md:flex-1">
            <figcaption class="mb-1">
              <CardTitle title="Total by band" :detail="`Count, ${monthRange}`" />
            </figcaption>
            <div class="h-64 md:h-auto md:min-h-36 md:flex-1">
              <BandChart :rows="bandRows" :bands="BANDS" :selected="selectedPeriod" @select="selectedPeriod = $event" />
            </div>
          </figure>
        </div>

        <figure class="flex flex-col md:min-h-0 lg:col-span-3">
          <figcaption class="mb-1 flex items-start justify-between gap-4">
            <CardTitle title="Monthly figures" :detail="tableHint" />
            <DownloadButton :download="downloadMonthlyFigures" />
          </figcaption>
          <!-- Solid rows ([&_tbody]:bg-page). `relative` keeps the cells' screen-reader text inside
               this scroll box, so it can't make the whole page scroll. -->
          <div class="relative overflow-auto text-sm md:min-h-0 md:flex-1 [&_tbody]:bg-page">
            <DataTable
              ref="table"
              v-model:selected="selectedPeriod"
              :data="tableRows"
              :columns="columns"
              :get-row-id="(r) => r.period"
              :initial-sorting="[{ id: 'period', desc: true }]"
              caption="Monthly figures. Select a row to highlight that month in the charts."
            >
              <template #detail="{ row }">
                <dl class="flex flex-wrap gap-x-8 gap-y-1 text-ink-secondary">
                  <div v-for="d in details(row)" :key="d.label" class="flex gap-2">
                    <dt>{{ d.label }}</dt>
                    <dd class="font-medium text-ink">{{ d.value }}</dd>
                  </div>
                </dl>
              </template>
            </DataTable>
          </div>
        </figure>
      </div>
    </section>

    <p v-else-if="loading" class="grid flex-1 place-items-center p-8 text-ink-secondary">Loading…</p>

    <p v-else class="grid flex-1 place-items-center p-8 text-ink-secondary">
      No figures for this organisation and category.
    </p>
  </DashboardLayout>
</template>
