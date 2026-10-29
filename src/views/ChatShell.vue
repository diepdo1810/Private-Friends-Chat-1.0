<template>
  <div class="responsive-chat-shell" :data-layout="isMobile ? 'mobile' : 'desktop'">
    <DesktopChatShell v-show="!isMobile" />
    <MobileChatShell v-show="isMobile" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { isNativeMobile } from '@/services/capacitor'
import { setActiveChatVisible } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useMessagesStore } from '@/stores/messages'
import DesktopChatShell from './DesktopChatShell.vue'
import MobileChatShell from './MobileChatShell.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()
const messagesStore = useMessagesStore()
const { activeRoom } = storeToRefs(chatStore)
const { user } = storeToRefs(authStore)

const isMobile = ref(true)
let media: MediaQueryList | null = null
let disposed = false

function updateLayout() {
  isMobile.value = isNativeMobile() || (media?.matches ?? window.innerWidth <= 700)
  if (!isMobile.value) setActiveChatVisible(true)
}

watch(
  [() => activeRoom.value?.id, () => user.value?.id],
  ([roomId, userId]) => {
    if (roomId && userId) void messagesStore.start(roomId, userId)
    else messagesStore.stop()
  },
  { immediate: true }
)

onMounted(async () => {
  media = window.matchMedia('(max-width: 700px)')
  updateLayout()
  media.addEventListener('change', updateLayout)
  await chatStore.fetchRooms()
  if (disposed) return
  if (!activeRoom.value && chatStore.rooms.length) {
    await chatStore.selectRoom(chatStore.rooms[0])
  }
})

onUnmounted(() => {
  disposed = true
  media?.removeEventListener('change', updateLayout)
  messagesStore.stop()
  setActiveChatVisible(false)
})
</script>

<style scoped>
.responsive-chat-shell { width: 100%; height: 100vh; height: 100dvh; overflow: hidden; }
.responsive-chat-shell > * { height: 100%; }
</style>
