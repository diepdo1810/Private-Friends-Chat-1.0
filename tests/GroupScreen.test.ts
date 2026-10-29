// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GroupScreen from '@/components/group/GroupScreen.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

describe('GroupScreen', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders room members and exposes logout action', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.roomMembers = [
      { user_id: 'u1', role: 'owner', profile: { id: 'u1', display_name: 'Bạn' } },
      { user_id: 'u2', role: 'member', profile: { id: 'u2', display_name: 'Linh Mai' } },
    ] as any

    const wrapper = mount(GroupScreen)
    expect(wrapper.text()).toContain('Ở đây')
    expect(wrapper.text()).toContain('Linh Mai')
    expect(wrapper.text()).toContain('Chủ phòng')
    expect(wrapper.text()).toContain('Mã nguồn AGPL-3.0')

    await wrapper.find('.head-button').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
    await wrapper.find('.logout-button').trigger('click')
    expect(wrapper.emitted('logout')).toBeTruthy()
  })
})
