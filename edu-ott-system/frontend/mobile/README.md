# Mobile App - Education OTT Platform

## Giới thiệu
Ứng dụng di động dành cho hệ thống OTT giáo dục ZaloForEdu. Được xây dựng bằng React Native và Expo với mục tiêu cung cấp môi trường giao tiếp, học tập hiệu quả cho sinh viên và giảng viên.

## Giao diện & Chủ đề (Theme)
- **Educational Light Theme:** Ứng dụng đã được chuyển đổi sang giao diện màu sáng, với các tông màu chủ đạo như Xanh dương mềm mại (Soft Blue), Xanh lá tích cực (Educational Green), và Nền xám nhạt (Soft Background). Những màu sắc này được tối ưu hóa đặc biệt cho mục đích giáo dục, giúp giảm mỏi mắt, tăng cường sự tập trung và thân thiện với người dùng.
- **Tích hợp API thực:** Giao diện đã được nâng cấp không dùng MockAPI nữa. Toàn bộ các luồng dữ liệu (Tin nhắn, Lớp học, Nhóm học, và Hồ sơ cá nhân) đều được lấy từ Backend thông qua tiện ích API (`utils/api.ts`).

## Cấu trúc thư mục tham khảo
- `app/`: Chứa các màn hình và định tuyến sử dụng Expo Router.
- `app/(tabs)/`: Chứa các tab chính của ứng dụng: Nhắn tin (hiện tại là danh sách tổng hợp từ `/conversations`), Lớp học, Nhóm, và Cá nhân. Các tab này đều đã được call API thực tế từ backend.
- `components/`: Các component tái sử dụng.
- `shared/`: (Liên kết từ `frontend/shared`) Chứa các service và type dùng chung (như `socketService.ts`).
- `constants/`: Khai báo màu sắc chuẩn và các constant khác.
- `utils/`: Các hàm tiện ích, trong đó có `api.ts` hỗ trợ gọi API trực tiếp vào Backend (tự động nhận diện thiết bị ảo Android/iOS).

## Khởi chạy
1. Cài đặt dependencies:
   ```bash
   npm install
   ```
2. Chạy ứng dụng:
   ```bash
   npx expo start
   ```
3. Nhấn `a` để mở trên Android Emulator, `i` để mở trên iOS Simulator, hoặc quét mã QR qua Expo Go.

## Xác thực (Authentication Flow)
Ứng dụng đã hoàn thiện luồng xác thực bảo mật chuẩn với Backend:
- Đăng ký và Xác thực Email bằng Token.
- Đăng nhập (Tự động cấp và làm mới JWT / Refresh Token qua `AsyncStorage`).
- Quên mật khẩu và Đặt lại mật khẩu an toàn.
- Quản lý tài khoản: Cập nhật Profile, thay đổi ảnh đại diện (cho phép chọn preset hoặc URL tùy chỉnh), đổi mật khẩu từ màn hình Cá nhân.

## Cấu hình Mạng (Networking) & API
1. **Liên kết IP Động (Dynamic IP Binding):** Ứng dụng tích hợp cấu hình tự nhận diện IP thông qua `Constants.expoConfig.hostUri`. Nhờ đó, nếu bạn test trên điện thoại thật bằng phần mềm Expo Go (cùng mạng Wi-Fi), app sẽ **tự động** kết nối về máy tính đang chạy Backend mà không cần sửa IP thủ công.
2. **Android Emulator fallback:** Nếu chạy bằng Emulator, App sẽ tự điều hướng về `http://10.0.2.2:5000`.
3. **Tuỳ chỉnh IP Thủ công:** Trong trường hợp môi trường mạng đặc thù không nhận được Expo host, bạn chỉ việc sửa biến IP dự phòng trong file `utils/api.ts` trỏ đúng vào IPv4 của máy tính server (ví dụ `192.168.x.x`).

## Group Management Parity (Mobile)

### Muc tieu
- Dong bo tinh nang quan ly nhom voi web, giu trai nghiem mobile-native.
- Khong thay doi backend; mobile su dung lai toan bo endpoint hien co.

### Ma tran quyen theo vai tro
- Owner:
  - Toan quyen cai dat nhom, phan quyen, chuyen quyen, chan/bo chan, duyet thanh vien.
  - Tao/sua/xoa reminder, tao poll, pin/unpin, doi ten/anh nhom.
- Admin (pho nhom):
  - Quan ly thanh vien (tru owner), duyet join request, chan/bo chan.
  - Tao/sua/xoa reminder, tao poll, pin/unpin, doi ten/anh nhom (neu setting cho phep).
- Member:
  - Quyen phu thuoc setting nhom:
    - `canMembersUpdateInfo`
    - `canMembersPin`
    - `canMembersCreateReminders`
    - `canMembersCreatePolls`
    - `canMembersSendMessages`

### Settings nhom da dong bo
- `isApprovalRequired`
- `markAdminMessages`
- `allowNewMembersReadHistory`
- `allowInviteLink`
- Nhom quyen thanh vien: `canMembersUpdateInfo`, `canMembersPin`, `canMembersCreateReminders`, `canMembersCreatePolls`, `canMembersSendMessages`

### Tinh nang da co tren mobile
- Doi ten, doi anh nhom (co check permission).
- Pin/unpin tin nhan theo permission.
- Tao poll theo permission.
- Reminder flow: tao/sua/xoa, tham gia/tu choi, cap nhat realtime.
- Duyet thanh vien moi (join requests).
- Chan khoi nhom + bo chan.
- Quan ly truong/pho nhom.
- Link moi nhom:
  - Uu tien web link dang `/join/<code>` de chia se.
  - Van ho tro deep link app cho luong tham gia.

### Route thao tac chinh
- Chi tiet hoi thoai: `/conversation-details?id=<conversationId>`
- Tin nhan da ghim: `/pinned-messages?id=<conversationId>`
- Nhac hen: `/reminders?id=<conversationId>`
- Duyet thanh vien: `/join-requests?id=<conversationId>`
- Chan khoi nhom: `/blocked-members?id=<conversationId>`
- Truong & pho nhom: `/group-roles?id=<conversationId>`
- Tham gia nhom bang link: `/join-group?code=<inviteCode>`

### Invite Link Config
- Set `EXPO_PUBLIC_WEB_URL` (default `http://localhost:3000`) so mobile shares group invite links in web format `/join/<code>`.
