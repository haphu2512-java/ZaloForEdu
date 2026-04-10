# OTT Messaging Platform Backend (Improved)

Tài liệu này mô tả thiết kế backend cho hệ thống nhắn tin thời gian thực (tương tự Zalo), đã được cải thiện theo hướng production-ready.

---

# 1. Tổng quan

Backend được xây dựng với mục tiêu:

* Realtime messaging
* Khả năng scale
* Dễ maintain và mở rộng

## Tech Stack

* Runtime: Node.js
* Framework: Express
* Database: MongoDB
* Cache/Presence: Redis
* Realtime: Socket.IO
* Search: Elasticsearch (hoặc Meilisearch)
* Message Broker (optional): Kafka / RabbitMQ
* Storage: AWS S3 / Cloudinary
* API Docs: Swagger/OpenAPI

---

# 2. Nguyên tắc thiết kế API

* Base URL: `/api/v1`
* Format: JSON
* Auth: JWT (Access + Refresh Token)
* Domain-based routing
* Pagination bắt buộc
* Validation bắt buộc

## 2.1 Response format

### Success

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payload"
  }
}
```

---

# 3. Authentication & Security

## Features

* Access Token (short-lived)
* Refresh Token (long-lived)
* Token rotation
* Logout single device / all devices
* Redis blacklist

## Endpoints

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/refresh-token`
* `POST /auth/logout`
* `POST /auth/logout-all`

## Security bổ sung

* Rate limit (login/register)
* Helmet (HTTP headers)
* CORS config
* Input validation (Joi/Zod)

---

# 4. User Service

## Endpoints

* `GET /users/:id`
* `PUT /users/:id`
* `DELETE /users/:id`
* `POST /users/block/:id`

## Schema

```js
Users: {
  _id,
  username,
  password_hash,
  email,
  phone,
  avatar_url,
  created_at,
  updated_at
}
```

---

# 5. Friend Service

## Features

* Gửi/accept/reject request
* Block user
* Suggestion
* Anti-spam

## Endpoints

* `POST /friends/request`
* `PUT /friends/request/:id/accept`
* `PUT /friends/request/:id/reject`
* `DELETE /friends/:friendId`
* `GET /friends/list`

---

# 6. Conversation & Message Service

## Features

* 1-1 và group chat
* Pagination (cursor-based)
* Seen / delivered status
* Reply / forward

## Endpoints

* `GET /conversations`
* `GET /messages/conversation/:id?limit=20&cursor=xxx`
* `POST /messages/send`
* `PUT /messages/:id/read`
* `DELETE /messages/:id`

## Indexing (MongoDB)

```js
{ conversation_id: 1, timestamp: -1 }
```

## Scaling

* Sharding theo `conversation_id`

---

# 7. Media Service

## Features

* Upload file
* Resize / compress
* CDN delivery

## Storage

* AWS S3 / Cloudinary

## Endpoints

* `POST /media/upload`
* `GET /media/:id`
* `DELETE /media/:id`

---

# 8. Notification Service

## Features

* Push notification
* In-app notification
* Retry mechanism

## Architecture

* Queue-based (Kafka / RabbitMQ)

## Endpoints

* `GET /notifications`
* `PUT /notifications/:id/read`

---

# 9. Presence Service (Redis)

## Keys

```
user:{id}:status
conversation:{id}:typing:{user_id}
```

## Features

* Online/offline
* Typing indicator
* Last seen

---

# 10. Search Service

## Engine

* Elasticsearch / Meilisearch

## Features

* Full-text search
* Fuzzy search
* Autocomplete

## Endpoints

* `GET /search/messages?q=`
* `GET /search/users?q=`

---

# 11. Realtime (Socket.IO)

## Events

* `connection`
* `send_message`
* `message_delivered`
* `message_seen`
* `typing`
* `user_online`
* `reconnect`
* `disconnect`

---

# 12. Logging & Monitoring

## Logging

* Winston / Pino

## Monitoring

* Prometheus
* Grafana

---

# 13. Project Structure

```
backend/
├── config/
├── controllers/
├── models/
├── routes/
├── services/
├── middlewares/
├── utils/
├── logs/
└── README.md
```

---

# 14. Environment Variables

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=
S3_BUCKET=
ELASTICSEARCH_URL=
```

---

# 15. Running Locally

```bash
git clone <repo>
cd backend
npm install
npm run dev
```

---

# 16. Current Implementation Notes (Web + Mobile)

Backend hiện đã bổ sung các điểm để dùng chung cho web và mobile:

* Swagger docs hiển thị trực tiếp từ route annotations:
  * `http://localhost:5000/api-docs/`
  * `http://localhost:5000/api-docs/openapi.json`
* Redis thật cho blacklist/presence (fallback in-memory khi Redis không sẵn sàng).
* Header metadata client:
  * `x-client-platform` (`web|ios|android|desktop|unknown`)
  * `x-app-version`
  * `x-device-id`
  * `x-request-id` (server tự sinh nếu thiếu và trả lại trong response)
* CORS hỗ trợ nhiều web origin qua biến `CORS_ORIGIN` (danh sách phân tách bằng dấu phẩy).
