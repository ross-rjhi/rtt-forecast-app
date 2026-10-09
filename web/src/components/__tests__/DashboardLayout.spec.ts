import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardLayout from '../DashboardLayout.vue'

function mountLayout() {
  return mount(DashboardLayout, {
    props: { title: 'Example dashboard' },
    slots: {
      sidebar: '<p id="filters">filters</p>',
      rail: '<button id="rail-icon">icon</button>',
      default: '<p>page</p>',
    },
    global: { stubs: { AppNavbar: true } }, // needs a router; tested on its own
  })
}
const toggle = (w: ReturnType<typeof mountLayout>) => w.find('[aria-controls="sidebar-content"]')
const sidebarShown = (w: ReturnType<typeof mountLayout>) =>
  (w.find('#sidebar-content').element as HTMLElement).style.display !== 'none'

describe('DashboardLayout', () => {
  afterEach(() => localStorage.clear())

  it('starts collapsed, showing the filter icons instead of the sidebar', () => {
    const wrapper = mountLayout()
    expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
    expect(sidebarShown(wrapper)).toBe(false)
    expect(wrapper.find('#rail-icon').exists()).toBe(true)
  })

  it('opens on the toggle, hiding the icons, and remembers that', async () => {
    const wrapper = mountLayout()
    await toggle(wrapper).trigger('click')
    expect(sidebarShown(wrapper)).toBe(true)
    expect(wrapper.find('#rail-icon').exists()).toBe(false)
    expect(localStorage.getItem('app.sidebar')).toBe('open')

    expect(sidebarShown(mountLayout())).toBe(true) // a later visit
  })
})
