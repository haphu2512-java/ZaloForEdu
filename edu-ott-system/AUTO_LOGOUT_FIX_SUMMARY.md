# Fix Auto-Logout khi Token hết hạn trên Mobile

## 🐛 Vấn đề

Khi Web đăng xuất tất cả thiết bị:
- ✅ **Web**: Đăng xuất thành công, redirect về /login
- ❌ **Mobile**: Chỉ báo lỗi "Phiên đăng nhập đã hết hạn" nhưng **KHÔNG tự động logout**
  - User vẫn ở màn hình hiện tại
  - Phải tự tay logout hoặc restart app

## 🔍 Nguyên nhân

Trong `frontend/mobile/utils/api.ts`:
- Khi refresh token thất bại, code chỉ **throw error**
- Không có logic để:
  - Clear storage (authToken, refreshToken, user)
  - Disconnect socket
  - Redirect về login screen

## ✅ Giải pháp

### Thêm auto-logout logic vào `api.ts`

Khi refresh token thất bại:

```typescript
// 1. Clear all auth data
await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);

// 2. Disconnect socket
const { disconnectSocket } = await import('./socketService');
disconnectSocket();

// 3. Redirect to login
router.replace('/(auth)/login');

// 4. Throw error (để các component biết)
throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
```

### Import thêm

```typescript
import { router } from 'expo-router';
```

## 📊 Flow hoạt động

### Trước khi fix:
```
Web: Logout All Devices
  ↓
Backend: Invalidate all refresh tokens
  ↓
Mobile: API call → 401 Unauthorized
  ↓
Mobile: Try refresh token → FAILED
  ↓
Mobile: ❌ Throw error → User thấy alert "Phiên đăng nhập hết hạn"
  ↓
Mobile: ❌ Vẫn ở màn hình cũ, không logout
```

### Sau khi fix:
```
Web: Logout All Devices
  ↓
Backend: Invalidate all refresh tokens
  ↓
Mobile: API call → 401 Unauthorized
  ↓
Mobile: Try refresh token → FAILED
  ↓
Mobile: ✅ Clear AsyncStorage (authToken, refreshToken, user)
  ↓
Mobile: ✅ Disconnect socket
  ↓
Mobile: ✅ Redirect to /(auth)/login
  ↓
Mobile: ✅ User thấy màn hình login
```

## 🧪 Test scenario

### Test 1: Logout All từ Web
1. Đăng nhập cả Web và Mobile cùng 1 tài khoản
2. Trên Web: Settings → Hỗ trợ → "Đăng xuất tất cả thiết bị"
3. Confirm
4. **Kết quả mong đợi**:
   - Web: Redirect về /login ✅
   - Mobile: Tự động redirect về login screen ✅

### Test 2: Logout All từ Mobile
1. Đăng nhập cả Web và Mobile cùng 1 tài khoản
2. Trên Mobile: Profile → "Đăng xuất tất cả thiết bị"
3. Confirm
4. **Kết quả mong đợi**:
   - Mobile: Redirect về login screen ✅
   - Web: Khi thực hiện API call tiếp theo → Tự động logout ✅

### Test 3: Token hết hạn tự nhiên
1. Đăng nhập Mobile
2. Đợi token hết hạn (hoặc xóa token trên backend)
3. Thực hiện bất kỳ API call nào (vd: load messages)
4. **Kết quả mong đợi**:
   - Mobile: Tự động redirect về login screen ✅
   - Không còn báo lỗi "Phiên đăng nhập hết hạn" mà vẫn ở màn hình cũ

## 📝 Files thay đổi

- `frontend/mobile/utils/api.ts`
  - Import `router` từ `expo-router`
  - Thêm logic clear storage khi refresh failed
  - Thêm logic disconnect socket
  - Thêm logic redirect về login

## 🎯 Kết quả

- ✅ Mobile giờ tự động logout khi token hết hạn
- ✅ Mobile tự động logout khi Web/Mobile khác logout all
- ✅ User experience mượt mà, không còn bị "stuck" ở màn hình cũ
- ✅ Socket được disconnect đúng cách
- ✅ Storage được clear sạch sẽ

## 🔒 Security benefits

- Đảm bảo user không thể tiếp tục sử dụng app với token đã invalid
- Tự động cleanup khi session hết hạn
- Đồng bộ logout giữa các thiết bị

## 📌 Lưu ý

- Logic này chỉ trigger khi **refresh token thất bại**
- Nếu refresh token thành công, app sẽ tiếp tục hoạt động bình thường
- Error vẫn được throw để các component có thể handle nếu cần
- Navigation sử dụng `router.replace()` để không thể back về màn hình cũ
