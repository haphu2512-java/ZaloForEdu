# Zalo Clone - API Documentation Guide

**API Version:** 2.0.0  
**Last Updated:** April 10, 2026  
**Base URL:** `http://localhost:5000/api/v1`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Response Format](#api-response-format)
4. [Error Codes](#error-codes)
5. [Pagination](#pagination)
6. [Endpoints Summary](#endpoints-summary)
7. [Rate Limiting](#rate-limiting)
8. [WebSocket Events](#websocket-events)
9. [Best Practices](#best-practices)

---

## Overview

### API Architecture

The ZaloCloneForEdu API is organized into 10 main feature groups:

| Feature | Endpoints | Auth Required |
|---------|-----------|---------------|
| **Auth** | 10 | Mostly No |
| **Users** | 4 | Yes |
| **Friends** | 6 | Yes |
| **Conversations** | 10+ | Yes |
| **Messages** | 6 | Yes |
| **Media** | 5 | Yes |
| **Notifications** | 2 | Yes |
| **Search** | 2 | Yes |
| **Settings** | 2 | Yes |
| **ChatBot** | 1 | Yes |

**Total Endpoints:** 48+

### Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (Bearer Token)
- **Real-time:** WebSocket (Socket.io)
- **File Storage:** Cloudinary

---

## Authentication

### Bearer Token Flow

All protected endpoints require JWT Bearer authentication via HTTP header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Login Flow

1. **POST** `/auth/register` - Create account
   ```json
   POST /auth/register
   {
     "email": "user@example.com",
     "username": "john_doe",
     "password": "Password123!"
   }
   ```
   Response: User + accessToken + refreshToken

2. **POST** `/auth/login` - Login with credentials
   ```json
   POST /auth/login
   {
     "email": "user@example.com",
     "password": "Password123!"
   }
   ```
   Response: User + accessToken + refreshToken

3. **POST** `/auth/refresh-token` - Rotate tokens
   ```json
   POST /auth/refresh-token
   {
     "refreshToken": "..."
   }
   ```
   Response: New accessToken + refreshToken

### Token Details

- **Access Token Lifetime:** 1 hour
- **Refresh Token Lifetime:** 7 days
- **Token Type:** HS256 signed JWT
- **Custom Claims:** `userId`, `username`, `email`, `phone`

### Logout

- **Single Device:** `POST /auth/logout` with refreshToken
- **All Devices:** `POST /auth/logout-all` with Bearer token

---

## API Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "605c72b8...",
      "username": "john_doe",
      "email": "user@example.com"
    }
  },
  "message": "User profile updated"
}
```

**HTTP Status Codes:**
- `200` - OK (GET, PUT, DELETE)
- `201` - Created (POST)
- `204` - No Content (DELETE with no body)

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": null
  }
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email, etc)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Error Codes

### Authentication Errors

| Code | Message | Status |
|------|---------|--------|
| `INVALID_CREDENTIALS` | Email/password combination invalid | 401 |
| `TOKEN_EXPIRED` | Access token has expired | 401 |
| `INVALID_TOKEN` | Token format invalid | 401 |
| `REFRESH_TOKEN_INVALID` | Refresh token not found or invalid | 401 |

### User Errors

| Code | Message | Status |
|------|---------|--------|
| `USER_NOT_FOUND` | User does not exist | 404 |
| `EMAIL_EXISTS` | Email already registered | 409 |
| `PHONE_EXISTS` | Phone already registered | 409 |
| `USERNAME_EXISTS` | Username already taken | 409 |
| `EMAIL_NOT_VERIFIED` | Email not verified | 400 |

### Authorization Errors

| Code | Message | Status |
|------|---------|--------|
| `FORBIDDEN` | You lack permission for this action | 403 |
| `NOT_GROUP_OWNER` | Only group owner can do this | 403 |
| `NOT_ADMIN` | Admin permission required | 403 |
| `NOT_CONVERSATION_MEMBER` | You are not a member of this conversation | 403 |

### Validation Errors

| Code | Message | Status |
|------|---------|--------|
| `INVALID_PAYLOAD` | Request body validation failed | 400 |
| `INVALID_PARAMS` | URL parameters validation failed | 400 |
| `INVALID_QUERY` | Query parameters validation failed | 400 |
| `INVALID_CURSOR` | Pagination cursor is invalid | 400 |

### Resource Errors

| Code | Message | Status |
|------|---------|--------|
| `CONVERSATION_NOT_FOUND` | Conversation does not exist | 404 |
| `MESSAGE_NOT_FOUND` | Message does not exist | 404 |
| `MEDIA_NOT_FOUND` | Media file not found | 404 |
| `NO_NEW_MEMBERS` | All users already in group | 400 |
| `INVALID_CONVERSATION_TYPE` | Operation only for group/direct chats | 400 |

### System Errors

| Code | Message | Status |
|------|---------|--------|
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `FILE_UPLOAD_ERROR` | File upload to storage failed | 400 |

---

## Pagination

### Cursor-Based Pagination (Standard)

All list endpoints use cursor-based pagination for efficiency and real-time data handling.

**Request:**
```http
GET /api/v1/conversations?limit=20&cursor=eyJjcmVhdGVk...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "nextCursor": "eyJjcmVhdGVk...",
    "limit": 20
  }
}
```

**Parameters:**
- `limit` (integer, default: 20, max: 100) - Items per page
- `cursor` (string, optional) - Token for next page

**Best Practices:**
1. Always include `limit` for consistency
2. Never hardcode cursor values - use `nextCursor` from response
3. When `nextCursor` is `null`, you've reached the end
4. Cursors are not sortable/skippable - always start from beginning

---

## Endpoints Summary

### Auth Endpoints (10 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Create account | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/refresh-token` | Get new tokens | No |
| POST | `/auth/logout` | Logout device | No |
| POST | `/auth/logout-all` | Logout all devices | Yes |
| POST | `/auth/verify-email` | Verify email | No |
| POST | `/auth/resend-verification` | Resend OTP | Yes |
| POST | `/auth/forgot-password` | Reset request | No |
| POST | `/auth/reset-password` | Complete reset | No |
| POST | `/auth/change-password` | Change password | Yes |

### User Endpoints (4 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/{id}` | Get profile | Yes |
| PUT | `/users/{id}` | Update profile | Yes |
| DELETE | `/users/{id}` | Delete account | Yes |
| POST | `/users/{id}/block` | Block user | Yes |

### Friend Endpoints (6 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/friends/request` | Send request | Yes |
| PUT | `/friends/request/{id}/accept` | Accept request | Yes |
| PUT | `/friends/request/{id}/reject` | Reject request | Yes |
| GET | `/friends/request/incoming` | List requests | Yes |
| GET | `/friends/list` | Get friends | Yes |
| DELETE | `/friends/{id}` | Remove friend | Yes |

### Conversation Endpoints (10+ total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/conversations` | List conversations | Yes |
| POST | `/conversations` | Create conversation | Yes |
| PUT | `/conversations/{id}` | Update name | Yes |
| POST | `/conversations/{id}/members` | Add members | Yes |
| DELETE | `/conversations/{id}/members/{uid}` | Remove member | Yes |
| PUT | `/conversations/{id}/owner` | Transfer ownership | Yes |
| POST | `/conversations/{id}/leave` | Leave group | Yes |

### Message Endpoints (6 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/messages/send` | Send message | Yes |
| GET | `/messages/conversation/{id}` | List messages | Yes |
| PUT | `/messages/{id}/read` | Mark read | Yes |
| PUT | `/messages/{id}/react` | Add reaction | Yes |
| PUT | `/messages/{id}/recall` | Unsend | Yes |
| DELETE | `/messages/{id}` | Delete | Yes |

### Media Endpoints (5 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/media/upload` | Upload (base64) | Yes |
| POST | `/media/cloudinary/signature` | Get signature | Yes |
| POST | `/media/cloudinary/register` | Register file | Yes |
| GET | `/media/{id}` | Get metadata | Yes |
| DELETE | `/media/{id}` | Delete file | Yes |

### Notification Endpoints (2 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/notifications` | List notifications | Yes |
| PUT | `/notifications/{id}/read` | Mark read | Yes |

### Search Endpoints (2 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/search/messages?q=text` | Search messages | Yes |
| GET | `/search/users?q=query` | Search users | Yes |

### Settings Endpoints (2 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/settings/me` | Get settings | Yes |
| PUT | `/settings/me` | Update settings | Yes |

### ChatBot Endpoints (1 total)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/chatbot/ask` | Ask AI | Yes |

---

## Rate Limiting

### Limits

- **General API:** 100 requests/minute per user
- **Auth endpoints:** 10 requests/minute (per IP)
- **File upload:** 50 MB/file, 500 MB/day per user
- **Search:** 50 requests/minute

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1649600400
```

### Exceeding Limits

When rate limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "details": {
      "retryAfter": 45
    }
  }
}
```

---

## WebSocket Events

The API supports real-time updates via WebSocket connection at `ws://localhost:5000`.

### Connection

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: accessToken
  }
});
```

### Events

#### Message Events
```javascript
// Sent when new message arrives
socket.on('new_message', (data) => {
  console.log(data.message, data.conversationId);
});

// Sent when user starts typing
socket.on('user_typing', (data) => {
  console.log(data.userId, data.conversationId);
});
```

#### Conversation Events
```javascript
// Sent when conversation is updated
socket.on('conversation_updated', (data) => {
  console.log(data.conversationId, data.changes);
});
```

#### User Events
```javascript
// Sent when user comes online/offline
socket.on('user_online', (data) => {
  console.log(data.userId, data.isOnline);
});
```

---

## Best Practices

### 1. Error Handling

Always check the `error.code` field:

```javascript
try {
  const response = await api.post('/auth/login', credentials);
  // Handle success
} catch (error) {
  if (error.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
    // Handle wrong password
  } else if (error.response?.status === 401) {
    // Handle auth error
  } else {
    // Handle other errors
  }
}
```

### 2. Token Refresh

Refresh tokens before expiration:

```javascript
// Implement token refresh middleware
const refreshTokenIfNeeded = async () => {
  if (isTokenExpiringSoon()) {
    const response = await api.post('/auth/refresh-token', {
      refreshToken: getRefreshToken()
    });
    setTokens(response.data);
  }
};
```

### 3. Pagination Handling

```javascript
let cursor = null;
let hasMore = true;

while (hasMore) {
  const response = await api.get('/conversations', {
    params: { limit: 20, cursor }
  });
  
  processItems(response.data.items);
  
  cursor = response.data.nextCursor;
  hasMore = !!cursor;
}
```

### 4. Optimistic Updates

For better UX, update UI before server confirms:

```javascript
// Optimistically update
setMessages([...messages, newMessage]);

// Send to server
try {
  await api.post('/messages/send', { ... });
} catch (error) {
  // Revert optimistic update on error
  setMessages(messages.slice(0, -1));
}
```

### 5. File Upload

Use Cloudinary for direct uploads:

```javascript
// Get signature from backend
const sig = await api.post('/media/cloudinary/signature', {});

// Upload directly to Cloudinary
const formData = new FormData();
formData.append('file', file);
// ... add other fields from signature

await fetch(sig.uploadUrl, { method: 'POST', body: formData });

// Register in database
await api.post('/media/cloudinary/register', {
  publicId: sig.publicId,
  url: sig.url,
  type: 'image'
});
```

### 6. Real-time Sync

Always listen to WebSocket events:

```javascript
socket.on('new_message', (message) => {
  // Update local cache
  addMessageToConversation(message);
});

socket.on('user_online', (userData) => {
  // Update online status
  updateUserStatus(userData.userId, userData.isOnline);
});
```

---

## Documentation Access

### Swagger UI

Interactive API documentation available at:

```
http://localhost:5000/api/docs
```

### OpenAPI Specification

Machine-readable specification at:

```
http://localhost:5000/api/docs.json
```

### Generated Files

- `routes/swagger.endpoints.js` - All endpoint definitions
- `routes/swagger.schemas.js` - All schema definitions
- `config/swagger.js` - Swagger configuration

---

## Support & Issues

For API issues or improvements:

1. Check the [Error Codes](#error-codes) section
2. Refer to endpoint documentation in Swagger UI
3. Review request/response examples in this guide
4. Contact development team for edge cases

---

**Last Updated:** April 10, 2026  
**Version:** 2.0.0
