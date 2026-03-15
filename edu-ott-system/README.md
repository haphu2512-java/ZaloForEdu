# Education OTT Platform (ZaloForEdu)

## Tổng quan
Hệ thống OTT giáo dục được thiết kế để tối ưu hóa việc giao tiếp và quản lý học tập giữa Giảng viên và Sinh viên. Dự án tích hợp các tính năng nhắn tin thời gian thực, quản lý lớp học, chia sẻ tài liệu và gọi điện video.

## Cấu trúc dự án (Monorepo)
Dự án được tổ chức theo cấu trúc monorepo để dễ dàng quản lý và chia sẻ code:

- **`backend/`**: Server API xây dựng bằng Node.js, Express và MongoDB.
- **`frontend/mobile-app/`**: Ứng dụng di động xây dựng bằng React Native và Expo.
- **`frontend/shared/`**: Chứa logic dùng chung cho các ứng dụng frontend (Web/Mobile) như Socket Services và Types.
- **`shared/`**: Thư mục chứa các hằng số (constants) và cấu hình dùng chung cho cả Backend và Frontend.
- **`docs/`**: Tài liệu thiết kế và hướng dẫn chi tiết.

## Các tính năng chính
- 💬 **Hệ thống Chat:** Hỗ trợ chat riêng tư, chat nhóm và chat theo lớp học.
- 📚 **Quản lý lớp học:** Giảng viên tạo lớp, sinh viên tham gia qua mã code.
- 📁 **Quản lý tài liệu:** Upload và chia sẻ tài liệu học tập trong từng lớp/nhóm.
- 🔔 **Thông báo:** Thông báo thời gian thực qua Socket.io.
- 📊 **Thống kê:** Dashboard theo dõi tiến độ và hoạt động.

## Tài liệu hướng dẫn
- **[Hướng dẫn cài đặt (SETUP.md)](./SETUP.md)**: Các bước để chạy môi trường phát triển.
- **[Tài liệu Backend API (backend/README.md)](./backend/README.md)**: Danh sách endpoint và cấu trúc database.
- **[Tài liệu Mobile App (frontend/mobile-app/README.md)](./frontend/mobile-app/README.md)**: Hướng dẫn chạy và phát triển app.

## Yêu cầu hệ thống
- Node.js >= 18
- MongoDB >= 6.0
- Expo CLI (cho mobile development)

## Giấy phép
Dự án được phát hành dưới giấy phép [MIT](./LICENSE).
