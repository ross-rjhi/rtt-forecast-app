<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/utils/format'

// A number with a small arrow for its change from the previous row (e.g. last month).
// Green = better, red = worse; hover or a screen reader gets the change in words.

const props = defineProps<{
  value: number
  previous?: number
  comparedTo?: string // e.g. "Jun 2026"
  higherIsBetter: boolean
}>()

const change = computed(() => (props.previous == null ? null : props.value - props.previous))
const description = computed(() => {
  if (change.value == null) return undefined
  if (change.value === 0) return `No change from ${props.comparedTo}`
  const sign = change.value > 0 ? '+' : '−'
  return `${sign}${formatNumber(Math.abs(change.value))} from ${props.comparedTo}`
})
const colour = computed(() => {
  if (!change.value) return 'text-ink-muted'
  return change.value > 0 === props.higherIsBetter ? 'text-good' : 'text-bad'
})
</script>

<template>
  <!-- `relative` plus top-0 left-0 keep the screen-reader text inside the cell: otherwise it sits
       just past the table's right edge in the last column, and the table gets a horizontal scrollbar. -->
  <span class="relative inline-flex items-center justify-end gap-1.5" :title="description">
    {{ formatNumber(value) }}
    <span class="w-2.5 text-[10px]" :class="colour" aria-hidden="true">
      {{ change == null ? '' : change > 0 ? '▲' : change < 0 ? '▼' : '■' }}
    </span>
    <span v-if="description" class="sr-only top-0 left-0">({{ description }})</span>
  </span>
</template>
