import { describe, expect, it, vi } from 'vitest'
import router from '../index'

// The test runner has a partial hot-reload object, enough to trigger the router's
// hot-reload hook but not for it to work. Hot reload is irrelevant here, so switch it off.
vi.mock('vue-router/auto-routes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router/auto-routes')>()),
  handleHotUpdate: () => {},
}))

describe('router', () => {
  it('sends "/" to the default section, keeping the query so shared links still work', async () => {
    await router.push('/?org=A01')
    expect(router.currentRoute.value.path).toBe('/overview')
    expect(router.currentRoute.value.query).toEqual({ org: 'A01' })
  })

  it('has a page for every section', () => {
    const paths = router.getRoutes().map((r) => r.path)
    expect(paths).toEqual(expect.arrayContaining(['/overview', '/reports', '/settings']))
  })

  it('has a page for every sub-page, as its own route (not nested in the section page)', () => {
    expect(router.getRoutes().find((r) => r.path === '/overview/detail')).toBeDefined()
    expect(router.getRoutes().find((r) => r.path === '/overview')!.children).toHaveLength(0)
  })
})
