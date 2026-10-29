<template>
  <div v-if="loading" class="initial-loader">
    <div class="ss-card loading-box">
      <font-awesome-icon :icon="['fas', 'spinner']" class="spinner" style="font-size: 32px; color: var(--color-blue);" />
      <p style="margin-top: 14px; font-weight: 500; font-size: 14px; color: var(--color-font-2);">
        Đang tải Private Friends Chat...
      </p>
    </div>
  </div>

  <template v-else>
    <ChatShell v-if="isAuthenticated" />
    <div v-if="toast" class="notification-toast" role="status" @click="dismissToast">
      {{ toast }}
      <button type="button" aria-label="Đóng thông báo" @click.stop="dismissToast">×</button>
    </div>
    <LoginView v-else />
  </template>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { initCapacitorApp, isNativeMobile } from '@/services/capacitor'
import { onIncomingMessage, isNotificationEnabled, isActiveChatVisible, showDesktopNotification } from '@/services/notifications'
import LoginView from '@/views/LoginView.vue'
import ChatShell from '@/views/ChatShell.vue'

const authStore = useAuthStore()
const messagesStore = useMessagesStore()
const { loading, isAuthenticated } = storeToRefs(authStore)

let cleanupCapacitor: (() => void) | null = null
let cleanupNotifications: (() => void) | null = null
const toast = ref<string | null>(null)

function dismissToast() {
  toast.value = null
  window.dispatchEvent(new CustomEvent('private-friends:open-chat'))
}

onMounted(async () => {
  cleanupNotifications = onIncomingMessage((message) => {
    const user = authStore.user
    if (!user || message.user_id === user.id || !isNotificationEnabled(user.id)) return
    // FCM owns Android background notification; browser API only on desktop Web.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      if (!isNativeMobile()) showDesktopNotification(message.id)
    } else if (!isActiveChatVisible()) {
      toast.value = 'Private Friends — Có tin nhắn mới'
    }
  })
  await authStore.initialize()

  cleanupCapacitor = await initCapacitorApp({
    onResume: async () => {
      await authStore.refreshSessionIfNeeded()
      await messagesStore.syncAfterResume()
    },
  })
})

onUnmounted(() => {
  cleanupCapacitor?.()
  cleanupNotifications?.()
})
</script>

<style scoped>
.initial-loader {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-main);
}

.loading-box {
  padding: 36px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
 .notification-toast { position: fixed; z-index: 9999; bottom: 85px; right: 18px; max-width: calc(100vw - 36px); background: var(--color-card-1); color: var(--color-font); padding: 12px 16px; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 8px 22px rgba(0,0,0,.15); cursor: pointer; }
.notification-toast button { margin-left: 12px; border: 0; background: transparent; color: inherit; cursor: pointer; }
</style>
