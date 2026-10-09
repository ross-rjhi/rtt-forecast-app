<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import { useChartTheme } from '@/composables/useChartTheme'

use([SVGRenderer, LineChart, GridComponent, TooltipComponent])

// A small trend line for a value box: no axes, a dot on the latest point, and the
// month and value on hover. Scaled to its own data range, so it shows shape, not size.

const props = defineProps<{
  labels: string[] // e.g. months, oldest first
  values: (number | null)[]
  format: (n: number) => string
  name: string // for the tooltip and screen readers, e.g. "Waiting list"
}>()

const theme = useChartTheme()

const option = computed<EChartsOption>(() => {
  const c = theme.value
  const last = props.values.length - 1
  return {
    animation: false,
    textStyle: { fontFamily: c.font },
    grid: { left: 4, right: 6, top: 6, bottom: 6 },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: props.labels },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', lineStyle: { color: c.axis } },
      backgroundColor: c.surface,
      borderColor: c.line,
      textStyle: { color: c.ink, fontSize: 12 * c.fontScale, fontFamily: c.font },
      formatter: (params) => {
        const p = (Array.isArray(params) ? params[0] : params)!
        const v = props.values[p.dataIndex]
        return `${props.labels[p.dataIndex]}<br><strong>${v == null ? '–' : props.format(v)}</strong>`
      },
    },
    series: [
      {
        type: 'line',
        name: props.name,
        data: props.values.map((value, i) => ({ value, symbolSize: i === last ? 8 : 0 })),
        symbol: 'circle',
        showSymbol: true,
        lineStyle: { width: 2, color: c.series, cap: 'round', join: 'round' },
        itemStyle: { color: c.series, borderColor: c.page, borderWidth: 2 },
        areaStyle: { color: c.series, opacity: 0.1 },
        emphasis: { disabled: true },
      },
    ],
  }
})
</script>

<template>
  <div class="h-full w-full" role="img" :aria-label="`${name}, trend from ${labels[0]} to ${labels[labels.length - 1]}`">
    <VChart :option="option" autoresize />
  </div>
</template>
