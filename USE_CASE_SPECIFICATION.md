# ĐẶC TẢ USE CASE - UC04 & UC05

---

## UC04: QUẢN LÝ LỜI MỜI KẾT BẠN

### 1. THÔNG TIN CHUNG

| Trường | Nội Dung |
|--------|---------|
| **Mã** | UC04 |
| **Tên** | Quản Lý Lời Mời Kết Bạn |
| **Mô Tả** | Người dùng gửi, chấp nhận hoặc từ chối lời mời kết bạn từ những người dùng khác |
| **Actor Chính** | Người Dùng A (Người Gửi/Người Nhận) |
| **Actor Phụ** | Người Dùng B (Người Nhận/Người Gửi) |
| **Tiền Điều Kiện** | • Người dùng đã đăng nhập<br>• Có kết nối mạng |
| **Hậu Điều Kiện** | • Lời mời được tạo/cập nhật<br>• Người nhận nhận được thông báo |

### 2. LUỒNG CHÍNH

| STT | Actor | Hệ Thống |
|-----|-------|---------|
| 1 | Người A xem danh sách người dùng hoặc hồ sơ | |
| 2 | Người A nhấn "Gửi lời mời kết bạn" | |
| 3 | | Hiển thị xác nhận: "Gửi lời mời?" |
| 4 | Người A xác nhận | |
| 5 | | **Kiểm tra:** Người A ≠ Người B, chưa là bạn, B chưa chặn A, không có lời mời pending |
| 6 | | POST /api/v1/friends/request { toUserId } |
| 7 | | Lưu FriendRequest (status: pending) |
| 8 | | Gửi thông báo tới Người B: "X gửi lời mời kết bạn" |
| 9 | | Emit socket event tới Người B |
| 10 | | Trả về 201 Created |
| 11 | | Hiển thị: "Đã gửi lời mời" |
| 12 | Nút thay đổi thành "Hủy lời mời" | |
| | **Người B phía khác** | |
| 13 | Người B nhận thông báo | |
| 14 | Người B mở "Lời mời kết bạn" | |
| 15 | | GET /api/v1/friends/request/incoming |
| 16 | | Hiển thị danh sách lời mời |
| 17 | Người B chọn: "Chấp nhận" hoặc "Từ chối" | |
| 18 | | Hiển thị xác nhận |
| 19 | Người B xác nhận | |
| 20 | | **Nếu chấp nhận:** PUT /friends/request/{id}/accept<br>Update: status = accepted<br>Thêm vào friends list của cả hai người<br>Gửi thông báo tới Người A<br>Emit event |
| 20b | | **Nếu từ chối:** PUT /friends/request/{id}/reject<br>Update: status = rejected |
| 21 | | Trả về 200 OK |
| 22 | | Hiển thị thành công |
| 23 | Lời mời biến mất khỏi danh sách | |

### 3. LUỒNG THAY THẾ & LỖI

| Điều Kiện | Hành Động |
|-----------|----------|
| Cố gửi cho chính mình | Lỗi 400: "Không thể gửi cho chính mình" |
| Đã là bạn | Lỗi 400: "Đã là bạn rồi" |
| Đối phương chặn | Lỗi 403: "Không thể gửi" |
| Lỗi mạng | Retry hoặc hiển thị lỗi |
| Request không tồn tại (accept/reject) | Lỗi 404 |

---

## UC05: QUẢN LÝ BẠN BÈ

### 1. THÔNG TIN CHUNG

| Trường | Nội Dung |
|--------|---------|
| **Mã** | UC05 |
| **Tên** | Quản Lý Bạn Bè |
| **Mô Tả** | Người dùng xem, tìm kiếm, hủy kết bạn, chặn bạn bè |
| **Actor Chính** | Người Dùng A |
| **Actor Phụ** | Người Dùng B (các bạn bè) |
| **Tiền Điều Kiện** | • Người dùng đã đăng nhập<br>• Có kết nối mạng |
| **Hậu Điều Kiện** | • Danh sách được cập nhật<br>• Trạng thái thay đổi |

### 2. LUỒNG CHÍNH (XEM DANH SÁCH & QUẢN LÝ)

| STT | Actor | Hệ Thống |
|-----|-------|---------|
| 1 | Người A mở "Danh sách bạn bè" | |
| 2 | | GET /api/v1/friends/list?limit=20 |
| 3 | | Lấy danh sách bạn, populate info (tên, avatar, online status) |
| 4 | | Return { items: [], nextCursor, limit } |
| 5 | | Hiển thị danh sách với avatar, tên, trạng thái |
| 6 | Người A có thể: | |
| 6a | - Cuộn để load thêm (pagination) | GET với nextCursor |
| 6b | - Tìm kiếm (nhập từ khóa) | Filter client-side |
| 6c | - Nhấn vào bạn | Xem hồ sơ |
| 6d | - Nhấn "Hủy kết bạn" | |
| | **Hủy kết bạn:** | |
| 7 | Người A chọn bạn, nhấn "Hủy kết bạn" | |
| 8 | | Xác nhận: "Hủy kết bạn với X?" |
| 9 | Người A xác nhận | |
| 10 | | DELETE /api/v1/friends/{friendId} |
| 11 | | Xóa khỏi friends list của cả hai |
| 12 | | Emit event friend_removed |
| 13 | | Trả về 200 OK |
| 14 | | Hiển thị: "Đã hủy kết bạn" |
| 15 | Bạn biến mất khỏi danh sách | |
| | **Chặn người dùng:** | |
| 16 | Người A nhấn "Chặn" (từ profile/contact) | |
| 17 | | Xác nhận: "Chặn X?" |
| 18 | Người A xác nhận | |
| 19 | | POST /api/v1/users/block/{userId} { action: 'block' } |
| 20 | | Thêm vào blockedUsers |
| 21 | | Trả về { blockedUsers: [...], action: 'block' } |
| 22 | | Hiển thị: "Đã chặn" |
| 23 | Người B không thể gửi tin nhắn hoặc lời mời | |
| | **Xem danh sách chặn & bỏ chặn:** | |
| 24 | Người A vào Settings → "Danh sách chặn" | |
| 25 | | GET /api/v1/users/me/blocked |
| 26 | | Hiển thị danh sách người bị chặn |
| 27 | Người A nhấn "Bỏ chặn" | |
| 28 | | Xác nhận: "Bỏ chặn X?" |
| 29 | Người A xác nhận | |
| 30 | | POST /api/v1/users/block/{userId} { action: 'unblock' } |
| 31 | | Xóa khỏi blockedUsers |
| 32 | | Trả về { blockedUsers: [...], action: 'unblock' } |
| 33 | | Hiển thị: "Đã bỏ chặn" |
| 34 | Người B có thể gửi tin nhắn lại | |

### 3. LUỒNG THAY THẾ & LỖI

| Điều Kiện | Hành Động |
|-----------|----------|
| Danh sách bạn rỗng | Hiển thị "Chưa có bạn bè" + nút "Tìm bạn mới" |
| Tìm kiếm không có kết quả | Hiển thị "Không tìm thấy" |
| Lỗi kết nối | Retry hoặc error message |
| Bạn không tồn tại (hủy) | Lỗi 404 |
| Chặn chính mình | Lỗi 400 |

---

## API ENDPOINTS

| Use Case | Method | URL | Request | Response |
|----------|--------|-----|---------|----------|
| UC04 - Gửi | POST | `/api/v1/friends/request` | {toUserId} | 201 FriendRequest |
| UC04 - Chấp nhận | PUT | `/api/v1/friends/request/{id}/accept` | - | 200 FriendRequest |
| UC04 - Từ chối | PUT | `/api/v1/friends/request/{id}/reject` | - | 200 FriendRequest |
| UC05 - Xem | GET | `/api/v1/friends/list?limit=20` | - | 200 {items, cursor} |
| UC05 - Hủy | DELETE | `/api/v1/friends/{friendId}` | - | 200 OK |
| UC05 - Chặn | POST | `/api/v1/users/block/{userId}` | {action: 'block'} | 200 {blockedUsers} |
| UC05 - Bỏ chặn | POST | `/api/v1/users/block/{userId}` | {action: 'unblock'} | 200 {blockedUsers} |
| UC05 - Danh sách chặn | GET | `/api/v1/users/me/blocked` | - | 200 {blockedUsers} |

---

## SOCKET EVENTS

| Event | Gửi từ | Gửi tới | Dữ liệu |
|-------|--------|--------|--------|
| `new_notification` | Backend | Recipient | {notification, actor} |
| `friend_request_received` | Backend | Recipient | {request} |
| `friend_request_accepted` | Backend | Both | {friendId, user} |
| `friend_request_rejected` | Backend | Sender | {requestId} |
| `friend_removed` | Backend | Both | {friendId} |

