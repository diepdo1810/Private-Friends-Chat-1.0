export interface MinimalMessage {
  user_id: string
  created_at: string
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Checks whether two messages are consecutive from the same user, on the same calendar day,
 * and within a 5-minute interval.
 */
export function isConsecutiveMessage(
  prev: MinimalMessage | null | undefined,
  curr: MinimalMessage
): boolean {
  if (!prev) return false
  if (prev.user_id !== curr.user_id) return false

  const prevDate = new Date(prev.created_at)
  const currDate = new Date(curr.created_at)

  // Must be on the same calendar day
  if (
    prevDate.getFullYear() !== currDate.getFullYear() ||
    prevDate.getMonth() !== currDate.getMonth() ||
    prevDate.getDate() !== currDate.getDate()
  ) {
    return false
  }

  const diffMs = currDate.getTime() - prevDate.getTime()
  return diffMs >= 0 && diffMs <= FIVE_MINUTES_MS
}

/**
 * Formats a timestamp into HH:mm (e.g. 20:14)
 */
export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Formats a timestamp into Vietnamese calendar day divider
 * Example: "Thứ tư, 29 tháng 10" or "Hôm nay, 29 tháng 10"
 */
export function formatDateDivider(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const dayName = dayNames[date.getDay()]
  const day = date.getDate()
  const month = date.getMonth() + 1

  return `${dayName}, ${day} tháng ${month}`
}

/**
 * Generates 1 to 2 uppercase initials for avatars (e.g., "Linh Mai" -> "LM", "Nam Anh" -> "NA")
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  const first = parts[0].charAt(0).toUpperCase()
  const last = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${first}${last}`
}
