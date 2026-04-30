# 🔧 Hướng dẫn Fix lỗi Audio không phát được trên iOS

## 🔴 Vấn đề
- **Lỗi:** `This media format is not supported. - The AVPlayerItem instance has failed with the error code -11828`
- **Nguyên nhân:** iOS không hỗ trợ định dạng audio **WebM** mà web đang ghi âm
- **Triệu chứng:** 
  - Tự gửi tự nghe được (vì cùng thiết bị)
  - Người khác gửi từ web → iOS không phát được

## ✅ Giải pháp đã áp dụng

### 1. **Sửa Web VoiceRecorder** (frontend/web/src/components/shared/VoiceRecorder.jsx)
```javascript
// ƯU TIÊN format tương thích iOS:
// 1. audio/mp4 (AAC) - TỐT NHẤT cho iOS
// 2. audio/wav - Tương thích tốt
// 3. audio/webm - CHỈ dùng khi không có lựa chọn khác
```

**Thay đổi:**
- Đổi thứ tự ưu tiên: `mp4 > wav > webm`
- Thêm log để debug format đang dùng

### 2. **Sửa Mobile VoiceRecorderMobile** (frontend/mobile/components/chat/VoiceRecorderMobile.tsx)
```typescript
// Dùng preset HIGH_QUALITY của Expo
// Tự động chọn format tốt nhất cho từng platform:
// - iOS: .m4a (AAC)
// - Android: .m4a (AAC)
```

**Thay đổi:**
- Đơn giản hóa config, dùng `Audio.RecordingOptionsPresets.HIGH_QUALITY`
- Format output: `.m4a` (tương thích cả iOS và Android)

### 3. **Cải thiện AudioBubbleMobile** (frontend/mobile/components/chat/AudioBubbleMobile.tsx)
```typescript
// Thêm thông báo lỗi rõ ràng khi format không được hỗ trợ
```

**Thay đổi:**
- Hiển thị thông báo chi tiết khi gặp lỗi format
- Hướng dẫn người dùng cách khắc phục

## 🧪 Cách test

### Test 1: Ghi âm từ Mobile → Phát trên Mobile
```bash
1. Mở app mobile (iOS/Android)
2. Vào chat bất kỳ
3. Nhấn nút mic → Ghi âm → Gửi
4. Nhấn play → Phải phát được
```

### Test 2: Ghi âm từ Web → Phát trên Mobile iOS
```bash
1. Mở web browser
2. Vào cùng chat
3. Ghi âm từ web → Gửi
4. Mở app iOS → Nhấn play
5. ✅ Phải phát được (nếu browser hỗ trợ audio/mp4)
6. ⚠️ Nếu vẫn lỗi → Browser đang dùng WebM
```

### Test 3: Kiểm tra format đang dùng
```bash
# Trên Web Console:
🎤 Recording with format: audio/mp4  ← TỐT (iOS tương thích)
🎤 Recording with format: audio/webm ← XẤU (iOS không tương thích)

# Trên Backend logs:
Kiểm tra mimeType của file audio được upload
```

## 🔍 Debug

### Kiểm tra browser hỗ trợ format nào:
```javascript
// Paste vào Console của browser:
console.log('MP4:', MediaRecorder.isTypeSupported('audio/mp4'));
console.log('WAV:', MediaRecorder.isTypeSupported('audio/wav'));
console.log('WebM:', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
```

### Kết quả mong đợi:
- **Chrome/Edge:** Hỗ trợ cả 3 (ưu tiên MP4)
- **Firefox:** Chỉ hỗ trợ WebM (⚠️ vẫn sẽ lỗi trên iOS)
- **Safari:** Hỗ trợ MP4 và WAV

## ⚠️ Lưu ý quan trọng

### 1. Firefox vẫn sẽ ghi WebM
Firefox không hỗ trợ `audio/mp4` trong MediaRecorder. Nếu người dùng dùng Firefox:
- Audio sẽ được ghi bằng WebM
- iOS sẽ KHÔNG phát được
- **Giải pháp:** Hiển thị cảnh báo cho user Firefox

### 2. Cần convert audio trên server (Tùy chọn)
Để đảm bảo 100% tương thích, có thể:
```javascript
// Backend: Convert WebM → MP4/AAC bằng FFmpeg
// Nhưng tốn tài nguyên server
```

### 3. Thông báo cho user
Khi iOS không phát được audio:
```
⚠️ Định dạng audio không được hỗ trợ trên iOS.

Tin nhắn này được ghi bằng định dạng WebM (từ web) 
không tương thích với iOS. 

Vui lòng yêu cầu người gửi:
- Ghi âm lại từ thiết bị iOS/Android
- Hoặc dùng Chrome/Safari thay vì Firefox
```

## 📊 Bảng tương thích

| Platform Ghi | Format | iOS Phát | Android Phát | Web Phát |
|-------------|--------|----------|--------------|----------|
| iOS Mobile  | .m4a   | ✅       | ✅           | ✅       |
| Android Mobile | .m4a | ✅       | ✅           | ✅       |
| Web (Chrome) | .mp4  | ✅       | ✅           | ✅       |
| Web (Safari) | .mp4  | ✅       | ✅           | ✅       |
| Web (Firefox)| .webm | ❌       | ✅           | ✅       |

## 🚀 Triển khai

### Bước 1: Test local
```bash
cd frontend/mobile
npm start

cd frontend/web  
npm run dev
```

### Bước 2: Test cross-platform
1. Ghi âm từ iOS → Phát trên Android ✅
2. Ghi âm từ Android → Phát trên iOS ✅
3. Ghi âm từ Web (Chrome) → Phát trên iOS ✅
4. Ghi âm từ Web (Firefox) → Phát trên iOS ⚠️

### Bước 3: Deploy
```bash
# Commit changes
git add .
git commit -m "fix: iOS audio playback compatibility - prioritize MP4/AAC format"
git push
```

## 📝 Checklist

- [x] Sửa Web VoiceRecorder ưu tiên MP4
- [x] Sửa Mobile VoiceRecorder dùng HIGH_QUALITY preset
- [x] Thêm error message rõ ràng cho iOS
- [ ] Test trên Chrome (Web → iOS)
- [ ] Test trên Safari (Web → iOS)
- [ ] Test trên Firefox (Web → iOS) - Sẽ vẫn lỗi
- [ ] Thêm cảnh báo cho Firefox users (Optional)
- [ ] Thêm server-side conversion (Optional)

## 🆘 Nếu vẫn lỗi

1. **Kiểm tra browser đang dùng format gì:**
   - Mở Console → Xem log `🎤 Recording with format:`
   
2. **Kiểm tra file đã upload:**
   - Vào backend/uploads → Xem extension file
   - Nếu là `.webm` → Vẫn đang dùng WebM
   
3. **Clear cache:**
   ```bash
   # Mobile
   Xóa app → Cài lại
   
   # Web
   Ctrl+Shift+R (Hard reload)
   ```

4. **Liên hệ:**
   - Gửi log console
   - Gửi screenshot lỗi
   - Cho biết browser/OS đang dùng
