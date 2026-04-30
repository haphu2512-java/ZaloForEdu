# So sánh chức năng Cài đặt/Cá nhân giữa Mobile và Web

## 📱 MOBILE - Profile Screen (`frontend/mobile/app/(tabs)/profile.tsx`)

### Thông tin cá nhân
- ✅ Avatar (có thể thay đổi)
- ✅ Username
- ✅ Email (có badge xác thực/chưa xác thực)
- ✅ Số điện thoại
- ✅ Số lượng bạn bè
- ✅ Ngày tạo tài khoản
- ✅ Trạng thái online/offline

### Tài khoản
- ✅ Chỉnh sửa hồ sơ (EditProfileModal)
  - Username
  - Số điện thoại
- ✅ Đổi mật khẩu (ChangePasswordModal)
- ✅ Đổi ảnh đại diện (ChangeAvatarModal)
  - Upload từ thư viện
  - Nhập URL
  - Upload lên Cloudinary
- ✅ Media Manager (tra cứu và xóa media theo ID)
- ✅ Tin nhắn lưu trữ (Archived Conversations)
- ✅ Danh sách chặn (Blocked Users)

### Cài đặt khác
- ✅ **Giao diện (Theme)**
  - ☀️ Sáng (Light)
  - 🌙 Tối (Dark)
  - 📱 Hệ thống (System/Auto)
- ✅ **Thông báo**
  - Thông báo đẩy (Push Enabled)
  - Thông báo tin nhắn (Message Enabled)
  - Thông báo nhóm (Group Enabled)
  - Âm thanh thông báo (Sound Enabled)
- ✅ Xem thông báo (Notifications page)
- ✅ Về ứng dụng (Version 1.0.0)

### Đăng xuất & Xóa tài khoản
- ✅ Đăng xuất
- ✅ Đăng xuất tất cả thiết bị
- ✅ Xóa tài khoản (soft delete)

### Email Verification
- ✅ Badge hiển thị trạng thái xác thực email
- ✅ Nút "Bấm xác thực" nếu chưa xác thực
- ✅ Gửi lại OTP xác thực email
- ✅ Banner cảnh báo nếu email chưa xác thực

---

## 💻 WEB - Profile Page (`frontend/web/src/pages/profile/ProfilePage.jsx`)

### Thông tin cá nhân
- ✅ Avatar (có thể thay đổi)
- ✅ Username
- ✅ Email (có badge xác thực/chưa xác thực)
- ✅ Số điện thoại (có badge xác thực/chưa xác thực)
- ✅ Số lượng bạn bè
- ✅ Ngày tham gia
- ✅ Trạng thái "Đang hoạt động"

### Tabs/Sections
- ✅ **Xem hồ sơ** (View Profile)
  - Hiển thị thông tin liên hệ
  - Badge xác thực cho email và phone
  - Nút "Xác thực ngay" nếu chưa xác thực
- ✅ **Chỉnh sửa hồ sơ** (Edit Profile)
  - Username
  - Số điện thoại
  - Email
  - Avatar (upload file)
- ✅ **Danh sách bạn bè** (Friends)
  - Hiển thị grid bạn bè
  - Avatar, tên, email
- ✅ **Đổi mật khẩu** (Password)
  - Mật khẩu hiện tại
  - Mật khẩu mới
  - Xác nhận mật khẩu
  - **Thanh đo độ mạnh mật khẩu** (Yếu/Trung bình/Mạnh)
  - Toggle hiển thị/ẩn mật khẩu

### OTP Verification Modal
- ✅ Xác thực số điện thoại (OTP 6 số)
- ✅ Xác thực email (OTP 6 số)
- ✅ Tự động gửi OTP khi mở modal
- ✅ Paste OTP từ clipboard
- ✅ Auto-focus input tiếp theo

### Xóa tài khoản
- ✅ Modal xác nhận xóa tài khoản
- ✅ Yêu cầu nhập mật khẩu để xác nhận
- ✅ Soft delete

### Sidebar Menu
- ✅ Xem hồ sơ
- ✅ Chỉnh sửa hồ sơ
- ✅ Danh sách bạn bè
- ✅ Đổi mật khẩu
- ✅ Xóa tài khoản

---

## 🔄 SO SÁNH CHI TIẾT

| Chức năng | Mobile | Web | Ghi chú |
|-----------|--------|-----|---------|
| **Thông tin cơ bản** |
| Avatar | ✅ | ✅ | |
| Username | ✅ | ✅ | |
| Email | ✅ | ✅ | |
| Số điện thoại | ✅ | ✅ | |
| Số bạn bè | ✅ | ✅ | |
| Ngày tạo TK | ✅ | ✅ | |
| Trạng thái online | ✅ | ✅ | |
| **Chỉnh sửa hồ sơ** |
| Chỉnh sửa username | ✅ | ✅ | |
| Chỉnh sửa phone | ✅ | ✅ | |
| Chỉnh sửa email | ✅ | ✅ | |
| Upload avatar từ file | ✅ | ✅ | |
| Nhập avatar URL | ✅ | ❌ | **Mobile có, Web không** |
| Upload lên Cloudinary | ✅ | ❌ | **Mobile có, Web không** |
| **Xác thực** |
| Badge xác thực email | ✅ | ✅ | |
| Badge xác thực phone | ❌ | ✅ | **Web có, Mobile không** |
| Nút "Xác thực ngay" email | ✅ | ✅ | |
| Nút "Xác thực ngay" phone | ❌ | ✅ | **Web có, Mobile không** |
| OTP Modal cho email | ❌ | ✅ | **Web có, Mobile không** |
| OTP Modal cho phone | ❌ | ✅ | **Web có, Mobile không** |
| Gửi lại OTP | ✅ | ✅ | |
| **Mật khẩu** |
| Đổi mật khẩu | ✅ | ✅ | |
| Toggle hiển thị mật khẩu | ✅ | ✅ | |
| Thanh đo độ mạnh MK | ❌ | ✅ | **Web có, Mobile không** |
| **Giao diện** |
| Theme Light/Dark/System | ✅ | ❌ | **Mobile có, Web không** |
| **Thông báo** |
| Bật/tắt push notification | ✅ | ❌ | **Mobile có, Web không** |
| Bật/tắt thông báo tin nhắn | ✅ | ❌ | **Mobile có, Web không** |
| Bật/tắt thông báo nhóm | ✅ | ❌ | **Mobile có, Web không** |
| Bật/tắt âm thanh thông báo | ✅ | ❌ | **Mobile có, Web không** |
| Xem danh sách thông báo | ✅ | ✅ | |
| **Quản lý** |
| Media Manager | ✅ | ❌ | **Mobile có, Web không** |
| Tin nhắn lưu trữ | ✅ | ✅ | |
| Danh sách chặn | ✅ | ✅ | |
| Danh sách bạn bè | ❌ | ✅ | **Web có tab riêng, Mobile chỉ hiển thị số** |
| **Đăng xuất & Xóa** |
| Đăng xuất | ✅ | ❌ | **Mobile có, Web không rõ** |
| Đăng xuất tất cả thiết bị | ✅ | ❌ | **Mobile có, Web không** |
| Xóa tài khoản | ✅ | ✅ | |
| **Khác** |
| Về ứng dụng | ✅ | ❌ | **Mobile có, Web không** |

---

## 🎯 CÁC CHỨC NĂNG CẦN ĐỒNG BỘ

### 1. Mobile thiếu (Web có):
- ❌ **OTP Modal** cho xác thực email/phone (Web có modal đẹp với 6 ô input)
- ❌ **Badge xác thực phone** (Web hiển thị trạng thái xác thực phone)
- ❌ **Nút "Xác thực ngay" cho phone** (Web có)
- ❌ **Thanh đo độ mạnh mật khẩu** (Web có thanh 3 vạch: Yếu/Trung bình/Mạnh)
- ❌ **Tab Danh sách bạn bè** (Web có tab riêng hiển thị grid bạn bè)

### 2. Web thiếu (Mobile có):
- ❌ **Theme selector** (Light/Dark/System) - Mobile có 3 nút chọn theme
- ❌ **Cài đặt thông báo** (Push/Message/Group/Sound) - Mobile có 4 toggle switches
- ❌ **Media Manager** - Mobile có chức năng tra cứu và xóa media theo ID
- ❌ **Upload avatar lên Cloudinary** - Mobile có tích hợp Cloudinary
- ❌ **Nhập avatar URL** - Mobile cho phép nhập URL trực tiếp
- ❌ **Đăng xuất** và **Đăng xuất tất cả thiết bị** - Mobile có 2 nút riêng
- ❌ **Về ứng dụng** - Mobile hiển thị version

---

## 📋 ĐỀ XUẤT ĐỒNG BỘ

### Ưu tiên cao:
1. **Thêm Theme selector vào Web** (Light/Dark/System)
2. **Thêm Cài đặt thông báo vào Web** (4 toggle switches)
3. **Thêm OTP Modal vào Mobile** (xác thực email/phone)
4. **Thêm Badge xác thực phone vào Mobile**
5. **Thêm Thanh đo độ mạnh mật khẩu vào Mobile**

### Ưu tiên trung bình:
6. **Thêm Đăng xuất/Đăng xuất tất cả vào Web**
7. **Thêm Tab Danh sách bạn bè vào Mobile**
8. **Thêm Media Manager vào Web**

### Ưu tiên thấp:
9. Thêm "Về ứng dụng" vào Web
10. Thêm upload Cloudinary vào Web
11. Thêm nhập avatar URL vào Web

---

## 🔧 KẾT LUẬN

**Mobile** có nhiều chức năng cài đặt hơn (theme, notifications, media manager), trong khi **Web** có UI xác thực OTP đẹp hơn và thanh đo độ mạnh mật khẩu.

Cần đồng bộ để 2 platform có trải nghiệm nhất quán!
