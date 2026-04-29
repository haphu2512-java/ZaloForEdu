# Tóm tắt: Auto Refresh Token khi hết hạn

## Vấn đề
- **Mobile**: Token hết hạn → API trả về "Invalid access token" → phải login lại
- **Web**: Token hết hạn → bị logout tự động → phải login lại
- Gây khó chịu cho người dùng khi không sử dụng app một thời gian

## Nguyên nhân
- Access token có thời gian sống ngắn (thường 15-60 phút)
- Khi token hết hạn, API trả về 401/403 error
- Frontend không tự động refresh token, chỉ logout user

## Giải pháp
Thêm logic **auto refresh token** khi nhận 401/403 error:
1. Detect auth error (401 hoặc 403 với message chứa "token")
2. Gọi API `/auth/refresh-token` với refresh token
3. Lưu access token mới vào storage
4. Retry request ban đầu với token mới
5. Nếu refresh thất bại → logout user

---

## Implementation

### Mobile (React Native)

File: `frontend/mobile/utils/api.ts`

#### 1. Thêm refresh token function:
```typescript
// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Clear tokens if refresh fails
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.data?.accessToken || data.accessToken;
      const newRefreshToken = data.data?.refreshToken || data.refreshToken;

      if (newAccessToken) {
        await AsyncStorage.setItem('authToken', newAccessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }
        return newAccessToken;
      }

      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
```

#### 2. Sửa fetchAPI để auto retry với token mới:
```typescript
export const fetchAPI = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
  // ... existing code ...

  if (!response.ok) {
    // Check if it's an authentication error
    const isAuthError = response.status === 401 || 
                       (response.status === 403 && data.error?.message?.toLowerCase().includes('token'));
    
    if (isAuthError && retryCount === 0) {
      console.log('[Token] Auth error detected, attempting refresh...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry the request with new token
        return fetchAPI(endpoint, options, retryCount + 1);
      } else {
        // Refresh failed, user needs to login again
        const err: any = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        err.errorCode = 'TOKEN_EXPIRED';
        throw err;
      }
    }
    
    // ... existing error handling ...
  }
};
```

**Đặc điểm**:
- ✅ Tự động detect auth error (401/403)
- ✅ Gọi refresh token API
- ✅ Retry request với token mới
- ✅ Prevent multiple simultaneous refresh (dùng flag + promise)
- ✅ Clear tokens nếu refresh thất bại
- ✅ Chỉ retry 1 lần (tránh infinite loop)

---

### Web (React + Axios)

File: `frontend/web/src/services/authService.js`

#### 1. Thêm refresh token function:
```javascript
// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        return null;
      }

      const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
      
      const newAccessToken = response.data.data?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.data?.refreshToken || response.data.refreshToken;

      if (newAccessToken) {
        localStorage.setItem("token", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        return newAccessToken;
      }

      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
```

#### 2. Sửa axios response interceptor:
```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError = error.response?.status === 401;
    const isForbiddenToken = error.response?.status === 403 && 
                            error.response?.data?.error?.message?.toLowerCase().includes('token');

    // Check if this is an auth error and we haven't retried yet
    if ((isAuthError || isForbiddenToken) && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        // Update the authorization header and retry
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    // If refresh failed, logout
    if (isAuthError || isForbiddenToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?reason=session_expired";
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Đặc điểm**:
- ✅ Sử dụng axios interceptor (tự động cho tất cả requests)
- ✅ Detect auth error (401/403)
- ✅ Refresh token và retry request
- ✅ Prevent multiple simultaneous refresh
- ✅ Redirect to login nếu refresh thất bại
- ✅ Chỉ retry 1 lần (dùng `_retry` flag)

---

## Cách hoạt động

### Flow diagram:
```
User makes API request
    ↓
Request sent with access token
    ↓
Backend validates token
    ↓
Token expired? (401/403)
    ↓ YES
Check if already retried?
    ↓ NO
Call refresh token API
    ↓
Success?
    ↓ YES
Save new access token
    ↓
Retry original request with new token
    ↓
Return response to user
    
    ↓ NO (refresh failed)
Clear all tokens
    ↓
Redirect to login
```

### Prevent multiple refresh:
```
Request 1 → 401 → Start refresh (set flag)
Request 2 → 401 → Wait for Request 1's refresh
Request 3 → 401 → Wait for Request 1's refresh
    ↓
Refresh completes
    ↓
All 3 requests retry with new token
```

---

## Lợi ích

### Trước khi sửa:
❌ Token hết hạn → Logout ngay lập tức
❌ Người dùng phải login lại thường xuyên
❌ Mất dữ liệu đang nhập (draft messages, forms)
❌ Trải nghiệm người dùng kém

### Sau khi sửa:
✅ Token hết hạn → Tự động refresh
✅ Người dùng không bị gián đoạn
✅ Chỉ logout khi refresh token cũng hết hạn
✅ Trải nghiệm mượt mà, không cần login lại thường xuyên
✅ Giảm số lần "Invalid access token" error

---

## Test cases

### Test 1: Token hết hạn trong khi dùng app
1. Login vào app
2. Đợi access token hết hạn (hoặc manually expire token)
3. Thực hiện action (gửi tin nhắn, load conversations)
4. ✅ Request tự động refresh token và thành công
5. ✅ Không bị logout, không thấy error

### Test 2: Multiple requests cùng lúc
1. Token sắp hết hạn
2. Thực hiện nhiều actions cùng lúc (load messages, send message, load users)
3. ✅ Chỉ 1 refresh token request được gọi
4. ✅ Tất cả requests đều retry với token mới
5. ✅ Không có race condition

### Test 3: Refresh token cũng hết hạn
1. Login vào app
2. Đợi cả access token và refresh token hết hạn
3. Thực hiện action
4. ✅ Refresh token API trả về 401
5. ✅ App logout user và redirect về login
6. ✅ Hiển thị message "Phiên đăng nhập đã hết hạn"

### Test 4: Offline → Online
1. Login vào app
2. Tắt mạng
3. Token hết hạn
4. Bật mạng lại
5. Thực hiện action
6. ✅ Tự động refresh token và thành công

---

## Lưu ý quan trọng

### ⚠️ Backend phải hỗ trợ refresh token API
Endpoint: `POST /api/v1/auth/refresh-token`
Request body: `{ refreshToken: "..." }`
Response: `{ data: { accessToken: "...", refreshToken: "..." } }`

### ⚠️ Refresh token expiration
- Access token: 15-60 phút
- Refresh token: 7-30 ngày
- Khi refresh token hết hạn, user phải login lại (đây là bình thường)

### ⚠️ Security
- Refresh token được lưu trong AsyncStorage (Mobile) hoặc localStorage (Web)
- Không nên lưu trong cookie nếu không có httpOnly flag
- Backend nên validate refresh token và check blacklist

### ⚠️ Race condition
- Dùng flag `isRefreshing` và `refreshPromise` để prevent multiple refresh
- Tất cả requests đợi cùng 1 refresh promise
- Chỉ 1 refresh token API call được thực hiện

---

## Files đã thay đổi

### Mobile
- ✅ `frontend/mobile/utils/api.ts`
  - Thêm `refreshAccessToken()` function
  - Sửa `fetchAPI()` để auto retry với token mới
  - Thêm retry count để prevent infinite loop

### Web
- ✅ `frontend/web/src/services/authService.js`
  - Thêm `refreshAccessToken()` function
  - Sửa axios response interceptor
  - Auto retry failed requests với token mới

---

## Kết quả mong đợi

✅ Mobile: Không còn "Invalid access token" error thường xuyên
✅ Web: Không bị logout khi không dùng app một lúc
✅ Token tự động refresh trong background
✅ User experience mượt mà, không bị gián đoạn
✅ Chỉ logout khi refresh token thực sự hết hạn
✅ Giảm số lần phải login lại
