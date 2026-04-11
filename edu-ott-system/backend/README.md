# OTT Messaging Backend (MVP)

Backend API cho hệ thống nhắn tin realtime theo chuẩn `/api/v1`.

## 1) Yêu cầu

- Node.js 18+
- MongoDB local (mặc định: `mongodb://127.0.0.1:27017/ott_messaging`)
- Redis local (mặc định: `redis://127.0.0.1:6379`)

<<<<<<< HEAD
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
=======
## 2) Cấu hình môi trường

1. Tạo file `.env` từ `.env.example`:
>>>>>>> Refactor_Project

```bash
cp .env.example .env
```

2. Kiểm tra các biến quan trọng:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`
- `CORS_ORIGIN` (hỗ trợ nhiều origin, phân tách bằng dấu phẩy)

## 3) Chạy local

```bash
cd backend
npm install
npm run dev
```

<<<<<<< HEAD
6. Xem API Documentation:
```
http://localhost:5000/api-docs
```

## 📧 Dịch vụ Gửi Email (Email Service)
Hệ thống xác thực (Đăng ký, Quên mật khẩu) yêu cầu gửi email xác thực. Chúng tôi đã xây dựng `emailService.js` sử dụng thư viện **Nodemailer** với hai chế độ:
- **Chế độ Dev (Mặc định)**: Nếu cấu hình `EMAIL_HOST` trong file `.env` trống, hệ thống sẽ tự động tạo một tài khoản ảo giả lập (*Ethereal Email*). Mỗi khi có Email được gửi đi, Terminal (cửa sổ chạy Node.js) sẽ tự in ra một đường link **TEST EMAIL PREVIEW URL** bắt đầu bằng `https://ethereal.email/message/...`. Bạn click vào link này để đọc Email ngay trên trình duyệt mà không cần tài khoản thật.
- **Chế độ Production (Real SMTP)**: Điền đầy đủ `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER` và `EMAIL_PASS` (Mật khẩu ứng dụng) vào `.env` (Ví dụ như thiết lập SMTP của Gmail) để hệ thống gửi thư vào hòm mail thực tế của người dùng.

## 🔄 Cập nhật contract API gần đây (quan trọng cho frontend)

### 1) Verify Email dùng OTP
- Endpoint: `POST /api/v1/auth/verify-email`
- Payload chuẩn:
```json
{
  "email": "student@example.com",
  "otp": "123456"
}
```

### 2) Join lớp bằng mã
- Endpoint mới: `POST /api/v1/classes/join-by-code`
- Quyền truy cập: **Student**
- Payload:
```json
{
  "code": "WEB101"
}
```

### 3) Reaction trả về full message
- Endpoint: `POST /api/v1/messages/:id/reaction`
- Response hiện tại:
```json
{
  "status": "success",
  "data": {
    "message": { "...": "populated message object" }
  }
}
```
- Socket event `message:reaction` cũng emit kèm `message` để client cập nhật UI ngay.

## API Endpoints (43 endpoints)

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
| GET | `/api/v1/users/:id` | Lấy thông tin user theo ID | Private |
| PUT | `/api/v1/users/:id` | Cập nhật user | Admin |
| DELETE | `/api/v1/users/:id` | Xóa user | Admin |

### Classes (9 endpoints)
| Method | Endpoint | Mô tả | Access |
|--------|----------|--------|--------|
| GET | `/api/v1/classes` | Danh sách lớp học (phân trang, tìm kiếm, lọc) | Private |
| POST | `/api/v1/classes` | Tạo lớp học mới | Teacher/Admin |
| POST | `/api/v1/classes/join-by-code` | Tham gia lớp bằng mã lớp | Student |
| GET | `/api/v1/classes/:id` | Chi tiết lớp học | Private |
| PUT | `/api/v1/classes/:id` | Cập nhật lớp học | Teacher/Admin |
| DELETE | `/api/v1/classes/:id` | Xóa lớp học | Teacher/Admin |
| POST | `/api/v1/classes/:id/join` | Tham gia lớp học | Student |
| POST | `/api/v1/classes/:id/leave` | Rời lớp học | Student |
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
| `message:reaction` | `{ messageId, reactions, message }` | Reaction mới (kèm message đã populate) |
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

## Authorization Notes (RBAC + Resource-based)

- **Admin**: có quyền quản trị tổng thể (users/classes/groups/messages theo rule hiện có).
- **Teacher**: tạo/cập nhật/xóa lớp của mình; xem lớp theo phân quyền; không dùng endpoint join/leave dành cho student.
- **Student**: chỉ tham gia/rời lớp và join bằng mã lớp; chỉ truy cập tài nguyên lớp/nhóm/hội thoại mà mình là thành viên.

### Resource-level guard mới
- `GET /classes/:id` và `GET /classes/:id/members`: yêu cầu user phải là admin hoặc thuộc lớp (teacher/student).
- `GET /groups/:id`: yêu cầu user phải là admin hoặc member của group.
- `/messages` (get/send/read/reaction): kiểm tra quyền theo room (`Class`, `Group`, `Conversation`) trước khi thao tác.

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
=======
Health check:
>>>>>>> Refactor_Project

```bash
GET http://localhost:5000/health
```

Swagger docs:

```bash
GET http://localhost:5000/api-docs/
GET http://localhost:5000/api-docs/openapi.json
```

## 3.1) Chạy test

```bash
cd backend
npm test
```

Test suite hiện có:

- `tests/auth.e2e.test.js`
- `tests/message.e2e.test.js`

## 4) Hỗ trợ Web và Mobile

Backend được thiết kế để dùng chung cho web frontend và mobile app:

- Auth thống nhất qua `Authorization: Bearer <accessToken>`
- Socket.IO auth thống nhất (token ở handshake auth/query/header)
- Metadata client hỗ trợ theo header:
  - `x-client-platform`: `web | ios | android | desktop | unknown`
  - `x-app-version`: phiên bản ứng dụng
  - `x-device-id`: định danh thiết bị
  - `x-request-id`: request correlation id (nếu thiếu server tự sinh và trả lại ở response header)
- CORS hỗ trợ multi-origin để phục vụ nhiều web domain cùng lúc

Ví dụ cấu hình CORS cho web:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://your-web-domain.com
```

Lưu ý mobile app native thường không cần CORS, nhưng vẫn nên gửi `x-client-platform` và `x-device-id` để backend theo dõi session rõ ràng hơn.

## 5) API đã implement

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`

### User/Friend

- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id`
- `DELETE /api/v1/users/:id` (soft delete)
- `POST /api/v1/users/block/:id`
- `POST /api/v1/friends/request`
- `PUT /api/v1/friends/request/:id/accept`
- `PUT /api/v1/friends/request/:id/reject`
- `DELETE /api/v1/friends/:friendId`
- `GET /api/v1/friends/list`

### Conversation/Message

- `GET /api/v1/conversations`
- `POST /api/v1/conversations`
- `POST /api/v1/messages/send`
- `GET /api/v1/messages/conversation/:id?limit=20&cursor=...`
- `PUT /api/v1/messages/:id/read`
- `DELETE /api/v1/messages/:id`

### Media/Notification

- `POST /api/v1/media/upload` (base64 payload, lưu local)
- `GET /api/v1/media/:id`
- `DELETE /api/v1/media/:id`
- `GET /api/v1/notifications`
- `PUT /api/v1/notifications/:id/read`

## 6) Socket.IO events

- Client -> Server: `join_conversation`, `send_message`, `typing`, `stop_typing`, `message_delivered`, `message_seen`
- Server -> Client: `new_message`, `typing`, `stop_typing`, `message_delivered`, `message_seen`, `user_online`, `user_offline`

## 7) Ghi chú hiện tại

- Redis blacklist/presence đã tích hợp thật khi Redis available.
- Nếu Redis down, hệ thống tự fallback sang in-memory để không làm sập API local.
- Upload media đang dùng local storage (`backend/uploads`).
- Swagger được sinh từ annotation ngay trong các file `backend/routes/*.js`, và render bằng `swagger-ui-express`.
