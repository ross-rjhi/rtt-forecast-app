<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SECTIONS } from '@/sections'
import AppNavbar from './AppNavbar.vue'

// Placeholder page for a section that isn't built yet. It takes its name from sections.ts.

const route = useRoute()
const section = computed(() => SECTIONS.find((s) => s.path === route.path))
</script>

<template>
  <AppNavbar />
  <main class="grid flex-1 place-items-center p-8 text-center">
    <div>
      <h1 class="text-xl font-semibold">{{ section?.title }}</h1>
      <p class="mt-2 text-ink-secondary">Coming soon.</p>
    </div>
  </main>
</template>
