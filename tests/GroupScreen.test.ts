// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GroupScreen from '@/components/group/GroupScreen.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

describe('GroupScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders hero and dynamic member rows from store', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.roomMembers = [
      { user_id: 'u1', role: 'owner', profile: { id: 'u1', display_name: 'Bạn', username: 'you' } },
      { user_id: 'u2', role: 'member', profile: { id: 'u2', display_name: 'Linh Mai', username: 'linh' } },
    ] as any

    const wrapper = mount(GroupScreen)
    expect(wrapper.text()).toContain('Ở đây')
    expect(wrapper.text()).toContain('cùng nhau.')
    expect(wrapper.text()).toContain('Linh Mai')
    expect(wrapper.text()).toContain('Chủ phòng')

    await wrapper.find('.head-button').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})
