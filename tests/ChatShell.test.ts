// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatShell from '@/views/ChatShell.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

describe('ChatShell Container', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts and automatically selects the primary room if available', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    const messagesStore = useMessagesStore()

    authStore.user = { id: 'u1' } as any
    const mockRoom = { id: 'room-1', name: 'Private Friends', description: '' }
    chatStore.fetchRooms = vi.fn().mockImplementation(async () => {
      chatStore.rooms = [mockRoom] as any
    })
    chatStore.fetchRoomMembers = vi.fn()
    messagesStore.start = vi.fn()

    const wrapper = mount(ChatShell)
    await wrapper.vm.$nextTick()
    // Give async onMounted a cycle to run
    await new Promise((r) => setTimeout(r, 10))

    expect(chatStore.fetchRooms).toHaveBeenCalled()
    expect(chatStore.activeRoom?.id).toBe('room-1')
  })

  it('switches screen when bottom nav navigate is triggered', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.rooms = [{ id: 'room-1', name: 'Private Friends' }] as any
    chatStore.activeRoom = chatStore.rooms[0]

    const wrapper = mount(ChatShell)
    expect(wrapper.find('.chat-screen').isVisible()).toBe(true)

    // Trigger navigate to 'group'
    const bottomNav = wrapper.findComponent({ name: 'BottomNav' })
    expect(bottomNav.exists()).toBe(true)
    await bottomNav.vm.$emit('navigate', 'group')

    expect(wrapper.find('.group-screen').isVisible()).toBe(true)
  })
})
