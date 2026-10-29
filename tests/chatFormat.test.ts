import { describe, it, expect } from 'vitest'
import {
  isConsecutiveMessage,
  formatDateDivider,
  formatMessageTime,
  getInitials,
} from '@/utils/chatFormat'

describe('chatFormat utilities', () => {
  it('identifies consecutive messages from same user within 5 minutes on same day', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:14:00Z' }
    const curr = { user_id: 'u1', created_at: '2026-10-29T20:16:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(true)
  })

  it('rejects consecutive grouping if user differs', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:14:00Z' }
    const curr = { user_id: 'u2', created_at: '2026-10-29T20:15:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(false)
  })

  it('rejects consecutive grouping if time delta exceeds 5 minutes', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:10:00Z' }
    const curr = { user_id: 'u1', created_at: '2026-10-29T20:16:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(false)
  })

  it('rejects consecutive grouping if prev is null', () => {
    const curr = { user_id: 'u1', created_at: '2026-10-29T20:16:00Z' }
    expect(isConsecutiveMessage(null, curr)).toBe(false)
  })

  it('formats initials correctly from single or multi-word names', () => {
    expect(getInitials('Linh Mai')).toBe('LM')
    expect(getInitials('Nam Anh')).toBe('NA')
    expect(getInitials('Bạn')).toBe('B')
    expect(getInitials('')).toBe('U')
  })

  it('formats message time as HH:mm', () => {
    const time = formatMessageTime('2026-10-29T20:14:00Z')
    expect(time).toMatch(/^\d{2}:\d{2}$/)
  })

  it('formats date divider in Vietnamese locale', () => {
    const divider = formatDateDivider('2026-10-29T20:14:00Z')
    expect(divider.toLowerCase()).toContain('tháng')
  })
})
