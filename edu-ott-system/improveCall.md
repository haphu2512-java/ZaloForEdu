# Improve Call Flow (Mobile + Web)

## Mục tiêu
- Đóng lỗ hổng bảo mật trong luồng tạo token Zego.
- Đồng bộ vòng đời cuộc gọi giữa Backend, Web, Mobile.
- Hoàn thiện xử lý event realtime cho trạng thái gọi.
- Bổ sung test cho các nhánh quan trọng để tránh regression.

## 1) Security Fix (P0)

### 1.1 Không trả `serverSecret` ra client
- File cần sửa: `backend/controllers/callController.js`
- Việc cần làm:
  - Xóa `serverSecret` khỏi response của `POST /calls/token`.
  - Trả về token đã ký từ backend (dùng `generateZegoToken`).
  - Response đề xuất:
    - `appID`
    - `token` (zego kit token đã ký)
    - `userID`
    - `userName`
    - `roomId`

### 1.2 Ràng buộc quyền truy cập khi xin token
- File cần sửa: `backend/controllers/callController.js`, `backend/services/callService.js`
- Việc cần làm:
  - Validate `roomId` bắt buộc, định dạng hợp lệ.
  - Chỉ cho cấp token nếu user thuộc call session/participant của `roomId`.
  - Nếu chưa có session (trường hợp incoming vừa nhận), cần xác minh membership qua `conversationId` liên quan hoặc map từ session đang `ringing/active`.
  - Trả `403` khi không có quyền.

### 1.3 Bỏ `generateKitTokenForTest` ở client
- File cần sửa:
  - `frontend/web/src/pages/chat/VideoCallPage.jsx`
  - `frontend/web/src/pages/chat/GroupCallPage.jsx`
  - `frontend/mobile/app/call/[roomId].tsx`
  - `frontend/mobile/app/group-call/[roomId].tsx`
- Việc cần làm:
  - Không dùng `data.serverSecret` nữa.
  - Dùng token backend trả về để khởi tạo Zego theo flow production.
  - Đảm bảo không có biến/chuỗi nào chứa `serverSecret` trong client bundle/WebView HTML.

## 2) Call Lifecycle Fix (P0/P1)

### 2.1 Web phải emit end/leave khi rời cuộc gọi
- File cần sửa:
  - `frontend/web/src/pages/chat/VideoCallPage.jsx`
  - `frontend/web/src/pages/chat/GroupCallPage.jsx`
- Việc cần làm:
  - Trong `onLeaveRoom`:
    - 1-1 call: emit `call:end`.
    - Group call: emit `call:leave`.
  - Tránh emit trùng nhiều lần (dùng cờ `hasEnded`/`hasLeft`).

### 2.2 Mobile accept group call phải emit `call:accept`
- File cần sửa: `frontend/mobile/components/call/IncomingCallOverlay.tsx`
- Việc cần làm:
  - Khi accept group call, emit `call:accept` trước khi `router.push`.
  - Truyền `roomId` + `callerId` nhất quán như nhánh 1-1.

### 2.3 Chuẩn hóa cleanup `in_call`
- File cần rà/sửa:
  - `backend/services/callService.js`
  - `backend/services/socketService.js`
- Việc cần làm:
  - Đảm bảo mọi nhánh `end/decline/timeout/leave/disconnect` đều clear trạng thái hợp lý.
  - Xác nhận logic group call không làm participant hợp lệ bị mark sai trạng thái `missed`.

## 3) Event Handling/UX Fix (P1)

### 3.1 Lắng nghe đầy đủ event call ở Web/Mobile
- Event cần xử lý ở caller/callee:
  - `call_busy`
  - `call:accepted`
  - `missed_call`
  - `call_declined`
  - `call:timeout`
  - `call:ended`
- File gợi ý:
  - `frontend/web/src/pages/chat/ChatPage.jsx`
  - `frontend/web/src/pages/chat/Modals/IncomingCallModal.jsx`
  - `frontend/mobile/app/chat/[id].tsx`
  - `frontend/mobile/components/call/IncomingCallOverlay.tsx`
- Việc cần làm:
  - Hiển thị toast/modal phù hợp theo trạng thái.
  - Khi nhận `call:accepted`, caller chuyển UI sang trạng thái “đang kết nối”.

### 3.2 Đồng bộ naming `type` audio/voice
- Hiện trạng: có nơi dùng `audio`, có nơi dùng query `voice`.
- Việc cần làm:
  - Chuẩn hóa toàn bộ payload socket/API dùng `audio | video`.
  - Query param route có thể giữ `voice` nhưng convert 1 chỗ duy nhất tại entry page.

## 4) Test Plan (P1/P2)

### 4.1 Backend tests
- Tạo test cho:
  - `POST /calls/token` trả `403` nếu user không thuộc session/conversation.
  - `POST /calls/token` không chứa `serverSecret`.
  - `call:end`, `call:leave`, `timeout` cập nhật đúng `CallSession` + clear `in_call`.

### 4.2 Frontend tests (khả thi theo mức hiện tại)
- Unit test (mock socket):
  - Incoming modal/overlay nhận event và cleanup listener đúng.
  - Accept/decline emit đúng event cho 1-1 và group.

## 5) Rollout Checklist
- [ ] Sửa backend token endpoint + authz check.
- [ ] Refactor web/mobile dùng production token.
- [x] Sửa onLeaveRoom emit end/leave.
- [x] Sửa mobile group accept emit `call:accept`.
- [ ] Bổ sung listener event call còn thiếu.
- [x] Sửa dedupe call session để thông báo system call xuất hiện ổn định cho chat 1-1 (không chỉ group).
- [ ] Viết test backend tối thiểu cho token/lifecycle.
- [ ] Regression test manual:
  - [ ] 1-1 audio/video: accept/decline/timeout/end.
  - [ ] Group audio/video: join/leave/timeout/caller disconnect.
  - [ ] Trường hợp user đang bận (`call_busy`).

## 6) Ưu tiên triển khai
1. P0: Security (`serverSecret`, token authz, bỏ test token generation trên client).
2. P0: Lifecycle consistency (emit end/leave + group accept).
3. P1: Event UX và đồng bộ type.
4. P1/P2: Test coverage.
