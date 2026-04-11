# API Quick Reference Guide

**Purpose:** Quick lookup for common API operations  
**Updated:** April 10, 2026

---

## Example Requests

### Authentication

#### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```bash
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Profile

#### Get Profile
```bash
GET /users/605c72b8c1234567890abcde
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Update Profile
```bash
PUT /users/605c72b8c1234567890abcde
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "new_name",
  "avatarUrl": "https://example.com/avatar.jpg",
  "phone": "+84912345678"
}
```

### Friends

#### Send Friend Request
```bash
POST /friends/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "toUserId": "605c72b8c1234567890abcd2"
}
```

#### List Friend Requests
```bash
GET /friends/request/incoming?limit=20&cursor=null
Authorization: Bearer {token}
```

#### Accept Friend Request
```bash
PUT /friends/request/605c72b8req001/accept
Authorization: Bearer {token}
```

#### Get Friend List
```bash
GET /friends/list?limit=20&cursor=null
Authorization: Bearer {token}
```

### Conversations

#### List Conversations
```bash
GET /conversations?limit=20&cursor=null
Authorization: Bearer {token}
```

#### Create Direct Conversation
```bash
POST /conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "direct",
  "participantIds": ["605c72b8c1234567890abcd2"]
}
```

#### Create Group Conversation
```bash
POST /conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "group",
  "name": "Class 12A1",
  "participantIds": [
    "605c72b8c1234567890abcd2",
    "605c72b8c1234567890abcd3",
    "605c72b8c1234567890abcd4"
  ]
}
```

#### Add Members to Group
```bash
POST /conversations/605c72convo001/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "memberIds": [
    "605c72b8c1234567890abcd5",
    "605c72b8c1234567890abcd6"
  ]
}
```

#### Update Group Name
```bash
PUT /conversations/605c72convo001
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Advanced Math Class"
}
```

#### Leave Group
```bash
POST /conversations/605c72convo001/leave
Authorization: Bearer {token}
```

### Messages

#### Send Message
```bash
POST /messages/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "605c72convo001",
  "content": "Hello everyone!",
  "mediaIds": []
}
```

#### Send Message with Media
```bash
POST /messages/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "605c72convo001",
  "content": "Check this out!",
  "mediaIds": [
    "605c72media001",
    "605c72media002"
  ]
}
```

#### Get Conversation Messages
```bash
GET /messages/conversation/605c72convo001?limit=20&cursor=null
Authorization: Bearer {token}
```

#### Mark Message as Read
```bash
PUT /messages/605c72message001/read
Authorization: Bearer {token}
```

#### React to Message
```bash
PUT /messages/605c72message001/react
Authorization: Bearer {token}
Content-Type: application/json

{
  "emoji": "👍"
}
```

#### Recall Message (Unsend)
```bash
PUT /messages/605c72message001/recall
Authorization: Bearer {token}
```

### Media

#### Upload Image (Base64)
```bash
POST /media/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "type": "image"
}
```

#### Get Cloudinary Upload Signature
```bash
POST /media/cloudinary/signature
Authorization: Bearer {token}
Content-Type: application/json

{
  "folder": "messages",
  "resourceType": "image"
}
```

#### Register Cloudinary File
```bash
POST /media/cloudinary/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "publicId": "zalo/abc123def456",
  "url": "https://res.cloudinary.com/...",
  "type": "image"
}
```

### Search

#### Search Messages
```bash
GET /search/messages?q=hello&limit=20&cursor=null
Authorization: Bearer {token}
```

#### Search Users
```bash
GET /search/users?q=john&limit=20&cursor=null
Authorization: Bearer {token}
```

### Notifications

#### Get Notifications
```bash
GET /notifications?limit=20&cursor=null
Authorization: Bearer {token}
```

#### Mark Notification as Read
```bash
PUT /notifications/605c72notif001/read
Authorization: Bearer {token}
```

### Settings

#### Get Settings
```bash
GET /settings/me
Authorization: Bearer {token}
```

#### Update Settings
```bash
PUT /settings/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "theme": "dark",
  "notifications": {
    "pushEnabled": true,
    "messageEnabled": true,
    "soundEnabled": false
  }
}
```

### ChatBot

#### Ask ChatBot
```bash
POST /chatbot/ask
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "How do I create a group chat?"
}
```

---

## Response Examples

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "605c72b8c1234567890abcde",
      "username": "john_doe",
      "email": "john@example.com"
    }
  },
  "message": "User profile fetched"
}
```

### List Response with Pagination
```json
{
  "success": true,
  "data": {
    "items": [
      { "_id": "msg001", "content": "Hello" },
      { "_id": "msg002", "content": "Hi there" }
    ],
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI...",
    "limit": 20
  },
  "message": "Messages fetched"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Email is required",
    "details": {
      "fieldErrors": {
        "email": "Required field"
      }
    }
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "details": null
  }
}
```

### Error Response (409 Conflict)
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already exists",
    "details": {
      "field": "email",
      "value": "john@example.com"
    }
  }
}
```

---

## cURL Examples

### Login and Get Token
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }' | jq '.data.accessToken' -r
```

### Use Token in Requests
```bash
TOKEN=$(curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}' \
  | jq '.data.accessToken' -r)

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/users/605c72b8c1234567890abcde
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "conversationId": "605c72convo001",
    "content": "Hello world!"
  }'
```

---

## Common Status Codes

| Code | Meaning | Common Causes |
|------|---------|--------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid JSON, missing fields, validation error |
| 401 | Unauthorized | Missing token, invalid token, expired token |
| 403 | Forbidden | Insufficient permissions, not group admin |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, duplicate username |
| 429 | Too Many Requests | Rate limit exceeded (wait and retry) |
| 500 | Server Error | Unexpected error (contact support) |

---

## Testing

### Using Postman
1. Import `http://localhost:5000/api/docs.json` as OpenAPI collection
2. Set `{{token}}` environment variable after login
3. Use in requests: `Authorization: Bearer {{token}}`

### Using REST Client (VS Code)
```
### Login
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

### Get Profile (replace TOKEN)
GET http://localhost:5000/api/v1/users/YOUR_USER_ID
Authorization: Bearer TOKEN
```

### Using JavaScript/Fetch
```javascript
// Login
const loginResponse = await fetch(
  'http://localhost:5000/api/v1/auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'SecurePass123!'
    })
  }
);
const { data } = await loginResponse.json();
const token = data.accessToken;

// Use token
const userResponse = await fetch(
  'http://localhost:5000/api/v1/users/USER_ID',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

---

## Tips & Tricks

1. **Always validate email/phone format** before sending to API
2. **Use cursor pagination** for large result sets
3. **Implement token refresh** before token expires
4. **Listen to WebSocket events** for real-time updates
5. **Cache user profiles** to reduce API calls
6. **Batch message uploads** for efficiency
7. **Implement optimistic UI updates** for better UX
8. **Handle 429 status** with exponential backoff retry
9. **Log error codes** for debugging
10. **Use ETags** for caching if implemented

---

**For full documentation, visit:** `http://localhost:5000/api/docs`  
**Last Updated:** April 10, 2026
