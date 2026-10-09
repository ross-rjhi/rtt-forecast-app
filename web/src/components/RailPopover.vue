<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

// An icon button for the collapsed sidebar that opens a small panel holding a filter
// control. The panel opens beside the strip (below it on phones), puts the cursor in the
// control, and closes on Escape, a click elsewhere, or when the slot calls `close`
// (e.g. once a choice is made).

defineProps<{
  label: string // e.g. "Organisation"
  summary: string // current choice, for the tooltip, e.g. "Ashdown Health Services"
  active?: boolean // show a dot: this filter is set
}>()

const open = ref(false)
const root = ref<HTMLElement>()
const button = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const id = useId()

function close() {
  open.value = false
}

function onPointerDown(e: PointerEvent) {
  if (!root.value?.contains(e.target as Node)) close()
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    button.value?.focus()
  }
}
function removeListeners() {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
}

watch(open, async (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input, select, button')?.focus()
  } else {
    removeListeners()
  }
})
onBeforeUnmount(removeListeners)
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="button"
      type="button"
      class="relative rounded-md p-1.5 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
      :class="open ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/15 hover:text-white'"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="`${label}: ${summary}`"
      :title="`${label}: ${summary}`"
      @click="open = !open"
    >
      <slot name="icon" />
      <span v-if="active" class="absolute top-1 right-1 size-1.5 rounded-full bg-white" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      :id="id"
      ref="panel"
      role="dialog"
      :aria-label="label"
      class="absolute top-full left-0 z-50 mt-2 w-80 rounded-lg border border-line bg-surface p-3 text-ink shadow-lg [--color-field-label:var(--color-ink-secondary)] md:top-0 md:left-full md:mt-0 md:ml-3"
    >
      <slot :close="close" />
    </div>
  </div>
</template>
