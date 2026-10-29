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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(query => ({
        media: query,
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('loads and auto-selects primary room', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    const messagesStore = useMessagesStore()
    authStore.user = { id: 'u1' } as any
    const mockRoom = { id: 'room-1', name: 'Private Friends', description: '', created_at: '' }
    chatStore.fetchRooms = vi.fn().mockImplementation(async () => { chatStore.rooms = [mockRoom] as any })
    chatStore.fetchRoomMembers = vi.fn()
    messagesStore.start = vi.fn()

    const wrapper = mount(ChatShell)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(chatStore.fetchRooms).toHaveBeenCalled()
    expect(chatStore.activeRoom?.id).toBe('room-1')
    wrapper.unmount()
  })

  it('switches to Group and displays logout', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.rooms = [{ id: 'room-1', name: 'Private Friends', description: '', created_at: '' }] as any
    chatStore.activeRoom = chatStore.rooms[0]
    chatStore.fetchRooms = vi.fn().mockResolvedValue(chatStore.rooms)

    const wrapper = mount(ChatShell)
    expect(wrapper.find('.chat-screen').isVisible()).toBe(true)
    const bottomNav = wrapper.findComponent({ name: 'BottomNav' })
    await bottomNav.vm.$emit('navigate', 'group')
    expect(wrapper.find('.group-screen').isVisible()).toBe(true)
    expect(wrapper.find('.logout-button').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows no-room state without fake member count or enabled composer', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.fetchRooms = vi.fn().mockResolvedValue([])

    const wrapper = mount(ChatShell)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(wrapper.text()).toContain('Chưa có phòng chat được cấp quyền')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('4 thành viên')
    wrapper.unmount()
  })

  it('restores QQ Lite desktop UI and hides mobile nav at widths over 700px', async () => {
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    authStore.user = { id: 'u1' } as any
    chatStore.fetchRooms = vi.fn().mockResolvedValue([])
    let onChange: (() => void) | undefined
    const query = { matches: false, addEventListener: vi.fn((_: string, fn: () => void) => { onChange = fn }), removeEventListener: vi.fn() }
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => query) })
    const wrapper = mount(ChatShell)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(wrapper.find('.app-sidebar').isVisible()).toBe(true)
    expect(wrapper.find('.session-panel').isVisible()).toBe(true)
    expect(wrapper.find('.four-together-shell').isVisible()).toBe(false)
    expect(wrapper.find('.bottom-nav').isVisible()).toBe(false)
    expect(onChange).toBeDefined()
    query.matches = true
    onChange?.()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.four-together-shell').isVisible()).toBe(true)
    expect(wrapper.find('.app-sidebar').isVisible()).toBe(false)
    expect(query.removeEventListener).toHaveBeenCalledTimes(0)
    wrapper.unmount()
    expect(query.removeEventListener).toHaveBeenCalledTimes(1)
  })
})
