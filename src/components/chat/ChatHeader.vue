<template>
  <header class="chat-head">
    <i class="token">PF</i>
    <span class="room-name">
      <b>{{ roomName || 'Private Friends' }}</b>
      <span>Hội thoại · {{ memberCount }} thành viên</span>
    </span>
    <button
      class="head-button"
      id="themeButton"
      type="button"
      aria-label="Đổi chế độ sáng tối"
      @click="$emit('toggle-theme')"
    >
      ◐
    </button>
    <button
      class="head-button group-button"
      type="button"
      aria-label="Mở trang nhóm"
      @click="$emit('open-group')"
    >
      Nhóm
    </button>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    roomName?: string
    memberCount?: number
  }>(),
  {
    roomName: 'Private Friends',
    memberCount: 4,
  }
)

defineEmits<{
  (e: 'toggle-theme'): void
  (e: 'open-group'): void
}>()
</script>

<style scoped>
.chat-head {
  padding: calc(12px + env(safe-area-inset-top, 0px)) 15px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--cream);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.token {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: var(--blue);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 3px 3px 0 rgba(49, 108, 244, 0.25);
  font-style: normal;
  flex-shrink: 0;
}

.room-name {
  flex: 1;
  min-width: 0;
}

.room-name b {
  display: block;
  font-size: 15px;
  letter-spacing: -0.3px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-name span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
}

.head-button {
  min-width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: var(--sky);
  color: var(--blue-strong);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.head-button:hover {
  background: var(--canvas);
}

.group-button {
  width: auto;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
}
</style>
