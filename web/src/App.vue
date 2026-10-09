<script setup lang="ts">
import SpotlightBackground from './components/SpotlightBackground.vue'
</script>

<template>
  <SpotlightBackground />
  <!-- One screen high from medium screens up. Each page provides its own layout, including
       where the navbar goes (e.g. components/DashboardLayout.vue puts it beside the sidebar). -->
  <div class="flex min-h-dvh flex-col md:h-dvh">
    <RouterView />
  </div>
</template>
