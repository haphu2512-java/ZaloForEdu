# Quy Trình Public Backend với Ngrok

## 📋 Tóm Tắt Nhanh
Khi bật máy lại, làm theo các bước này để public backend bằng ngrok:

## 🔧 Bước 1: Khởi động Backend

```bash
cd edu-ott-system/backend
npm start
```

**Chờ đến khi thấy:**
```
Server is running on port 5000
MongoDB connected
Redis connected
```

## 🌐 Bước 2: Chạy Ngrok

**Mở terminal mới** và chạy:
```bash
ngrok http 5000 --region ap
```

**Lưu ngrok URL** (ví dụ: `https://abc123.ngrok.io`)

## 📱 Bước 3: Cập Nhật Config Mobile

Vào file config/constants của Expo mobile:
```javascript
// Replace old ngrok URL with new one
export const API_BASE_URL = 'https://your-ngrok-url/api';
```

## 🖥️ Bước 4: Cập Nhật Config Web (nếu dùng ngrok)

Nếu web cũng dùng ngrok:
```javascript
// .env.local hoặc config file
REACT_APP_API_BASE_URL=https://your-ngrok-url/api
```

## ✅ Bước 5: Kiểm Tra Kết Nối

```bash
# Test ngrok URL
curl -I https://your-ngrok-url/api/health

# Hoặc từ mobile/web, kiểm tra login API
POST https://your-ngrok-url/api/auth/login
```

## 🔐 Điểm Quan Trọng

| Item | Status |
|------|--------|
| **CORS_ORIGIN** | ✅ Đã thêm `https://*.ngrok.io` |
| **MongoDB** | ✅ Cloud (mất dữ liệu?) |
| **Redis** | ⚠️ Local - restart máy sẽ mất cache |
| **Ngrok URL** | 🔄 Thay đổi mỗi lần restart |

## 🧹 Nếu Redis Bị Offline

Làm sạch Redis cache (optional):
```bash
redis-cli FLUSHALL
```

## 📌 Troubleshooting

| Lỗi | Giải Pháp |
|-----|----------|
| **Port 5000 already in use** | `lsof -i :5000` rồi kill process |
| **404 khi đăng nhập** | Check ngrok URL mới, cập nhật mobile/web config |
| **CORS Error** | Ngrok URL có trong `CORS_ORIGIN`? |
| **Redis connection error** | Chạy `redis-server` (hoặc Docker) |
| **MongoDB timeout** | Check internet connection, MongoDB Atlas status |

## ⏱️ Thời Gian Setup

- Backend start: ~5-10s
- Ngrok start: ~2-3s
- Update config: ~1-2min
- **Tổng: ~5-10 phút**

## 🔗 Liên Kết Quan Trọng

- Backend config: `backend/.env`
- Ngrok docs: https://ngrok.com/docs
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

**Ghi chú:** Mỗi lần bật máy lại, ngrok URL thay đổi → phải update lại config mobile/web.
