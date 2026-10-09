<script setup lang="ts">
import { ref } from 'vue'

// A small "Download .xlsx" button, like Shiny's downloadButton(). The parent passes the
// function that builds and saves the file; the button shows it's busy meanwhile and
// reports a failure instead of failing silently.
const props = withDefaults(defineProps<{ download: () => Promise<void>; label?: string }>(), {
  label: 'Download .xlsx',
})

const busy = ref(false)
const failed = ref(false)

async function run() {
  if (busy.value) return
  busy.value = true
  failed.value = false
  try {
    await props.download()
  } catch (err) {
    console.error(err)
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-2">
    <span v-if="failed" role="alert" class="text-xs text-bad">Download failed</span>
    <button
      type="button"
      class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs pointer-coarse:px-2.5 pointer-coarse:py-1.5 text-ink-secondary hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-series-1/40 focus-visible:outline-none disabled:opacity-60"
      :disabled="busy"
      :aria-busy="busy"
      @click="run"
    >
      <!-- Download: an arrow into a tray -->
      <svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M2.75 11.5v1.75h10.5V11.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ busy ? 'Preparing…' : label }}
    </button>
  </span>
</template>
