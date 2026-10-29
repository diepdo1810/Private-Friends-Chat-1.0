<template>
  <div class="picker" id="emojiPicker" :class="{ show: visible }">
    <p class="picker-title">Emoji Unicode</p>
    <div class="emoji-grid" id="emojiGrid">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        :aria-label="emoji"
        @click="$emit('select', emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'select', emoji: string): void
}>()

const emojis = [
  '😀', '🥰', '😂', '👍',
  '❤️', '✨', '🙌', '🤝',
  '😄', '🤍', '🎉', '🤔',
  '🥹', '🔥', '🌿', '☕',
]
</script>

<style scoped>
.picker {
  display: none;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 10px 25px var(--shadow);
}

.picker.show {
  display: block;
}

.picker-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin: 0 0 8px 4px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.emoji-grid button {
  height: 36px;
  background: none;
  border: 0;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.emoji-grid button:hover,
.emoji-grid button:focus-visible {
  background: var(--sky);
}

@media (max-width: 360px) {
  .emoji-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
