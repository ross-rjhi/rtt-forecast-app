<script setup lang="ts">
import DashboardLayout from '@/components/DashboardLayout.vue'
import { useFiltersInUrl } from '@/composables/useFiltersInUrl'

// An example sub-page (see `pages` in src/sections.ts): its own file and route, shown as a
// second row of tabs under the navbar.
useFiltersInUrl()
</script>

<template>
  <DashboardLayout title="Example dashboard" subtitle="Made-up data, for the template">
    <header>
      <h2 class="text-xl font-semibold">Detail</h2>
      <p class="text-sm text-ink-secondary">An example sub-page.</p>
    </header>
  </DashboardLayout>
</template>
