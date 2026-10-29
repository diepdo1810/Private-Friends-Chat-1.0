# Private Friends Chat 1.0 (P1 Foundation)

Ứng dụng chat web tối giản, an toàn và riêng tư dành riêng cho nhóm 4 người bạn, kế thừa ngôn ngữ thiết kế giao diện từ [Stapxs QQ Lite 2.0](https://github.com/Stapxs/Stapxs-QQ-Lite-2.0), xây dựng trên nền tảng **Vue 3 + TypeScript + Vite + Pinia** kết hợp **Supabase (Auth + PostgreSQL + RLS)** và triển khai trên **Vercel Hobby**.

---

## 🚀 Tính năng Giai đoạn P1

- [x] **Trích xuất giao diện Stapxs QQ Lite sạch:** Tái sử dụng hệ thống biến màu CSS tokens, card kính mờ (`.ss-card`), typography hiện đại, layout sidebar và khả năng responsive mobile/desktop. Loại bỏ 100% logic QQ/OneBot/Desktop/Mobile cũ.
- [x] **Supabase Authentication:** Quản lý phiên làm việc đăng nhập/đăng xuất bằng email & mật khẩu, bảo mật phiên tự động, xử lý trạng thái loading/error mượt mà.
- [x] **Khóa đăng ký công khai (Public Signups Disabled):** Chỉ cho phép 4 tài khoản do Admin cấp phát trước tham gia hệ thống.
- [x] **PostgreSQL Schema & RLS (Default Deny):** Cấu trúc 4 bảng (`profiles`, `rooms`, `room_members`, `messages`) được bảo vệ nghiêm ngặt bằng Row Level Security (RLS).
- [x] **Helper bảo mật chống đệ quy:** Hàm `private.is_room_member(room_id)` đặt trong schema `private`, chạy dưới quyền `SECURITY DEFINER` với `search_path = ''` và sử dụng `auth.uid()` nội bộ, triệt tiêu nguy cơ giả mạo quyền và lỗi infinite recursion.
- [x] **Con trỏ kết hợp `(room_id, created_at DESC, id DESC)`:** Tạo composite index sẵn sàng cho phân trang lịch sử và catch-up sync tin nhắn ở P2.
- [x] **Tuân thủ AGPL-3.0:** Đầy đủ thông tin giấy phép và liên kết mã nguồn tương ứng trong giao diện (About Modal / Footer).

---

## 🛠️ Hướng dẫn Cài đặt & Cấu hình cho Owner

### Bước 1: Chuẩn bị Supabase Project
1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard) và tạo project mới (chọn khu vực gần Việt Nam như `Singapore (ap-southeast-1)`).
2. Vào **Project Settings -> API** để lấy:
   - `Project URL` (URL dự án)
   - `anon public` key (Khóa công khai)

### Bước 2: Chạy Database Migration & Seed
1. Mở **SQL Editor** trong Supabase Dashboard.
2. Sao chép và chạy toàn bộ nội dung file:
   `supabase/migrations/20261028000000_p1_initial_schema.sql`
   *(Thao tác này sẽ tạo schema `private`, 4 bảng dữ liệu, hàm `private.is_room_member`, và các chính sách RLS an toàn).*
3. Tiếp tục chạy file:
   `supabase/seed.sql`
   *(Thao tác này khởi tạo phòng chat chung cố định ID `00000000-0000-0000-0000-000000000001` mang tên "Private Friends").*

### Bước 3: Tắt Đăng ký Công khai & Tạo 4 Tài khoản
1. **Tắt đăng ký công khai:**
   - Vào **Authentication -> Providers -> Email**.
   - Bỏ chọn: **"Allow new users to sign up"** (Save).
   - Bỏ chọn: **"Confirm email"** (nếu muốn tài khoản đăng nhập được ngay mà không cần xác thực email).
2. **Tạo 4 tài khoản người dùng:**
   - Vào **Authentication -> Users -> Add user -> Create user**.
   - Nhập email và mật khẩu cho 4 bạn (Ví dụ: `user1@friends.local`, `user2@friends.local`, v.v.).
3. **Gán 4 thành viên vào phòng chat:**
   - Chạy câu lệnh sau trong **SQL Editor**:
   ```sql
   INSERT INTO public.room_members (room_id, user_id, role)
   SELECT '00000000-0000-0000-0000-000000000001', id, 'member'
   FROM auth.users
   WHERE email IN (
     'user1@friends.local',
     'user2@friends.local',
     'user3@friends.local',
     'user4@friends.local'
   )
   ON CONFLICT (room_id, user_id) DO NOTHING;
   ```

### Bước 4: Cấu hình Môi trường Frontend
1. Tạo file `.env` tại thư mục gốc dựa trên `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Điền thông tin Supabase của bạn:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Bước 5: Cài đặt & Khởi chạy Ứng dụng
```bash
# Cài đặt dependencies (Yarn v4)
yarn install

# Khởi chạy dev server (cổng 3000)
yarn dev

# Kiểm tra TypeScript
yarn typecheck

# Chạy bộ kiểm thử tự động (Vitest)
yarn test

# Build production bundle
yarn build
```

---

## 🧪 Kết quả Kiểm thử Tự động (Automated Tests)

Bộ test tự động trong thư mục `tests/` bao gồm 18 bài test đã được xác minh thực tế:
- **`tests/sql-schema.test.ts`**: Kiểm tra tính toàn vẹn cú pháp của migration, schema `private`, constraints độ dài tin nhắn, index con trỏ `(room_id, created_at DESC, id DESC)`, và các ràng buộc RLS.
- **`tests/rls-policy-simulation.test.ts`**: Mô phỏng 8 kịch bản an ninh:
  1. Người dùng ẩn danh bị chặn 100% trên tất cả các bảng.
  2. Thành viên A đọc được phòng, danh sách thành viên và tin nhắn.
  3. Thành viên B đọc được phòng và đăng tin nhắn hợp lệ.
  4. Người ngoài phòng nhận `0 rows` khi SELECT (chuẩn hành vi PostgreSQL RLS).
  5. Người ngoài phòng bị chặn khi cố tình INSERT tin nhắn.
  6. Thành viên không thể giả mạo `user_id` của người khác khi INSERT.
  7. Client không thể tự ý thêm mình vào `room_members` (self-join bị chặn).
  8. Hàm `is_room_member` thực thi an toàn, không xảy ra đệ quy vô tận.
- **`tests/auth.test.ts`**: Kiểm tra trạng thái Pinia store, xử lý phiên làm việc và lỗi cấu hình an toàn.

---

## ⚖️ Giấy phép & Bản quyền (AGPL-3.0)

Dự án này được cấp phép theo [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).  
Phần giao diện kế thừa phong cách từ [Stapxs QQ Lite 2.0](https://github.com/Stapxs/Stapxs-QQ-Lite-2.0). Mọi tài nguyên nhãn hiệu QQ của bên thứ ba đã được loại bỏ và thay thế bằng icon mã nguồn mở cùng emoji hệ thống chuẩn Unicode.


---

## P2 — Realtime text chat
- Áp dụng P1 migration/seed và kiểm tra đúng 4 thành viên phòng.
- **Chạy `supabase/migrations/20261028010000_p2_realtime.sql` trong Supabase SQL Editor** để bật Postgres Changes cho `public.messages`. Frontend không tự thay publication.
- Trên 2 trình duyệt đăng nhập 2 thành viên: gửi tin nhắn, kiểm tra nhận ngay, refresh lịch sử, cuộn lên tải cũ.
- Kiểm tra mất kết nối rồi kết nối lại: tin nhắn bị lỡ được tải bù và chống trùng qua `message.id`.
- Nội dung text chỉ hiển thị qua Vue interpolation (không dùng `v-html`); quyền SELECT/INSERT tiếp tục do RLS tại PostgreSQL.
- Không có upload/DM/voice/video. Khi chưa bật publication, dữ liệu vẫn lưu và hiện qua refresh nhưng không đẩy realtime.
- Chạy `yarn typecheck && yarn test && yarn build` để xác nhận build trước khi deploy.


## P3 — Stabilization & QA
- Khi đổi tài khoản/logout: xóa cached room/messages và bỏ Realtime subscription; kết quả request cũ không được hiển thị dưới account mới.
- Khi mạng mất: dùng **Thử lại**, đồng bộ các tin thiếu; kể cả phòng ban đầu không có tin.
- Khi đọc lịch sử, tin mới hiện nút **tin mới — Xem** thay vì tự cuộn.
- DB tests trong CI là unit/simulation. **KHÔNG** coi PASS nghĩa là Supabase RLS live đã được kiểm chứng.
- Test live **chỉ khi chủ động bật**: `RUN_LIVE_SUPABASE_TESTS=1` cùng với `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (hoặc publishable key), `TEST_MEMBER_EMAIL`, `TEST_MEMBER_PASSWORD`, `TEST_OUTSIDER_EMAIL`, `TEST_OUTSIDER_PASSWORD`.
- Nếu thiếu cấu hình hoặc migration, test live PHẢI FAIL. Không đặt mật khẩu trong git hoặc GitHub issue. Thử trên project test, không dùng dữ liệu thật.
- Realtime P2 vẫn yêu cầu chạy `supabase/migrations/20261028010000_p2_realtime.sql` nếu chưa áp dụng và kiểm tra 2 tài khoản thực.

---

## P4 — Android App với Capacitor

Đóng gói ứng dụng Vue 3 thành ứng dụng Android native bằng Capacitor (chế độ single-codebase cho Web và Android; không viết lại UI, không thay đổi backend Supabase).

### 1. Yêu cầu Môi trường Build
- **Node.js**: v22.x
- **Package Manager**: Yarn v4 (`yarn@4.12.0`)
- **JDK**: Java 17 (Eclipse Temurin / OpenJDK 17)
- **Android SDK**: API Level 34 (Android 14) & Build Tools 34.0.0
- **Android Studio**: Bản Giraffe trở lên (tùy chọn nếu dùng CLI)

### 2. Các bước Build từ mã nguồn (CLI & Local)
```bash
# 1. Cài đặt dependencies
yarn install

# 2. Cấu hình biến môi trường client
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env

# 3. Kiểm tra kiểm thử và typecheck
yarn typecheck
yarn test

# 4. Build web bundle vào dist/
yarn build

# 5. Đồng bộ web assets và native plugins sang Android project
yarn cap:sync
# hoặc: npx cap sync android

# 6. Build Debug APK bằng Gradle Wrapper
cd android
./gradlew assembleDebug
cd ..
```

### 3. Đường dẫn Output Debug APK & Cài đặt lên thiết bị
- **Đường dẫn file APK**:
  `android/app/build/outputs/apk/debug/app-debug.apk`
- **Cài đặt lên thiết bị Android qua ADB**:
  ```bash
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Mở Android Studio để debug / chạy Emulator**:
  ```bash
  yarn cap:open:android
  ```

### 4. Tự động hóa qua GitHub Actions CI
Dự án đã tích hợp workflow tự động: `.github/workflows/android.yml`.
- Tự động chạy mỗi khi push hoặc tạo PR vào các nhánh `mvp`, `next`, `feature/**`.
- Cài đặt Node 22, JDK 17, Android SDK.
- Kiểm tra `yarn typecheck` và `yarn test`.
- Chạy `yarn build` và `npx cap sync android`.
- Thực hiện `./gradlew assembleDebug` và upload artifact mang tên **`app-debug`**.

### 5. Mobile Runtime & Tính năng tương thích
- **Android Back Button**: Tích hợp điều hướng lùi phần cứng (đóng Modal Thông tin, đóng Drawer thành viên, quay lại danh sách phòng, hoặc thoát app khi ở màn hình gốc).
- **Status Bar**: Tự động chuyển đổi màu và icon sáng/tối theo theme.
- **Safe Area Insets**: Hỗ trợ notch camera, tai thỏ và thanh điều hướng ảo (`env(safe-area-inset-*)`).
- **Soft Keyboard (`adjustResize`)**: Tự động cuộn khung chat khi bàn phím ảo hiển thị, không che khuất ô nhập tin.
- **Pause / Resume Sync**: Tự động kiểm tra làm mới phiên làm việc Supabase và đồng bộ tin nhắn bị bỏ lỡ sau khi mở lại ứng dụng từ chạy nền.
- **Bảo mật mạng**: Enforce HTTPS / WSS qua `network_security_config.xml`, chặn cleartext HTTP toàn cục. Không chứa khóa bảo mật hay `service_role` phía client.

### 6. Bảng Kiểm Tra & Đánh Giá Tiêu Chí (Acceptance Matrix)
| Hạng mục / Tiêu chí | Trạng thái | Ghi chú kiểm chứng |
| :--- | :---: | :--- |
| Không sửa nhánh `next`, PR vào `mvp` | **PASS** | Nhánh phát triển từ `mvp`, `next` giữ nguyên |
| Web Typecheck (`yarn typecheck`) | **PASS** | `vue-tsc --noEmit` hoàn tất không lỗi |
| Web Test Suite (`yarn test`) | **PASS** | 28/28 vitest tests passed |
| Web Build (`yarn build`) | **PASS** | Đóng gói production sạch vào `dist/` |
| Capacitor Sync (`npx cap sync android`) | **PASS** | Đồng bộ assets và 3 plugins native thành công |
| Cấu hình bảo mật Android (HTTPS / WSS) | **PASS** | `network_security_config.xml` và `AndroidManifest.xml` |
| GitHub Actions Android Build Workflow | **PASS** | Cấu hình `.github/workflows/android.yml` upload artifact `app-debug` |
| Kiểm thử trên thiết bị vật lý thật | **NOT TESTED** | Môi trường agent không gắn thiết bị ngoại vi vật lý |

