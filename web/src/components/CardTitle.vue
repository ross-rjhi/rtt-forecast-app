<script setup lang="ts">
// One-line card heading: "Title | detail", with the detail lighter.
// e.g. Within target | % of the total, Aug 2024 to Jul 2026
defineProps<{ title: string; detail?: string }>()
</script>

<template>
  <!-- min-w-0: in a row with a button (e.g. Download), the title wraps rather than pushing it off screen -->
  <p class="min-w-0 leading-snug">
    <span class="font-semibold text-ink">{{ title }}</span>
    <template v-if="detail">
      <!-- Real spaces (not margins), so screen readers don't run the two parts together -->
      <span class="text-ink-muted">&nbsp;|&nbsp;</span>
      <span class="text-ink-secondary">{{ detail }}</span>
    </template>
  </p>
</template>
