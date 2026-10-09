import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RailPopover from '../RailPopover.vue'

function mountPopover() {
  return mount(RailPopover, {
    props: { label: 'Organisation', summary: 'Ashdown Health Services', active: true },
    slots: {
      icon: '<svg />',
      default: `<template #default="{ close }"><input id="picker" /><button id="choose" @click="close">Choose</button></template>`,
    },
    attachTo: document.body, // needed for focus and outside clicks
  })
}

describe('RailPopover', () => {
  let wrapper: ReturnType<typeof mountPopover>
  afterEach(() => wrapper.unmount())

  const panel = () => wrapper.find('[role="dialog"]')

  it('describes the current choice on the button', () => {
    wrapper = mountPopover()
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBe('Organisation: Ashdown Health Services')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(panel().exists()).toBe(false)
  })

  it('opens with the cursor in the control', async () => {
    wrapper = mountPopover()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(panel().exists()).toBe(true)
    expect(document.activeElement?.id).toBe('picker')
  })

  it('closes on Escape, on a click elsewhere, and when a choice is made', async () => {
    wrapper = mountPopover()
    const open = async () => {
      await wrapper.find('button').trigger('click')
      await flushPromises()
      expect(panel().exists()).toBe(true)
    }

    await open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(panel().exists()).toBe(false)

    await open()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(panel().exists()).toBe(false)

    await open()
    await wrapper.find('#choose').trigger('click')
    expect(panel().exists()).toBe(false)
  })
})
