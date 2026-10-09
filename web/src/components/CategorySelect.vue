<script setup lang="ts">
import { computed, useId } from 'vue'
import { getCategories } from '@/api/client'
import { useDebouncedFetch } from '@/composables/useDebouncedFetch'

// Category dropdown. Once an organisation is picked, it only offers the categories that
// organisation has data for. A short list, so a plain <select> is enough.

const model = defineModel<string>({ required: true })
const props = withDefaults(defineProps<{ orgCode: string | null; label?: string }>(), { label: 'Category' })

const { data, error } = useDebouncedFetch(
  () => ({ org: props.orgCode ?? undefined }),
  getCategories,
  0, // a new organisation isn't typed character by character, so no need to wait
)

// The full list, fetched once, to name a choice missing from this organisation's list.
const { data: allData } = useDebouncedFetch(() => ({}), getCategories, 0)
const nameOf = (code: string) => allData.value?.data.find((c) => c.category_code === code)?.category_name ?? code

const options = computed(() => {
  const list = (data.value?.data ?? []).map((c) => ({ code: c.category_code, label: c.category_name }))
  // A choice from the URL or a previous organisation may not exist for this one: keep it
  // visible (so the select isn't blank) and say so.
  if (data.value && !list.some((o) => o.code === model.value)) {
    list.push({ code: model.value, label: `${nameOf(model.value)} (no data here)` })
  }
  return list
})

const id = useId()
</script>

<template>
  <div class="w-full max-w-xs">
    <label :for="id" class="mb-1 block text-sm font-medium text-field-label">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      class="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink focus:border-series-1 focus:outline-none focus:ring-2 focus:ring-series-1/30"
    >
      <option v-for="o in options" :key="o.code" :value="o.code">{{ o.label }}</option>
    </select>
    <p v-if="error" class="mt-1 text-sm text-bad">Couldn't load categories: {{ error }}</p>
  </div>
</template>
