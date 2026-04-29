# Hướng dẫn Debug Voice Duration

## Vấn đề hiện tại
- **Web**: Hiển thị duration đúng (00:08, 00:06, 00:10)
- **Mobile**: Tất cả đều hiện 0:00

## Các bước debug

### Bước 1: RESTART BACKEND (QUAN TRỌNG NHẤT!)
```bash
cd backend
# Stop backend nếu đang chạy (Ctrl+C)
npm start
```

**Lý do**: Backend phải restart để Media model có field `duration` mới.

Kiểm tra backend log khi start:
```
Server running on port 5000
MongoDB connected
```

---

### Bước 2: Test gửi voice từ Mobile

1. Mở Mobile app
2. Vào một conversation
3. Bấm mic để ghi âm
4. Ghi âm 8 giây
5. Bấm gửi

**Kiểm tra Mobile logs**:
```
[Voice] Sending voice with duration: 8 seconds
[Upload] uploadMediaForm called with: { fileName: "voice-...", mimeType: "audio/mp4", duration: 8 }
[Upload] Adding duration to FormData: 8
[Upload] Response: { mediaId: "...", duration: 8 }
```

**Nếu thấy**:
- ✅ `duration: 8` → Duration được gửi đúng
- ❌ `duration: undefined` → VoiceRecorderMobile không trả về duration
- ❌ `No duration provided!` → handleSendVoice không nhận duration

---

### Bước 3: Kiểm tra Backend logs

**Backend phải log**:
```
[Media Upload] Created media: {
  fileName: "voice-1234567890.m4a",
  mimeType: "audio/mp4",
  duration: 8,
  receivedDuration: "8"
}
```

**Nếu thấy**:
- ✅ `duration: 8` → Backend lưu duration đúng
- ❌ `duration: null` → Backend không nhận được duration từ FormData
- ❌ `receivedDuration: undefined` → Mobile không gửi duration

---

### Bước 4: Kiểm tra database

Mở MongoDB và kiểm tra collection `medias`:
```javascript
db.medias.find().sort({createdAt: -1}).limit(1).pretty()
```

**Kết quả mong đợi**:
```json
{
  "_id": "...",
  "fileName": "voice-1234567890.m4a",
  "mimeType": "audio/mp4",
  "duration": 8,
  "url": "/uploads/...",
  "createdAt": "2026-04-29T..."
}
```

**Nếu thấy**:
- ✅ `"duration": 8` → Database lưu đúng
- ❌ `"duration": null` → Backend không lưu duration
- ❌ Không có field `duration` → Backend chưa restart hoặc model chưa update

---

### Bước 5: Kiểm tra Mobile hiển thị

Sau khi gửi voice, kiểm tra:
1. Voice message xuất hiện trong chat
2. Duration hiển thị bên cạnh waveform

**Kết quả mong đợi**: `0:08` (không phải `0:00`)

**Nếu vẫn hiện 0:00**:
- Kiểm tra `media.duration` trong message object
- Kiểm tra AudioBubbleMobile có nhận prop `duration` không
- Kiểm tra console log: `[Mobile Chat] Rendering audio with duration: 8`

---

## Các lỗi thường gặp

### Lỗi 1: Backend chưa restart
**Triệu chứng**: Database không có field `duration`

**Giải pháp**:
```bash
cd backend
# Stop backend (Ctrl+C)
npm start
```

---

### Lỗi 2: VoiceRecorderMobile không trả về duration
**Triệu chứng**: Mobile log hiện `No duration provided!`

**Kiểm tra**:
```typescript
// frontend/mobile/components/chat/VoiceRecorderMobile.tsx
const handleStopAndSend = async () => {
  const finalDurationSeconds = Math.floor(duration / 1000);
  console.log('[VoiceRecorder] Sending with duration:', finalDurationSeconds);
  onSend(uri, finalDurationSeconds); // ← Phải có duration
};
```

---

### Lỗi 3: handleSendVoice không nhận duration
**Triệu chứng**: Mobile log không hiện `[Voice] Sending voice with duration`

**Kiểm tra**:
```typescript
// frontend/mobile/app/chat/[id].tsx
const handleSendVoice = async (uri: string, duration: number) => {
  // ← Phải có parameter duration
  console.log('[Voice] Sending voice with duration:', duration);
  // ...
};
```

---

### Lỗi 4: FormData không gửi duration
**Triệu chứng**: Backend log hiện `receivedDuration: undefined`

**Kiểm tra**:
```typescript
// frontend/mobile/utils/mediaService.ts
if (payload.duration) {
  formData.append('duration', payload.duration.toString()); // ← Phải convert to string
}
```

---

### Lỗi 5: Backend không parse duration
**Triệu chứng**: Backend log hiện `receivedDuration: "8"` nhưng `duration: null`

**Kiểm tra**:
```javascript
// backend/controllers/mediaController.js
duration: req.body.duration ? parseInt(req.body.duration) : null,
// ← Phải parse string to number
```

---

### Lỗi 6: AudioBubbleMobile không nhận duration prop
**Triệu chứng**: Voice hiển thị nhưng vẫn hiện 0:00

**Kiểm tra**:
```typescript
// frontend/mobile/app/chat/[id].tsx
<AudioBubbleMobile 
  url={media.url} 
  isMe={isMine} 
  duration={media.duration} // ← Phải truyền duration
/>
```

---

## Checklist debug

### Backend
- [ ] Backend đã restart
- [ ] Media model có field `duration`
- [ ] mediaController log `[Media Upload] Created media`
- [ ] Database có field `duration` với giá trị đúng

### Mobile
- [ ] VoiceRecorderMobile trả về duration
- [ ] handleSendVoice nhận parameter duration
- [ ] uploadMediaForm gửi duration qua FormData
- [ ] Upload response có field duration
- [ ] AudioBubbleMobile nhận prop duration
- [ ] Duration hiển thị đúng (không phải 0:00)

### Web (để so sánh)
- [ ] Web hiển thị duration đúng
- [ ] Web upload có gửi duration
- [ ] Web AudioBubble nhận prop duration

---

## Test case

### Test 1: Gửi voice 8 giây từ Mobile
1. Ghi âm 8 giây
2. Bấm gửi
3. ✅ Backend log: `duration: 8`
4. ✅ Database: `"duration": 8`
5. ✅ Mobile hiển thị: `0:08`

### Test 2: Gửi voice 15 giây từ Web
1. Ghi âm 15 giây
2. Bấm gửi
3. ✅ Backend log: `duration: 15`
4. ✅ Database: `"duration": 15`
5. ✅ Web hiển thị: `00:15`
6. ✅ Mobile cũng hiển thị: `0:15` (cross-platform)

### Test 3: Voice cũ (trước khi update)
1. Mở voice message cũ
2. ✅ Hiển thị `0:00` (bình thường vì không có duration trong DB)
3. ✅ Khi play, duration load từ audio metadata

---

## Kết quả mong đợi

✅ Backend restart thành công
✅ Mobile gửi duration lên backend
✅ Backend lưu duration vào database
✅ Mobile hiển thị duration đúng (0:08, 0:15, etc.)
✅ Web hiển thị duration đúng (00:08, 00:15, etc.)
✅ Cross-platform: Voice từ Web hiển thị đúng trên Mobile và ngược lại
✅ Không còn hiện 0:00 cho voice messages mới
