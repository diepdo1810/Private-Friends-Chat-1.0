# Design Specification: P5 — Four Together Chat UI Implementation (P0)

- **Date:** 2026-10-29
- **Author:** Antigravity (AI Assistant) & diepdo1810
- **Base Branch:** `mvp`
- **Feature Branch:** `feature/p5-four-together-chat-ui`
- **Target Issue:** [Issue #9 — P5 Four Together Chat UI Implementation](https://github.com/diepdo1810/Private-Friends-Chat-1.0/issues/9)
- **Source of Truth:** `design-demos/four-together-chat-first.html` & approved preview images in `origin/docs/p5-four-together-reference`.

---

## 1. Context & Objectives

The goal of P5 is to upgrade the Private Friends Chat application to the latest approved **Four Together / Chat-first** visual and interaction design:
1. **Chat-first paradigm:** Upon login, navigate directly into the single private chat room conversation without requiring room selection.
2. **Production-grade Vue 3 implementation:** Translate the static HTML/CSS prototype (`four-together-chat-first.html`) into modular, reactive, accessible Vue 3 components while preserving existing Supabase Auth, PostgreSQL, Realtime, Pinia stores, and Capacitor Android runtime.
3. **P0 / P1 Phasing:**
   - **P0 (This Spec):** Core Chat-first UI, header, message list with grouping and date dividers, auto-expanding composer with Unicode emoji picker, offline banner, group screen showing 4 real members from Supabase, theme toggle, and bottom navigation.
   - **P1 (Subsequent PR):** Real reply database persistence (`reply_to_message_id`), emoji reactions table & RLS, static bundled stickers pack.

---

## 2. Architecture & Component Decomposition

### 2.1 Component Hierarchy

```text
src/views/ChatShell.vue (Orchestrator: manages active screen, auto-selects primary room)
├── Chat Screen (v-show="activeScreen === 'chat'")
│   ├── ChatHeader.vue (Token 'PF', title 'Private Friends', subtitle 'Hội thoại · 4 thành viên', theme toggle, 'Nhóm' button)
│   ├── OfflineBanner.vue (Orange offline bar with 'Thử lại' retry action)
│   ├── MessageBubbleList.vue (Day dividers, avatar initials, grouped bubbles, timestamp, send state)
│   ├── ChatComposer.vue (Auto-expanding 1-5 line textarea, emoji picker toggle, sticker button, send button)
│   │   └── EmojiPicker.vue (Unicode emoji grid popover)
│   └── BottomNav.vue (Hội thoại [active] | Nhóm)
│
└── Group Screen (v-show="activeScreen === 'group'")
    ├── GroupScreen.vue (Back button '‹', hero 'Ở đây cùng nhau', orbit avatars, 4 members list from Supabase)
    └── BottomNav.vue (Hội thoại | Nhóm [active])
```

### 2.2 File Structure Updates

```text
src/
├── components/
│   ├── chat/
│   │   ├── ChatHeader.vue            # [New] Header with PF badge, member count, theme button, group shortcut
│   │   ├── OfflineBanner.vue         # [New] Inline offline notification banner with retry handler
│   │   ├── MessageBubbleList.vue     # [New] Message history with grouping, date dividers, scroll anchoring
│   │   ├── ChatComposer.vue          # [New] Auto-resizing composer (1-5 lines), emoji/sticker actions, send
│   │   └── EmojiPicker.vue           # [New] Accessible Unicode emoji grid
│   ├── group/
│   │   └── GroupScreen.vue           # [New] 4-member group introduction & membership details from Supabase
│   └── navigation/
│       └── BottomNav.vue             # [New] Two-tab bottom navigation with safe-area support
├── views/
│   └── ChatShell.vue                 # [Refactored] Replaces sidebar layout with Chat-First container
└── styles/
    ├── variables.css                 # [Updated] New Four Together color tokens (light & dark)
    └── layout.css                    # [Updated] 100dvh viewport, safe area insets, keyboard adaptations
```

---

## 3. Detailed Technical Requirements (P0)

### 3.1 Design System Tokens & Theming

In `src/styles/variables.css`, define the core palette extracted from `four-together-chat-first.html`:

- **Light Mode (`:root` / `[data-theme='light']`):**
  - `--blue: #316cf4` (Primary blue for my bubbles, action buttons, token)
  - `--blue-strong: #2256ce`
  - `--sky: #eaf1ff` (Secondary action background, icon buttons)
  - `--cream: #fffdf8` (Warm chat background)
  - `--canvas: #dce9ff`
  - `--ink: #1e2a3a` (High-contrast text)
  - `--muted: #64748b` (Secondary metadata, timestamp)
  - `--line: #dfe5ee` (Borders, date lines)
  - `--coral: #d96e4a` (Offline text / accent)
  - `--coral-wash: #fff1ec` (Offline banner background)
  - `--panel: #ffffff`
  - `--bubble: #f0f3f7` (Other person's message bubble)
  - `--soft: #f8fafd`
  - `--shadow: rgba(49, 73, 104, 0.15)`

- **Dark Mode (`[data-theme='dark']`):**
  - `--cream: #14171a` (Dark chat surface)
  - `--ink: #e6edf3` (White-toned font)
  - `--muted: #a8b3c2`
  - `--line: rgba(255, 255, 255, 0.08)`
  - `--panel: #1e2228`
  - `--bubble: #252b33` (Other person's bubble in dark mode)
  - `--soft: #1e2228`
  - `--sky: #1c315e`
  - `--blue: #316cf4` (Remains vibrant for user's bubbles)
  - `--coral-wash: #2e1a14`
  - `--coral: #ff8e6b`

### 3.2 Chat-First Routing & Room Selection

- In `src/views/ChatShell.vue`:
  - On mount, invoke `chatStore.fetchRooms()`.
  - Once rooms are loaded, if `!chatStore.activeRoom && chatStore.rooms.length > 0`, immediately invoke `chatStore.selectRoom(chatStore.rooms[0])`.
  - Fetch room members via `chatStore.fetchRoomMembers(chatStore.activeRoom.id)`.
  - Default view is `activeScreen = 'chat'`.

### 3.3 Message Bubble List & Grouping

- **Consecutive Message Grouping:**
  - Messages from the same `user_id` sent on the same day within 5 minutes of the preceding message are tagged with `isGrouped = true`.
  - Grouped messages omit the sender avatar and name header.
  - Border radii adapt softly (matching prototype `.message.grouped .bubble`).
- **Date Separator:**
  - Displayed whenever the calendar day changes between messages.
  - Format: `Thứ ..., DD tháng MM` (Vietnamese locale) flanked by subtle horizontal rules.
- **My vs Other Bubbles:**
  - My messages (`message.user_id === user.id`): right-aligned, `--blue` background, white text, metadata includes `Đã gửi` indicator.
  - Others' messages: left-aligned with initial avatar circle (e.g. `LM`, `NA`, `VK`), name in bold, `--bubble` background, `--ink` text.
- **Scroll Anchoring:**
  - Maintain scroll position when older paginated messages are prepended.
  - Automatically scroll to bottom on initial load and when sending a message.

### 3.4 Composer & Input Handling

- **Dimensions & Auto-resize:**
  - Rounded container (`border-radius: 22px`, `--panel` background, border `--line`).
  - Textarea starting at 1 line (`rows="1"`), expanding dynamically up to 5 lines (`max-height: 114px`), with vertical scrolling enabled only beyond 5 lines.
- **Emoji Picker:**
  - Embedded popover grid featuring curated Unicode emojis (`['😀','🥰','😂','👍','❤️','✨','🙌','🤝','😄','🤍','🎉','🤔','🥹','🔥','🌿','☕']`).
  - Clicking an emoji inserts it at the current caret position (`selectionStart`/`selectionEnd`), updates draft reactive value, recalculates textarea height, and focuses the textarea.
- **Keydown Behavior:**
  - **Desktop (Mouse/keyboard pointer):** `Enter` without `Shift` submits the message. `Shift + Enter` inserts a newline.
  - **Mobile / Touch:** `Enter` inserts a newline. Submitting is exclusively performed by tapping the Send button (`↑`).
  - Vietnamese IME friendly (ignores `isComposing` events).
- **Draft & Duplicate Protection:**
  - Retain draft on send failure.
  - Disable Send button when draft is empty/whitespace or when `isSending` is true.

### 3.5 Offline Banner & Resilience

- **Trigger:**
  - Monitors `window.addEventListener('online')` / `offline` and Supabase Realtime channel status.
  - Triggers offline banner if `!navigator.onLine` or socket state is disconnected.
- **Presentation:**
  - Compact banner below header: **Mất kết nối** / *Tin nhắn chưa gửi. Bản soạn vẫn được giữ.* with a **Thử lại** button.
- **Retry Logic:**
  - Clicking **Thử lại** tests active network reachability, triggers `messagesStore.syncAfterResume()`, and hides the banner once connected.
  - Does NOT clear or wipe the composer draft.

### 3.6 Group Screen & Member Listing

- Accessible via the **Nhóm** tab in Bottom Navigation or the **Nhóm** button in Chat Header.
- **Group Hero:**
  - Visual orbit cluster with the 4 avatars around the title "Ở đây cùng nhau. Một phòng trò chuyện riêng tư."
- **Member Rows:**
  - Driven by `chatStore.roomMembers` (fallback to authenticated user profile if members loading).
  - Shows Avatar initials, Display Name, Role (`Chủ phòng` / `Thành viên`), and a `Bạn` badge for the current user.
  - No mocked presence or fake green online dots.

### 3.7 Mobile & Android Capacitor Integration

- **Safe Area Insets:**
  - Header: `padding-top: calc(16px + env(safe-area-inset-top, 0px))`.
  - BottomNav / Composer: `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px))`.
- **Keyboard Handling:**
  - Listens to `capacitor:keyboard-did-show` and autoscrolls to the newest message.
  - Container uses `height: 100dvh` to seamlessly adjust with Android window insets (`adjustResize`).
- **Hardware Back Button:**
  - If `activeScreen === 'group'`, pressing Back returns to `'chat'` (`return true`).
  - If `EmojiPicker` is open, pressing Back closes the picker (`return true`).
  - If already on `'chat'`, delegate to default back handler / exit.

---

## 4. Test & Verification Plan

1. **Unit Testing (Vitest):**
   - Test consecutive message grouping logic (time threshold and same sender).
   - Test date divider generation logic across different message timestamps.
   - Test auto-resize helper and caret emoji insertion.
   - Test offline banner visibility and retry invocation.
   - Test hardware back button priority in `ChatShell.vue`.
2. **Build & Typecheck:**
   - `yarn typecheck` (0 errors).
   - `yarn test` (all tests passing).
   - `yarn build` (Vite production bundle generated cleanly in `dist/`).
   - `npx cap sync android` (sync web assets to `android/`).
3. **CI Execution:**
   - GitHub Actions CI (Typecheck, Vitest, Build).
   - GitHub Actions Android Debug Build (Gradle `./gradlew assembleDebug` and APK artifact generation).

---

## 5. Security & Migration Considerations

- **No Schema Changes in P0:** Uses existing `messages`, `rooms`, `room_members`, and `profiles` tables.
- **No Client Secrets:** Relies exclusively on `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` with RLS enforcement.
- **Attribution:** Retains AGPL-3.0 attribution in About modal / footer notes.
