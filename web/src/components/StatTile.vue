<script setup lang="ts">
import { computed } from 'vue'
import TrendSparkline from './TrendSparkline.vue'

// A value box: a headline figure, an optional change vs an earlier period, and an optional
// sparkline of its recent trend. The change is shown with an arrow and words, not colour
// alone; colour says whether it's good or bad.

const props = defineProps<{
  label: string
  value: string
  change?: { amount: number; text: string; comparedTo: string; higherIsBetter: boolean }
  note?: string // shown beside the label, e.g. "Standard: 92%"
  trend?: { labels: string[]; values: (number | null)[]; format: (n: number) => string }
}>()

const changeClass = computed(() => {
  if (!props.change || props.change.amount === 0) return 'text-ink-secondary'
  const better = props.change.amount > 0 === props.change.higherIsBetter
  return better ? 'text-good' : 'text-bad'
})
const arrow = computed(() => {
  const amount = props.change?.amount ?? 0
  return amount > 0 ? '▲' : amount < 0 ? '▼' : '■'
})
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="min-w-0 shrink-0 self-start">
      <p class="text-sm whitespace-nowrap text-ink-secondary">
        {{ label }}<span v-if="note" class="text-ink-muted"> · {{ note }}</span>
      </p>
      <p class="mt-1 text-3xl font-semibold">{{ value }}</p>
      <p v-if="change" class="mt-1 text-sm whitespace-nowrap" :class="changeClass">
        <span aria-hidden="true">{{ arrow }}</span> {{ change.text }}
        <span class="text-ink-secondary">vs {{ change.comparedTo }}</span>
      </p>
    </div>
    <div v-if="trend" class="h-16 min-w-0 flex-1">
      <TrendSparkline :name="label" v-bind="trend" />
    </div>
  </div>
</template>
