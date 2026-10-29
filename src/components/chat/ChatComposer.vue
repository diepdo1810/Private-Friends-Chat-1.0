<template>
  <form class="composer" id="composer" @submit.prevent="handleSubmit">
    <EmojiPicker
      :visible="showEmojiPicker"
      @select="handleSelectEmoji"
    />

    <div class="compose-row">
      <button
        class="compose-action"
        id="emojiButton"
        type="button"
        aria-label="Mở emoji"
        @click="toggleEmojiPicker"
      >
        ☺
      </button>

      <textarea
        ref="textareaRef"
        class="draft"
        id="draft"
        v-model="draft"
        rows="1"
        maxlength="4000"
        aria-label="Nội dung tin nhắn"
        placeholder="Nhắn gì đó cho nhóm..."
        :disabled="disabled"
        @input="handleInput"
        @keydown="handleKeyDown"
      ></textarea>

      <button
        class="compose-action"
        id="stickerButton"
        type="button"
        aria-label="Mở sticker (P1)"
        title="Tính năng Sticker sẽ có trong bản cập nhật tới"
        disabled
      >
        ✦
      </button>

      <button
        class="send"
        id="send"
        type="submit"
        aria-label="Gửi tin nhắn"
        :disabled="!canSend"
      >
        ↑
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import EmojiPicker from './EmojiPicker.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    isSending?: boolean
  }>(),
  {
    disabled: false,
    isSending: false,
  }
)

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const draft = ref('')
const showEmojiPicker = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => {
  return !props.disabled && !props.isSending && draft.value.trim().length > 0
})

function adjustHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const maxHeight = 114 // Max 5 lines
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
}

function handleInput() {
  adjustHeight()
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function handleSelectEmoji(emoji: string) {
  const el = textareaRef.value
  if (!el) {
    draft.value += emoji
    showEmojiPicker.value = false
    return
  }

  const start = el.selectionStart ?? draft.value.length
  const end = el.selectionEnd ?? draft.value.length
  const before = draft.value.substring(0, start)
  const after = draft.value.substring(end)

  draft.value = before + emoji + after
  showEmojiPicker.value = false

  nextTick(() => {
    adjustHeight()
    el.focus()
    const newPos = start + emoji.length
    el.setSelectionRange(newPos, newPos)
  })
}

function handleKeyDown(e: KeyboardEvent) {
  // Ignore IME composition (Vietnamese, etc.)
  if (e.isComposing) return

  // On desktop (mouse/pointer:fine): Enter sends, Shift+Enter adds newline
  // On mobile/touch (pointer:coarse): Enter adds newline, Send button sends
  const isTouchDevice =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer:coarse)').matches

  if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
    e.preventDefault()
    if (canSend.value) {
      handleSubmit()
    }
  }
}

function handleSubmit() {
  if (!canSend.value) return
  const text = draft.value.trim()
  if (!text) return

  emit('send', text)
  draft.value = ''
  nextTick(() => {
    adjustHeight()
  })
}

onMounted(() => {
  adjustHeight()
})

defineExpose({
  clear() {
    draft.value = ''
    adjustHeight()
  },
  focus() {
    textareaRef.value?.focus()
  },
  setDraft(text: string) {
    draft.value = text
    adjustHeight()
  },
})
</script>

<style scoped>
.composer {
  padding: 8px 14px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--cream);
  position: relative;
  flex-shrink: 0;
}

.compose-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 4px 6px 4px 10px;
  box-shadow: 0 4px 12px var(--shadow);
  transition: border-color 0.15s ease;
}

.compose-row:focus-within {
  border-color: var(--blue);
}

.compose-action {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.compose-action:hover:not(:disabled) {
  background: var(--sky);
  color: var(--blue);
}

.compose-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.draft {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  padding: 6px 2px;
  max-height: 114px;
  overflow-y: auto;
  field-sizing: content;
  min-block-size: 1lh;
  max-block-size: 5lh;
}

.draft::placeholder {
  color: var(--muted);
}

.send {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: var(--blue);
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.1s ease, background 0.15s ease, opacity 0.15s ease;
}

.send:active:not(:disabled) {
  transform: scale(0.92);
}

.send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
