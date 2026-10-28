import { describe, expect, it } from 'vitest'
import { compareMessages, cursorFilter, mergeMessages } from '../src/utils/messageCursor'

const a = { id: '00000000-0000-0000-0000-000000000001', created_at: '2026-10-28T10:00:00Z', content: 'a' }
const b = { id: '00000000-0000-0000-0000-000000000002', created_at: '2026-10-28T10:00:00Z', content: 'b' }
const c = { id: '00000000-0000-0000-0000-000000000003', created_at: '2026-10-28T11:00:00Z', content: 'c' }

describe('message history merging and cursor', () => {
  it('sorts deterministically by created_at then id', () => {
    expect([c, a, b].sort(compareMessages).map(x => x.id)).toEqual([a.id, b.id, c.id])
  })
  it('deduplicates realtime events against DB fetch and keeps updated record', () => {
    const merged = mergeMessages([c, a], [a, b, { ...c, content: 'confirmed' }])
    expect(merged.map(x => x.id)).toEqual([a.id, b.id, c.id])
    expect(merged[2].content).toBe('confirmed')
  })
  it('paginates tied timestamps using UUID tie-breaker', () => {
    expect(cursorFilter('older', b)).toBe(
      `created_at.lt.${b.created_at},and(created_at.eq.${b.created_at},id.lt.${b.id})`
    )
    expect(cursorFilter('newer', a)).toBe(
      `created_at.gt.${a.created_at},and(created_at.eq.${a.created_at},id.gt.${a.id})`
    )
  })
})
