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
