// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import BottomNav from '@/components/navigation/BottomNav.vue'

describe('ChatHeader & BottomNav', () => {
  it('ChatHeader renders token PF and emits events', async () => {
    const wrapper = mount(ChatHeader, {
      props: { roomName: 'Private Friends', memberCount: 4 },
    })
    expect(wrapper.find('.token').text()).toBe('PF')
    expect(wrapper.text()).toContain('Private Friends')
    expect(wrapper.text()).toContain('4 thành viên')

    await wrapper.find('.group-button').trigger('click')
    expect(wrapper.emitted('open-group')).toBeTruthy()

    await wrapper.find('#themeButton').trigger('click')
    expect(wrapper.emitted('toggle-theme')).toBeTruthy()
  })

  it('BottomNav highlights active tab and emits navigate', async () => {
    const wrapper = mount(BottomNav, { props: { activeTab: 'chat' } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].classes()).not.toContain('active')

    await buttons[1].trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['group'])
  })
})
