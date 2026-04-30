# Tóm tắt: Real-time Sync cho Group Settings

## Vấn đề
Khi admin/owner thay đổi cài đặt nhóm (ví dụ: "Cho phép thành viên gửi tin nhắn") trên Web, Mobile không cập nhật real-time. Người dùng phải thoát ra và vào lại mới thấy thay đổi.

## Giải pháp đã triển khai

### 1. Backend (Đã có sẵn)
File: `backend/controllers/groupFeatureController.js` (line 225)
```javascript
socketService.emitToConversation(id, 'conversation_settings_updated', conversation.settings);
```
Backend đã emit event `conversation_settings_updated` khi settings thay đổi.

### 2. Web (Đã có sẵn)
File: `frontend/web/src/pages/chat/useChatSocket.jsx`
```javascript
const handleSettingsUpdated = (newSettings) => {
  setActiveConversation(prev => prev ? { ...prev, settings: newSettings } : prev);
  setConversations(prev => prev.map(c =>
    activeConversationRef.current && c._id === activeConversationRef.current._id
      ? { ...c, settings: newSettings } : c
  ));
};

socketService.on("conversation_settings_updated", handleSettingsUpdated);
```
Web đã lắng nghe và xử lý event này.

### 3. Mobile (MỚI THÊM)

#### File: `frontend/mobile/app/chat/[id].tsx`
Thêm listener trong socket setup (line ~540):
```typescript
const onConversationSettingsUpdated = (newSettings: any) => {
  console.log('[Mobile Chat] conversation_settings_updated:', newSettings);
  setConversation((prev) => prev ? { ...prev, settings: newSettings } : prev);
};

socket.on('conversation_settings_updated', onConversationSettingsUpdated);

// Cleanup
socket.off('conversation_settings_updated', onConversationSettingsUpdated);
```

#### File: `frontend/mobile/stores/communityStore.ts`
Thêm listener cho community (line ~210):
```typescript
socket.on('conversation_settings_updated', (newSettings: any) => {
  console.log('[Mobile] conversation_settings_updated:', newSettings);
  // Settings will be handled by individual chat screens via their own socket listeners
});
```

## Cách hoạt động

1. **Admin/Owner thay đổi settings** trên Web hoặc Mobile
2. **Backend** nhận request → cập nhật DB → emit event `conversation_settings_updated` tới room `conversation:${conversationId}`
3. **Tất cả clients** đang join room đó (Web + Mobile) nhận event
4. **Client cập nhật state** → UI tự động re-render với settings mới
5. **Input bị disable/enable** ngay lập tức nếu setting `canMembersSendMessages` thay đổi

## Kiểm tra permission gửi tin nhắn

File: `frontend/mobile/app/chat/[id].tsx` (line ~1430)
```typescript
const isGroupConv = conversation?.type === 'group';
const ownerId = (conversation?.ownerId as any)?._id || conversation?.ownerId;
const adminIds = conversation?.adminIds || [];
const isOwner = ownerId && String(ownerId) === String(currentUserId);
const isAdmin = adminIds.some((aid: any) => String(aid._id || aid) === String(currentUserId)) || isOwner;
const canSend = !isGroupConv || isAdmin || conversation?.settings?.canMembersSendMessages !== false;

if (isGroupConv && !canSend) {
  return (
    <View>
      <Ionicons name="information-circle" size={20} color={colors.tint} />
      <Text>Chỉ trưởng nhóm và phó nhóm mới có thể gửi tin nhắn trong nhóm này</Text>
    </View>
  );
}
```

## Cách test

### Bước 1: Restart Backend
```bash
cd backend
npm start
```
**QUAN TRỌNG**: Backend PHẢI được restart để socket listeners mới có hiệu lực!

### Bước 2: Mở 2 devices
- Device 1: Web (admin/owner)
- Device 2: Mobile (thành viên thường)

### Bước 3: Test scenario

#### Test 1: Disable member messages
1. Device 2 (Mobile - member): Vào nhóm, thấy input bình thường
2. Device 1 (Web - admin): Vào Settings → Tắt "Cho phép thành viên gửi tin nhắn"
3. Device 2 (Mobile): **Ngay lập tức** input biến mất, hiện thông báo "Chỉ trưởng nhóm và phó nhóm..."

#### Test 2: Enable member messages
1. Device 2 (Mobile - member): Đang thấy thông báo không được gửi
2. Device 1 (Web - admin): Vào Settings → Bật "Cho phép thành viên gửi tin nhắn"
3. Device 2 (Mobile): **Ngay lập tức** input xuất hiện trở lại

#### Test 3: Cross-platform
- Thử ngược lại: Mobile admin thay đổi settings → Web member cập nhật real-time
- Thử với nhiều settings khác: `markAdminMessages`, `canMembersPin`, etc.

## Debug

### Kiểm tra console logs
Mobile sẽ log:
```
[Mobile Chat] conversation_settings_updated: { canMembersSendMessages: false, ... }
```

Web sẽ log:
```
[Socket] conversation_settings_updated: { canMembersSendMessages: false, ... }
```

### Kiểm tra socket connection
1. Mobile phải join conversation room: `joinConversation(conversationId)` được gọi
2. Backend phải emit tới đúng room: `conversation:${conversationId}`
3. Event name phải khớp: `conversation_settings_updated`

### Nếu không hoạt động
1. **Restart backend** (quan trọng nhất!)
2. Kiểm tra Mobile đã join conversation room chưa
3. Kiểm tra console logs xem có nhận event không
4. Kiểm tra conversation object có field `settings` không

## Files đã thay đổi

### Mobile
- ✅ `frontend/mobile/app/chat/[id].tsx` - Thêm socket listener
- ✅ `frontend/mobile/stores/communityStore.ts` - Thêm socket listener (optional)

### Backend
- ✅ Không thay đổi (đã có sẵn)

### Web
- ✅ Không thay đổi (đã có sẵn)

## Kết quả mong đợi
✅ Thay đổi settings trên Web → Mobile cập nhật ngay lập tức
✅ Thay đổi settings trên Mobile → Web cập nhật ngay lập tức
✅ Input disable/enable tự động khi `canMembersSendMessages` thay đổi
✅ Không cần refresh hoặc thoát ra vào lại
✅ Hoạt động với tất cả settings: `canMembersSendMessages`, `markAdminMessages`, `canMembersPin`, etc.
