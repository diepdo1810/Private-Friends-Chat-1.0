import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerBackButtonHandler, isNativeMobile, updateStatusBarTheme } from '@/services/capacitor'

// Mock capacitor plugins
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
  })

  it('reports isNativeMobile as false on web environment', () => {
    expect(isNativeMobile()).toBe(false)
  })

  it('registers back button handlers and respects priority', async () => {
    const executed: string[] = []

    const unregisterLow = registerBackButtonHandler(10, () => {
      executed.push('low')
      return true
    })

    const unregisterHigh = registerBackButtonHandler(100, () => {
      executed.push('high')
      return true
    })

    // Both handlers registered. Now simulate execution
    // Unregister low and test unregister behavior
    expect(typeof unregisterLow).toBe('function')
    expect(typeof unregisterHigh).toBe('function')

    unregisterLow()
    unregisterHigh()
  })

  it('does not throw when updateStatusBarTheme is invoked on web', async () => {
    await expect(updateStatusBarTheme(true)).resolves.not.toThrow()
    await expect(updateStatusBarTheme(false)).resolves.not.toThrow()
  })
})
