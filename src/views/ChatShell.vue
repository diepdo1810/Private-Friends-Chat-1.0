<template>
  <div class="four-together-shell">
    <!-- Screen 1: Chat Screen -->
    <section v-show="activeScreen === 'chat'" class="four-together-screen chat-screen">
      <ChatHeader
        :roomName="activeRoom?.name"
        :memberCount="roomMembers.length"
        @toggle-theme="toggleTheme"
        @open-group="handleNavigate('group')"
      />

      <OfflineBanner
        :visible="isOffline"
        @retry="handleRetry"
      />

      <template v-if="activeRoom">
        <MessageBubbleList
          ref="messageListRef"
          :messages="messages"
          :members="roomMembers"
          :currentUserId="user?.id"
          :hasMore="hasMore"
          :loadingMore="loadingMore"
          :loadOlder="messagesStore.loadOlder"
        />
        <ChatComposer :isSending="sending" :sendMessage="handleSendMessage" />
      </template>
      <div v-else class="room-status" role="status">
        <p>{{ roomsLoading ? 'Đang tải phòng...' : (roomsError || 'Chưa có phòng chat được cấp quyền.') }}</p>
        <button v-if="!roomsLoading" type="button" @click="loadRoomsAndSelect">Thử tải lại phòng</button>
      </div>

      <BottomNav
        :activeTab="activeScreen"
        @navigate="handleNavigate"
      />
    </section>

    <!-- Screen 2: Group Screen -->
    <section v-show="activeScreen === 'group'" class="four-together-screen group-screen">
      <GroupScreen @back="handleNavigate('chat')" @logout="handleLogout" />
      <p v-if="logoutError" class="logout-error" role="alert">{{ logoutError }}</p>

      <BottomNav
        :activeTab="activeScreen"
        @navigate="handleNavigate"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useMessagesStore } from '@/stores/messages'
import { registerBackButtonHandler, updateStatusBarTheme } from '@/services/capacitor'
import { setActiveChatVisible } from '@/services/notifications'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import OfflineBanner from '@/components/chat/OfflineBanner.vue'
import MessageBubbleList from '@/components/chat/MessageBubbleList.vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import GroupScreen from '@/components/group/GroupScreen.vue'
import BottomNav from '@/components/navigation/BottomNav.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()
const messagesStore = useMessagesStore()

const { user } = storeToRefs(authStore)
const { rooms, activeRoom, roomMembers, loading: roomsLoading, error: roomsError } = storeToRefs(chatStore)
const { messages, loadingMore, sending, hasMore, connection } = storeToRefs(messagesStore)

const activeScreen = ref<'chat' | 'group'>('chat')
const messageListRef = ref<InstanceType<typeof MessageBubbleList> | null>(null)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

let unregisterBack: (() => void) | null = null
let disposed = false
const logoutError = ref<string | null>(null)

const isOffline = computed(() => {
  return !isOnline.value || connection.value === 'offline'
})

function handleNavigate(tab: 'chat' | 'group') {
  activeScreen.value = tab
  setActiveChatVisible(tab === 'chat')
}

async function handleSendMessage(text: string): Promise<boolean> {
  if (!activeRoom.value) return false
  const ok = await messagesStore.sendText(text)
  if (ok) void messageListRef.value?.scrollToBottom(true)
  return ok
}

async function handleLogout() {
  const result = await authStore.logout()
  logoutError.value = result.success ? null : (result.error || 'Không thể đăng xuất.')
}

async function loadRoomsAndSelect() {
  await chatStore.fetchRooms()
  if (disposed) return
  if (!activeRoom.value && rooms.value.length > 0) {
    await chatStore.selectRoom(rooms.value[0])
  }
}

function handleRetry() {
  isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true
  messagesStore.syncAfterResume()
}

function toggleTheme() {
  if (typeof document === 'undefined') return
  const current = document.documentElement.getAttribute('data-theme')
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
  updateStatusBarTheme(next === 'dark')
}

function handleOnline() {
  isOnline.value = true
  messagesStore.syncAfterResume()
}

function handleOffline() {
  isOnline.value = false
}

function handleKeyboardShow() {
  messageListRef.value?.scrollToBottom(true)
}

// Watch activeRoom and start messages subscription
watch(
  [() => activeRoom.value?.id, () => user.value?.id],
  ([roomId, userId]) => {
    if (roomId && userId) {
      void messagesStore.start(roomId, userId)
      void chatStore.fetchRoomMembers(roomId)
    } else {
      messagesStore.stop()
    }
  },
  { immediate: true }
)

function handleOpenChatNotification() {
  activeScreen.value = 'chat'
  setActiveChatVisible(true)
}

onMounted(async () => {
  setActiveChatVisible(true)
  window.addEventListener('private-friends:open-chat', handleOpenChatNotification)
  // 1. Register hardware back button
  unregisterBack = registerBackButtonHandler(20, () => {
    if (activeScreen.value === 'group') {
      activeScreen.value = 'chat'
      return true
    }
    return false
  })

  // 2. Network status listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('capacitor:keyboard-did-show', handleKeyboardShow)
  }

  // 3. Fetch rooms without masking missing memberships.
  await loadRoomsAndSelect()
})

onUnmounted(() => {
  window.removeEventListener('private-friends:open-chat', handleOpenChatNotification)
  setActiveChatVisible(false)
  disposed = true
  messagesStore.stop()
  unregisterBack?.()
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('capacitor:keyboard-did-show', handleKeyboardShow)
  }
})
</script>

<style scoped>
.chat-screen,
.group-screen {
  height: 100%;
}
.room-status { flex: 1; display: grid; align-content: center; justify-items: center; gap: 12px; padding: 24px; color: var(--muted); text-align: center; }
.room-status button { padding: 10px 16px; border: 1px solid var(--line); border-radius: 12px; color: var(--blue); background: var(--panel); cursor: pointer; }
.logout-error { margin: 8px 16px; color: var(--coral); font-size: 12px; }
</style>
