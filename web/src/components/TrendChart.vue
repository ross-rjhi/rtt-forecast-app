<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import { useChartTheme } from '@/composables/useChartTheme'
import { categoryIndexAt } from '@/utils/chartClick'
import { formatMonth, formatPct } from '@/utils/format'

// Only register the ECharts pieces we use, to keep the download small.
use([SVGRenderer, BarChart, LineChart, GridComponent, MarkLineComponent, TooltipComponent])

// One point per month: a percentage (0-1), plus an optional second tooltip line
// (e.g. "6,500 of 10,000"), worked out by the page.
export interface TrendPoint {
  period: string // "2026-07-01"
  value: number | null
  detail?: string
}

const props = withDefaults(
  defineProps<{
    rows: TrendPoint[] // oldest month first
    name: string // e.g. "within target", shown in the tooltip after the value
    target?: number | null // a reference line, e.g. 0.92; null for none
    targetLabel?: string // defaults to "92% target"
    selected?: string | null // a period ("2026-07-01") to highlight
  }>(),
  { target: null, targetLabel: undefined, selected: null },
)
const emit = defineEmits<{ select: [period: string | null] }>()

// A click anywhere over a month selects it (or clears it if it's already selected).
const chart = ref<InstanceType<typeof VChart>>()
function onClick(event: { offsetX: number; offsetY: number }) {
  const index = categoryIndexAt(chart.value, event.offsetX, event.offsetY)
  const period = index == null ? undefined : props.rows[index]?.period
  if (period) emit('select', period === props.selected ? null : period)
}

const theme = useChartTheme()

// Y-axis limits and gridline step, set together: the limits snap to the step, so ECharts
// never squeezes an extra, colliding label in at either end (e.g. 90% right under 95%).
const axisRange = computed(() => {
  const values = props.rows.map((r) => r.value).filter((v): v is number => v != null)
  if (props.target != null) values.push(props.target)
  const lo = Math.min(...values) - 0.03
  const hi = Math.max(...values) + 0.01
  const interval = hi - lo > 0.4 ? 0.1 : 0.05
  const snap = (n: number) => Math.round(n * 100) / 100 // avoid 0.35000000000000003
  return {
    min: snap(Math.max(0, Math.floor(lo / interval) * interval)),
    max: snap(Math.min(1, Math.ceil(hi / interval) * interval)),
    interval,
  }
})

const option = computed<EChartsOption>(() => {
  const c = theme.value
  const last = props.rows.length - 1
  const axisText = { color: c.muted, fontSize: 12 * c.fontScale }

  return {
    animation: false,
    textStyle: { fontFamily: c.font },
    // Keep these margins and the y-label width the same in every chart stacked with this one,
    // so they line up month for month.
    grid: { left: 8, right: 56, top: 24, bottom: 8 }, // ECharts 6 keeps axis labels inside the chart by default
    xAxis: {
      type: 'category',
      boundaryGap: true, // points at the centre of each month, above the bars below
      data: props.rows.map((r) => formatMonth(r.period)),
      axisLine: { lineStyle: { color: c.axis } },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      // Zoom to the data, but always keep the target in view.
      ...axisRange.value,
      axisLabel: { ...axisText, width: 36 * c.fontScale, align: 'right', formatter: (n: number) => formatPct(n, 0) },
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
        return [
          `<strong>${formatMonth(r.period)}</strong>`,
          `${formatPct(r.value)} ${props.name}`,
          ...(r.detail ? [`<span style="color:${c.secondary}">${r.detail}</span>`] : []),
        ].join('<br>')
      },
    },
    series: [
      // The selected month: a faint full-height bar behind the line, one month wide. (A
      // markArea band has no width on a line chart, where each month is a single point.)
      {
        type: 'bar',
        name: 'Selected month',
        data: props.rows.map((r) => (r.period === props.selected ? axisRange.value.max : null)),
        barWidth: '100%',
        itemStyle: { color: c.series, opacity: 0.1 },
        silent: true,
        tooltip: { show: false },
        z: 0,
      },
      {
        type: 'line',
        name: props.name,
        data: props.rows.map((r, i) => ({
          value: r.value,
          // Marker on the latest month (with its value) and on the selected month.
          symbolSize: i === last || r.period === props.selected ? 9 : 0,
          label: { show: i === last },
        })),
        symbol: 'circle',
        showSymbol: true,
        lineStyle: { width: 2, color: c.series, cap: 'round', join: 'round' },
        itemStyle: { color: c.series, borderColor: c.page, borderWidth: 2 }, // ring in the background colour
        label: { position: 'right', color: c.ink, fontSize: 12 * c.fontScale, fontWeight: 600, formatter: (p) => formatPct(p.value as number) },
        emphasis: { disabled: true },
        markLine:
          props.target == null
            ? undefined
            : {
                silent: true,
                symbol: 'none',
                lineStyle: { color: c.secondary, width: 1, type: 'solid' },
                label: {
                  position: 'insideStartTop',
                  color: c.secondary,
                  fontSize: 12 * c.fontScale,
                  formatter: props.targetLabel ?? `${formatPct(props.target, 0)} target`,
                },
                data: [{ yAxis: props.target }],
              },
      },
    ],
  }
})
</script>

<template>
  <!-- Fills its container: give the parent a height. The height can't go on <VChart> itself:
       vue-echarts sets its own unlayered height: 100%, which beats Tailwind classes. -->
  <div class="h-full w-full">
    <VChart ref="chart" :option="option" autoresize @zr:click="onClick" />
  </div>
</template>
