<template>
  <div class="chat-window">
    <div class="chat-connection" role="status" :class="connection">
      <span>{{ connection === 'online' ? 'Đã kết nối' : connection === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối — sẽ đồng bộ khi có mạng' }}</span>
      <button v-if="connection === 'offline' || error" class="reconnect-button" type="button" :disabled="loading" @click="retry">Thử lại</button>
    </div>
    <div ref="scrollEl" class="message-scroll" @scroll="onScroll">
      <div class="history-actions">
        <button v-if="hasMore && messages.length" class="ss-button secondary" :disabled="loadingMore" @click="older">
          {{ loadingMore ? 'Đang tải...' : 'Tải tin nhắn cũ' }}
        </button>
        <span v-else-if="!loading && messages.length">Đã xem toàn bộ lịch sử</span>
      </div>
      <div v-if="loading" class="chat-placeholder">Đang tải tin nhắn...</div>
      <div v-else-if="!messages.length" class="chat-placeholder">Chưa có tin nhắn. Gửi lời chào đầu tiên.</div>
      <div v-for="item in messages" :key="item.id" class="message-line" :class="{ own: item.user_id === myUserId }">
        <div class="message-avatar">{{ label(item.user_id).slice(0, 1).toUpperCase() }}</div>
        <div class="message-content">
          <div class="message-meta">
            <span>{{ item.user_id === myUserId ? 'Bạn' : label(item.user_id) }}</span>
            <time :datetime="item.created_at">{{ timeLabel(item.created_at) }}</time>
          </div>
          <div class="message-bubble">{{ item.content }}</div>
        </div>
      </div>
    </div>
    <button v-if="unreadCount > 0" class="latest-button" type="button" @click="jumpToLatest">
      {{ unreadCount }} tin mới — Xem
    </button>
    <div v-if="error" class="chat-error" role="alert">{{ error }}</div>
    <form class="message-compose" @submit.prevent="send">
      <textarea v-model="draft" rows="2" maxlength="4000" aria-label="Nội dung tin nhắn"
        placeholder="Nhập tin nhắn... (Shift+Enter để xuống dòng)"
        :disabled="sending" @keydown.enter.exact.prevent="send"></textarea>
      <button type="submit" class="ss-button" :disabled="sending || !draft.trim() || draft.length > 4000">
        {{ sending ? 'Đang gửi...' : 'Gửi' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { RoomMember } from '@/types/database'
import { useMessagesStore } from '@/stores/messages'
import { compareMessages } from '@/utils/messageCursor'

const props = defineProps<{ roomId: string; myUserId: string; members: RoomMember[] }>()
const store = useMessagesStore()
const { messages, loading, loadingMore, sending, hasMore, error, connection } = storeToRefs(store)
const scrollEl = ref<HTMLDivElement | null>(null)
const draft = ref('')
const unreadCount = ref(0)
let keepingScroll = false

const names = computed(() => new Map(props.members.map(member => [
  member.user_id, member.profile?.display_name || 'Thành viên',
])))
function label(id: string) { return names.value.get(id) ?? 'Thành viên' }
function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
function start() {
  draft.value = ''
  unreadCount.value = 0
  void store.start(props.roomId, props.myUserId)
}
function retry() {
  unreadCount.value = 0
  void store.start(props.roomId, props.myUserId)
}
function jumpToLatest() {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
  unreadCount.value = 0
}
function onKeyboardShow() {
  void nextTick(() => {
    jumpToLatest()
  })
}
onMounted(() => {
  start()
  window.addEventListener('capacitor:keyboard-did-show', onKeyboardShow)
})
watch(() => [props.roomId, props.myUserId], start)
onBeforeUnmount(() => {
  store.stop()
  window.removeEventListener('capacitor:keyboard-did-show', onKeyboardShow)
})

async function older() {
  const el = scrollEl.value
  if (!el || loadingMore.value) return
  keepingScroll = true
  const oldHeight = el.scrollHeight
  const oldTop = el.scrollTop
  await store.loadOlder()
  await nextTick()
  el.scrollTop = el.scrollHeight - oldHeight + oldTop
  keepingScroll = false
}
function onScroll() {
  const el = scrollEl.value
  if (!el) return
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) unreadCount.value = 0
  if (el.scrollTop < 75 && hasMore.value && !loading.value && !loadingMore.value) void older()
}
watch(() => messages.value.map(message => message.id), async (_current, previous) => {
  const el = scrollEl.value
  if (!el || keepingScroll) return
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180
  const before = new Set(previous)
  const last = previous.length ? messages.value.find(m => m.id === previous[previous.length - 1]) : null
  const added = messages.value.filter(m => !before.has(m.id) && (!last || compareMessages(m, last) > 0))
  if (!nearBottom && previous.length) unreadCount.value += added.length
  await nextTick()
  if (!previous.length || nearBottom) jumpToLatest()
})
async function send() {
  if (!draft.value.trim() || sending.value) return
  const content = draft.value
  const ok = await store.sendText(content)
  if (ok) {
    draft.value = ''
    await nextTick()
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  }
}
</script>

<style scoped>
.chat-window { display:flex; flex:1; min-height:0; flex-direction:column; }
.chat-connection { font-size:11px; text-align:center; color:var(--color-font-2); padding:5px; }
.chat-connection.online { color:var(--color-green); }
.chat-connection.offline { color:var(--color-yellow); }
.message-scroll { flex:1; min-height:0; overflow-y:auto; padding:12px 4px 18px; }
.history-actions { text-align:center; min-height:28px; margin-bottom:12px; font-size:12px; color:var(--color-font-2); }
.history-actions .ss-button { padding:6px 10px; font-size:12px; }
.chat-placeholder { text-align:center; padding:50px 8px; font-size:13px; color:var(--color-font-2); }
.message-line { display:flex; gap:10px; margin:12px 0; align-items:flex-end; }
.message-line.own { flex-direction:row-reverse; }
.message-avatar { flex:none; width:32px; height:32px; border-radius:50%; background:var(--color-blue-light); color:var(--color-blue); display:grid; place-items:center; font-size:12px; font-weight:700; }
.message-content { display:flex; flex-direction:column; max-width:min(78%, 540px); min-width:0; align-items:flex-start; }
.own .message-content { align-items:flex-end; }
.message-meta { display:flex; gap:8px; align-items:baseline; color:var(--color-font-2); font-size:11px; margin:0 3px 4px; }
.message-meta time { opacity:.75; }
.message-bubble { white-space:pre-wrap; overflow-wrap:anywhere; background:var(--color-card-1); color:var(--color-font); border:1px solid var(--color-border); border-radius:12px 12px 12px 3px; padding:9px 13px; font-size:14px; line-height:1.6; }
.own .message-bubble { background:var(--color-blue); color:#fff; border-color:transparent; border-radius:12px 12px 3px 12px; }
.chat-error { color:var(--color-red); font-size:12px; padding:8px; background:var(--color-red-light); border-radius:6px; }
.message-compose { display:flex; gap:10px; align-items:flex-end; padding:12px 0 0; border-top:1px solid var(--color-border); }
.message-compose textarea { flex:1; min-width:0; resize:vertical; max-height:145px; padding:10px 12px; border-radius:10px; border:1px solid var(--color-border); background:var(--color-card-1); color:var(--color-font); font:inherit; font-size:14px; }
.message-compose textarea:focus { outline:1px solid var(--color-blue); }
.message-compose button { flex:none; min-width:62px; }
@media(max-width:500px) { .message-content {max-width:82%;} .message-compose {gap:6px;} .message-compose textarea {font-size:16px;} }
</style>

<style scoped>
.reconnect-button { border:0; background:transparent; color:var(--color-blue); margin-left:12px; cursor:pointer; text-decoration:underline; font-size:11px; }
.reconnect-button:disabled { opacity:.5; cursor:default; }
.latest-button { align-self:center; border:1px solid var(--color-border); border-radius:999px; background:var(--color-card-1); color:var(--color-blue); padding:6px 14px; margin:3px; cursor:pointer; font-size:12px; }
</style>
