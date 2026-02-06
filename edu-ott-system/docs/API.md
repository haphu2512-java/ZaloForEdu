# API Documentation - Education OTT Platform

Base URL: `http://localhost:5000/api/v1`

> **Lưu ý:** Tài liệu này có thể chưa cập nhật kịp thời. Vui lòng xem tài liệu tương tác đầy đủ và mới nhất tại **[Swagger UI](http://localhost:5000/api-docs)**. Xem hướng dẫn sử dụng tại [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md).

## Authentication

Tất cả các endpoint (trừ login và register) yêu cầu JWT token trong header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error message here"
}
```

---

## Authentication Endpoints

### Register
Đăng ký tài khoản mới

**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "role": "student"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "email": "student@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "7c4a8d09ca3762af...", // Added refresh token if applicable
  }
}
```

### Login
Đăng nhập

**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:** Giống register

### Logout
Đăng xuất - Invalidate token hiện tại

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Refresh Token
Lấy access token mới từ refresh token

**Endpoint:** `POST /auth/refresh`

**Body:**
```json
{
  "refreshToken": "7c4a8d09ca3762af..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "new_access_token..."
  }
}
```

### Verify Email
Xác thực email người dùng (New)

**Endpoint:** `POST /auth/verify-email`

**Body:**
```json
{
  "token": "email_verification_token_from_email"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

### Resend Verification Email
Gửi lại email xác thực (New)

**Endpoint:** `POST /auth/resend-verification`

**Body:**
```json
{
  "email": "student@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Verification email sent"
}
```

### Forgot Password
Yêu cầu reset mật khẩu

**Endpoint:** `POST /auth/forgot-password`

**Body:**
```json
{
  "email": "student@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset email sent"
}
```

### Reset Password
Đặt lại mật khẩu mới

**Endpoint:** `PUT /auth/reset-password/:token`

**Body:**
```json
{
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "new_token_auto_login..."
  }
}
```

### Get Current User
Lấy thông tin user hiện tại

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "email": "student@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "student",
      "avatar": "https://...",
      "bio": "..."
    }
  }
}
```

### Update Profile
Cập nhật thông tin cá nhân

**Endpoint:** `PUT /auth/update-profile`

**Body:**
```json
{
  "fullName": "Nguyễn Văn B",
  "avatar": "https://...",
  "phoneNumber": "0123456789",
  "bio": "Student at XYZ University"
}
```

### Change Password
Đổi mật khẩu

**Endpoint:** `PUT /auth/change-password`

**Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

---

## Classes Endpoints

### Get All Classes
Lấy danh sách lớp học của user hiện tại

**Endpoint:** `GET /classes`

**Query Params:**
- `page`: Số trang (default: 1)
- `limit`: Số lượng mỗi trang (default: 20)
- `status`: active | completed | archived
- `search`: Tìm kiếm theo tên/code

**Response:**
```json
{
  "status": "success",
  "data": {
    "classes": [
      {
        "_id": "...",
        "name": "Web Development",
        "code": "CS101",
        "teacher": {
          "_id": "...",
          "fullName": "Teacher Name"
        },
        "studentCount": 30,
        "status": "active"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "pages": 1
    }
  }
}
```

### Create Class
Tạo lớp học mới (Teacher/Admin only)

**Endpoint:** `POST /classes`

**Body:**
```json
{
  "name": "Web Development",
  "code": "CS101",
  "description": "Learn modern web development",
  "subject": "Computer Science",
  "semester": "Fall 2024",
  "schedule": {
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "10:00",
    "room": "A101"
  }
}
```

### Get Class Details
Lấy chi tiết lớp học

**Endpoint:** `GET /classes/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "class": {
      "_id": "...",
      "name": "Web Development",
      "code": "CS101",
      "description": "...",
      "teacher": {
        "_id": "...",
        "fullName": "Teacher Name",
        "avatar": "..."
      },
      "students": [...],
      "studentCount": 30,
      "schedule": {...},
      "status": "active"
    }
  }
}
```

### Join Class
Tham gia lớp học (Student)

**Endpoint:** `POST /classes/:id/join`

**Body:**
```json
{
  "enrollmentCode": "ABC123"
}
```

### Leave Class
Rời khỏi lớp học

**Endpoint:** `POST /classes/:id/leave`

---

## Messages Endpoints

### Get Messages
Lấy tin nhắn của một room

**Endpoint:** `GET /messages`

**Query Params:**
- `roomId`: ID của class/group/conversation
- `roomModel`: Class | Group | Conversation
- `page`: Số trang
- `limit`: Số lượng mỗi trang

**Response:**
```json
{
  "status": "success",
  "data": {
    "messages": [
      {
        "_id": "...",
        "content": "Hello everyone!",
        "type": "text",
        "sender": {
          "_id": "...",
          "fullName": "Nguyễn Văn A",
          "avatar": "..."
        },
        "room": "...",
        "readBy": [...],
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### Send Message
Gửi tin nhắn

**Endpoint:** `POST /messages`

**Body:**
```json
{
  "content": "Hello!",
  "type": "text",
  "room": "class_id_or_group_id",
  "roomModel": "Class",
  "replyTo": "message_id" // Optional
}
```

### Update Message
Sửa tin nhắn

**Endpoint:** `PUT /messages/:id`

**Body:**
```json
{
  "content": "Updated message"
}
```

### Delete Message
Xóa tin nhắn

**Endpoint:** `DELETE /messages/:id`

### Mark as Read
Đánh dấu đã đọc

**Endpoint:** `POST /messages/:id/read`

---

## Files Endpoints

### Upload File
Upload file

**Endpoint:** `POST /files/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload
- `type`: image | video | document
- `room`: class_id or group_id
- `roomModel`: Class | Group

**Response:**
```json
{
  "status": "success",
  "data": {
    "file": {
      "_id": "...",
      "name": "document.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 1024000
    }
  }
}
```

---

## Analytics Endpoints

### Get Dashboard
Thống kê tổng quan

**Endpoint:** `GET /analytics/dashboard`

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalClasses": 5,
    "totalStudents": 150,
    "totalMessages": 1000,
    "activeUsers": 45,
    "recentActivity": [...]
  }
}
```

### Get Class Analytics
Thống kê lớp học

**Endpoint:** `GET /analytics/classes/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "class": {...},
    "messageStats": {
      "total": 500,
      "byDay": {...}
    },
    "studentEngagement": [...],
    "fileStats": {...}
  }
}
```

---

## Error Codes

- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Invalid or missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API có giới hạn:
- 100 requests per 15 minutes cho mỗi IP
- Các endpoint nhạy cảm có thể có giới hạn thấp hơn

---

## WebSocket Events

Xem file SOCKET.md để biết chi tiết về Socket.io events.
