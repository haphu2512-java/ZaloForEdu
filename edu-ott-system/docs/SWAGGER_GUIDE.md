# Hướng dẫn sử dụng Swagger UI

Dự án này sử dụng **Swagger (OpenAPI 3.0)** để tự động tạo tài liệu và cung cấp giao diện tương tác cho API.

## 1. Truy cập Swagger UI

Sau khi khởi chạy server backend, bạn có thể truy cập tài liệu API tại địa chỉ:

> **URL:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

Tại đây bạn sẽ thấy danh sách đầy đủ các API endpoint, model dữ liệu, và có thể gọi thử API trực tiếp.

## 2. Xác thực (Authentication)

Hầu hết các API đều yêu cầu xác thực bằng JWT Token. Để sử dụng tính năng "Try it out" cho các API bảo mật, bạn cần làm như sau:

1.  Gọi API **Login** (`/auth/login`) hoặc **Register** (`/auth/register`) để lấy `token`.
2.  Copy chuỗi `token` từ response.
3.  Kéo lên đầu trang Swagger UI, nhấn nút **Authorize** (biểu tượng ổ khóa).
4.  Nhập token vào ô **Value** (chỉ cần nhập token, không cần prefix `Bearer` vì Swagger đã cấu hình sẵn).
5.  Nhấn **Authorize** sau đó nhấn **Close**.

Bây giờ các request bạn thực hiện thông qua Swagger sẽ tự động đính kèm header `Authorization: Bearer <token>`.

## 3. Hướng dẫn phát triển (Dành cho Developer)

Chúng ta sử dụng thư viện `swagger-jsdoc` để sinh file Swagger từ các comment JSDoc trong code.

### Cấu trúc cơ bản

Đặt comment JSDoc ngay phía trên định nghĩa route trong các file `routes/*.js`.

Ví dụ:

```javascript
/**
 * @swagger
 * /examples:
 *   get:
 *     summary: Lấy danh sách ví dụ
 *     tags: [Examples]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/examples', exampleController.getExamples);
```

### Các Tags thường dùng

*   `summary`: Mô tả ngắn gọn về API.
*   `tags`: Nhóm API (ví dụ: Auth, Users, Classes).
*   `requestBody`: Định nghĩa dữ liệu gửi lên (cho POST/PUT).
*   `parameters`: Định nghĩa tham số trên URL (path/query param).
*   `responses`: Định nghĩa các mã phản hồi (200, 400, 401, ...).

### Xem mẫu

Bạn có thể xem file `src/routes/authRoutes.js` để thấy các ví dụ đầy đủ về cách viết tài liệu cho API Login và Register.

### Cập nhật cấu hình

Cấu hình chính của Swagger nằm tại `src/config/swagger.js`. Tại đây bạn có thể sửa:
*   Thông tin chung (Tiêu đề, version, mô tả).
*   Danh sách Server.
*   Cấu hình bảo mật.
