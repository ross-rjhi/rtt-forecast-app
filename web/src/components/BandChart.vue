<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import { useChartTheme } from '@/composables/useChartTheme'
import { categoryIndexAt } from '@/utils/chartClick'
import { formatMonth, formatNumber } from '@/utils/format'

use([SVGRenderer, BarChart, GridComponent, LegendComponent, TooltipComponent])

// A total per month, stacked into ordered bands (e.g. under 4 weeks, 4-12, over 12). The bands
// are ordered, so they're shades of one colour (--color-band-* in main.css), stepping towards
// the most important. Up to three bands; add more --color-band-* tokens for more.

export interface BandRow {
  period: string // "2026-07-01"
  values: number[] // one per band, bottom of the stack first
}

const props = withDefaults(
  defineProps<{
    rows: BandRow[] // oldest month first
    bands: string[] // band names, bottom of the stack first
    selected?: string | null // a period ("2026-07-01") to highlight
  }>(),
  { selected: null },
)
const emit = defineEmits<{ select: [period: string | null] }>()

// The y-axis top: the largest total rounded up to a round number (8,281 -> 10,000). Set here,
// not left to ECharts, so the selected-month highlight below can reach exactly to the top.
const axisMax = computed(() => {
  const max = Math.max(1, ...props.rows.map((r) => r.values.reduce((sum, v) => sum + v, 0)))
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((n) => n >= max)!
})

// A click anywhere over a month selects it (or clears it if it's already selected).
const chart = ref<InstanceType<typeof VChart>>()
function onClick(event: { offsetX: number; offsetY: number }) {
  const index = categoryIndexAt(chart.value, event.offsetX, event.offsetY)
  const period = index == null ? undefined : props.rows[index]?.period
  if (period) emit('select', period === props.selected ? null : period)
}

const theme = useChartTheme()

const option = computed<EChartsOption>(() => {
  const c = theme.value
  const axisText = { color: c.muted, fontSize: 12 * c.fontScale }
  const top = props.bands.length - 1

  return {
    animation: false,
    textStyle: { fontFamily: c.font },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 12 * c.fontScale,
      itemHeight: 12 * c.fontScale,
      itemGap: 16 * c.fontScale,
      icon: 'roundRect',
      textStyle: { color: c.secondary, fontSize: 12 * c.fontScale },
      selectedMode: false, // clicking a band away would make the stack misleading
      data: props.bands, // leaves the highlight series out of the legend
    },
    // Same margins and y-label width as TrendChart, so stacked charts line up month for month.
    grid: { left: 8, right: 56, top: 32, bottom: 8 },
    xAxis: [
      {
        type: 'category',
        data: props.rows.map((r) => formatMonth(r.period)),
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: { ...axisText, hideOverlap: true },
      },
      // A hidden copy of the months, for the highlight series: on its own axis, it can be a full
      // month wide without squeezing the stacked bars beside it.
      { type: 'category', data: props.rows.map((r) => formatMonth(r.period)), show: false },
    ],
    yAxis: {
      type: 'value',
      max: axisMax.value,
      axisLabel: {
        ...axisText,
        width: 36 * c.fontScale,
        align: 'right',
        // 88,602 -> 89K, to keep the axis narrow
        formatter: (n: number) => (n >= 1000 ? `${formatNumber(Math.round(n / 1000))}K` : formatNumber(n)),
      },
      splitLine: { lineStyle: { color: c.line, width: 1 } },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: c.axis } },
      backgroundColor: c.surface,
      borderColor: c.line,
      textStyle: { color: c.ink, fontSize: 13 * c.fontScale, fontFamily: c.font },
      formatter: (params) => {
        const i = (Array.isArray(params) ? params[0] : params)!.dataIndex
        const r = props.rows[i]!
        const swatch = (color: string) =>
          `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:${color}"></span>`
        // Top band first, matching the stack from the top down.
        const lines = props.bands
          .map((name, k) => `${swatch(c.bands[k]!)}${name}: <strong>${formatNumber(r.values[k] ?? 0)}</strong>`)
          .reverse()
        const total = r.values.reduce((sum, v) => sum + v, 0)
        return [`<strong>${formatMonth(r.period)}</strong>`, ...lines, `Total: <strong>${formatNumber(total)}</strong>`].join('<br>')
      },
    },
    series: [
      // The selected month: a faint full-height bar behind the stack, one month wide. (A markArea
      // from a month to the same month has no width.)
      {
        type: 'bar' as const,
        name: 'Selected month',
        xAxisIndex: 1,
        data: props.rows.map((r) => (r.period === props.selected ? axisMax.value : null)),
        barWidth: '100%',
        itemStyle: { color: c.series, opacity: 0.1 },
        silent: true,
        tooltip: { show: false },
        z: 0,
      },
      ...props.bands.map((name, k) => ({
        type: 'bar' as const,
        name,
        stack: 'total',
        data: props.rows.map((r) => r.values[k] ?? 0),
        barMaxWidth: 24,
        itemStyle: {
          color: c.bands[k],
          // A thin gap in the background colour between stacked segments; rounded top only.
          borderColor: c.page,
          borderWidth: 1,
          borderRadius: k === top ? [4, 4, 0, 0] : 0,
        },
        emphasis: { disabled: true },
      })),
    ],
  }
})
</script>

<template>
  <!-- Fills its container: give the parent a height (see TrendChart.vue for why). -->
  <div class="h-full w-full">
    <VChart ref="chart" :option="option" autoresize @zr:click="onClick" />
  </div>
</template>
