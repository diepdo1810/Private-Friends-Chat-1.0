# P5 — Four Together Chat UI Implementation Plan (P0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement P0 of Issue #9 (Four Together / Chat-first UI) in Vue 3 + TypeScript + Pinia, ensuring seamless production behavior on Web and Android Capacitor.

**Architecture:** Transform `ChatShell.vue` into a chat-first container that auto-selects the primary room upon login and provides seamless tab switching between `'chat'` and `'group'`. Modularize layout into focused components (`ChatHeader`, `OfflineBanner`, `MessageBubbleList`, `ChatComposer`, `EmojiPicker`, `GroupScreen`, `BottomNav`).

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Supabase Auth/PostgreSQL/Realtime, Capacitor Android 6, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-p5-four-together-chat-ui-design.md`

## Global Constraints

- Keep existing Supabase Auth, PostgreSQL, and Realtime structures intact.
- No schema migrations or database modifications in P0.
- One codebase for Web and Android Capacitor.
- Use `100dvh` and safe-area insets (`env(safe-area-inset-*)`).
- Do not paste demo JS or presentation mockups (`.board`, `.phone`, `.rail`) into production.
- Desktop: `Enter` sends, `Shift + Enter` inserts newline. Mobile/Android: `Enter` inserts newline, Send button sends.
- Preserve draft on send failures and network disconnection.
- Strictly maintain AGPL-3.0 attribution in About modal and documentation.

---

### Task 1: Design Tokens & CSS Variables

**Files:**
- Modify: `src/styles/variables.css`
- Modify: `src/styles/layout.css`

**Interfaces:**
- Produces: CSS custom properties `--blue`, `--blue-strong`, `--sky`, `--cream`, `--canvas`, `--ink`, `--muted`, `--line`, `--coral`, `--coral-wash`, `--panel`, `--bubble`, `--soft`, `--shadow` in light and dark modes.

- [ ] **Step 1: Update CSS tokens in `src/styles/variables.css`**

Add the Four Together color tokens to `:root` and `[data-theme='dark']`:
```css
:root {
  --blue: #316cf4;
  --blue-strong: #2256ce;
  --sky: #eaf1ff;
  --cream: #fffdf8;
  --canvas: #dce9ff;
  --ink: #1e2a3a;
  --muted: #64748b;
  --line: #dfe5ee;
  --coral: #d96e4a;
  --coral-wash: #fff1ec;
  --panel: #ffffff;
  --bubble: #f0f3f7;
  --soft: #f8fafd;
  --shadow: rgba(49, 73, 104, 0.15);
}

[data-theme='dark'] {
  --cream: #14171a;
  --ink: #e6edf3;
  --muted: #a8b3c2;
  --line: rgba(255, 255, 255, 0.08);
  --panel: #1e2228;
  --bubble: #252b33;
  --soft: #1e2228;
  --sky: #1c315e;
  --blue: #316cf4;
  --coral-wash: #2e1a14;
  --coral: #ff8e6b;
}
```

- [ ] **Step 2: Add responsive and safe-area helpers in `src/styles/layout.css`**

Ensure `.chat-screen` and `.group-screen` utilize `100dvh` and safe-area insets without hardcoded mobile heights.

- [ ] **Step 3: Verify build with new styles**

Run: `yarn build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/styles/variables.css src/styles/layout.css
git commit -m "style: add Four Together design tokens and layout helpers"
```

---

### Task 2: Message Grouping & Formatting Utilities

**Files:**
- Create: `src/utils/chatFormat.ts`
- Create: `tests/chatFormat.test.ts`

**Interfaces:**
- Produces:
  - `isConsecutiveMessage(prev: { user_id: string; created_at: string } | null, curr: { user_id: string; created_at: string }): boolean`
  - `formatDateDivider(dateStr: string): string`
  - `formatMessageTime(dateStr: string): string`
  - `getInitials(name: string): string`

- [ ] **Step 1: Write failing unit tests in `tests/chatFormat.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  isConsecutiveMessage,
  formatDateDivider,
  formatMessageTime,
  getInitials,
} from '@/utils/chatFormat'

describe('chatFormat utilities', () => {
  it('identifies consecutive messages from same user within 5 minutes on same day', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:14:00Z' }
    const curr = { user_id: 'u1', created_at: '2026-10-29T20:16:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(true)
  })

  it('rejects consecutive grouping if user differs', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:14:00Z' }
    const curr = { user_id: 'u2', created_at: '2026-10-29T20:15:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(false)
  })

  it('rejects consecutive grouping if time delta exceeds 5 minutes', () => {
    const prev = { user_id: 'u1', created_at: '2026-10-29T20:10:00Z' }
    const curr = { user_id: 'u1', created_at: '2026-10-29T20:16:00Z' }
    expect(isConsecutiveMessage(prev, curr)).toBe(false)
  })

  it('formats initials correctly from single or multi-word names', () => {
    expect(getInitials('Linh Mai')).toBe('LM')
    expect(getInitials('Nam Anh')).toBe('NA')
    expect(getInitials('Bạn')).toBe('B')
    expect(getInitials('')).toBe('U')
  })

  it('formats message time as HH:mm', () => {
    const time = formatMessageTime('2026-10-29T20:14:00Z')
    expect(time).toMatch(/^\d{2}:\d{2}$/)
  })

  it('formats date divider in Vietnamese locale', () => {
    const divider = formatDateDivider('2026-10-29T20:14:00Z')
    expect(divider.toLowerCase()).toContain('tháng')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/chatFormat.test.ts`
Expected: FAIL (Cannot find module `@/utils/chatFormat`)

- [ ] **Step 3: Implement `src/utils/chatFormat.ts`**

Implement `isConsecutiveMessage`, `formatDateDivider`, `formatMessageTime`, and `getInitials`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/chatFormat.test.ts`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add src/utils/chatFormat.ts tests/chatFormat.test.ts
git commit -m "feat(utils): add message grouping and date formatting utilities"
```

---

### Task 3: Emoji Picker & Auto-expanding Composer Component

**Files:**
- Create: `src/components/chat/EmojiPicker.vue`
- Create: `src/components/chat/ChatComposer.vue`
- Create: `tests/ChatComposer.test.ts`

**Interfaces:**
- Consumes: Unicode emoji catalog `['😀','🥰','😂','👍','❤️','✨','🙌','🤝','😄','🤍','🎉','🤔','🥹','🔥','🌿','☕']`
- Produces:
  - `ChatComposer.vue`: Events `send(text: string)`, Props `disabled?: boolean`, `isSending?: boolean`
  - `EmojiPicker.vue`: Event `select(emoji: string)`

- [ ] **Step 1: Write unit tests in `tests/ChatComposer.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatComposer from '@/components/chat/ChatComposer.vue'

describe('ChatComposer', () => {
  it('disables send button when draft is empty', () => {
    const wrapper = mount(ChatComposer)
    const sendButton = wrapper.find('button.send')
    expect(sendButton.attributes('disabled')).toBeDefined()
  })

  it('enables send button when draft has non-whitespace text', async () => {
    const wrapper = mount(ChatComposer)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Chào mọi người')
    const sendButton = wrapper.find('button.send')
    expect(sendButton.attributes('disabled')).toBeUndefined()
  })

  it('emits send with trimmed text and clears textarea on submit', async () => {
    const wrapper = mount(ChatComposer)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello!')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('send')?.[0]).toEqual(['Hello!'])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/ChatComposer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/components/chat/EmojiPicker.vue` and `src/components/chat/ChatComposer.vue`**

Features:
- Textarea `rows="1"`, auto-resizes up to 5 lines (`max-height: 114px`).
- Emoji picker popover; clicking emoji inserts at caret and focuses textarea.
- Enter sends on Desktop; Enter adds line on mobile/pointer:coarse.
- Retains draft if sending fails.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/ChatComposer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/EmojiPicker.vue src/components/chat/ChatComposer.vue tests/ChatComposer.test.ts
git commit -m "feat(chat): implement auto-expanding ChatComposer and EmojiPicker"
```

---

### Task 4: Offline Banner Component

**Files:**
- Create: `src/components/chat/OfflineBanner.vue`
- Create: `tests/OfflineBanner.test.ts`

**Interfaces:**
- Produces: `OfflineBanner.vue`: Props `visible: boolean`, Event `retry`

- [ ] **Step 1: Write unit test in `tests/OfflineBanner.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OfflineBanner from '@/components/chat/OfflineBanner.vue'

describe('OfflineBanner', () => {
  it('renders correctly with message and retry button when visible', async () => {
    const wrapper = mount(OfflineBanner, { props: { visible: true } })
    expect(wrapper.text()).toContain('Mất kết nối')
    expect(wrapper.text()).toContain('Tin nhắn chưa gửi. Bản soạn vẫn được giữ.')
    const retryBtn = wrapper.find('button#retry')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('is hidden when visible is false', () => {
    const wrapper = mount(OfflineBanner, { props: { visible: false } })
    expect(wrapper.find('.connection').classes()).not.toContain('show')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/OfflineBanner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/components/chat/OfflineBanner.vue`**

Implement component adhering to prototype CSS (`--coral`, `--coral-wash`, `#retry` button).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/OfflineBanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/OfflineBanner.vue tests/OfflineBanner.test.ts
git commit -m "feat(chat): implement OfflineBanner component with retry event"
```

---

### Task 5: Chat Header & Navigation Components

**Files:**
- Create: `src/components/chat/ChatHeader.vue`
- Create: `src/components/navigation/BottomNav.vue`
- Create: `tests/Navigation.test.ts`

**Interfaces:**
- Produces:
  - `ChatHeader.vue`: Props `roomName: string`, `memberCount: number`, Events `open-group`, `toggle-theme`
  - `BottomNav.vue`: Props `activeTab: 'chat' | 'group'`, Event `navigate(tab: 'chat' | 'group')`

- [ ] **Step 1: Write unit tests in `tests/Navigation.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import BottomNav from '@/components/navigation/BottomNav.vue'

describe('ChatHeader & BottomNav', () => {
  it('ChatHeader renders token PF and emits events', async () => {
    const wrapper = mount(ChatHeader, {
      props: { roomName: 'Private Friends', memberCount: 4 },
    })
    expect(wrapper.find('.token').text()).toBe('PF')
    expect(wrapper.text()).toContain('Private Friends')
    expect(wrapper.text()).toContain('4 thành viên')

    await wrapper.find('.group-button').trigger('click')
    expect(wrapper.emitted('open-group')).toBeTruthy()

    await wrapper.find('#themeButton').trigger('click')
    expect(wrapper.emitted('toggle-theme')).toBeTruthy()
  })

  it('BottomNav highlights active tab and emits navigate', async () => {
    const wrapper = mount(BottomNav, { props: { activeTab: 'chat' } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].classes()).toContain('active')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['group'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/Navigation.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `ChatHeader.vue` and `BottomNav.vue`**

Adhere to prototype structure (`.chat-head`, `.token`, `.room-name`, `.head-button`, `.bottom-nav`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/Navigation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatHeader.vue src/components/navigation/BottomNav.vue tests/Navigation.test.ts
git commit -m "feat(navigation): implement ChatHeader and BottomNav components"
```

---

### Task 6: Group Screen Component

**Files:**
- Create: `src/components/group/GroupScreen.vue`
- Create: `tests/GroupScreen.test.ts`

**Interfaces:**
- Consumes: `chatStore.roomMembers`, `authStore.user`
- Produces: `GroupScreen.vue`: Event `back`

- [ ] **Step 1: Write unit test in `tests/GroupScreen.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GroupScreen from '@/components/group/GroupScreen.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

describe('GroupScreen', () => {
  setActivePinia(createPinia())

  it('renders hero and dynamic member rows from store', async () => {
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    authStore.user = { id: 'u1' } as any
    chatStore.roomMembers = [
      { user_id: 'u1', role: 'owner', profile: { id: 'u1', display_name: 'Bạn', username: 'you' } },
      { user_id: 'u2', role: 'member', profile: { id: 'u2', display_name: 'Linh Mai', username: 'linh' } },
    ] as any

    const wrapper = mount(GroupScreen)
    expect(wrapper.text()).toContain('Ở đây')
    expect(wrapper.text()).toContain('cùng nhau.')
    expect(wrapper.text()).toContain('Linh Mai')
    expect(wrapper.text()).toContain('Chủ phòng')

    await wrapper.find('.head-button').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/GroupScreen.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/components/group/GroupScreen.vue`**

Implement hero orbit avatars and member list mapped from `chatStore.roomMembers`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/GroupScreen.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/group/GroupScreen.vue tests/GroupScreen.test.ts
git commit -m "feat(group): implement GroupScreen with 4-member orbit layout"
```

---

### Task 7: Message Bubble List Component

**Files:**
- Create: `src/components/chat/MessageBubbleList.vue`
- Create: `tests/MessageBubbleList.test.ts`

**Interfaces:**
- Consumes: `messagesStore.messages`, `authStore.user`, `isConsecutiveMessage`, `formatDateDivider`, `formatMessageTime`, `getInitials`
- Produces: `MessageBubbleList.vue`: Event `load-more`

- [ ] **Step 1: Write unit test in `tests/MessageBubbleList.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubbleList from '@/components/chat/MessageBubbleList.vue'

describe('MessageBubbleList', () => {
  it('renders messages with correct bubble classes and dates', () => {
    const messages = [
      { id: '1', user_id: 'u2', content: 'Mai mình chốt giờ gặp nhé.', created_at: '2026-10-29T20:14:00Z', profile: { display_name: 'Linh Mai' } },
      { id: '2', user_id: 'u1', content: 'Ổn nhé!', created_at: '2026-10-29T20:17:00Z', profile: { display_name: 'Bạn' } },
    ]
    const wrapper = mount(MessageBubbleList, {
      props: { messages: messages as any, currentUserId: 'u1' },
    })

    const items = wrapper.findAll('article.message')
    expect(items.length).toBe(2)
    expect(items[0].classes()).not.toContain('me')
    expect(items[1].classes()).toContain('me')
    expect(items[1].text()).toContain('Đã gửi')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/MessageBubbleList.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/components/chat/MessageBubbleList.vue`**

Implement bubbles list, date headers, scroll-to-bottom helper, and scroll anchoring.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/MessageBubbleList.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MessageBubbleList.vue tests/MessageBubbleList.test.ts
git commit -m "feat(chat): implement MessageBubbleList with grouped bubbles and date headers"
```

---

### Task 8: Assemble ChatShell Container & Android Runtime Integration

**Files:**
- Modify: `src/views/ChatShell.vue`
- Test: `tests/ChatShell.test.ts`

**Interfaces:**
- Connects all components: `ChatHeader`, `OfflineBanner`, `MessageBubbleList`, `ChatComposer`, `GroupScreen`, `BottomNav`.
- Manages hardware back button (Group -> Chat -> exit).

- [ ] **Step 1: Write integration tests in `tests/ChatShell.test.ts`**

Verify that on mount, `chatStore.fetchRooms()` is called and automatically selects `rooms[0]`. Verify back button switches screen from `'group'` to `'chat'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/ChatShell.test.ts`
Expected: FAIL

- [ ] **Step 3: Refactor `src/views/ChatShell.vue`**

Assemble the components:
- Chat-first logic: auto-select primary room.
- Switch `activeScreen` between `'chat'` and `'group'`.
- Register back button: if in group screen, back returns to chat screen.
- Listen for `capacitor:keyboard-did-show` to scroll chat to bottom.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/ChatShell.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/ChatShell.vue tests/ChatShell.test.ts
git commit -m "feat(view): assemble ChatShell container with Chat-first flow and back navigation"
```

---

### Task 9: Full Verification, Documentation & APK Sync

**Files:**
- Modify: `README.md`
- Touch: Android native sync via `npx cap sync android`

- [ ] **Step 1: Run typecheck and test suite**

Run: `yarn typecheck && yarn test`
Expected: All test suites PASS with 0 errors.

- [ ] **Step 2: Run production build and capacitor sync**

Run: `yarn build && npx cap sync android`
Expected: Production build finishes in `<2s` and capacitor assets are synced.

- [ ] **Step 3: Update README.md with P5 documentation**

Document Four Together Chat-First UI features, 3 states, and testing guidelines.

- [ ] **Step 4: Commit**

```bash
git add README.md android/
git commit -m "docs: update documentation for P5 Four Together Chat UI"
```
