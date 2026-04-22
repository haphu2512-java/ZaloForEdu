# Test Persist Middleware

## Cách test:

1. **Mở trình duyệt và vào trang chat**
2. **Gửi lời mời kết bạn** cho một người lạ trong đoạn chat
3. **Kiểm tra localStorage**:
   - Mở DevTools (F12)
   - Vào tab Application > Local Storage
   - Tìm key `friend-storage`
   - Xem có `outgoingRequests` array chứa request vừa gửi không

4. **Reload trang** (F5 hoặc Ctrl+R)
5. **Kiểm tra banner trong chat**:
   - Banner "Đã gửi lời mời kết bạn" phải vẫn hiển thị
   - Nút "Hủy lời mời" phải có sẵn

6. **Chuyển tab hoặc đóng/mở lại trình duyệt**:
   - State vẫn phải được giữ nguyên

## Expected behavior:

✅ Sau khi gửi lời mời → Banner "Đã gửi lời mời" hiển thị
✅ Reload trang → Banner vẫn hiển thị (không mất)
✅ localStorage có key `friend-storage` với data
✅ Nút "Hủy lời mời" hoạt động bình thường

## Nếu vẫn mất state:

1. Check console có lỗi không
2. Verify localStorage có data không
3. Check network tab xem API có được gọi không
4. Báo lại để debug thêm
