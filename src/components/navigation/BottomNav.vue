<template>
  <nav class="bottom-nav" aria-label="Điều hướng chính">
    <button
      type="button"
      :class="{ active: activeTab === 'chat' }"
      aria-label="Chuyển sang Hội thoại"
      @click="$emit('navigate', 'chat')"
    >
      <i class="icon">▰</i>
      <span>Hội thoại</span>
    </button>
    <button
      type="button"
      :class="{ active: activeTab === 'group' }"
      aria-label="Chuyển sang Nhóm"
      @click="$emit('navigate', 'group')"
    >
      <i class="icon">◌</i>
      <span>Nhóm</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: 'chat' | 'group'
}>()

defineEmits<{
  (e: 'navigate', tab: 'chat' | 'group'): void
}>()
</script>

<style scoped>
.bottom-nav {
  display: flex;
  background: var(--cream);
  border-top: 1px solid var(--line);
  padding: 6px 16px calc(6px + env(safe-area-inset-bottom, 0px));
  justify-content: space-around;
  flex-shrink: 0;
}

.bottom-nav button {
  flex: 1;
  max-width: 180px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 0;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.bottom-nav button:hover {
  color: var(--ink);
}

.bottom-nav button.active {
  color: var(--blue);
  background: var(--sky);
}

.icon {
  font-style: normal;
  font-size: 14px;
}
</style>
