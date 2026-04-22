# Hướng dẫn test với logs

## Bước 1: Mở Console
1. Mở trình duyệt
2. Nhấn F12 để mở DevTools
3. Chọn tab **Console**
4. Clear console (Ctrl+L hoặc nút Clear)

## Bước 2: Test gửi lời mời kết bạn

### Từ modal "Thêm bạn":
1. Click nút "Thêm bạn" 
2. Tìm người dùng
3. Click "Gửi lời mời"
4. **Quan sát console logs:**
   - `🔵 [sendRequest] START` - Bắt đầu gửi
   - `✅ [sendRequest] API SUCCESS` - API thành công
   - `🟢 [sendRequest] OPTIMISTIC UPDATE` - Update state ngay
   - `💾 [sendRequest] localStorage after 100ms` - Check localStorage
   - `🔄 [sendRequest] Fetching from server after 500ms` - Fetch lại để sync

### Từ đoạn chat với người lạ:
1. Vào chat với người lạ
2. Click nút "Gửi kết bạn" trong banner
3. **Quan sát console logs:**
   - `🔵 [ChatPage] Send friend request button clicked`
   - `✅ [ChatPage] API SUCCESS`
   - `🟢 [ChatPage] justSentRequestTo updated`
   - `🟢 [ChatPage] Updating store with`
   - `💾 [ChatPage] localStorage after 100ms`

## Bước 3: Đóng modal / Chuyển tab

1. Đóng modal hoặc chuyển sang tab khác
2. **Check console:**
   - `💾 [persist.partialize] Saving to localStorage` - Persist đang save

## Bước 4: Reload trang (QUAN TRỌNG)

1. Nhấn F5 hoặc Ctrl+R để reload
2. **Quan sát console logs theo thứ tự:**
   
   **A. Khi store khởi tạo:**
   - `🔵 [friendStore] Creating store...`
   
   **B. Khi persist restore:**
   - `🔄 [persist.onRehydrateStorage] Restored from localStorage`
   - Xem số lượng: `outgoingRequests: X` (phải > 0 nếu đã gửi request)
   
   **C. Khi ChatPage mount:**
   - `🔵 [ChatPage] Render - outgoingRequests: [...]` (phải có data)
   - `🔵 [ChatPage] Mount effect - outgoingRequests: [...]` (phải có data)
   
   **D. Sau 100ms:**
   - `🔄 [ChatPage] Fetching after 100ms delay...`
   - `🔵 [ChatPage] outgoingRequests before fetch: [...]` (phải có data)
   - `🔵 [fetchOutgoingRequests] START`
   - `⏭️ [fetchOutgoingRequests] SKIPPED - already has data` (nếu skipIfHasData = true)

## Bước 5: Check localStorage trực tiếp

1. Trong DevTools, chọn tab **Application**
2. Mở **Local Storage** > `http://localhost:3000`
3. Tìm key `friend-storage`
4. Click vào để xem value
5. **Kiểm tra:**
   - `state.outgoingRequests` phải có array với request vừa gửi
   - Mỗi request phải có `_id`, `toUserId`, `status: 'pending'`

## Kết quả mong đợi:

✅ **Sau khi gửi request:**
- Console hiển thị logs optimistic update
- localStorage có key `friend-storage` với data
- Banner "Đã gửi lời mời" hiển thị

✅ **Sau khi reload:**
- Console hiển thị persist restore với data
- `outgoingRequests` array KHÔNG rỗng
- Banner "Đã gửi lời mời" vẫn hiển thị
- Nút "Hủy lời mời" có sẵn

❌ **Nếu mất state:**
- Check console xem có log `⏭️ SKIPPED` không
- Check localStorage có data không
- Check log `🔵 [fetchOutgoingRequests] API SUCCESS` - xem API trả về gì
- Nếu API trả về rỗng `[]` → Vấn đề ở backend
- Nếu localStorage rỗng → Vấn đề ở persist middleware

## Debug tips:

1. **Nếu localStorage rỗng:**
   - Check log `💾 [persist.partialize] Saving to localStorage`
   - Nếu không có log này → persist không hoạt động

2. **Nếu localStorage có data nhưng vẫn mất:**
   - Check log `🔄 [persist.onRehydrateStorage] Restored`
   - Xem số lượng outgoingRequests có đúng không
   - Check log `🔵 [fetchOutgoingRequests] API SUCCESS` - xem có ghi đè không

3. **Nếu API trả về rỗng:**
   - Vấn đề ở backend - request đã bị xóa hoặc không được lưu
   - Check Network tab xem request/response

## Copy logs để báo lỗi:

Nếu vẫn lỗi, copy toàn bộ console logs từ lúc:
1. Gửi request
2. Reload trang
3. Paste vào chat để tôi debug
