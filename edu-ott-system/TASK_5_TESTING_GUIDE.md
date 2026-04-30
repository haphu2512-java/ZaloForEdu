# 🧪 TASK 5 - Testing Guide

## Quick Test Checklist

### 1️⃣ Theme Settings Test (5 phút)

#### Test 1: Load Theme từ Database
```
1. Đăng nhập vào Web
2. Mở Settings (click avatar → Settings)
3. Kiểm tra tab "General"
4. ✅ Theme hiện tại phải load từ database
5. ✅ Không có console errors
```

#### Test 2: Change Theme và Save
```
1. Trong Settings, đổi theme (Light → Dark hoặc ngược lại)
2. ✅ Theme apply ngay lập tức (instant UX)
3. ✅ Không có lag
4. Đóng Settings và mở lại
5. ✅ Theme vẫn giữ nguyên (đã save)
```

#### Test 3: Cross-device Sync (nếu có 2 devices)
```
1. Đăng nhập cùng account trên 2 devices
2. Device 1: Đổi theme sang Dark
3. Device 2: Refresh page hoặc logout/login
4. ✅ Device 2 phải có theme Dark
```

#### Test 4: Offline Fallback
```
1. Disconnect internet (hoặc block API trong DevTools)
2. Refresh page
3. ✅ Theme vẫn load từ localStorage cache
4. Đổi theme
5. ✅ Theme vẫn apply locally (không crash)
6. Reconnect internet
7. ✅ Theme sync lên server
```

---

### 2️⃣ Notification Settings Test (5 phút)

#### Test 1: Load Notification Settings
```
1. Mở Settings → Tab "General"
2. Scroll xuống phần "Cài đặt thông báo"
3. ✅ Phải thấy 4 options:
   - Thông báo đẩy (Push)
   - Tin nhắn mới (Message)
   - Hoạt động nhóm (Group)
   - Âm thanh (Sound)
4. ✅ Mỗi option có icon và description
5. ✅ Toggle switches hoạt động
```

#### Test 2: Toggle và Auto-save
```
1. Toggle bất kỳ option nào (ví dụ: tắt Sound)
2. ✅ Toggle chuyển ngay lập tức
3. ✅ Thấy "Đang lưu..." (spinner)
4. ✅ Sau đó thấy "Đã lưu thành công" (checkmark)
5. Đóng Settings và mở lại
6. ✅ Setting vẫn giữ nguyên (đã save)
```

#### Test 3: Multiple Toggles
```
1. Toggle nhiều options liên tiếp
2. ✅ Mỗi toggle đều save riêng
3. ✅ Không có race conditions
4. ✅ Tất cả settings đều save đúng
```

#### Test 4: Error Handling
```
1. Disconnect internet
2. Toggle một option
3. ✅ Thấy error (hoặc không có success message)
4. ✅ Setting revert về trạng thái cũ
5. ✅ Không crash
```

---

### 3️⃣ UI/UX Test (3 phút)

#### Test 1: Responsive Design
```
1. Resize browser window (mobile size)
2. ✅ Notification settings vẫn đẹp
3. ✅ Toggle switches vẫn hoạt động
4. ✅ Text không bị overflow
```

#### Test 2: Theme Switching
```
1. Đổi theme Light → Dark
2. ✅ Notification settings UI adapt theo theme
3. ✅ Colors và borders đúng
4. ✅ Không có contrast issues
```

#### Test 3: Animations
```
1. Toggle notification options
2. ✅ Toggle switch có smooth animation
3. ✅ Spinner quay mượt
4. ✅ Success checkmark fade in/out
```

---

### 4️⃣ Integration Test (5 phút)

#### Test 1: Full Flow
```
1. Logout
2. Login lại
3. ✅ Theme load từ database
4. Mở Settings
5. ✅ Notification settings load từ database
6. Đổi theme và toggle notifications
7. ✅ Tất cả save thành công
8. Logout
9. Login lại
10. ✅ Tất cả settings vẫn giữ nguyên
```

#### Test 2: API Endpoints
```
1. Mở DevTools → Network tab
2. Refresh page
3. ✅ Thấy GET /api/v1/settings/me (200 OK)
4. Đổi theme
5. ✅ Thấy PUT /api/v1/settings/me (200 OK)
6. Toggle notification
7. ✅ Thấy PUT /api/v1/settings/me (200 OK)
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Theme không load
**Symptoms:** Theme luôn là "system" hoặc "light"
**Solution:**
1. Check console logs
2. Verify API endpoint: GET /settings/me returns data
3. Check localStorage: `app-theme-mode` key exists
4. Clear cache và refresh

### Issue 2: Notification settings không save
**Symptoms:** Toggle nhưng không thấy "Đang lưu..."
**Solution:**
1. Check console logs for errors
2. Verify API endpoint: PUT /settings/me works
3. Check network tab for failed requests
4. Verify token exists in localStorage

### Issue 3: Cross-device không sync
**Symptoms:** Đổi settings trên device 1, device 2 không update
**Solution:**
1. Verify cùng account
2. Refresh page trên device 2 (không auto-sync realtime)
3. Check API response có đúng data
4. Clear cache trên device 2

### Issue 4: UI bị vỡ
**Symptoms:** Notification settings không hiển thị đúng
**Solution:**
1. Check CSS file imported đúng
2. Verify CSS variables defined
3. Check browser compatibility
4. Clear browser cache

---

## ✅ Success Criteria

### Must Have:
- [x] Theme loads từ database
- [x] Theme saves to database
- [x] Notification settings load từ database
- [x] Notification settings save to database
- [x] No console errors
- [x] No visual bugs
- [x] Responsive design works

### Nice to Have:
- [x] Smooth animations
- [x] Loading states
- [x] Success feedback
- [x] Error handling
- [x] Optimistic updates

### Production Ready:
- [x] Cross-device sync works
- [x] Offline fallback works
- [x] Performance is good (no lag)
- [x] Code is clean and documented

---

## 📊 Performance Benchmarks

### Expected Performance:
- Theme load: < 100ms (from cache)
- Theme save: < 500ms (API call)
- Notification load: < 100ms (from cache)
- Notification save: < 500ms (API call)
- UI render: < 50ms (instant)

### How to Measure:
```javascript
// In DevTools Console
performance.mark('start');
// Do action (change theme, toggle notification)
performance.mark('end');
performance.measure('action', 'start', 'end');
console.log(performance.getEntriesByType('measure'));
```

---

## 🚀 Ready for Production?

### Checklist:
- [ ] All tests passed
- [ ] No console errors
- [ ] No visual bugs
- [ ] Cross-device sync works
- [ ] Performance is acceptable
- [ ] Code reviewed
- [ ] Documentation complete

### If all checked → **DEPLOY! 🎉**

---

## 📞 Need Help?

### Debug Steps:
1. Check console logs
2. Check network tab
3. Check localStorage
4. Check API responses
5. Clear cache and retry

### Still stuck?
- Review TASK_5_IMPLEMENTATION_SUMMARY.md
- Check backend logs
- Verify database has UserSettings collection
- Test API endpoints with Postman

**Good luck testing! 🧪**
