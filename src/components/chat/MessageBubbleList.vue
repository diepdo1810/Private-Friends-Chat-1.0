<template>
  <div ref="containerRef" class="messages" id="messages" @scroll="handleScroll">
    <div v-if="hasMore" class="load-more-container">
      <button
        type="button"
        class="load-more-btn"
        :disabled="loadingMore"
        @click="handleLoadMore"
      >
        {{ loadingMore ? 'Đang tải tin nhắn cũ...' : 'Tải thêm tin nhắn cũ' }}
      </button>
    </div>

    <template v-for="item in processedItems" :key="item.key">
      <!-- Day Divider -->
      <p v-if="item.type === 'day'" class="day">
        {{ item.dateText }}
      </p>

      <!-- Message Bubble -->
      <article
        v-else-if="item.type === 'message' && item.message"
        class="message"
        :class="{
          me: item.isMe,
          grouped: item.isGrouped,
        }"
      >
        <i v-if="!item.isMe" class="avatar">
          {{ getInitials(displayName(item.message.user_id)) }}
        </i>

        <div class="payload">
          <p v-if="!item.isGrouped" class="meta">
            {{ item.isMe ? 'Bạn' : displayName(item.message.user_id) }}
            <time>{{ formatMessageTime(item.message.created_at) }}</time>
          </p>

          <p class="bubble">{{ item.message.content }}</p>

          <p v-if="item.isMe" class="send-state">Đã gửi</p>
        </div>
      </article>
    </template>
    <button v-if="unreadCount > 0" type="button" class="new-messages-btn" @click="scrollToBottom(true)">{{ unreadCount }} tin mới — Xem</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Message, RoomMember } from '@/types/database'
import {
  isConsecutiveMessage,
  formatDateDivider,
  formatMessageTime,
  getInitials,
} from '@/utils/chatFormat'

const props = withDefaults(
  defineProps<{
    messages: Message[]
    currentUserId?: string | null
    hasMore?: boolean
    loadingMore?: boolean
    members?: RoomMember[]
    loadOlder?: () => Promise<void>
  }>(),
  {
    currentUserId: null,
    hasMore: false,
    loadingMore: false,
    members: () => [],
    loadOlder: async () => {},
  }
)

const containerRef = ref<HTMLDivElement | null>(null)
const unreadCount = ref(0)
const isLoadingOlder = ref(false)
const memberNames = computed(() => new Map(
  props.members.map(member => [member.user_id, member.profile?.display_name || 'Thành viên'])
))
function displayName(userId: string): string {
  return memberNames.value.get(userId) ?? 'Thành viên'
}

interface ProcessedDayItem {
  type: 'day'
  key: string
  dateText: string
}

interface ProcessedMessageItem {
  type: 'message'
  key: string
  message: Message
  isMe: boolean
  isGrouped: boolean
}

type ProcessedItem = ProcessedDayItem | ProcessedMessageItem

const processedItems = computed<ProcessedItem[]>(() => {
  const items: ProcessedItem[] = []
  let lastDateStr = ''
  let prevMsg: Message | null = null

  for (let i = 0; i < props.messages.length; i++) {
    const msg = props.messages[i]
    const currentDate = new Date(msg.created_at)
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`

    if (dateKey !== lastDateStr) {
      items.push({
        type: 'day',
        key: `day-${dateKey}`,
        dateText: formatDateDivider(msg.created_at),
      })
      lastDateStr = dateKey
      prevMsg = null // Reset grouping across day boundaries
    }

    const isMe = Boolean(props.currentUserId && msg.user_id === props.currentUserId)
    const isGrouped = isConsecutiveMessage(prevMsg, msg)

    items.push({
      type: 'message',
      key: `msg-${msg.id}`,
      message: msg,
      isMe,
      isGrouped,
    })

    prevMsg = msg
  }

  return items
})

async function handleLoadMore() {
  if (isLoadingOlder.value || props.loadingMore || !props.hasMore) return
  const el = containerRef.value
  if (!el) return
  isLoadingOlder.value = true
  const previousHeight = el.scrollHeight
  const previousTop = el.scrollTop
  try {
    await props.loadOlder()
    await nextTick()
    el.scrollTop = previousTop + el.scrollHeight - previousHeight
  } finally {
    isLoadingOlder.value = false
  }
}

function handleScroll() {
  const el = containerRef.value
  if (!el) return
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) unreadCount.value = 0
  if (el.scrollTop < 30 && props.hasMore && !props.loadingMore && !isLoadingOlder.value) {
    void handleLoadMore()
  }
}

async function scrollToBottom(smooth = false) {
  await nextTick()
  const el = containerRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  unreadCount.value = 0
}

// Compare identity/order, not only length. Older history must not steal scroll.
watch(
  () => props.messages.map(message => message.id),
  async (ids, previous) => {
    const el = containerRef.value
    if (!el || isLoadingOlder.value || ids.length <= previous.length) return
    if (!previous.length) {
      await scrollToBottom(false)
      return
    }
    if (ids[0] !== previous[0]) return
    const priorIds = new Set(previous)
    const newCount = ids.filter(id => !priorIds.has(id)).length
    if (!newCount) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    await nextTick()
    if (nearBottom) await scrollToBottom(false)
    else unreadCount.value += newCount
  }
)

defineExpose({ scrollToBottom })

</script>

<style scoped>
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 15px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--cream);
  min-height: 0;
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}

.load-more-btn {
  background: var(--sky);
  border: 1px solid var(--line);
  color: var(--blue-strong);
  font-size: 11px;
  font-weight: 700;
  border-radius: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: var(--canvas);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.day {
  margin: 14px 0 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day::before,
.day::after {
  content: '';
  height: 1px;
  flex: 1;
  background: var(--line);
}

.message {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 82%;
  align-self: flex-start;
}

.message.grouped {
  margin-top: -6px;
}

.message.grouped .avatar {
  visibility: hidden;
}

.message.grouped .meta {
  display: none;
}

.message.me {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.me .avatar {
  display: none;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--sky);
  color: var(--blue-strong);
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
  font-style: normal;
  flex-shrink: 0;
}

.payload {
  min-width: 0;
}

.meta {
  margin: 0 0 3px 4px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.message.me .meta {
  text-align: right;
  margin: 0 4px 3px 0;
}

.meta time {
  margin-left: 4px;
  font-weight: 400;
  opacity: 0.85;
}

.bubble {
  margin: 0;
  padding: 9px 13px;
  border-radius: 18px 18px 18px 4px;
  background: var(--bubble);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.message.me .bubble {
  border-radius: 18px 18px 4px 18px;
  background: var(--blue);
  color: #ffffff;
}

.send-state {
  margin: 2px 4px 0 0;
  text-align: right;
  font-size: 10px;
  color: var(--muted);
}
</style>

<style scoped>
.messages { position: relative; }
.new-messages-btn { position: sticky; bottom: 10px; align-self: center; padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--blue); font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 10px var(--shadow); }
</style>
