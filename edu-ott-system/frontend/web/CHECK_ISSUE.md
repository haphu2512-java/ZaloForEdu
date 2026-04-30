# Debug: Bên gửi mất trạng thái

## Vấn đề quan sát:
- ✅ Bên nhận (Trang): Hiển thị đúng banner "Bạn và Trang chưa kết bạn"
- ❌ Bên gửi (wind): Sau khi gửi lời mời → reload → mất trạng thái "Đã gửi"

## Các khả năng:

### 1. localStorage không được save
**Check:**
1. Mở DevTools (F12)
2. Tab Application > Local Storage > localhost:3000
3. Tìm key `friend-storage`
4. Xem có `outgoingRequests` array không
5. Nếu KHÔNG có hoặc rỗng → persist middleware không hoạt động

### 2. API không trả về đúng data
**Check console logs:**
- `✅ [sendRequest] API SUCCESS - result:` → Xem có `_id` không
- `🟢 [sendRequest] OPTIMISTIC UPDATE` → Xem array có data không
- `💾 [sendRequest] localStorage after 100ms` → Xem có được save không

### 3. Fetch API ghi đè state sau khi reload
**Check console logs sau reload:**
- `🔄 [persist.onRehydrateStorage] Restored` → Xem `outgoingRequests: X` (X phải > 0)
- `🔵 [ChatPage] Render - outgoingRequests:` → Xem có data không
- `🔵 [fetchOutgoingRequests] API SUCCESS` → Xem API trả về gì
- Nếu API trả về `[]` rỗng → Vấn đề ở backend

## Hành động ngay:

### Bước 1: Check localStorage
```javascript
// Paste vào Console:
const stored = localStorage.getItem('friend-storage');
console.log('📦 localStorage:', stored ? JSON.parse(stored) : 'empty');
```

### Bước 2: Gửi lời mời và xem logs
1. Clear console (Ctrl+L)
2. Gửi lời mời kết bạn
3. Đợi 1 giây
4. Copy toàn bộ console logs

### Bước 3: Reload và xem logs
1. Clear console
2. Reload trang (F5)
3. Đợi trang load xong
4. Copy toàn bộ console logs

### Bước 4: Check API response
1. Tab Network trong DevTools
2. Filter: `outgoing`
3. Reload trang
4. Click vào request `outgoing?page=1&limit=20`
5. Xem Response → Có request vừa gửi không?

## Nếu localStorage rỗng:

Có thể persist middleware không hoạt động. Cần check:
```javascript
// Paste vào Console để test persist:
import { useFriendStore } from './store/friendStore';

// Thêm fake request
useFriendStore.setState({
  outgoingRequests: [{
    _id: 'test123',
    toUserId: { _id: 'user123', username: 'Test' },
    status: 'pending'
  }]
});

// Check localStorage sau 1 giây
setTimeout(() => {
  const stored = localStorage.getItem('friend-storage');
  console.log('After manual update:', stored);
}, 1000);
```

## Copy logs và gửi cho tôi:
1. Logs khi gửi lời mời
2. Logs sau khi reload
3. localStorage content
4. Network response của API `/friends/request/outgoing`
