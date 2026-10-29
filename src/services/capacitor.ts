import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'

type BackHandler = () => boolean | Promise<boolean>

interface RegisteredHandler {
  id: number
  priority: number
  handler: BackHandler
}

let nextHandlerId = 1
const backHandlers: RegisteredHandler[] = []
let isInitialized = false

/**
 * Check whether the application is running inside a native mobile container (Capacitor Android/iOS).
 */
export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Register a back-button handler with a priority.
 * Higher priority handlers execute first (e.g. modals=100, drawers=50, subviews=20).
 * If a handler returns true, the back event is considered handled.
 * Returns an unregister function.
 */
export function registerBackButtonHandler(priority: number, handler: BackHandler): () => void {
  const item: RegisteredHandler = {
    id: nextHandlerId++,
    priority,
    handler,
  }
  backHandlers.push(item)
  backHandlers.sort((a, b) => b.priority - a.priority)

  return () => {
    const index = backHandlers.findIndex(h => h.id === item.id)
    if (index !== -1) {
      backHandlers.splice(index, 1)
    }
  }
}

/**
 * Configure Status Bar style and background according to current theme.
 */
export async function updateStatusBarTheme(isDark: boolean): Promise<void> {
  if (!isNativeMobile()) return
  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    })
    await StatusBar.setBackgroundColor({
      color: isDark ? '#14171a' : '#f0f3f6',
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Capacitor] StatusBar update error:', err)
  }
}

export interface MobileInitOptions {
  onResume?: () => void | Promise<void>
  onPause?: () => void | Promise<void>
}

/**
 * Initialize Capacitor native plugins (Android Back button, Status Bar, Keyboard, App pause/resume).
 * Safely does nothing when running on standard Web.
 */
export async function initCapacitorApp(options?: MobileInitOptions): Promise<() => void> {
  if (isInitialized || !isNativeMobile()) {
    return () => {}
  }
  isInitialized = true

  // 1. Initial Status Bar Setup
  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
    await updateStatusBarTheme(isDark)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Capacitor] StatusBar setup failed:', err)
  }

  // 2. Keyboard Setup
  if (Capacitor.getPlatform() === 'ios') {
    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: false })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Capacitor] iOS accessory bar setup failed:', err)
    }
  }

  let keyboardShowListener: { remove: () => Promise<void> } | null = null
  let keyboardHideListener: { remove: () => Promise<void> } | null = null

  try {
    keyboardShowListener = await Keyboard.addListener('keyboardDidShow', () => {
      window.dispatchEvent(new CustomEvent('capacitor:keyboard-did-show'))
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Capacitor] Keyboard keyboardDidShow listener registration failed:', err)
  }

  try {
    keyboardHideListener = await Keyboard.addListener('keyboardDidHide', () => {
      window.dispatchEvent(new CustomEvent('capacitor:keyboard-did-hide'))
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Capacitor] Keyboard keyboardDidHide listener registration failed:', err)
  }

  // 3. Android Hardware / System Back Button Listener
  const backListener = await App.addListener('backButton', async () => {
    for (const item of backHandlers) {
      try {
        const handled = await item.handler()
        if (handled) return
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Capacitor] Back handler error:', err)
      }
    }
    // If no handlers consumed the back event, exit app
    await App.exitApp()
  })

  // 4. App State Change (Pause / Resume)
  const appStateListener = await App.addListener('appStateChange', async (state) => {
    if (state.isActive) {
      if (options?.onResume) {
        try {
          await options.onResume()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Capacitor] onResume handler error:', err)
        }
      }
    } else {
      if (options?.onPause) {
        try {
          await options.onPause()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Capacitor] onPause handler error:', err)
        }
      }
    }
  })

  return () => {
    void backListener.remove()
    void appStateListener.remove()
    void keyboardShowListener?.remove()
    void keyboardHideListener?.remove()
    isInitialized = false
  }
}
