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
