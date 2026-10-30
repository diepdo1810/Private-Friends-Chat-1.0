import { isNativeMobile } from '@/services/capacitor'
import { supabase } from '@/services/supabase'
import { isNotificationEnabled } from '@/services/notifications'

let registeredUser: string | null = null
let removeListeners: Array<() => Promise<void>> = []

function deviceId(): string {
  const key = 'private-friends:device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export async function stopNativePushListeners() {
  registeredUser = null
  const old = removeListeners
  removeListeners = []
  await Promise.allSettled(old.map(remove => remove()))
}

export async function disableNativePush(userId: string) {
  if (!isNativeMobile()) return
  const device = deviceId()
  // Delete while still authenticated; RLS only allows deleting own token.
  await supabase.from('push_devices').delete().eq('user_id', userId).eq('device_id', device)
  await stopNativePushListeners()
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.unregister()
  } catch { /* logout must still work even if FCM is unavailable */ }
}

export async function startNativePush(userId: string, interactive = false): Promise<boolean> {
  if (!isNativeMobile() || !userId) return false
  if (!interactive && !isNotificationEnabled(userId)) return false
  if (registeredUser === userId) return true

  const { PushNotifications } = await import('@capacitor/push-notifications')
  const currentPermission = await PushNotifications.checkPermissions()
  const permission = currentPermission.receive === 'prompt' && interactive
    ? await PushNotifications.requestPermissions()
    : currentPermission
  if (permission.receive !== 'granted') return false

  await stopNativePushListeners()
  registeredUser = userId
  try {
    await PushNotifications.createChannel({
      id: 'friends_messages', name: 'Tin nhắn bạn bè', description: 'Thông báo tin nhắn mới',
      importance: 5, visibility: 0,
    })
  } catch { /* existing channel or OS without channel support */ }

  try {
    const registration = await PushNotifications.addListener('registration', async event => {
      if (registeredUser !== userId || !event.value) return
      const { error } = await supabase.from('push_devices').upsert({
        user_id: userId, device_id: deviceId(), fcm_token: event.value, enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,device_id' })
      if (error) console.error('[Push] Could not register device for notifications:', error.message)
    })
    removeListeners.push(() => registration.remove())

    const registrationError = await PushNotifications.addListener('registrationError', () => {
      console.warn('[Push] FCM registration failed')
    })
    removeListeners.push(() => registrationError.remove())

    const clicked = await PushNotifications.addListener('pushNotificationActionPerformed', () => {
      window.dispatchEvent(new CustomEvent('private-friends:open-chat'))
    })
    removeListeners.push(() => clicked.remove())

    // Foreground delivery is handled by existing Realtime UI; avoid duplicate popup.
    const received = await PushNotifications.addListener('pushNotificationReceived', () => {})
    removeListeners.push(() => received.remove())

    await PushNotifications.register()
    return true
  } catch {
    await stopNativePushListeners()
    return false
  }
}
