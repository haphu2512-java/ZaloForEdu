# Mobile Group Parity Note

## Pham vi
Cap nhat mobile de dong bo tinh nang quan ly nhom voi web, khong doi backend.

## Nhung nhom tinh nang da dong bo
- Permission matrix cho thanh vien: update info, pin, reminder, poll, send message.
- Cai dat nhom: approval mode, mark admin messages, read history for new members, invite link usage.
- Reminder flow: tao/sua/xoa, tham gia/tu choi, realtime event.
- Poll + pin theo permission.
- Join request moderation.
- Block/unblock member in group.
- Owner/Admin role management.
- Invite link share uu tien dang web `/join/<code>` va deep-link app.

## Duong dan thao tac chinh (mobile routes)
- `/conversation-details?id=<conversationId>`
- `/pinned-messages?id=<conversationId>`
- `/reminders?id=<conversationId>`
- `/join-requests?id=<conversationId>`
- `/blocked-members?id=<conversationId>`
- `/group-roles?id=<conversationId>`
- `/join-group?code=<inviteCode>`

## Ghi chu
- Backend khong thay doi.
- Mobile tiep tuc nhan event socket de dong bo settings/pin/poll/reminder/join-request theo realtime.
- Cau hinh `EXPO_PUBLIC_WEB_URL` trong `frontend/mobile/.env` de share invite link theo domain web (fallback `http://localhost:3000`).
