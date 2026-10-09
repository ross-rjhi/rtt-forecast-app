<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { SECTIONS, sectionFor } from '@/sections'
import BrandMark from './BrandMark.vue'

// Top navigation between sections. Links keep the current query (e.g. the chosen organisation),
// so switching section and coming back doesn't lose your filters.
// Shiny analogy: bslib::page_navbar() with nav_panel()s.

const route = useRoute()
// The section you're in, including its sub-pages (e.g. /overview/detail is in Overview).
const current = computed(() => sectionFor(route.path))

// The sub-pages hang from the active section: a short grey stem drops from its button in the pill
// to a smaller capsule. The stem sits under the button; the capsule centres on it but stays within
// the pill's width. Measured after layout, and again when the pill resizes (window, fonts) or the
// route changes. Until measured, the capsule is simply centred.
const sectionsNav = useTemplateRef<HTMLElement>('sectionsNav')
const subNav = useTemplateRef<HTMLElement>('subNav')
const stemX = ref<number | null>(null)
const capsuleX = ref(0)
function place() {
  const nav = sectionsNav.value
  const sub = subNav.value
  const link = nav?.querySelector<HTMLElement>('[aria-current]')
  if (!nav || !sub || !link) {
    stemX.value = null
    return
  }
  const navBox = nav.getBoundingClientRect()
  const linkBox = link.getBoundingClientRect()
  const centre = linkBox.left + linkBox.width / 2 - navBox.left
  const width = sub.offsetWidth
  stemX.value = Math.round(centre)
  capsuleX.value = Math.round(Math.min(Math.max(centre - width / 2, 0), Math.max(navBox.width - width, 0)))
}
let observer: ResizeObserver | undefined
onMounted(() => {
  place()
  if (typeof ResizeObserver !== 'undefined' && sectionsNav.value) {
    observer = new ResizeObserver(place)
    observer.observe(sectionsNav.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => route.path, () => nextTick(place))
</script>

<template>
  <!-- Transparent bar: the background shows through. From medium screens, three columns: an empty
       left one, the sections pill in the middle (so it stays centred), and the brand on the right.
       On phones there's no room to centre, so the pill takes the width beside the brand mark.
       @container: the brand's words show or hide by the bar's own width (see below). -->
  <header
    class="@container grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-1 md:grid-cols-[1fr_minmax(0,36rem)_1fr] md:gap-4"
  >
    <nav
      ref="sectionsNav"
      aria-label="Sections"
      class="col-start-1 flex w-full overflow-x-auto rounded-full border border-line bg-ink/5 p-0.5 backdrop-blur-sm md:col-start-2"
    >
      <RouterLink
        v-for="s in SECTIONS"
        :key="s.path"
        :to="{ path: s.path, query: route.query }"
        :title="s.ready ? s.title : `${s.title} (coming soon)`"
        class="flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap transition-colors sm:gap-1.5 sm:px-4 pointer-coarse:py-1.5"
        :aria-current="route.path === s.path ? 'page' : current === s ? 'true' : undefined"
        :class="
          current === s
            ? 'bg-surface font-medium text-ink shadow-sm'
            : 'text-ink-secondary hover:bg-ink/5 hover:text-ink'
        "
      >
        {{ s.label }}
        <span v-if="!s.ready" class="rounded-full bg-line px-1.5 py-px text-[10px] font-medium tracking-wide text-ink-secondary uppercase">
          soon
        </span>
      </RouterLink>
    </nav>

    <!-- The current section's sub-pages, if it has any: a smaller capsule hanging from the active
         section by a short grey stem. -mt-4 cancels the grid's row gap, so the stem meets the pill. -->
    <div v-if="current?.pages" class="relative col-start-1 row-start-2 -mt-3 h-8 md:col-start-2 md:-mt-4 pointer-coarse:h-11">
      <span
        aria-hidden="true"
        class="absolute top-0 h-2 w-px bg-line"
        :style="stemX == null ? { left: '50%' } : { left: `${stemX}px` }"
      />
      <nav
        ref="subNav"
        :aria-label="`${current.label} pages`"
        class="absolute top-2 flex rounded-full border border-line bg-ink/5 p-0.5 text-xs whitespace-nowrap backdrop-blur-sm"
        :style="stemX == null ? { left: '50%', transform: 'translateX(-50%)' } : { left: `${capsuleX}px` }"
      >
        <RouterLink
          v-for="p in current.pages"
          :key="p.path"
          :to="{ path: p.path, query: route.query }"
          :aria-current="route.path === p.path ? 'page' : undefined"
          class="rounded-full px-3 py-px transition-colors pointer-coarse:px-4 pointer-coarse:py-1.5"
          :class="
            route.path === p.path
              ? 'bg-surface font-medium text-ink shadow-sm'
              : 'text-ink-secondary hover:bg-ink/5 hover:text-ink'
          "
        >
          {{ p.label }}
        </RouterLink>
      </nav>
    </div>

    <!-- Brand, right-aligned. The words show only when the bar has room for them beside the
         centred pill (80rem), otherwise just the mark: it depends on the sidebar as well as the
         screen, so it's a container query, not a screen-width one. -->
    <p class="col-start-2 row-start-1 flex items-center justify-self-end gap-2 text-sm whitespace-nowrap md:col-start-3">
      <BrandMark class="size-6 shrink-0" />
      <span class="sr-only @7xl:not-sr-only @7xl:whitespace-nowrap">
        <span class="font-medium text-ink">Ross Johnson</span>
        <!-- Real spaces (not margins), so screen readers don't run the two names together -->
        <span class="text-ink-muted">&nbsp;|&nbsp;</span>
        <span class="text-ink-secondary">RJ Health Informatics Ltd.</span>
      </span>
    </p>
  </header>
</template>
