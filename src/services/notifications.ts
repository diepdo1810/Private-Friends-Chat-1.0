import type { Message } from '@/types/database'

export type IncomingMessage = Pick<Message, 'id' | 'room_id' | 'user_id' | 'created_at'>
type MessageListener = (message: IncomingMessage) => void

const listeners = new Set<MessageListener>()
const recent = new Set<string>()
const recentOrder: string[] = []
let activeChatVisible = true

// Publish only server INSERT events, never history/catch-up queries.
export function publishIncomingMessage(message: IncomingMessage) {
  if (recent.has(message.id)) return
  recent.add(message.id)
  recentOrder.push(message.id)
  if (recentOrder.length > 200) recent.delete(recentOrder.shift()!)
  for (const listener of listeners) listener(message)
}

export function onIncomingMessage(listener: MessageListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setActiveChatVisible(visible: boolean) {
  activeChatVisible = visible
}
export function isActiveChatVisible() { return activeChatVisible }

export function isNotificationEnabled(userId: string): boolean {
  try {
    return typeof localStorage !== 'undefined' &&
      localStorage.getItem('private-friends:notifications:' + userId) === 'enabled'
  } catch { return false }
}

export function disableNotifications(userId: string) {
  try { localStorage.removeItem('private-friends:notifications:' + userId) } catch { /* ignored */ }
}

export async function enableNotifications(userId: string, isNative: boolean): Promise<boolean> {
  if (!userId) return false
  if (!isNative && typeof Notification !== 'undefined') {
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (permission !== 'granted') return false
  }
  try {
    localStorage.setItem('private-friends:notifications:' + userId, 'enabled')
    return true
  } catch { return false }
}

export function showDesktopNotification(messageId: string): boolean {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return false
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const n = new Notification('Private Friends', {
      body: 'Có tin nhắn mới',
      tag: 'private-friends-' + messageId,
    })
    n.onclick = () => {
      window.focus()
      window.dispatchEvent(new CustomEvent('private-friends:open-chat'))
      n.close()
    }
    return true
  } catch { return false }
}

// test-only reset: no production consumers.
export function resetNotificationStateForTests() {
  listeners.clear()
  recent.clear()
  recentOrder.length = 0
  activeChatVisible = true
}
