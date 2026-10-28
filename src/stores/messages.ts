import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/services/supabase'
import type { Message } from '@/types/database'
import { cursorFilter, mergeMessages, newestCursor, EMPTY_ROOM_CURSOR, type MessageCursor } from '@/utils/messageCursor'

const HISTORY_SIZE = 50
const OLDER_SIZE = 30
const CATCHUP_SIZE = 100

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const sending = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const connection = ref<'connecting' | 'online' | 'offline'>('offline')

  let channel: RealtimeChannel | null = null
  let epoch = 0
  let currentRoom: string | null = null
  let currentUser: string | null = null
  let initialized = false
  let catchupRunning = false
  let catchupRequested = false
  // Only successful DB fetches advance this anchor. Realtime events alone do NOT
  // advance it: otherwise a new event after reconnect can skip missed inserts.
  let reconciledCursor: MessageCursor | null = null

  function valid(run: number, room: string) {
    return run === epoch && currentRoom === room && currentUser !== null
  }

  function stop() {
    epoch += 1
    const old = channel
    channel = null
    if (old) void supabase.removeChannel(old)
    currentRoom = null
    currentUser = null
    initialized = false
    catchupRunning = false
    catchupRequested = false
    reconciledCursor = null
    messages.value = []
    loading.value = false
    loadingMore.value = false
    sending.value = false
    hasMore.value = true
    error.value = null
    connection.value = 'offline'
  }

  async function start(room: string, user: string) {
    stop()
    if (!isSupabaseConfigured || !room || !user) return
    currentRoom = room
    currentUser = user
    const run = epoch
    loading.value = true
    connection.value = 'connecting'

    channel = supabase
      .channel(`room:${room}:${run}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}`,
      }, payload => {
        if (!valid(run, room)) return
        const message = payload.new as Message
        if (message.room_id === room) messages.value = mergeMessages(messages.value, [message])
      })
      .subscribe(status => {
        if (!valid(run, room)) return
        if (status === 'SUBSCRIBED') {
          connection.value = 'online'
          if (initialized) void catchUp(run, room)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connection.value = 'offline'
        }
      })

    try {
      // Subscribe first, then fetch. Dedupe by server message ID across both paths.
      const { data, error: queryError } = await supabase.from('messages')
        .select('id,room_id,user_id,content,created_at')
        .eq('room_id', room)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(HISTORY_SIZE)
      if (!valid(run, room)) return
      if (queryError) throw queryError
      const batch = (data ?? []) as Message[]
      messages.value = mergeMessages(messages.value, batch)
      hasMore.value = batch.length === HISTORY_SIZE
      reconciledCursor = newestCursor(batch)
      initialized = true
      // This second read closes the gap between initial query and subscription.
      void catchUp(run, room)
    } catch (err) {
      if (valid(run, room)) error.value = err instanceof Error ? err.message : 'Không tải được lịch sử.'
    } finally {
      if (valid(run, room)) loading.value = false
    }
  }

  async function catchUp(run: number, room: string) {
    if (!valid(run, room) || !initialized) return
    if (catchupRunning) {
      // Reconnect may arrive while an earlier catch-up is still in flight.
      // Repeat after it completes instead of dropping the new sync request.
      catchupRequested = true
      return
    }
    catchupRunning = true
    try {
      do {
        catchupRequested = false
        let cursor: MessageCursor = reconciledCursor ?? EMPTY_ROOM_CURSOR
        // Even if initial room was empty, page forward through EVERY missed message.
        for (;;) {
          const { data, error: queryError } = await supabase.from('messages')
            .select('id,room_id,user_id,content,created_at')
            .eq('room_id', room)
            .or(cursorFilter('newer', cursor))
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .limit(CATCHUP_SIZE)
          if (!valid(run, room)) return
          if (queryError) throw queryError
          const batch = (data ?? []) as Message[]
          if (!batch.length) break
          messages.value = mergeMessages(messages.value, batch)
          cursor = batch[batch.length - 1]
          reconciledCursor = cursor
          if (batch.length < CATCHUP_SIZE) break
        }
      } while (catchupRequested && valid(run, room))
    } catch (err) {
      if (valid(run, room)) error.value = err instanceof Error ? err.message : 'Không đồng bộ được tin nhắn.'
    } finally {
      if (valid(run, room)) catchupRunning = false
    }
  }

  async function loadOlder() {
    const room = currentRoom
    if (!room || !initialized || loadingMore.value || !hasMore.value || !messages.value.length) return
    const run = epoch
    const oldest = messages.value[0]
    loadingMore.value = true
    try {
      const { data, error: queryError } = await supabase.from('messages')
        .select('id,room_id,user_id,content,created_at')
        .eq('room_id', room)
        .or(cursorFilter('older', oldest))
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(OLDER_SIZE)
      if (!valid(run, room)) return
      if (queryError) throw queryError
      const batch = (data ?? []) as Message[]
      messages.value = mergeMessages(messages.value, batch)
      hasMore.value = batch.length === OLDER_SIZE
    } catch (err) {
      if (valid(run, room)) error.value = err instanceof Error ? err.message : 'Không tải được tin nhắn cũ.'
    } finally {
      if (valid(run, room)) loadingMore.value = false
    }
  }

  async function sendText(input: string): Promise<boolean> {
    const room = currentRoom
    const user = currentUser
    const content = input.trim()
    if (!room || !user || sending.value) return false
    if (!content || content.length > 4000) {
      error.value = 'Tin nhắn phải có 1–4000 ký tự.'
      return false
    }
    const run = epoch
    sending.value = true
    error.value = null
    try {
      // No optimistic fake message: only persist/emit server-confirmed content.
      const { data, error: sendError } = await supabase.from('messages')
        .insert({ id: crypto.randomUUID(), room_id: room, user_id: user, content })
        .select('id,room_id,user_id,content,created_at')
        .single()
      if (!valid(run, room)) return false
      if (sendError) throw sendError
      messages.value = mergeMessages(messages.value, [data as Message])
      return true
    } catch (err) {
      if (valid(run, room)) error.value = err instanceof Error ? err.message : 'Không gửi được tin nhắn.'
      return false
    } finally {
      if (valid(run, room)) sending.value = false
    }
  }

  return { messages, loading, loadingMore, sending, hasMore, error, connection, start, stop, loadOlder, sendText }
})
