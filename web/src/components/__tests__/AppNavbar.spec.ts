import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNavbar from '../AppNavbar.vue'
import { SECTIONS } from '@/sections'

// Link text as it reads on screen (the badge adds a line break in the markup).
const text = (el: { text: () => string }) => el.text().replace(/\s+/g, ' ')

async function mountAt(path: string) {
  const Empty = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [...SECTIONS.map((s) => ({ path: s.path, component: Empty })), { path: '/overview/detail', component: Empty }],
  })
  await router.push(path)
  await router.isReady()
  return mount(AppNavbar, { global: { plugins: [router] } })
}

describe('AppNavbar', () => {
  it('lists the sections in order, marking placeholders as coming soon', async () => {
    const wrapper = await mountAt('/overview')
    const links = wrapper.findAll('nav[aria-label="Sections"] a')
    expect(links.map(text)).toEqual(['Overview', 'Reports soon', 'Settings soon'])
  })

  it('highlights the current section', async () => {
    const wrapper = await mountAt('/reports')
    const current = wrapper.findAll('nav a').filter((a) => a.attributes('aria-current') === 'page')
    expect(current.map(text)).toEqual(['Reports soon'])
  })

  it("shows a section's sub-pages under the navbar, only while you're in it", async () => {
    const subPages = (w: Awaited<ReturnType<typeof mountAt>>) => w.find('nav[aria-label="Overview pages"]')

    const dashboard = await mountAt('/overview?org=A01')
    expect(subPages(dashboard).findAll('a').map(text)).toEqual(['Dashboard', 'Detail'])
    expect(subPages(dashboard).find('[aria-current="page"]').text()).toBe('Dashboard')
    expect(subPages(dashboard).findAll('a')[1]!.attributes('href')).toBe('/overview/detail?org=A01')

    // On a sub-page, the section stays highlighted and the sub-page is the current page.
    const detail = await mountAt('/overview/detail')
    expect(detail.find('nav[aria-label="Sections"] [aria-current="true"]').text()).toBe('Overview')
    expect(subPages(detail).find('[aria-current="page"]').text()).toBe('Detail')

    expect(subPages(await mountAt('/reports')).exists()).toBe(false)
  })

  it('shows the brand: Ross Johnson | RJ Health Informatics Ltd.', async () => {
    const wrapper = await mountAt('/overview')
    const brand = wrapper.find('header > p')
    expect(brand.find('svg').exists()).toBe(true)
    expect(text(brand)).toBe('Ross Johnson | RJ Health Informatics Ltd.')
  })

  it('keeps the chosen filters in every link', async () => {
    const wrapper = await mountAt('/overview?org=A01&category=MED')
    const hrefs = wrapper.findAll('nav[aria-label="Sections"] a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual([
      '/overview?org=A01&category=MED',
      '/reports?org=A01&category=MED',
      '/settings?org=A01&category=MED',
    ])
  })
})
