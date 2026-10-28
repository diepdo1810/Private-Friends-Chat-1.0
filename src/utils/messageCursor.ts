export interface MessageCursor {
  id: string
  created_at: string
}

export function compareMessages(a: MessageCursor, b: MessageCursor): number {
  const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  return timeDiff || a.id.localeCompare(b.id)
}

export function mergeMessages<T extends MessageCursor>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map(message => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort(compareMessages)
}

// PostgREST OR: strict cursor for two-field deterministic ordering.
export function cursorFilter(direction: 'older' | 'newer', cursor: MessageCursor): string {
  const op = direction === 'older' ? 'lt' : 'gt'
  return `created_at.${op}.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.${op}.${cursor.id})`
}

/** Earliest cursor for a previously empty room. Reconnect must not cap catch-up to last 50. */
export const EMPTY_ROOM_CURSOR: MessageCursor = {
  created_at: '1970-01-01T00:00:00+00:00',
  id: '00000000-0000-0000-0000-000000000000',
}

export function newestCursor<T extends MessageCursor>(items: T[]): MessageCursor | null {
  if (!items.length) return null
  return [...items].sort(compareMessages)[items.length - 1]
}
