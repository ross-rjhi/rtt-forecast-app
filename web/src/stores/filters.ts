import { ref } from 'vue'
import { defineStore } from 'pinia'

// The user's current filter choices, shared by every component on the page.
// Shiny analogy: the `input$...` values - components read them, and the data
// composable re-queries the API whenever they change.
export const useFiltersStore = defineStore('filters', () => {
  const orgCode = ref<string | null>(null)
  const category = ref('ALL') // ALL = all categories
  const from = ref<string | undefined>(undefined) // YYYY-MM; undefined = earliest available
  const to = ref<string | undefined>(undefined)

  function $reset() {
    orgCode.value = null
    category.value = 'ALL'
    from.value = undefined
    to.value = undefined
  }

  return { orgCode, category, from, to, $reset }
})
