# Backend - Education OTT Platform

## Giới thiệu

Backend API server cho hệ thống OTT giáo dục, xây dựng bằng Node.js, Express.js và MongoDB.

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/          # Cấu hình database, env, etc.
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middlewares
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── validators/      # Input validation
│   ├── socket/          # Socket.io configuration
│   └── server.js        # Entry point
├── uploads/             # Uploaded files (gitignored)
├── .env                 # Environment variables
└── package.json
```

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

3. Cấu hình các biến môi trường trong file `.env`

4. Khởi động MongoDB (nếu chạy local):
```bash
mongod
```

5. Chạy server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

> 📖 Chi tiết đầy đủ xem tại Swagger UI: `http://localhost:5000/api-docs`

### Authentication
- `POST /api/v1/auth/register` - Đăng ký tài khoản
- `POST /api/v1/auth/verify-email` - Xác thực email
- `POST /api/v1/auth/resend-verification` - Gửi lại email xác thực
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Đăng xuất
- `GET /api/v1/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/v1/auth/update-profile` - Cập nhật profile
- `PUT /api/v1/auth/change-password` - Đổi mật khẩu
- `POST /api/v1/auth/forgot-password` - Quên mật khẩu
- `PUT /api/v1/auth/reset-password/:token` - Đặt lại mật khẩu

### Users (Admin)
- `GET /api/v1/users` - Lấy danh sách users
- `GET /api/v1/users/:id` - Lấy thông tin user
- `PUT /api/v1/users/:id` - Cập nhật user
- `DELETE /api/v1/users/:id` - Xóa user

### Classes
- `GET /api/v1/classes` - Lấy danh sách lớp học (phân trang, tìm kiếm, lọc)
- `POST /api/v1/classes` - Tạo lớp học mới (Teacher/Admin)
- `GET /api/v1/classes/:id` - Chi tiết lớp học
- `PUT /api/v1/classes/:id` - Cập nhật lớp học (Teacher/Admin)
- `DELETE /api/v1/classes/:id` - Xóa lớp học (Teacher/Admin)
- `POST /api/v1/classes/:id/join` - Tham gia lớp học
- `POST /api/v1/classes/:id/leave` - Rời lớp học
- `GET /api/v1/classes/:id/members` - Lấy danh sách thành viên

### Groups
- `GET /api/v1/groups` - Lấy danh sách nhóm (lọc theo lớp)
- `POST /api/v1/groups` - Tạo nhóm mới
- `GET /api/v1/groups/:id` - Chi tiết nhóm
- `PUT /api/v1/groups/:id` - Cập nhật nhóm
- `DELETE /api/v1/groups/:id` - Xóa nhóm
- `POST /api/v1/groups/:id/members` - Thêm thành viên
- `DELETE /api/v1/groups/:id/members/:userId` - Xóa thành viên

### Messages
- `GET /api/v1/messages` - Lấy tin nhắn (theo phòng, phân trang, infinite scroll)
- `POST /api/v1/messages` - Gửi tin nhắn (text/image/video/file/audio)
- `PUT /api/v1/messages/:id` - Sửa tin nhắn
- `DELETE /api/v1/messages/:id` - Xóa tin nhắn (soft delete)
- `POST /api/v1/messages/:id/read` - Đánh dấu đã đọc
- `POST /api/v1/messages/:id/reaction` - Thêm reaction emoji

### Files
- `GET /api/v1/files` - Lấy danh sách file (lọc theo phòng, loại)
- `POST /api/v1/files/upload` - Upload file (multipart/form-data, max 50MB)
- `GET /api/v1/files/:id` - Lấy thông tin file
- `DELETE /api/v1/files/:id` - Xóa file (soft delete)

### Analytics
- `GET /api/v1/analytics/dashboard` - Thống kê tổng quan (role-based)
- `GET /api/v1/analytics/classes/:id` - Thống kê lớp học (hoạt động, top thành viên)
- `GET /api/v1/analytics/users/:id` - Thống kê người dùng (Admin/Teacher)

## Socket.io Events

### Client → Server
- `join:room` - Tham gia phòng chat
- `leave:room` - Rời phòng chat
- `message:send` - Gửi tin nhắn
- `typing:start` - Bắt đầu gõ
- `typing:stop` - Dừng gõ
- `call:offer` - Gửi offer cho video call
- `call:answer` - Trả lời video call
- `call:ice-candidate` - Gửi ICE candidate

### Server → Client
- `user:online` - User online
- `user:offline` - User offline
- `message:new` - Tin nhắn mới
- `message:read` - Tin nhắn đã đọc
- `typing:start` - Ai đó đang gõ
- `typing:stop` - Dừng gõ
- `call:offer` - Nhận offer
- `call:answer` - Nhận answer
- `call:ice-candidate` - Nhận ICE candidate
- `call:end` - Cuộc gọi kết thúc

## Models

### User
- email
- password (hashed)
- fullName
- avatar
- role (student/teacher/admin)
- studentId
- phoneNumber
- dateOfBirth
- bio
- department
- isActive
- isEmailVerified

### Class
- name
- code
- description
- coverImage
- subject
- semester
- academicYear
- teacher (ref User)
- students (array of User refs)
- status

### Group
- name
- description
- class (ref Class)
- members (array of User refs)
- createdBy (ref User)

### Message
- content
- type (text/image/video/file)
- sender (ref User)
- room (Class/Group/Conversation)
- attachments
- readBy
- reactions

## Testing

```bash
npm test
```

## Deployment

### Docker
```bash
docker build -t edu-ott-backend .
docker run -p 5000:5000 edu-ott-backend
```

### PM2
```bash
pm2 start src/server.js --name edu-ott-backend
```

## License

MIT
