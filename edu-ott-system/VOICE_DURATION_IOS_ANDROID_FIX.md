# Sửa lỗi Voice Duration trên iOS và Android

## Vấn đề
- **iOS**: Phải click play 2 lần - lần 1 để load duration, lần 2 mới phát
- **Android**: Click play 1 lần là phát luôn, nhưng duration không hiển thị (chạy từ 0 đến 8s)

## Nguyên nhân
1. Duration từ backend bị override bởi metadata của audio file
2. Audio player không đợi load xong trước khi play (iOS)
3. Một số component không truyền duration prop

## Giải pháp

### 1. Ưu tiên duration từ backend
**File**: `frontend/mobile/components/chat/AudioBubbleMobile.tsx`
- Chỉ update duration từ metadata nếu backend không có
- Backend duration luôn được ưu tiên (chính xác hơn)

```typescript
// Only update duration from metadata if we don't have it from backend
if (!propDuration && newDuration !== duration && newDuration > 0) {
  setDuration(newDuration);
}
```

### 2. Đợi audio load trước khi play (iOS fix)
**File**: `frontend/mobile/components/chat/AudioBubbleMobile.tsx`
- Thêm promise để đợi audio load xong
- Timeout 3 giây nếu load quá lâu
- Play ngay sau khi load xong

```typescript
// Wait for audio to load before playing
await new Promise((resolve) => {
  const checkLoaded = (status: any) => {
    if (status?.isLoaded) {
      newPlayer.removeListener('playbackStatusUpdate', checkLoaded);
      resolve(true);
    }
  };
  newPlayer.addListener('playbackStatusUpdate', checkLoaded);
  setTimeout(() => resolve(false), 3000);
});

newPlayer.play();
```

### 3. Truyền duration prop đầy đủ
**Files**:
- `frontend/mobile/app/(tabs)/mydocument.tsx` - Thêm duration prop
- `frontend/mobile/components/chat/MessageBubble.tsx` - Thêm duration prop
- `frontend/mobile/types/chat.ts` - Thêm duration field vào Attachment interface

## Kết quả
- ✅ iOS: Click play 1 lần là phát ngay, duration hiển thị đúng từ backend
- ✅ Android: Duration hiển thị ngay từ đầu (không chạy từ 0)
- ✅ Duration chính xác từ backend, không bị override bởi metadata
- ✅ Tất cả component đều hiển thị duration đồng nhất

## Files thay đổi
1. `frontend/mobile/components/chat/AudioBubbleMobile.tsx` - Logic ưu tiên backend duration và đợi load
2. `frontend/mobile/app/(tabs)/mydocument.tsx` - Truyền duration prop
3. `frontend/mobile/components/chat/MessageBubble.tsx` - Truyền duration prop
4. `frontend/mobile/types/chat.ts` - Thêm duration field
