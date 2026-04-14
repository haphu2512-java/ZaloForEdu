# Shared Constants & Configuration

Thư mục này chứa mã nguồn dùng chung cho toàn bộ hệ thống (cả Frontend và Backend).

## Cấu trúc
- `constants/`: Chứa các giá trị hằng số như:
  - `USER_ROLES`: Quy định các quyền (student, teacher, admin).
  - `SOCKET_EVENTS`: Tên các sự kiện Socket.io để tránh sai sót khi gõ tay ở hai phía.
  - `MESSAGE_TYPES`: Các loại tin nhắn hỗ trợ (text, image, file...).
  - `API_STATUS`: Các trạng thái trả về của API.

## Cách sử dụng
Để đảm bảo tính nhất quán, hãy luôn sử dụng các hằng số từ thư mục này thay vì hard-code chuỗi ký tự trong logic xử lý.

```javascript
// Ví dụ sử dụng trong Backend hoặc Frontend
const { SOCKET_EVENTS } = require('../../shared/constants');
socket.emit(SOCKET_EVENTS.MESSAGE_NEW, messageData);
```
