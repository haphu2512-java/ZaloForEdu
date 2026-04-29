# PLAN ĐỒNG BỘ CHỨC NĂNG WEB - MOBILE

## 📋 TỔNG QUAN CÁC VẤN ĐỀ CẦN SỬA

### ✅ Đã phân tích xong:
1. ✅ Mobile sửa realtime nhóm
2. ✅ Phân quyền trưởng nhóm ở bên web
3. ✅ Set chặn tin nhắn bên mobile phải từ chối luôn
4. ✅ Chuyển quyền trưởng nhóm bên web (với thông báo không thể hoàn tác)
5. ✅ Theme và thông báo không được lưu bên web

---

## 🎯 TASK 1: MOBILE - REALTIME NHÓM (Group Updates)

### Vấn đề hiện tại:
- Mobile chỉ xử lý `new_message` và `announcement` trong communityStore
- Thiếu các socket events cho group member changes, role changes, settings updates

### Cần làm:

#### 1.1. Thêm Socket Events vào Mobile (`frontend/mobile/utils/socketService.ts`)
```typescript
// Thêm các events mới:
- member_added (khi có thành viên mới)
- member_removed (khi thành viên bị kick)
- member_blocked (khi thành viên bị chặn)
- member_promoted (khi thành viên được promote admin)
- member_demoted (khi admin bị demote)
- owner_transferred (khi chuyển quyền trưởng nhóm)
- group_settings_updated (khi đổi tên nhóm, avatar, settings)
- removed_from_group (khi bản thân bị kick/blocked)
```

#### 1.2. Cập nhật Community Store (`frontend/mobile/stores/communityStore.ts`)
```typescript
// Thêm handlers trong connectRealtime():
socket.on('member_added', (data) => {
  // Reload members list
  get().loadMembers(data.conversationId);
});

socket.on('member_removed', (data) => {
  // Reload members list
  get().loadMembers(data.conversationId);
});

socket.on('member_promoted', (data) => {
  // Update member role in store
  get().updateMemberRole(data.conversationId, data.memberId, 'admin');
});

socket.on('owner_transferred', (data) => {
  // Update owner and reload members
  get().updateCommunityOwner(data.conversationId, data.newOwnerId);
});

socket.on('removed_from_group', (data) => {
  // Remove community from list
  get().removeCommunity(data.conversationId);
  // Show notification
});
```

#### 1.3. Files cần sửa:
- `frontend/mobile/utils/socketService.ts` (thêm event listeners)
- `frontend/mobile/stores/communityStore.ts` (thêm handlers và state updates)
- `frontend/mobile/screens/MembersScreen.tsx` (auto-refresh khi có changes)

---

## 🎯 TASK 2: WEB - PHÂN QUYỀN TRƯỞNG NHÓM

### Vấn đề hiện tại:
- Web đã có promote/demote admin functions
- Cần kiểm tra UI có đầy đủ không

### Cần làm:

#### 2.1. Kiểm tra UI trong ChatRightPanel
- ✅ Đã có `promoteGroupAdmin` và `demoteGroupAdmin` functions
- ✅ Đã có UI trong ChatRightPanel để promote/demote

#### 2.2. Thêm Socket Listeners cho Web (`frontend/web/src/services/socketService.js`)
```javascript
// Thêm listeners:
this.socket.on('member_promoted', (data) => {
  // Update conversation in chatStore
});

this.socket.on('member_demoted', (data) => {
  // Update conversation in chatStore
});
```

#### 2.3. Cập nhật Chat Store (`frontend/web/src/store/chatStore.js`)
```javascript
// Thêm handler:
handleMemberRoleChange: (data) => {
  const { conversationId, memberId, role } = data;
  // Update conversation.adminIds
  set((state) => ({
    conversations: state.conversations.map(conv => 
      conv._id === conversationId 
        ? { ...conv, adminIds: updateAdminIds(conv.adminIds, memberId, role) }
        : conv
    )
  }));
}
```

#### 2.4. Files cần sửa:
- `frontend/web/src/services/socketService.js` (thêm listeners)
- `frontend/web/src/store/chatStore.js` (thêm handlers)
- `frontend/web/src/pages/chat/ChatRightPanel.jsx` (connect to socket events)

---

## 🎯 TASK 3: MOBILE - CHẶN TIN NHẮN (Block User)

### Vấn đề hiện tại:
- Backend đã có logic check blockedUsers trước khi send message
- Mobile cần thêm UI để block user và xử lý khi bị block

### Cần làm:

#### 3.1. Tạo Block Service cho Mobile (`frontend/mobile/utils/blockService.ts`)
```typescript
export async function blockUser(targetId: string): Promise<void> {
  await fetchAPI(`/users/${targetId}/block`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'block' }),
  });
}

export async function unblockUser(targetId: string): Promise<void> {
  await fetchAPI(`/users/${targetId}/block`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'unblock' }),
  });
}

export async function getBlockedUsers(): Promise<User[]> {
  const res = await fetchAPI('/users/blocked');
  return res.data?.blockedUsers || [];
}
```

#### 3.2. Thêm UI Block User trong Profile Screen
```typescript
// Trong UserProfileScreen hoặc ChatScreen:
- Thêm button "Chặn người dùng"
- Hiển thị confirmation dialog
- Sau khi block, không cho gửi tin nhắn
```

#### 3.3. Xử lý khi bị block
```typescript
// Trong message sending logic:
try {
  await sendMessage(payload);
} catch (error) {
  if (error.errorCode === 'BLOCKED_BY_USER') {
    Alert.alert('Không thể gửi tin nhắn', 'Bạn đã bị người này chặn');
  }
}
```

#### 3.4. Thêm Socket Event khi bị block
```typescript
// Trong socketService.ts:
socket.on('user_blocked_you', (data) => {
  // Show notification
  // Disable message input
});
```

#### 3.5. Files cần tạo/sửa:
- `frontend/mobile/utils/blockService.ts` (TẠO MỚI)
- `frontend/mobile/screens/UserProfileScreen.tsx` (thêm block button)
- `frontend/mobile/screens/ChatScreen.tsx` (xử lý blocked state)
- `frontend/mobile/utils/socketService.ts` (thêm user_blocked_you event)

---

## 🎯 TASK 4: WEB - CHUYỂN QUYỀN TRƯỞNG NHÓM VỚI CONFIRMATION

### Vấn đề hiện tại:
- ✅ Đã có TransferOwnerModal
- ⚠️ Cần thêm warning rõ ràng về việc không thể hoàn tác

### Cần làm:

#### 4.1. Cập nhật TransferOwnerModal (`frontend/web/src/pages/chat/Modals/TransferOwnerModal.jsx`)
```javascript
// Thêm warning message:
<div style={{ 
  background: '#FEF3C7', 
  border: '1px solid #F59E0B',
  borderRadius: 8,
  padding: 12,
  margin: '12px 16px',
  display: 'flex',
  gap: 10
}}>
  <FaExclamationTriangle color="#F59E0B" size={18} />
  <div style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
    <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác! 
    Sau khi chuyển quyền trưởng nhóm, bạn sẽ trở thành phó nhóm 
    và không thể tự lấy lại quyền trưởng nhóm.
  </div>
</div>

// Thêm confirmation dialog trước khi transfer:
const handleConfirm = (newOwnerId) => {
  const confirmed = window.confirm(
    '⚠️ XÁC NHẬN CHUYỂN QUYỀN TRƯỞNG NHÓM\n\n' +
    'Bạn có chắc chắn muốn chuyển quyền trưởng nhóm?\n\n' +
    '❌ Hành động này KHÔNG THỂ HOÀN TÁC!\n' +
    '❌ Bạn sẽ trở thành phó nhóm sau khi chuyển quyền.\n' +
    '❌ Chỉ trưởng nhóm mới có thể chuyển quyền lại.\n\n' +
    'Nhấn OK để xác nhận.'
  );
  
  if (confirmed) {
    onConfirm(newOwnerId);
  }
};
```

#### 4.2. Files cần sửa:
- `frontend/web/src/pages/chat/Modals/TransferOwnerModal.jsx` (thêm warning và double confirmation)

---

## 🎯 TASK 5: WEB - LƯU THEME VÀ THÔNG BÁO VÀO DATABASE

### Vấn đề hiện tại:
- Web lưu theme trong localStorage (không sync giữa devices)
- Web chưa có notification settings
- Mobile đã dùng Settings API đúng cách

### Cần làm:

#### 5.1. Tạo Settings Service cho Web (`frontend/web/src/services/settingsService.js`)
```javascript
import api from "./authService";

export const settingsService = {
  // Get user settings from database
  getMySettings: () => api.get("/settings/me"),

  // Update user settings
  updateMySettings: (data) => api.put("/settings/me", data),
};
```

#### 5.2. Cập nhật ThemeContext (`frontend/web/src/contexts/ThemeContext.jsx`)
```javascript
import { settingsService } from '../services/settingsService';

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await settingsService.getMySettings();
        const savedTheme = res.data?.data?.theme || 'system';
        setThemeMode(savedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
        // Fallback to localStorage
        const localTheme = localStorage.getItem('app-theme-mode') || 'system';
        setThemeMode(localTheme);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  // Save theme to database when changed
  const updateThemeMode = async (newTheme) => {
    setThemeMode(newTheme);
    localStorage.setItem('app-theme-mode', newTheme); // Keep for offline
    
    try {
      await settingsService.updateMySettings({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // ... rest of code
};
```

#### 5.3. Tạo Notification Settings Component (`frontend/web/src/components/NotificationSettings.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    messageEnabled: true,
    groupEnabled: true,
    soundEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsService.getMySettings();
      setSettings(res.data?.data?.notifications || settings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await settingsService.updateMySettings({
        notifications: newSettings,
      });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  return (
    <div className="notification-settings">
      <h3>Cài đặt thông báo</h3>
      
      <label>
        <input
          type="checkbox"
          checked={settings.pushEnabled}
          onChange={(e) => updateSetting('pushEnabled', e.target.checked)}
        />
        Bật thông báo đẩy
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.messageEnabled}
          onChange={(e) => updateSetting('messageEnabled', e.target.checked)}
        />
        Thông báo tin nhắn mới
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.groupEnabled}
          onChange={(e) => updateSetting('groupEnabled', e.target.checked)}
        />
        Thông báo nhóm
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
        />
        Âm thanh thông báo
      </label>
    </div>
  );
}
```

#### 5.4. Thêm vào Settings Page (`frontend/web/src/pages/settings/SettingsPage.jsx`)
```javascript
import NotificationSettings from '../../components/NotificationSettings';

// Trong component:
<section>
  <h2>Giao diện</h2>
  <ThemeSelector /> {/* Existing */}
</section>

<section>
  <h2>Thông báo</h2>
  <NotificationSettings /> {/* NEW */}
</section>
```

#### 5.5. Files cần tạo/sửa:
- `frontend/web/src/services/settingsService.js` (TẠO MỚI)
- `frontend/web/src/contexts/ThemeContext.jsx` (SỬA - load/save từ API)
- `frontend/web/src/components/NotificationSettings.jsx` (TẠO MỚI)
- `frontend/web/src/pages/settings/SettingsPage.jsx` (SỬA - thêm notification settings)

---

## 📊 PRIORITY & TIMELINE

### Priority 1 (Quan trọng nhất):
1. **TASK 5** - Lưu theme và notification vào DB (ảnh hưởng UX nhiều nhất)
2. **TASK 3** - Block user trên mobile (security feature)

### Priority 2:
3. **TASK 4** - Confirmation cho transfer ownership (prevent mistakes)
4. **TASK 1** - Realtime nhóm trên mobile (improve UX)

### Priority 3:
5. **TASK 2** - Phân quyền realtime trên web (nice to have)

---

## 🔧 BACKEND CHANGES NEEDED

### Backend đã có sẵn:
- ✅ Settings API (`/settings/me` GET/PUT)
- ✅ Block user API (`/users/:id/block`)
- ✅ Transfer ownership API (`/conversations/:id/owner`)
- ✅ Promote/demote admin API

### Backend cần thêm:
- ⚠️ Socket events cho group member changes (có thể đã có, cần kiểm tra)
- ⚠️ Socket event `user_blocked_you` khi user bị block

---

## ✅ CHECKLIST IMPLEMENTATION

### TASK 1: Mobile Realtime Nhóm
- [ ] Thêm socket event listeners vào socketService.ts
- [ ] Thêm handlers vào communityStore.ts
- [ ] Test realtime updates khi có member changes
- [ ] Test realtime updates khi có role changes

### TASK 2: Web Phân Quyền Realtime
- [ ] Thêm socket listeners vào socketService.js
- [ ] Thêm handlers vào chatStore.js
- [ ] Test promote/demote realtime

### TASK 3: Mobile Block User
- [ ] Tạo blockService.ts
- [ ] Thêm block button vào UserProfileScreen
- [ ] Xử lý blocked state trong ChatScreen
- [ ] Thêm socket event user_blocked_you
- [ ] Test block/unblock flow

### TASK 4: Web Transfer Ownership Confirmation
- [ ] Thêm warning message vào TransferOwnerModal
- [ ] Thêm double confirmation dialog
- [ ] Test transfer flow

### TASK 5: Web Settings API
- [ ] Tạo settingsService.js
- [ ] Cập nhật ThemeContext load/save từ API
- [ ] Tạo NotificationSettings component
- [ ] Thêm vào SettingsPage
- [ ] Test theme sync giữa devices
- [ ] Test notification settings sync

---

## 🚀 NEXT STEPS

Bạn muốn tôi bắt đầu implement từ task nào?

**Đề xuất:** Bắt đầu từ **TASK 5** (Settings API) vì:
1. Ảnh hưởng trực tiếp đến UX
2. Backend đã sẵn sàng
3. Dễ test và verify
4. Không phụ thuộc vào các task khác
