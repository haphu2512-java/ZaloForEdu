# Cập nhật Web Profile - Đồng bộ với Mobile

## ✅ Đã thêm vào Web Profile

### 1. Đăng xuất
- **Vị trí**: Sidebar menu → Khác → Đăng xuất
- **Chức năng**: 
  - Xóa token và refreshToken
  - Clear sessionStorage
  - Dispatch event `user-logout` cho ThemeContext
  - Redirect về /login
- **Confirm**: Có popup xác nhận

### 2. Đăng xuất tất cả thiết bị
- **Vị trí**: Sidebar menu → Khác → Đăng xuất tất cả thiết bị
- **Chức năng**:
  - Gọi API `/auth/logout-all`
  - Xóa token local
  - Dispatch event `user-logout`
  - Redirect về /login
- **Confirm**: Có popup xác nhận

### 3. Về hệ thống (About)
- **Vị trí**: Sidebar menu → Khác → Về hệ thống
- **Hiển thị**:
  - Tên ứng dụng: "Zalo Edu Web"
  - Phiên bản: "1.0.0"
  - Năm phát hành: "2026"
- **UI**: Grid 3 cards với icon và thông tin

### 4. Cập nhật tab Thông báo
- **Trước**: "Chưa có thông báo nào mới"
- **Sau**: "Xem thông báo ở góc trên bên phải (biểu tượng chuông)"
- **Lý do**: Web đã có NotificationsPanel ở header, không cần duplicate

---

## 📊 So sánh sau khi cập nhật

| Chức năng | Mobile | Web | Trạng thái |
|-----------|--------|-----|------------|
| **Đăng xuất** | ✅ | ✅ | ✅ Đã đồng bộ |
| **Đăng xuất tất cả thiết bị** | ✅ | ✅ | ✅ Đã đồng bộ |
| **Về ứng dụng** | ✅ | ✅ | ✅ Đã đồng bộ |
| **Xóa tài khoản** | ✅ | ✅ | ✅ Đã có sẵn |
| **Theme selector** | ✅ | ✅ | ✅ Đã có (MainLayout Settings Modal) |
| **Thông báo** | ✅ | ✅ | ✅ Đã có (NotificationsPanel) |

---

## 🔍 Kiểm tra lại các chức năng

### Web đã có (không cần thêm):
1. ✅ **Theme selector** - Có trong MainLayout Settings Modal
   - Light/Dark/System
   - Sync với backend
   - Real-time update
   
2. ✅ **Notifications** - Có NotificationsPanel riêng
   - Xem danh sách thông báo
   - Đánh dấu đã đọc
   - Đánh dấu tất cả đã đọc
   - Xóa thông báo
   - Accept/Reject friend request
   - Lưu trữ persistent (đăng nhập thiết bị khác vẫn thấy)

3. ✅ **OTP Modal** - Xác thực email/phone
   - 6 ô input
   - Auto-focus
   - Paste support
   - Error handling

4. ✅ **Password strength meter** - Thanh đo độ mạnh mật khẩu
   - 3 vạch: Yếu/Trung bình/Mạnh
   - Màu sắc: Đỏ/Vàng/Xanh
   - Real-time validation

---

## 🎯 Các chức năng Web có nhưng Mobile chưa có

### 1. OTP Modal (Web có, Mobile không)
- **Web**: Modal đẹp với 6 ô input, auto-focus, paste support
- **Mobile**: Chỉ có nút "Xác thực ngay" redirect về verify-email page
- **Đề xuất**: Thêm OTP Modal vào Mobile

### 2. Password Strength Meter (Web có, Mobile không)
- **Web**: Thanh 3 vạch với màu sắc (Yếu/Trung bình/Mạnh)
- **Mobile**: Không có
- **Đề xuất**: Thêm vào ChangePasswordModal trong Mobile

### 3. Badge xác thực Phone (Web có, Mobile không)
- **Web**: Hiển thị badge "Đã xác thực" hoặc nút "Xác thực ngay" cho phone
- **Mobile**: Chỉ có cho email
- **Đề xuất**: Thêm badge cho phone trong Mobile

### 4. Tab Danh sách bạn bè (Web có, Mobile không)
- **Web**: Tab riêng hiển thị grid bạn bè với avatar, tên, email
- **Mobile**: Chỉ hiển thị số lượng bạn bè
- **Đề xuất**: Thêm tab hoặc screen riêng cho danh sách bạn bè

---

## 🚀 Các chức năng Mobile có nhưng Web chưa có

### 1. Cài đặt Thông báo (Mobile có, Web không)
- **Mobile**: 4 toggle switches
  - Push Enabled
  - Message Enabled
  - Group Enabled
  - Sound Enabled
- **Web**: Không có
- **Đề xuất**: Thêm vào ProfilePage hoặc Settings Modal

### 2. Media Manager (Mobile có, Web không)
- **Mobile**: Tra cứu và xóa media theo ID
- **Web**: Không có
- **Đề xuất**: Thêm vào ProfilePage

### 3. Upload Cloudinary (Mobile có, Web không)
- **Mobile**: Upload avatar lên Cloudinary
- **Web**: Chỉ upload file local
- **Đề xuất**: Tích hợp Cloudinary vào Web

### 4. Nhập Avatar URL (Mobile có, Web không)
- **Mobile**: Cho phép nhập URL trực tiếp
- **Web**: Chỉ upload file
- **Đề xuất**: Thêm input URL vào Web

---

## 📝 Kết luận

### Đã hoàn thành:
- ✅ Thêm Đăng xuất vào Web
- ✅ Thêm Đăng xuất tất cả thiết bị vào Web
- ✅ Thêm Về ứng dụng vào Web
- ✅ Xác nhận Web đã có Theme selector
- ✅ Xác nhận Web đã có Notifications với persistent storage

### Cần làm tiếp (nếu muốn đồng bộ 100%):
1. **Ưu tiên cao**:
   - Thêm Cài đặt Thông báo vào Web (4 toggles)
   - Thêm OTP Modal vào Mobile
   - Thêm Password Strength Meter vào Mobile

2. **Ưu tiên trung bình**:
   - Thêm Badge xác thực Phone vào Mobile
   - Thêm Media Manager vào Web
   - Thêm Tab Danh sách bạn bè vào Mobile

3. **Ưu tiên thấp**:
   - Thêm Upload Cloudinary vào Web
   - Thêm Nhập Avatar URL vào Web

---

## 🔧 Files đã thay đổi

- `frontend/web/src/pages/profile/ProfilePage.jsx`
  - Thêm import `LogOut` icon và `useNavigate`
  - Thêm hàm `handleLogout()`
  - Thêm hàm `handleLogoutAll()`
  - Thêm 2 menu items: "Đăng xuất" và "Đăng xuất tất cả thiết bị"
  - Cập nhật tab "Về hệ thống" với thông tin version
  - Cập nhật tab "Thông báo" với hướng dẫn

---

## ✅ Test checklist

- [ ] Click "Đăng xuất" → Confirm → Redirect về /login
- [ ] Click "Đăng xuất tất cả thiết bị" → Confirm → API call → Redirect về /login
- [ ] Click "Về hệ thống" → Hiển thị 3 cards với thông tin
- [ ] Theme vẫn hoạt động sau khi logout (reset về system)
- [ ] Notifications vẫn persistent sau khi đăng nhập lại
