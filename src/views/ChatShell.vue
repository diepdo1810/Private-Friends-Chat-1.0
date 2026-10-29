<template>
  <div class="four-together-shell">
    <!-- Screen 1: Chat Screen -->
    <section v-show="activeScreen === 'chat'" class="four-together-screen chat-screen">
      <ChatHeader
        :roomName="activeRoom?.name"
        :memberCount="roomMembers.length || 4"
        @toggle-theme="toggleTheme"
        @open-group="activeScreen = 'group'"
      />

      <OfflineBanner
        :visible="isOffline"
        @retry="handleRetry"
      />

      <MessageBubbleList
        ref="messageListRef"
        :messages="messages"
        :currentUserId="user?.id"
        :hasMore="hasMore"
        :loadingMore="loadingMore"
        @load-more="messagesStore.loadOlder()"
      />

      <ChatComposer
        :isSending="sending"
        @send="handleSendMessage"
      />

      <BottomNav
        :activeTab="activeScreen"
        @navigate="handleNavigate"
      />
    </section>

    <!-- Screen 2: Group Screen -->
    <section v-show="activeScreen === 'group'" class="four-together-screen group-screen">
      <GroupScreen @back="activeScreen = 'chat'" />

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
const { rooms, activeRoom, roomMembers } = storeToRefs(chatStore)
const { messages, loadingMore, sending, hasMore, connection } = storeToRefs(messagesStore)

const activeScreen = ref<'chat' | 'group'>('chat')
const messageListRef = ref<InstanceType<typeof MessageBubbleList> | null>(null)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

let unregisterBack: (() => void) | null = null

const isOffline = computed(() => {
  return !isOnline.value || connection.value === 'offline'
})

function handleNavigate(tab: 'chat' | 'group') {
  activeScreen.value = tab
  if (tab === 'chat') {
    messageListRef.value?.scrollToBottom(false)
  }
}

async function handleSendMessage(text: string) {
  if (!activeRoom.value && rooms.value.length > 0) {
    chatStore.selectRoom(rooms.value[0])
  }
  const ok = await messagesStore.sendText(text)
  if (ok) {
    messageListRef.value?.scrollToBottom(true)
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
  [activeRoom, user],
  ([room, currentUser]) => {
    if (room && currentUser) {
      messagesStore.start(room.id, currentUser.id)
      chatStore.fetchRoomMembers(room.id)
    }
  },
  { immediate: true }
)

onMounted(async () => {
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

  // 3. Fetch rooms and auto-select primary room
  await chatStore.fetchRooms()
  if (!activeRoom.value && rooms.value.length > 0) {
    chatStore.selectRoom(rooms.value[0])
  }
})

onUnmounted(() => {
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
</style>
