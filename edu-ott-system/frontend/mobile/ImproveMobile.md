# Kế Hoạch Nâng Cấp ZaloForEdu Mobile 🚀

> **Cập nhật lần cuối: 12/04/2026** — Antigravity AI

---

## 1. Phân Tích Khoảng Cách (Gap Analysis)

| Tính năng | Zalo | ZaloForEdu (Hiện tại) | Ưu tiên |
| :--- | :--- | :--- | :--- |
| **Trả lời tin nhắn (Reply)** | Vuốt để reply với context trích dẫn | ✅ Đã thêm reply box + quote context | 🟢 Hoàn thành |
| **Trạng thái tin nhắn** | Đang gửi / Đã gửi / Đã nhận / Đã xem | ✅ Đã hiển thị icon trạng thái (✓ / ✓✓ / ✓✓ xanh) | 🟢 Hoàn thành |
| **Xem ảnh trong chat** | Ảnh hiển thị ngay trong bubble | ✅ Đã render ảnh inline, tap mở fullscreen viewer | 🟢 Hoàn thành |
| **Gửi ảnh nhanh** | Nút camera/gallery riêng | ✅ Nút (+) mở media menu chọn Ảnh / Tài liệu | 🟢 Hoàn thành |
| **Tab phân loại tin nhắn** | Tất cả / Chưa đọc / Nhóm | ✅ Tabs: Tất cả / Công việc / Gia đình | 🟢 Hoàn thành |
| **Chỉnh sửa nhóm từ chat** | Nút settings trong header | ✅ Nút (...) → màn hình Conversation Details | 🟢 Hoàn thành |
| **Đa phương tiện** | Gửi Video, Voice, Vị trí | ⬜ Chưa có tin nhắn thoại, vị trí | ⚡ Trung bình |
| **Typing Indicator** | "Đang soạn tin nhắn…" | ⬜ Chưa có | ⚡ Trung bình |
| **QR Code kết bạn** | Quét mã QR để kết bạn | ⬜ Chưa có | ⚡ Trung bình |
| **Edu: Bình chọn (Poll)** | N/A | ⬜ Chưa có — cần cho lớp học | 🔥 Cao |
| **Edu: Bảng tin lớp** | N/A | ⬜ Chưa có — thông báo từ trường/lớp | 🔥 Cao |

---

## 2. Chi Tiết Những Gì Đã Thực Hiện ✅

### A. Màn hình Chat (`app/chat/[id].tsx`)

- **Trạng thái tin nhắn:** Mỗi tin nhắn của mình hiển thị icon nhỏ ở góc phải dưới:
  - ⏱ `time-outline` = Đang gửi
  - `checkmark` trắng mờ = Đã gửi
  - `checkmark-done` trắng = Đã nhận  
  - `checkmark-done` xanh neon = Đã xem

- **Hiển thị ảnh trong bubble:** Media có `mimeType` bắt đầu bằng `image/` sẽ render ra `<Image>` thay vì icon file.
  - Tap vào ảnh → mở fullscreen Image Viewer với nền đen.
  - Các file còn lại vẫn hiển thị dạng attachment với icon download.

- **Tính năng Trả lời (Reply):**
  - Nhấn giữ tin nhắn → chọn "↩️ Trả lời"
  - Xuất hiện "Reply Preview Bar" phía trên input, hiển thị nội dung trích dẫn.
  - Khi gửi → tin nhắn được gắn `replyTo` ID.
  - Trong bubble hiển thị quote box với đường viền màu.

- **Nút Media (+):** Thay thế nút clip cũ bằng nút `+` mở media menu dạng bottom sheet với hai lựa chọn:
  - 📸 **Thư viện ảnh** → `ImagePicker` (tự động upload Cloudinary + đăng ký media)
  - 📄 **Tệp tài liệu** → `DocumentPicker` (Base64 upload)

- **Giao diện bubble cải tiến:**
  - Avatar người gửi hiển thị trong nhóm (bên trái, nhỏ)
  - Tên người gửi màu tint trong nhóm
  - Giờ gửi hiển thị nhỏ ở mỗi bubble
  - Phân cách rõ "tin nhắn của tôi" vs "tin nhắn người khác"

### B. Màn hình Danh sách tin nhắn (`app/(tabs)/index.tsx`)

- **3 Tab lọc:** Tất cả | Công việc | Gia đình
  - Badge số lượng hiển thị trên mỗi tab
  - Lọc theo `conversation.preference.category`

- **Action Sheet khi nhấn giữ cải tiến:**
  - Icons màu sắc cho từng lựa chọn
  - Thêm nút "Chuyển về Tất cả" nếu đang trong category khác
  - Nút **Quản lý nhóm** (cho group) dẫn thẳng đến Conversation Details
  - Handle bar kéo ở đầu sheet

---

## 3. Lộ Trình Tiếp Theo 📋

### Phase 2 – Cải thiện Kết nối & UX
- [ ] **Typing Indicator:** Emit `user_typing` qua socket, hiển thị "... đang soạn" trong chat
- [ ] **QR Code:** Sinh mã QR từ userId, cho phép scan để gửi kết bạn nhanh (hữu ích cho GV/HS)
- [ ] **Tin nhắn thoại:** Tích hợp `expo-av` để record audio, upload và phát lại

### Phase 3 – Tính năng đặc thù Giáo dục
- [ ] **Bình chọn (Poll):** Giáo viên tạo câu hỏi nhiều lựa chọn trong nhóm lớp
- [ ] **Bảng tin lớp (Class Board):** Tab riêng trong nhóm để ghim thông báo quan trọng từ nhà trường
- [ ] **Nhắc lịch / Deadline:** Tích hợp lịch với push notification cho phụ huynh
- [ ] **Huy hiệu vai trò:** Icon đặc biệt cho Giáo viên, Phụ huynh, Học sinh

---

*Bản tài liệu này được tạo và cập nhật tự động bởi Antigravity AI Assistant.*
