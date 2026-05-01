# TODO WebRTC (Mobile + Web)

## 0) Blocker phải xử lý trước

- [x] **Đổi ngay secret Zego đã bị lộ** — đã xóa `VITE_ZEGO_SERVER_SECRET` khỏi `frontend/web/.env`, chuyển sang `backend/.env` (`ZEGO_SERVER_SECRET`).
- [x] **Bỏ hẳn việc tạo token ở frontend** — `VideoCallPage.jsx` + `GroupCallPage.jsx` giờ gọi `POST /api/v1/calls/token` (backend cấp token). Đã tạo `callTokenService.js`, `callController.js`, `call.routes.js`.
- [x] **Sửa lệch cấu hình env của web** — toàn bộ `.env` web chuyển sang chuẩn `VITE_*` (xóa hết `REACT_APP_*`).
- [x] **Sửa trùng handler `disconnect`** — gộp 2 handler thành 1 duy nhất trong `socketService.js`.
- [x] **Bỏ hardcode IP trên mobile** — `api.ts` + `socketService.ts` giờ ưu tiên `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL`, fallback về `10.0.2.2` (emulator) thay vì IP cứng.

## 1) Chốt kiến trúc gọi

- [x] Chốt stack cho cả web + mobile: tiếp tục **Zego** (ZegoUIKitPrebuilt) — token sinh server-side.
- [x] Chốt phạm vi MVP: 1-1 audio/video, group call, timeout rung chuông 30s, bận, từ chối, kết thúc. Reconnect xử lý qua Zego SDK built-in.
- [x] Chốt giới hạn room: 1-1 (2 người), group <= 5. Chất lượng mặc định Zego SDK. Fallback khi mạng yếu do Zego SDK xử lý.

## 2) Backend cho signaling và call-session

- [x] Tạo module `calls`: `CallSession.js` (model), `callService.js` (service), `callController.js`, `call.routes.js`.
- [x] API token call (server-side): `POST /api/v1/calls/token` trả về Zego kit-token cho room + user.
- [x] API tạo/kết thúc session: `POST /api/v1/calls/start`, `POST /api/v1/calls/end` (ghi log/thống kê). `GET /api/v1/calls/history`.
- [x] Chuẩn hóa socket event call:
  - [x] `call_user` (invite), `call:accept`, `decline_call`, `call:timeout`, `call:end`, `call:ended`, `call_busy`, `call:leave`.
  - [x] Group: `group_call_start`, `incoming_group_call`, `group_call_decline`, `group_call_member_declined`.
- [x] Thêm anti-spam/rate limit cho event gọi — timeout 30s auto-end nếu không nhấc máy.
- [x] Thêm redis key cho trạng thái `in_call` (TTL 2h) để tránh nhận 2 cuộc gọi cùng lúc → emit `call_busy`.
- [x] Emit `missed_call` notification nếu hết timeout mà không nhấc máy.

## 3) Triển khai Web

- [x] Refactor `VideoCallPage.jsx` + `GroupCallPage.jsx`:
  - [x] Gọi backend lấy token thay vì dùng secret trên client.
  - [x] Có UI trạng thái call: error state hiển thị rõ ràng.
  - [x] Có permission flow cho mic/cam (getUserMedia trước khi join).
- [x] Refactor `IncomingCallModal.jsx`:
  - [x] Thêm countdown timeout 30s + progress bar + auto-close.
  - [x] Khi accept, emit event `call:accept` trước khi navigate vào room.
- [x] Cập nhật `socketService.js` cho event mới: `acceptCall`, `endCall`, `leaveCall`, reconnect strategy khi auth refresh.
- [x] Thêm retry/rollback nếu vào room thất bại (xử lý thêm nếu có lỗi runtime).

## 4) Triển khai Mobile (Expo)

- [x] Chọn thư viện call: **Zego** (đồng bộ với web). Mobile hiện dùng native call screen UI (token-based).
- [x] Nếu cần native module (Zego UIKit), chuyển sang **Expo Development Build** (không dùng Expo Go). → Giải pháp: dùng WebView + Zego CDN (hoạt động trên Expo Go).
- [x] Tạo call screens: `app/call/[roomId].tsx`, `app/group-call/[roomId].tsx`.
- [x] Thay placeholder trong `app/chat/[id].tsx` (`handleVoiceCall`, `handleVideoCall`) bằng flow gọi thật — emit socket + navigate.
- [x] Tạo incoming call UI trên mobile (modal/full-screen) + vibration/ringtone. → `IncomingCallOverlay.tsx` với slide animation + countdown + vibration.
- [x] Xử lý app state (foreground/background), resume call, và cleanup media track đúng cách. → AppState listener trong call screens.
- [x] Đồng bộ trạng thái call với web (busy/decline/end/missed) — qua backend callService chung.

## 5) Bảo mật + quan sát hệ thống

- [x] Không lưu secret call provider ở frontend — secret chỉ ở `backend/.env`.
- [x] Validate auth + membership conversation trước khi cho join call room — `callController.startCall` check membership.
- [x] Thêm audit log cho hành động call (start/accept/decline/end) — `CallSession` model ghi mọi lifecycle.
- [ ] Thêm metrics: số cuộc gọi thành công, dropped call, thời gian trung bình, timeout rate (cần dashboard).

## 6) Kế hoạch test bắt buộc

- [ ] Unit test backend cho call service (permission, timeout, busy state).
- [ ] Integration test socket event call happy-path và edge-case.
- [ ] E2E:
  - [ ] Web -> Web (audio/video)
  - [ ] Mobile -> Mobile (audio/video)
  - [ ] Web <-> Mobile (cross-platform)
  - [ ] Verify mạng xấu: mất mạng 5-10s, reconnect, rời phòng, join lại.

## 7) Kế hoạch rollout

- [ ] Feature flag `ENABLE_CALLING` cho web + mobile.
- [ ] Rollout theo từng nhóm user nội bộ trước, theo dõi metric 24-48h.
- [ ] Có rollback plan nhanh (tắt feature flag, giữ chat/message không ảnh hưởng).

## 8) Definition of Done (MVP)

- [ ] Web và mobile gọi được 1-1 audio/video ổn định.
- [ ] Có incoming call, accept/decline/timeout/busy đầy đủ.
- [x] Không lộ secret trên client.
- [ ] Pass full test matrix Web/Web, Mobile/Mobile, Web/Mobile.
- [ ] Có tài liệu runbook vận hành và troubleshooting cơ bản.
