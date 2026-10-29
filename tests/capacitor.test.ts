import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerBackButtonHandler,
  isNativeMobile,
  updateStatusBarTheme,
  initCapacitorApp,
} from '@/services/capacitor'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}))

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
    setOverlaysWebView: vi.fn(),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
  },
}))

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    setAccessoryBarVisible: vi.fn(),
    addListener: vi.fn(),
  },
}))

describe('Capacitor Mobile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')
  })

  it('reports isNativeMobile as false on web environment', () => {
    expect(isNativeMobile()).toBe(false)
  })

  it('does not throw when updateStatusBarTheme is invoked on web', async () => {
    await expect(updateStatusBarTheme(true)).resolves.not.toThrow()
    await expect(updateStatusBarTheme(false)).resolves.not.toThrow()
    expect(StatusBar.setStyle).not.toHaveBeenCalled()
  })

  it('registers back button handlers and executes in priority order', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')

    let backListenerCb: (() => Promise<void>) | null = null
    const removeBackListener = vi.fn()
    const removeAppStateListener = vi.fn()
    const removeKeyboardShow = vi.fn()
    const removeKeyboardHide = vi.fn()

    vi.mocked(App.addListener).mockImplementation((eventName: any, callback: any) => {
      if (eventName === 'backButton') backListenerCb = callback
      return Promise.resolve({ remove: eventName === 'backButton' ? removeBackListener : removeAppStateListener } as any)
    })

    vi.mocked(Keyboard.addListener).mockImplementation((eventName: any) => {
      return Promise.resolve({ remove: eventName === 'keyboardDidShow' ? removeKeyboardShow : removeKeyboardHide } as any)
    })

    const cleanup = await initCapacitorApp()
    expect(backListenerCb).not.toBeNull()

    const executionLog: string[] = []

    const unregisterModal = registerBackButtonHandler(100, () => {
      executionLog.push('modal')
      return true // Consumes the back event
    })

    const unregisterView = registerBackButtonHandler(20, () => {
      executionLog.push('view')
      return false
    })

    // Trigger back button: high-priority modal consumes it
    await backListenerCb!()
    expect(executionLog).toEqual(['modal'])
    expect(App.exitApp).not.toHaveBeenCalled()

    // Now unregister modal handler; next back button triggers lower-priority view
    unregisterModal()
    executionLog.length = 0

    await backListenerCb!()
    expect(executionLog).toEqual(['view'])
    expect(App.exitApp).toHaveBeenCalledTimes(1) // Not consumed -> calls exitApp()

    unregisterView()
    cleanup()
    expect(removeBackListener).toHaveBeenCalled()
    expect(removeAppStateListener).toHaveBeenCalled()
    expect(removeKeyboardShow).toHaveBeenCalled()
    expect(removeKeyboardHide).toHaveBeenCalled()
  })

  it('bypasses iOS-only Keyboard.setAccessoryBarVisible on Android platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')

    const removeKeyboard = vi.fn()
    vi.mocked(Keyboard.addListener).mockResolvedValue({ remove: removeKeyboard } as any)
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() } as any)

    const cleanup = await initCapacitorApp()

    // Must NOT call setAccessoryBarVisible on Android
    expect(Keyboard.setAccessoryBarVisible).not.toHaveBeenCalled()
    // Must register listeners for keyboard events
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function))
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function))

    cleanup()
  })

  it('invokes onResume and onPause callbacks on app state transitions', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')

    let appStateCb: ((state: { isActive: boolean }) => Promise<void>) | null = null

    vi.mocked(App.addListener).mockImplementation((eventName: any, callback: any) => {
      if (eventName === 'appStateChange') appStateCb = callback
      return Promise.resolve({ remove: vi.fn() } as any)
    })
    vi.mocked(Keyboard.addListener).mockResolvedValue({ remove: vi.fn() } as any)

    const onResume = vi.fn()
    const onPause = vi.fn()

    const cleanup = await initCapacitorApp({ onResume, onPause })
    expect(appStateCb).not.toBeNull()

    // Transition to active (resume)
    await appStateCb!({ isActive: true })
    expect(onResume).toHaveBeenCalledTimes(1)
    expect(onPause).not.toHaveBeenCalled()

    // Transition to background (pause)
    await appStateCb!({ isActive: false })
    expect(onPause).toHaveBeenCalledTimes(1)

    cleanup()
  })
})
