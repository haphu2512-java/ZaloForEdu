# Shared Frontend Logic

Thư mục này chứa logic và các định nghĩa kiểu dữ liệu dùng chung cho các ứng dụng Frontend (phiên bản Web và phiên bản Mobile App).

## Nội dung
- **`services/`**: Các service xử lý logic bên thứ ba hoặc logic phức tạp (ví dụ: `socketService.ts` quản lý kết nối Socket.io).
- **`types/`**: Định nghĩa các TypeScript Interfaces/Types cho toàn bộ frontend (nhưng Model của tin nhắn, người dùng, lớp học...).

## Mục tiêu
Việc gộp các logic này vào thư mục `shared/` giúp việc phát triển bản Web (React.js/Next.js) sau này cực kỳ nhanh chóng vì có thể dùng lại toàn bộ logic kết nối và định nghĩa dữ liệu từ bản Mobile App hiện tại.
