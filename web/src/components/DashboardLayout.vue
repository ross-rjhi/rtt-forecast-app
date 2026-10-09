<script setup lang="ts">
import { ref, watch } from 'vue'
import AppNavbar from './AppNavbar.vue'

// Dashboard: a collapsible sidebar (title, inputs, footnote) and a main area. When collapsed,
// the sidebar becomes a slim strip showing the `rail` slot (icon buttons for the filters).
// On medium screens and up it fills the screen exactly, and the main area's content
// flexes to fit. On phones the sidebar sits on top and the page scrolls.
// Shiny analogy: bslib::page_sidebar(sidebar = sidebar(open = ...)).

defineProps<{ title: string; subtitle?: string }>()

// Collapsed by default; a viewer who opens it is remembered per browser. Storage can be
// unavailable (private windows), so fall back to collapsed. (The key changed when the
// default did, so earlier "open" choices don't carry over.)
const STORAGE_KEY = 'app.sidebar'
function readOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'open'
  } catch {
    return false
  }
}
const open = ref(readOpen())
watch(open, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'open' : 'collapsed')
  } catch {
    // not saved; fine
  }
})
</script>

<template>
  <!-- The sidebar runs the full height; the navbar sits above the main area, beside it. -->
  <div class="flex flex-1 flex-col md:min-h-0 md:flex-row md:overflow-hidden">
    <aside
      class="flex shrink-0 flex-col bg-sidebar text-white transition-[width] duration-200 [--color-field-label:rgb(255_255_255/0.85)]"
      :class="open ? 'md:w-72' : 'md:w-14'"
    >
      <div class="flex gap-2 p-4" :class="open ? 'items-start justify-between' : 'items-center md:flex-col md:px-2'">
        <div v-show="open" class="min-w-0">
          <h1 class="text-lg leading-tight font-semibold">{{ title }}</h1>
          <p v-if="subtitle" class="mt-0.5 text-sm text-white/80">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md p-1.5 text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          :aria-expanded="open"
          aria-controls="sidebar-content"
          :aria-label="open ? 'Hide filters' : 'Show filters'"
          :title="open ? 'Hide filters' : 'Show filters'"
          @click="open = !open"
        >
          <!-- Panel icon: a window with a left column -->
          <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
            <path d="M7.75 3.75v12.5" />
            <path v-if="open" d="M13.5 8 11.5 10l2 2" stroke-linecap="round" stroke-linejoin="round" />
            <path v-else d="M11.5 8l2 2-2 2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- Collapsed: the page's filters as icon buttons (see RailPopover.vue), so they stay usable. -->
        <template v-if="!open">
          <div class="h-5 w-px bg-white/25 md:h-px md:w-6" aria-hidden="true" />
          <slot name="rail" />
        </template>
      </div>

      <div v-show="open" id="sidebar-content" class="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 md:w-72">
        <slot name="sidebar" />
        <div class="mt-auto">
          <slot name="sidebar-footer" />
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col md:min-h-0">
      <AppNavbar />
      <main class="flex min-w-0 flex-1 flex-col p-4 md:min-h-0 md:overflow-hidden md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
