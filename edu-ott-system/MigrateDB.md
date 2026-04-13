# Plan: Migrate MongoDB to DynamoDB (Zalo Clone)

## 1. Phân tích kiến trúc Database hiện tại (Mongoose)

| Thành phần | Đặc điểm hiện tại | Thách thức khi sang DynamoDB |
|---|---|---|
| **Models** | Có 9 models chính: User, Conversation, Message, FriendRequest, v.v. | DynamoDB ưu tiên mô hình **Single Table Design** để tối ưu hiệu năng và chi phí. |
| **Relationships** | Sử dụng `ObjectId` refs và `.populate()` để Join dữ liệu. | DynamoDB không hỗ trợ JOIN. Phải denormalize (phi chuẩn hóa) dữ liệu hoặc JOIN ở tầng ứng dụng. |
| **Queries** | Dùng nhiều toán tử phức tạp: `$or`, `$in`, `$ne`, và mảng (Arrays) | Cần định nghĩa Partition Key (PK) và Sort Key (SK) rõ ràng. Các query phức tạp cần dùng **GSI (Global Secondary Index)**. |
| **Indexing** | Dùng Mongoose Indexes trên nhiều field. | DynamoDB giới hạn số lượng GSI (mặc định 20). Cần thiết kế SK cẩn thận. |
| **Lists/Arrays** | Lưu list `friends`, `participants` trực tiếp trong Document. | Nếu mảng quá lớn (>400KB), sẽ bị lỗi DynamoDB. Cần tách thành các row riêng lẻ (1-to-N). |

---

## 2. Ý tưởng thiết kế mới trên DynamoDB (Single Table Design)

*   **PK (Partition Key):** Identifiers như `USER#<id>`, `CONV#<id>`.
*   **SK (Sort Key):** Metadata hoặc Timestamps như `METADATA`, `MSG#<timestamp>`.
*   **GSI1 (Global Secondary Index):** Để truy vấn ngược (ví dụ: Tìm tất cả cuộc trò chuyện của 1 User).

---

## 3. Lộ trình thực hiện (TodoPlan)

### Giai đoạn 1: Chuẩn bị & Cấu hình (Infrastructure)
- [ ] **Setup AWS SDK**: Cài đặt `@aws-sdk/client-dynamodb` và `@aws-sdk/lib-dynamodb`.
- [ ] **Database Module**: Tạo `backend/services/dynamoClient.js` thay thế cho `config/database.js`.
- [ ] **Environment Variables**: Cấu hình `AWS_REGION`, `DYNAMODB_TABLE_NAME`, `AWS_ACCESS_KEY_ID`, v.v.

### Giai đoạn 2: Thiết kế Schema DynamoDB chi tiết
- [ ] **User Mapping**: Thiết kế PK `USER#<id>`, SK `PROFILE`. GSI cho `username`, `email`, `phone`.
- [ ] **Conversation Mapping**: Thiết kế mối quan hệ N-N giữa User và Conversation thông qua SK `USER#<id>` trong PK `CONV#<id>`.
- [ ] **Message Mapping**: Thiết kế PK `CONV#<id>`, SK `MSG#<timestamp>`.
- [ ] **Denormalization Strategy**: Xác định các field cần sao chép (ví dụ: `senderName`, `avatarUrl` trong Message) để tránh JOIN.

### Giai đoạn 3: Thực thi tầng Repository/Data Access
- [ ] **Repository Layer**: Tạo lớp Repository thay thế các lệnh `Mongoose.model` trực tiếp trong controllers.
- [ ] **Auth Migration**: Chuyển đổi logic Login/Register (User Repository).
- [ ] **Chat Migration**: Chuyển đổi logic lấy danh sách chat và tin nhắn (Conversation & Message Repository).
- [ ] **Friendship Migration**: Chuyển đổi logic bạn bè/chặn (Friendship Repository).

### Giai đoạn 4: Refactor Controllers & Middlewares
- [ ] **Remove .populate()**: Thay thế các hàm populate bằng logic fetch song song hoặc dữ liệu denormalized.
- [ ] **Update Pagination**: Chuyển đổi từ `limit/skip` sang `ExclusiveStartKey` của DynamoDB.
- [ ] **Transaction Logic**: Sử dụng `TransactWriteItems` cho các hành động cần tính toàn vẹn (ví dụ: tạo nhóm chat).

### Giai đoạn 5: Kiểm thử & Di cư dữ liệu
- [ ] **Data Migration Script**: Viết script chuyển dữ liệu từ MongoDB sang DynamoDB.
- [ ] **Integration Testing**: Chạy bộ test Jest hiện tại với tầng Database mới.
- [ ] **Performance Audit**: Kiểm tra Read/Write Capacity Unit (RCU/WCU) để tối ưu chi phí.
