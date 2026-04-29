# 🐛 DEBUG: Session Management Issue

## Vấn đề

Khi đăng nhập cùng 1 account:
- ❌ Web + Mobile: Chỉ có web hoạt động, mobile báo "đã đăng nhập trên thiết bị khác"
- ✅ Mong muốn: Web + Mobile cùng hoạt động, chỉ logout khi login thêm web thứ 2 hoặc mobile thứ 2

## Logic hiện tại (ĐÚNG)

```javascript
// backend/services/authService.js - issueTokenPair()
const versionField = safeDevice === 'web' ? 'webTokenVersion' : 'mobileTokenVersion';
await User.findByIdAndUpdate(user._id, { $inc: { [versionField]: 1 } });
```

- Login web → bump `webTokenVersion` only
- Login mobile → bump `mobileTokenVersion` only
- **Không ảnh hưởng lẫn nhau!**

## Mobile gửi device parameter

```typescript
// frontend/mobile/utils/authService.ts - login()
body: JSON.stringify({ ...payload, device: 'mobile' })
```

✅ Mobile **ĐÃ GỬI** `device: 'mobile'`

## Backend nhận device parameter

```javascript
// backend/controllers/authController.js - login()
const { email, username, phone, password, device = 'web' } = req.body;
```

✅ Backend **ĐÃ NHẬN** device với default `'web'`

## Possible Causes

### 1. Mobile không gửi device parameter đúng

**Test:**
```bash
# Check mobile login request
# In mobile app, add console.log before fetchAPI:
console.log('Login payload:', { ...payload, device: 'mobile' });
```

### 2. Backend validation strip device parameter

**Check:**
```javascript
// backend/validators/authSchemas.js
// Có thể loginSchema không allow device field?
```

### 3. Token version check logic sai

**Check:**
```javascript
// backend/services/tokenService.js
// getDeviceTokenVersion() có đúng không?
```

### 4. Mobile cache token cũ

**Test:**
```bash
# Clear mobile AsyncStorage
await AsyncStorage.clear();
# Then login again
```

## Debug Steps

### Step 1: Add logging to backend

```javascript
// backend/controllers/authController.js - login()
const login = asyncHandler(async (req, res) => {
  const { email, username, phone, password, device = 'web' } = req.body;
  
  // ADD THIS
  console.log('🔍 [LOGIN] Device:', device);
  console.log('🔍 [LOGIN] Body:', req.body);
  
  // ... rest of code
});
```

### Step 2: Add logging to issueTokenPair

```javascript
// backend/services/authService.js - issueTokenPair()
const issueTokenPair = async (user, device = 'web') => {
  const safeDevice = VALID_DEVICES.includes(device) ? device : 'web';
  
  // ADD THIS
  console.log('🔍 [ISSUE_TOKEN] User:', user._id);
  console.log('🔍 [ISSUE_TOKEN] Device:', device, '→', safeDevice);
  console.log('🔍 [ISSUE_TOKEN] Before - webTokenVersion:', user.webTokenVersion, 'mobileTokenVersion:', user.mobileTokenVersion);
  
  const versionField = safeDevice === 'web' ? 'webTokenVersion' : 'mobileTokenVersion';
  await User.findByIdAndUpdate(user._id, { $inc: { [versionField]: 1 } });
  
  const freshUser = await User.findById(user._id);
  
  // ADD THIS
  console.log('🔍 [ISSUE_TOKEN] After - webTokenVersion:', freshUser.webTokenVersion, 'mobileTokenVersion:', freshUser.mobileTokenVersion);
  
  // ... rest of code
};
```

### Step 3: Test scenario

```
1. Logout all devices
2. Login on Mobile
   → Check logs: Device should be 'mobile'
   → Check logs: mobileTokenVersion should bump
3. Login on Web
   → Check logs: Device should be 'web'
   → Check logs: webTokenVersion should bump
4. Test Mobile still works
   → If fails, check error message
```

### Step 4: Check token validation

```javascript
// backend/middlewares/auth.js
// Add logging to see which version is being checked
console.log('🔍 [AUTH] Token device:', payload.device);
console.log('🔍 [AUTH] Token version:', payload.tokenVersion);
console.log('🔍 [AUTH] User webTokenVersion:', user.webTokenVersion);
console.log('🔍 [AUTH] User mobileTokenVersion:', user.mobileTokenVersion);
```

## Expected Behavior

### Scenario 1: Web + Mobile (SHOULD WORK)
```
1. Login Mobile → mobileTokenVersion = 1
2. Login Web → webTokenVersion = 1
3. Mobile still works ✅ (mobileTokenVersion unchanged)
4. Web works ✅
```

### Scenario 2: Web + Web (SHOULD LOGOUT FIRST WEB)
```
1. Login Web 1 → webTokenVersion = 1
2. Login Web 2 → webTokenVersion = 2
3. Web 1 logout ✅ (version mismatch)
4. Web 2 works ✅
```

### Scenario 3: Mobile + Mobile (SHOULD LOGOUT FIRST MOBILE)
```
1. Login Mobile 1 → mobileTokenVersion = 1
2. Login Mobile 2 → mobileTokenVersion = 2
3. Mobile 1 logout ✅ (version mismatch)
4. Mobile 2 works ✅
```

## Quick Fix (If validation strips device)

### Check loginSchema

```javascript
// backend/validators/authSchemas.js
const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
  device: z.enum(['web', 'mobile']).optional(), // ← ADD THIS IF MISSING
});
```

## Temporary Workaround

If you need immediate fix, you can:

1. **Disable device-specific versioning** (not recommended):
```javascript
// backend/services/authService.js
// Bump BOTH versions (forces logout on all devices)
await User.findByIdAndUpdate(user._id, { 
  $inc: { webTokenVersion: 1, mobileTokenVersion: 1 } 
});
```

2. **Allow multiple sessions per device** (not recommended):
```javascript
// backend/services/authService.js
// Don't bump version at all (allows unlimited sessions)
// const versionField = safeDevice === 'web' ? 'webTokenVersion' : 'mobileTokenVersion';
// await User.findByIdAndUpdate(user._id, { $inc: { [versionField]: 1 } });
```

## Next Steps

1. Add logging as shown above
2. Test login scenario
3. Check console logs
4. Identify where device parameter is lost/changed
5. Fix the issue
6. Remove logging
7. Test again

## Contact

If issue persists after debugging, provide:
- Backend console logs (with 🔍 markers)
- Mobile console logs
- Network request/response (device parameter)
- User document (webTokenVersion, mobileTokenVersion)
