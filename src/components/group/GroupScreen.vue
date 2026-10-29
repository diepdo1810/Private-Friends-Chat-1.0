<template>
  <div class="group-container">
    <header class="group-top">
      <button
        class="head-button"
        type="button"
        aria-label="Quay lại hội thoại"
        @click="$emit('back')"
      >
        ‹
      </button>
      <h2>Nhóm của mình</h2>
    </header>

    <div class="group-scrollable">
      <div class="group-hero">
        <i
          v-for="(member, idx) in orbitMembers"
          :key="member.user_id"
          class="orbit"
          :class="'o' + ((idx % 4) + 1)"
        >
          {{ getInitials(member.profile?.display_name) }}
        </i>
        <h1>Ở đây<br />cùng nhau.</h1>
        <p>Một phòng trò chuyện riêng tư.</p>
      </div>

      <p class="group-copy">
        Bốn tài khoản đã được cấp quyền có thể đọc và gửi tin trong không gian này.
      </p>

      <div class="members-list">
        <div
          v-for="member in roomMembers"
          :key="member.user_id"
          class="member-row"
        >
          <i class="avatar">
            {{ getInitials(member.profile?.display_name) }}
          </i>
          <span class="member-info">
            <b>
              {{ member.profile?.display_name || 'Thành viên' }}
              <span v-if="member.user_id === user?.id" class="me-tag">Bạn</span>
            </b>
            <small>{{ member.role === 'owner' ? 'Trưởng nhóm' : 'Thành viên' }}</small>
          </span>
          <em>{{ member.role === 'owner' ? 'Chủ phòng' : 'Thành viên' }}</em>
        </div>

        <div v-if="roomMembers.length === 0" class="member-loading">
          Đang tải danh sách thành viên...
        </div>
      </div>
      <div class="group-actions">
        <div class="notification-settings">
          <button type="button" class="logout-button" @click="toggleNotifications">
            {{ notificationsEnabled ? 'Tắt thông báo' : (isNativeMobile() ? 'Bật nhắc trong ứng dụng' : 'Bật thông báo trình duyệt') }}
          </button>
          <small v-if="notificationError" role="alert">{{ notificationError }}</small>
        </div>
        <button type="button" class="logout-button" @click="$emit('logout')">Đăng xuất</button>
        <a href="https://github.com/diepdo1810/Private-Friends-Chat-1.0" target="_blank" rel="noopener noreferrer">Mã nguồn AGPL-3.0</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isNativeMobile } from '@/services/capacitor'
import { isNotificationEnabled, enableNotifications, disableNotifications } from '@/services/notifications'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { getInitials } from '@/utils/chatFormat'

defineEmits<{
  (e: 'back'): void
  (e: 'logout'): void
}>()

const chatStore = useChatStore()
const authStore = useAuthStore()

const { roomMembers } = storeToRefs(chatStore)
const { user } = storeToRefs(authStore)
const notificationsEnabled = ref(false)
const notificationError = ref('')
watch(user, next => {
  notificationsEnabled.value = next ? isNotificationEnabled(next.id) : false
}, { immediate: true })
async function toggleNotifications() {
  const uid = user.value?.id
  if (!uid) return
  notificationError.value = ''
  if (notificationsEnabled.value) {
    disableNotifications(uid)
    notificationsEnabled.value = false
    return
  }
  const granted = await enableNotifications(uid, isNativeMobile())
  notificationsEnabled.value = granted
  if (!granted) notificationError.value = 'Chưa được cấp quyền thông báo.'
}

const orbitMembers = computed(() => {
  return roomMembers.value.slice(0, 4)
})
</script>

<style scoped>
.group-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cream);
  color: var(--ink);
}

.group-top {
  padding: calc(12px + env(safe-area-inset-top, 0px)) 15px 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.group-top h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}

.head-button {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: var(--sky);
  color: var(--blue-strong);
  font-size: 24px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1;
}

.head-button:hover {
  background: var(--canvas);
}

.group-scrollable {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.group-hero {
  margin: 14px 15px 18px;
  background: linear-gradient(145deg, #1f4cb6, #13337f);
  color: #ffffff;
  border-radius: 24px;
  padding: 30px 20px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(19, 51, 127, 0.25);
}

.group-hero h1 {
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.5px;
  margin: 0 0 8px;
  font-weight: 800;
}

.group-hero p {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}

.orbit {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  font-style: normal;
}

.o1 { top: 16px; right: 20px; }
.o2 { top: 62px; right: 54px; }
.o3 { top: 38px; right: 104px; }
.o4 { bottom: 18px; right: 28px; }

.group-copy {
  padding: 0 18px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 16px;
}

.members-list {
  display: flex;
  flex-direction: column;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
}

.member-row .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--sky);
  color: var(--blue-strong);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  font-style: normal;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-info b {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--ink);
}

.me-tag {
  font-size: 10px;
  background: var(--sky);
  color: var(--blue);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.member-info small {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.member-row em {
  font-style: normal;
  font-size: 12px;
  color: var(--muted);
  background: var(--bubble);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.member-loading {
  padding: 20px 18px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
</style>

<style scoped>
.group-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 18px; }
.logout-button { min-height: 44px; padding: 0 18px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); color: var(--ink); font-weight: 700; cursor: pointer; }
.group-actions a { color: var(--blue); font-size: 12px; }
</style>

<style scoped>
.notification-settings { display:flex; flex-direction:column; gap:5px; }
.notification-settings small { font-size: 11px; color: var(--coral); }
</style>
