// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'
import {
  publishIncomingMessage,
  resetNotificationStateForTests,
  setActiveChatVisible,
} from '@/services/notifications'

vi.mock('@/services/capacitor', () => ({
  initCapacitorApp: vi.fn(async () => () => {}),
  isNativeMobile: () => false,
}))

function renderApp() {
  return mount(App, {
    global: {
      stubs: {
        ChatShell: { template: '<main data-test="chat-shell">Chat</main>' },
        LoginView: { template: '<main data-test="login-view">Login</main>' },
      },
    },
  })
}

describe('App auth vs notification rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetNotificationStateForTests()
    const auth = useAuthStore()
    auth.loading = false
    auth.initialize = vi.fn().mockResolvedValue(undefined)
  })

  it('renders only login when unauthenticated', async () => {
    const app = renderApp()
    await flushPromises()
    expect(app.find('[data-test="login-view"]').exists()).toBe(true)
    expect(app.find('[data-test="chat-shell"]').exists()).toBe(false)
    app.unmount()
  })

  it('renders only chat when authenticated, with no notification', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'account-b' } as any
    const app = renderApp()
    await flushPromises()
    expect(app.find('[data-test="chat-shell"]').exists()).toBe(true)
    expect(app.find('[data-test="login-view"]').exists()).toBe(false)
    app.unmount()
  })

  it('keeps login hidden even when incoming notification appears or clears', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'account-b' } as any
    localStorage.setItem('private-friends:notifications:account-b', 'enabled')
    setActiveChatVisible(false)
    const app = renderApp()
    await flushPromises()

    publishIncomingMessage({
      id: 'msg-1', room_id: 'room-1', user_id: 'account-a',
      created_at: '2026-10-30T10:00:00Z',
    })
    await flushPromises()
    expect(app.find('.notification-toast').exists()).toBe(true)
    expect(app.find('[data-test="chat-shell"]').exists()).toBe(true)
    expect(app.find('[data-test="login-view"]').exists()).toBe(false)

    await app.find('.notification-toast button').trigger('click')
    expect(app.find('.notification-toast').exists()).toBe(false)
    expect(app.find('[data-test="login-view"]').exists()).toBe(false)
    app.unmount()
  })

  it('switches from chat to login on logout and never overlaps both', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'account-b' } as any
    const app = renderApp()
    await flushPromises()
    auth.user = null
    await flushPromises()
    expect(app.find('[data-test="chat-shell"]').exists()).toBe(false)
    expect(app.find('[data-test="login-view"]').exists()).toBe(true)
    app.unmount()
  })
})
