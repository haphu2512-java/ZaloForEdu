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

## REST API (Đã nâng cấp)
- Toàn bộ Mock API đã được xóa bỏ.
- Mobile App kết nối với Backend thông qua IP `http://10.0.2.2:5000` (đối với Android Emulator) hoặc `http://localhost:5000` (đối với môi trường khác).
