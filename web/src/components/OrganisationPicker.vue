<script lang="ts">
import { getOrganisations, type Organisation } from '@/api/client'

// The organisation list is the same for every picker, so load it once per visit and share it
// (the collapsed sidebar creates a fresh picker each time its panel opens).
let organisationsRequest: Promise<Organisation[]> | null = null
function loadOrganisations() {
  organisationsRequest ??= getOrganisations().then(
    (r) => r.data,
    (e) => {
      organisationsRequest = null // let the next picker retry
      throw e
    },
  )
  return organisationsRequest
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'

// Searchable organisation picker (an accessible "combobox"). Loads the list once and filters
// it in the browser as you type - quicker than asking the API on every key. Options are
// grouped under their parent (e.g. a Trust's ICB).

const model = defineModel<string | null>({ required: true })
withDefaults(defineProps<{ label?: string; placeholder?: string }>(), {
  label: 'Organisation',
  placeholder: 'Search by name or code',
})

const organisations = ref<Organisation[]>([])
const loadError = ref<string | null>(null)

const input = ref<HTMLInputElement>()
const typed = ref(false) // has the user typed since this picker appeared?

onMounted(async () => {
  try {
    organisations.value = await loadOrganisations()
    // Show the selected organisation's name - unless the user has already started typing.
    // If the box has focus, select the name so typing replaces it.
    if (model.value && !typed.value) {
      syncText()
      if (document.activeElement === input.value) {
        await nextTick()
        input.value?.select()
      }
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  }
})

const id = useId()
const listId = `${id}-list`
const text = ref('')
const open = ref(false)
const active = ref(0) // index of the highlighted option

const selected = computed(() => organisations.value.find((o) => o.org_code === model.value))
function syncText() {
  text.value = selected.value ? selected.value.org_name : ''
}
watch(model, syncText)

const MAX_OPTIONS = 100

// Grouped by parent (A-Z), then A-Z by name within each group.
const options = computed(() => {
  const q = text.value.trim().toLowerCase()
  const showAll = !q || (selected.value && text.value === selected.value.org_name)
  const matches = showAll
    ? organisations.value
    : organisations.value.filter((o) => o.org_name.toLowerCase().includes(q) || o.org_code.toLowerCase().includes(q))
  return [...matches]
    .sort((a, b) => (a.parent_name ?? '').localeCompare(b.parent_name ?? '') || a.org_name.localeCompare(b.org_name))
    .slice(0, MAX_OPTIONS)
})
// A group heading goes before the first option of each parent.
const startsGroup = (i: number) => i === 0 || options.value[i]!.parent_name !== options.value[i - 1]!.parent_name

watch(options, () => (active.value = 0))

function choose(o: Organisation) {
  model.value = o.org_code
  text.value = o.org_name
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  const count = options.value.length
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!open.value) {
      open.value = true
      return
    }
    active.value = (active.value + (e.key === 'ArrowDown' ? 1 : count - 1)) % Math.max(count, 1)
    document.getElementById(`${id}-opt-${active.value}`)?.scrollIntoView({ block: 'nearest' })
  } else if (e.key === 'Enter' && open.value && options.value[active.value]) {
    e.preventDefault()
    choose(options.value[active.value]!)
  } else if (e.key === 'Escape') {
    open.value = false
    syncText()
  }
}

// Select the text on focus, so typing replaces it. Wait for Vue to finish updating the box
// first: it may be filling in the name at this very moment (e.g. in a panel that has just
// opened), and selecting before that would select nothing.
async function onFocus() {
  open.value = true
  await nextTick()
  if (document.activeElement === input.value) input.value?.select()
}

function onBlur() {
  // Delay so a click on an option registers before the list closes.
  setTimeout(() => {
    open.value = false
    syncText()
  }, 150)
}
</script>

<template>
  <div class="relative w-full max-w-md">
    <label :for="id" class="mb-1 block text-sm font-medium text-field-label">{{ label }}</label>
    <input
      :id="id"
      ref="input"
      v-model="text"
      type="text"
      role="combobox"
      autocomplete="off"
      :placeholder="placeholder"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && options.length ? `${id}-opt-${active}` : undefined"
      class="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:border-series-1 focus:outline-none focus:ring-2 focus:ring-series-1/30"
      @focus="onFocus"
      @input="open = true; typed = true"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <p v-if="loadError" class="mt-1 text-sm text-bad">Couldn't load organisations: {{ loadError }}</p>

    <ul
      v-show="open"
      :id="listId"
      role="listbox"
      class="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-md border border-line bg-surface py-1 text-ink shadow-lg"
    >
      <li v-if="!options.length" class="px-3 py-2 text-sm text-ink-muted">No matching organisations</li>
      <template v-for="(o, i) in options" :key="o.org_code">
        <li
          v-if="startsGroup(i) && o.parent_name"
          role="presentation"
          class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted"
        >
          {{ o.parent_name }}
        </li>
        <li
          :id="`${id}-opt-${i}`"
          role="option"
          :aria-selected="o.org_code === model"
          class="flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5 text-sm"
          :class="i === active ? 'bg-series-1/10' : ''"
          @mousedown.prevent="choose(o)"
          @mousemove="active = i"
        >
          <span :class="o.org_code === model ? 'font-semibold' : ''">{{ o.org_name }}</span>
          <span class="shrink-0 text-xs text-ink-muted">{{ o.org_code }}</span>
        </li>
      </template>
    </ul>
  </div>
</template>
