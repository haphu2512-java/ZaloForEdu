# Backend - Education OTT Platform

## Giới thiệu

Backend API server cho hệ thống OTT giáo dục, xây dựng bằng Node.js, Express.js và MongoDB.

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/              # Cấu hình database, swagger, etc.
│   │   ├── database.js
│   │   └── swagger.js
│   ├── controllers/         # Request handlers (thin layer)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── classController.js
│   │   ├── groupController.js
│   │   ├── conversationController.js
│   │   ├── messageController.js
│   │   ├── fileController.js
│   │   └── analyticsController.js
│   ├── services/            # Business logic layer
│   │   ├── authService.js
│   │   ├── classService.js
│   │   ├── groupService.js
│   │   ├── messageService.js
│   │   ├── fileService.js
│   │   ├── analyticsService.js
│   │   └── socketService.js
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   ├── Class.js
│   │   ├── Group.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── File.js
│   │   └── RefreshToken.js
│   ├── routes/              # API routes + Swagger JSDoc
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── classRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── conversationRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── fileRoutes.js
│   │   └── analyticsRoutes.js
│   ├── middlewares/         # Custom middlewares
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── socket/              # Socket.io (modular handlers)
│   │   ├── index.js         # Entry point + auth middleware
│   │   ├── chatHandler.js   # Chat events
│   │   └── callHandler.js   # Video/voice call events
│   ├── utils/               # Helper functions
│   │   ├── appError.js
│   │   └── asyncHandler.js
│   └── server.js            # Entry point
├── uploads/                 # Uploaded files (gitignored)
├── .env                     # Environment variables
└── package.json
```

## Kiến trúc

Dự án sử dụng kiến trúc **3 lớp (three-tier)** :

```
Route (+ Swagger) → Controller (req/res) → Service (business logic) → Model (data)
```

- **Controller**: Chỉ xử lý request/response, extract data, gọi service, format response
- **Service**: Toàn bộ business logic, validation, authorization, tương tác DB
- **Model**: Schema definition, indexes, methods, virtuals

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

6. Xem API Documentation:
```
http://localhost:5000/api-docs
```

## API Endpoints (42 endpoints)

> 📖 Chi tiết đầy đủ xem tại Swagger UI: `http://localhost:5000/api-docs`

### Authentication (11 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| POST | `/api/v1/auth/register` | Đăng ký tài khoản | Public |
| POST | `/api/v1/auth/verify-email` | Xác thực email | Public |
| POST | `/api/v1/auth/resend-verification` | Gửi lại email xác thực | Public |
| POST | `/api/v1/auth/login` | Đăng nhập | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Đăng xuất | Private |
| GET | `/api/v1/auth/me` | Lấy thông tin user hiện tại | Private |
| PUT | `/api/v1/auth/update-profile` | Cập nhật profile | Private |
| PUT | `/api/v1/auth/change-password` | Đổi mật khẩu | Private |
| POST | `/api/v1/auth/forgot-password` | Quên mật khẩu | Public |
| PUT | `/api/v1/auth/reset-password/:token` | Đặt lại mật khẩu | Public |

### Users (4 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/users` | Lấy danh sách users | Admin |
| GET | `/api/v1/users/:id` | Lấy thông tin user | Admin |
| PUT | `/api/v1/users/:id` | Cập nhật user | Admin |
| DELETE | `/api/v1/users/:id` | Xóa user | Admin |

### Classes (8 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/classes` | Danh sách lớp học (phân trang, tìm kiếm, lọc) | Private |
| POST | `/api/v1/classes` | Tạo lớp học mới | Teacher/Admin |
| GET | `/api/v1/classes/:id` | Chi tiết lớp học | Private |
| PUT | `/api/v1/classes/:id` | Cập nhật lớp học | Teacher/Admin |
| DELETE | `/api/v1/classes/:id` | Xóa lớp học | Teacher/Admin |
| POST | `/api/v1/classes/:id/join` | Tham gia lớp học | Private |
| POST | `/api/v1/classes/:id/leave` | Rời lớp học | Private |
| GET | `/api/v1/classes/:id/members` | Danh sách thành viên | Private |

### Groups (7 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/groups` | Danh sách nhóm (lọc theo lớp) | Private |
| POST | `/api/v1/groups` | Tạo nhóm mới | Private |
| GET | `/api/v1/groups/:id` | Chi tiết nhóm | Private |
| PUT | `/api/v1/groups/:id` | Cập nhật nhóm | Creator/Admin |
| DELETE | `/api/v1/groups/:id` | Xóa nhóm | Creator/Admin |
| POST | `/api/v1/groups/:id/members` | Thêm thành viên | Private |
| DELETE | `/api/v1/groups/:id/members/:userId` | Xóa thành viên | Creator/Admin |

### Conversations (2 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/conversations` | Lấy danh sách hội thoại (gồm cả Lớp và Nhóm) | Private |
| POST | `/api/v1/conversations` | Tạo hoặc lấy hội thoại riêng với User | Private |

### Messages (6 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/messages` | Lấy tin nhắn (theo phòng, phân trang) | Private |
| POST | `/api/v1/messages` | Gửi tin nhắn | Private |
| PUT | `/api/v1/messages/:id` | Sửa tin nhắn | Sender |
| DELETE | `/api/v1/messages/:id` | Xóa tin nhắn (soft delete) | Sender/Admin |
| POST | `/api/v1/messages/:id/read` | Đánh dấu đã đọc | Private |
| POST | `/api/v1/messages/:id/reaction` | Thêm reaction emoji | Private |

### Files (4 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/files` | Danh sách file (lọc theo phòng, loại) | Private |
| POST | `/api/v1/files/upload` | Upload file (max 50MB) | Private |
| GET | `/api/v1/files/:id` | Lấy thông tin file | Private |
| DELETE | `/api/v1/files/:id` | Xóa file (soft delete) | Uploader/Admin |

### Analytics (3 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/analytics/dashboard` | Thống kê tổng quan (role-based) | Private |
| GET | `/api/v1/analytics/classes/:id` | Thống kê lớp học | Private |
| GET | `/api/v1/analytics/users/:id` | Thống kê người dùng | Admin/Teacher |

## Socket.io Events

> Kết nối: `io({ auth: { token: 'JWT_TOKEN' } })`

### Client → Server

| Event | Data | Mô tả | Handler |
|-------|------|--------|---------|
| `join:room` | `roomId` | Tham gia phòng chat | chatHandler |
| `leave:room` | `roomId` | Rời phòng chat | chatHandler |
| `message:send` | `{ content, type, roomId, roomModel, attachments?, replyTo? }` | Gửi tin nhắn (lưu DB) | chatHandler |
| `message:read` | `{ messageId, roomId }` | Đánh dấu đã đọc | chatHandler |
| `typing:start` | `{ roomId }` | Bắt đầu gõ | chatHandler |
| `typing:stop` | `{ roomId }` | Dừng gõ | chatHandler |
| `call:offer` | `{ to, offer, roomId?, callType? }` | Gửi WebRTC offer | callHandler |
| `call:answer` | `{ to, answer }` | Trả lời cuộc gọi | callHandler |
| `call:ice-candidate` | `{ to, candidate }` | Gửi ICE candidate | callHandler |
| `call:end` | `{ to, roomId? }` | Kết thúc cuộc gọi | callHandler |
| `call:reject` | `{ to, reason? }` | Từ chối cuộc gọi | callHandler |
| `call:busy` | `{ to }` | Báo đang bận | callHandler |

### Server → Client

| Event | Data | Mô tả |
|-------|------|--------|
| `user:online` | `{ userId, fullName, avatar, onlineAt }` | User online |
| `user:offline` | `{ userId, fullName, disconnectedAt }` | User offline |
| `users:online-list` | `[{ userId, fullName, avatar, connectedAt }]` | Danh sách user online (khi kết nối) |
| `room:user-joined` | `{ userId, fullName, avatar, roomId }` | User tham gia phòng |
| `room:user-left` | `{ userId, fullName, roomId }` | User rời phòng |
| `message:sent` | `Message object` | Xác nhận tin nhắn đã gửi (cho sender) |
| `message:new` | `Message object` | Tin nhắn mới (cho room members) |
| `message:read` | `{ messageId, userId, fullName, readAt }` | Tin nhắn đã đọc |
| `message:updated` | `Message object` | Tin nhắn đã sửa (từ REST API) |
| `message:deleted` | `{ messageId }` | Tin nhắn đã xóa (từ REST API) |
| `message:reaction` | `{ messageId, reactions }` | Reaction mới (từ REST API) |
| `typing:start` | `{ userId, fullName, avatar, roomId }` | Ai đó đang gõ |
| `typing:stop` | `{ userId, roomId }` | Dừng gõ |
| `call:offer` | `{ from, offer, roomId?, callType, caller }` | Nhận cuộc gọi đến |
| `call:answer` | `{ from, answer, answerer }` | Nhận answer |
| `call:ice-candidate` | `{ from, candidate }` | Nhận ICE candidate |
| `call:end` | `{ from, roomId?, endedBy }` | Cuộc gọi kết thúc |
| `call:rejected` | `{ from, reason, rejectedBy }` | Cuộc gọi bị từ chối |
| `call:busy` | `{ from, user }` | Người nhận đang bận |

## Models

### User
| Field | Type | Description |
|-------|------|-------------|
| email | String | Email (unique) |
| password | String | Hashed password |
| fullName | String | Tên đầy đủ |
| avatar | String | URL ảnh đại diện |
| role | Enum | student / teacher / admin |
| studentId | String | Mã sinh viên |
| phoneNumber | String | Số điện thoại |
| dateOfBirth | Date | Ngày sinh |
| bio | String | Tiểu sử (max 500 ký tự) |
| department | String | Khoa |
| isActive | Boolean | Trạng thái tài khoản |
| isEmailVerified | Boolean | Email đã xác thực |
| lastLogin | Date | Lần đăng nhập cuối |

### Class
| Field | Type | Description |
|-------|------|-------------|
| name | String | Tên lớp |
| code | String | Mã lớp (unique, uppercase) |
| description | String | Mô tả (max 1000) |
| coverImage | String | Ảnh bìa |
| subject | String | Môn học |
| semester | String | Học kỳ |
| academicYear | String | Năm học |
| schedule | Object | Lịch học (dayOfWeek, startTime, endTime, room) |
| teacher | Ref User | Giảng viên |
| students | [Ref User] | Danh sách sinh viên |
| maxStudents | Number | Sĩ số tối đa |
| status | Enum | active / completed / archived |
| settings | Object | allowStudentPost, allowFileUpload, requireApproval |

### Group
| Field | Type | Description |
|-------|------|-------------|
| name | String | Tên nhóm |
| description | String | Mô tả (max 500) |
| avatar | String | Ảnh đại diện nhóm |
| class | Ref Class | Lớp học chứa nhóm |
| members | Array | [{ user: Ref User, role: leader/member, joinedAt }] |
| createdBy | Ref User | Người tạo |
| maxMembers | Number | Số thành viên tối đa |
| isActive | Boolean | Trạng thái |
| lastMessage | Ref Message | Tin nhắn cuối cùng |

### Conversation
| Field | Type | Description |
|-------|------|-------------|
| participants | [Ref User] | Danh sách người tham gia (thường là 2) |
| lastMessage | Ref Message | Tin nhắn cuối cùng |
| unreadCount | Map | Đếm số tin nhắn chưa đọc cho từng user |

### Message
| Field | Type | Description |
|-------|------|-------------|
| content | String | Nội dung |
| type | Enum | text / image / video / file / audio / system |
| sender | Ref User | Người gửi |
| room | Ref (dynamic) | ID phòng chat |
| roomModel | Enum | Class / Group / Conversation |
| attachments | Array | [{ name, url, type, size, thumbnail }] |
| isEdited | Boolean | Đã chỉnh sửa |
| isDeleted | Boolean | Đã xóa (soft delete) |
| replyTo | Ref Message | Tin nhắn trả lời |
| readBy | Array | [{ user: Ref User, readAt }] |
| reactions | Array | [{ user: Ref User, emoji }] |

### File
| Field | Type | Description |
|-------|------|-------------|
| originalName | String | Tên file gốc |
| filename | String | Tên file trên server |
| mimeType | String | MIME type |
| size | Number | Kích thước (bytes) |
| url | String | URL download |
| category | Enum | document / image / video / audio / other |
| uploadedBy | Ref User | Người upload |
| room | Ref (dynamic) | Phòng chứa file |
| roomModel | Enum | Class / Group / Conversation |
| isDeleted | Boolean | Đã xóa (soft delete) |

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

