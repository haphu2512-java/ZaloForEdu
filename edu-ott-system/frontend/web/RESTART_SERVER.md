# Cách restart dev server

## Đã clear Vite cache, bây giờ cần restart server:

1. **Dừng server hiện tại:**
   - Nhấn `Ctrl+C` trong terminal đang chạy `npm run dev`

2. **Khởi động lại:**
   ```bash
   cd frontend/web
   npm run dev
   ```

3. **Hoặc nếu server không chạy:**
   ```bash
   cd frontend/web
   rm -rf node_modules/.vite
   npm run dev
   ```

4. **Reload trình duyệt:**
   - Nhấn `Ctrl+Shift+R` (hard reload) hoặc `Cmd+Shift+R` trên Mac
   - Hoặc mở DevTools > Network tab > check "Disable cache" > reload

## Lỗi đã được sửa:
- ✅ Xóa duplicate declaration của `outgoingRequests`
- ✅ Clear Vite cache
- ✅ File ChatPage.jsx chỉ có 1 lần khai báo `outgoingRequests` (dòng 282)

Sau khi restart, lỗi sẽ biến mất!
