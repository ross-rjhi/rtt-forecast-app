import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { DEFAULT_SECTION } from '@/sections'

// Routes are generated from the files in src/pages/, plus "/" -> the default section.
// The redirect keeps the query, so links like /?org=A01 still open that organisation.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', redirect: (to) => ({ path: DEFAULT_SECTION, query: to.query, hash: to.hash }) }, ...routes],
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
