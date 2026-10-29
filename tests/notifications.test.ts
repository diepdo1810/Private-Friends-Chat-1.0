// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  onIncomingMessage, publishIncomingMessage, resetNotificationStateForTests,
  isNotificationEnabled, enableNotifications, disableNotifications,
  setActiveChatVisible, isActiveChatVisible,
} from '@/services/notifications'

describe('Incoming message notifications', () => {
  beforeEach(() => {
    resetNotificationStateForTests()
    localStorage.clear()
  })

  it('sends one event for each unique realtime message and unregisters listener', () => {
    const listener = vi.fn()
    const cancel = onIncomingMessage(listener)
    const message = { id: 'm1', room_id: 'room', user_id: 'friend', created_at: '2026-10-29T12:00:00Z' }
    publishIncomingMessage(message)
    publishIncomingMessage(message)
    expect(listener).toHaveBeenCalledTimes(1)
    cancel()
    publishIncomingMessage({ ...message, id: 'm2' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps opt-in per user and supports disabling', async () => {
    expect(isNotificationEnabled('a')).toBe(false)
    expect(await enableNotifications('a', true)).toBe(true)
    expect(isNotificationEnabled('a')).toBe(true)
    expect(isNotificationEnabled('b')).toBe(false)
    disableNotifications('a')
    expect(isNotificationEnabled('a')).toBe(false)
  })

  it('tracks active chat independently of layout', () => {
    setActiveChatVisible(false)
    expect(isActiveChatVisible()).toBe(false)
    setActiveChatVisible(true)
    expect(isActiveChatVisible()).toBe(true)
  })
})
