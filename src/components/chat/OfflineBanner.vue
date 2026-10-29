<template>
  <aside
    class="connection"
    id="connection"
    role="status"
    :class="{ show: visible }"
  >
    <span>
      <b>Mất kết nối</b>
      <br />
      Tin nhắn chưa gửi. Bản soạn vẫn được giữ.
    </span>
    <button
      id="retry"
      type="button"
      aria-label="Thử kết nối lại"
      @click="$emit('retry')"
    >
      Thử lại
    </button>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<style scoped>
.connection {
  display: none;
  background: var(--coral-wash);
  color: var(--coral);
  border-bottom: 1px solid rgba(217, 110, 74, 0.2);
  padding: 8px 15px;
  font-size: 11px;
  line-height: 1.4;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  animation: slideDown 0.2s ease-out;
}

.connection.show {
  display: flex;
}

.connection span {
  flex: 1;
  min-width: 0;
}

.connection b {
  font-size: 12px;
  font-weight: 700;
}

.connection button {
  border: 1px solid var(--coral);
  background: var(--panel);
  color: var(--coral);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 800;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.connection button:hover {
  background: var(--coral);
  color: #ffffff;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
