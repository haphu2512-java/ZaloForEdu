# Database Schema - Education OTT Platform

## Overview

Hệ thống sử dụng MongoDB (NoSQL) để lưu trữ dữ liệu.

## Collections

### 1. Users
Lưu trữ thông tin người dùng (Học viên, Giảng viên, Admin)

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  fullName: String (required),
  avatar: String (URL),
  role: String (enum: ['student', 'teacher', 'admin']),
  studentId: String (unique, sparse),
  phoneNumber: String,
  dateOfBirth: Date,
  bio: String (max 500 chars),
  department: String,
  isActive: Boolean (default: true),
  isEmailVerified: Boolean (default: false),
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- email (unique)
- role
- isActive
- studentId (unique, sparse)

---

### 2. Classes
Lưu trữ thông tin lớp học

```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (unique, required, uppercase),
  description: String (max 1000 chars),
  coverImage: String (URL),
  subject: String (required),
  semester: String,
  academicYear: String,
  schedule: {
    dayOfWeek: Number (0-6),
    startTime: String (HH:mm),
    endTime: String (HH:mm),
    room: String
  },
  teacher: ObjectId (ref: User, required),
  students: [ObjectId] (ref: User),
  maxStudents: Number,
  status: String (enum: ['active', 'completed', 'archived']),
  settings: {
    allowStudentPost: Boolean (default: true),
    allowFileUpload: Boolean (default: true),
    requireApproval: Boolean (default: false)
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- code (unique)
- teacher
- status
- students

**Virtuals:**
- studentCount: Số lượng học viên
- groups: Các nhóm trong lớp

---

### 3. Groups
Lưu trữ thông tin nhóm môn học

```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  class: ObjectId (ref: Class, required),
  members: [ObjectId] (ref: User),
  createdBy: ObjectId (ref: User, required),
  avatar: String (URL),
  settings: {
    isPrivate: Boolean (default: false),
    requireApproval: Boolean (default: false)
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- class
- createdBy
- members

---

### 4. Messages
Lưu trữ tin nhắn

```javascript
{
  _id: ObjectId,
  content: String,
  type: String (enum: ['text', 'image', 'video', 'file', 'audio', 'system']),
  sender: ObjectId (ref: User, required),
  room: ObjectId (refPath: 'roomModel', required),
  roomModel: String (enum: ['Class', 'Group', 'Conversation'], required),
  attachments: [{
    name: String,
    url: String,
    type: String (mime type),
    size: Number,
    thumbnail: String
  }],
  isEdited: Boolean (default: false),
  editedAt: Date,
  isDeleted: Boolean (default: false),
  deletedAt: Date,
  replyTo: ObjectId (ref: Message),
  readBy: [{
    user: ObjectId (ref: User),
    readAt: Date
  }],
  reactions: [{
    user: ObjectId (ref: User),
    emoji: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- room + createdAt (compound)
- sender
- roomModel + room (compound)

**Methods:**
- markAsRead(userId): Đánh dấu tin nhắn đã đọc
- addReaction(userId, emoji): Thêm reaction

---

### 5. Conversations
Lưu trữ cuộc hội thoại 1-1

```javascript
{
  _id: ObjectId,
  participants: [ObjectId] (ref: User, size: 2),
  lastMessage: ObjectId (ref: Message),
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- participants (unique compound)
- lastMessageAt

---

### 6. Files
Lưu trữ thông tin file upload

```javascript
{
  _id: ObjectId,
  name: String (required),
  originalName: String,
  url: String (required),
  cloudinaryId: String,
  type: String (mime type),
  size: Number,
  category: String (enum: ['image', 'video', 'document', 'other']),
  uploadedBy: ObjectId (ref: User, required),
  room: ObjectId (refPath: 'roomModel'),
  roomModel: String (enum: ['Class', 'Group', 'Conversation']),
  isPublic: Boolean (default: false),
  downloads: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- uploadedBy
- room + roomModel (compound)
- createdAt

---

### 7. Notifications
Lưu trữ thông báo

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User, required),
  type: String (enum: ['message', 'class', 'assignment', 'system']),
  title: String (required),
  content: String,
  link: String,
  isRead: Boolean (default: false),
  readAt: Date,
  data: Object (additional data),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- user + isRead (compound)
- createdAt

---

### 8. Assignments (Optional - Future)
Lưu trữ bài tập

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  class: ObjectId (ref: Class, required),
  teacher: ObjectId (ref: User, required),
  dueDate: Date,
  maxScore: Number,
  attachments: [String] (URLs),
  submissions: [{
    student: ObjectId (ref: User),
    files: [String] (URLs),
    submittedAt: Date,
    score: Number,
    feedback: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Relationships

### One-to-Many
- User → Classes (một teacher có nhiều classes)
- Class → Messages (một class có nhiều messages)
- Class → Groups (một class có nhiều groups)
- User → Messages (một user gửi nhiều messages)

### Many-to-Many
- Class ↔ Students (nhiều students trong nhiều classes)
- Group ↔ Members (nhiều members trong nhiều groups)

### One-to-One
- Conversation ↔ Participants (mỗi cặp user có 1 conversation)

---

## Queries thường dùng

### Lấy tất cả classes của một student
```javascript
Class.find({ students: studentId })
  .populate('teacher', 'fullName avatar')
  .sort('-createdAt');
```

### Lấy tin nhắn của một room
```javascript
Message.find({ room: roomId, roomModel: 'Class' })
  .populate('sender', 'fullName avatar')
  .sort('-createdAt')
  .limit(50);
```

### Kiểm tra user có trong class không
```javascript
Class.findOne({ _id: classId, students: userId });
```

### Đếm số tin nhắn chưa đọc
```javascript
Message.countDocuments({
  room: roomId,
  'readBy.user': { $ne: userId }
});
```

---

## Data Validation

- Email phải hợp lệ và unique
- Password tối thiểu 6 ký tự
- Class code phải unique và uppercase
- File size tối đa 10MB
- Message content tối đa 5000 ký tự

---

## Performance Optimization

### Indexes
- Tạo compound indexes cho các query thường dùng
- Index cho các trường được filter/sort thường xuyên

### Pagination
- Sử dụng cursor-based pagination cho messages
- Limit kết quả mỗi query (default: 20)

### Populate
- Chỉ populate các fields cần thiết
- Sử dụng select để giới hạn fields

### Caching
- Cache user profile trong Redis
- Cache class list của user
- Invalidate cache khi có update
