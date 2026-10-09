<script setup lang="ts">
import { formatPct } from '@/utils/format'

// A percentage with a small bar (like reactable's data bars) and a tick at the target,
// so how far each value is from the standard shows at a glance.

withDefaults(defineProps<{ value: number | null; target?: number }>(), { target: 0.92 })
</script>

<template>
  <span class="inline-flex items-center justify-end gap-2">
    {{ formatPct(value) }}
    <span class="relative h-1.5 w-16 rounded-full bg-line" aria-hidden="true">
      <span class="absolute inset-y-0 left-0 rounded-full bg-series-1" :style="{ width: `${(value ?? 0) * 100}%` }" />
      <span class="absolute -inset-y-0.5 w-px bg-ink" :style="{ left: `${target * 100}%` }" />
    </span>
  </span>
</template>
