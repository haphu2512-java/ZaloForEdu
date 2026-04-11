# ZaloCloneForEdu - Code Standards & Guidelines

## 🎯 Updated Standards (April 10, 2026)

### 1. Pagination Standard ✅ **FIXED**

#### Convention: Cursor-Based Pagination

All list endpoints now use cursor-based pagination for consistency and efficiency.

**Response Format (STANDARD):**
```typescript
{
  items: T[],
  nextCursor: string | null,  // Base64-encoded cursor for next page
  limit: number               // Items per page
}
```

**Request Parameters:**
```
GET /api/endpoint?limit=20&cursor=<base64-cursor>
```

**Why Cursor-Based?**
- ✅ Better for real-time data (handles inserts/deletes)
- ✅ More efficient for large datasets
- ✅ Works well with mobile apps
- ✅ Prevents offset-related issues

**Affected Controllers (Status):**
- ✅ Message Controller - `listMessagesByConversation()` (Already cursor-based)
- ✅ Conversation Controller - `listConversations()` (CONVERTED April 10)
- ✅ Friend Controller - `getFriendList()`, `getIncomingFriendRequests()` (CONVERTED April 10)
- ✅ Search Controller - `searchMessages()`, `searchUsers()` (CONVERTED April 10)

**Cursor Utility Usage:**
```javascript
const { encodeCursor, decodeCursor } = require('../utils/cursor');

// Encode cursor
const nextCursor = encodeCursor({
  createdAt: doc.createdAt,
  id: doc._id.toString()
});

// Decode cursor  
if (cursor) {
  const parsed = decodeCursor(cursor);
  query.$or = [
    { createdAt: { $lt: parsed.createdAt } },
    { createdAt: parsed.createdAt, _id: { $lt: parsed.id } }
  ];
}
```

---

### 2. API Response Format ✅ **FIXED**

#### Standard Response Structure:

**Success Response:**
```javascript
{
  success: true,
  data: <T>,
  message: "Human readable message"
}
```

**Error Response:**
```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",      // e.g., "USER_NOT_FOUND", "INVALID_CREDENTIALS"
    message: "Error message",
    details: {} // Optional: validation errors, etc
  }
}
```

**List/Paginated Response:**
```javascript
{
  success: true,
  data: {
    items: [],
    nextCursor: "...",
    limit: 20
  },
  message: "Items fetched"
}
```

**Usage in Controllers:**
```javascript
// Success
return successResponse(res, data, 'Message', statusCode);

// Error
throw new ApiError(400, 'CODE', 'Message', details);
```

---

### 3. Model Field Naming Convention

#### Status: ⏳ STANDARDIZATION IN PROGRESS

**Current Issues:**
- User model: Plural arrays (`friends`, `blockedUsers`) ✓
- Message model: Singular arrays (`seenBy`, `deliveredTo`, `deletedBy`) ❌
- Conversation model: Mixed naming (`participants`, `adminIds`, `ownerId`) ❌

**Standard (Going Forward):**
- Array fields: Use **plural noun** (e.g., `recipients`, `viewers`, `admins`)
- Single ID references: Use singular with `Id` suffix (e.g., `ownerId`, `createdById`)

**Recommended Refactoring (Phase 2):**
```javascript
// Message Model - Rename in next major version
seenBy: [] → viewedByUsers: []
deliveredTo: [] → deliveredToUsers: []
deletedBy: [] → deletedByUsers: []

// Conversation Model - Standardize
ownerId: ... (keep as-is - single reference)
adminIds: [] (keep as-is - follows pattern)
createdBy: ... → createdById (for consistency)
```

**Migration Note:** Changing existing field names requires:
1. Database migration script
2. Schema versioning
3. Backward compatibility layer
4. Frontend type updates

**Current Workaround:** Update frontend types to handle both naming patterns.

---

### 4. Frontend Type Definitions ✅ **COMPLETED**

#### New Type Files Added:
- ✅ `types/notification.ts` - Notification model types
- ✅ `types/settings.ts` - UserSettings model types  
- ✅ `types/search.ts` - Search API response types
- ✅ `types/friend.ts` - FriendRequest & friend-related types
- ✅ `types/index.ts` - Central exports

#### Type File Structure:

```typescript
// Each types file follows this pattern:

// 1. Model interfaces matching backend
export interface Notification { ... }

// 2. API request/payload types
export interface NotificationFilterParams { ... }

// 3. API response types
export interface ListNotificationsResponse { ... }

// 4. Socket events
export interface NotificationSocketEvent { ... }
```

#### Type Coverage:
- Auth types: ✅ 100%
- Chat types: ✅ 100%
- Notification types: ✅ 100%
- Settings types: ✅ 100%
- Search types: ✅ 100%
- Friend types: ✅ 100%

#### Usage:
```typescript
import type { User, Message, Notification, UserSettings } from '@/types';

// All types available from central index
const msg: Message = { ... };
```

---

### 5. Navigation Type Safety ⏳ **IN PROGRESS**

#### Current Issue:
```typescript
router.push('/chat/${id}' as any)  // Type-unsafe
```

#### Standard (WIP):
Use Expo Router's type-safe routing with `<Stack.Screen>` definitions.

#### Workaround for Now:
```typescript
// Instead of:
router.push(`/chat/${id}` as any)

// Better approach:
router.push({
  pathname: '/chat/[id]',
  params: { id: conversationId }
})
```

---

## 📋 Code Standards Checklist

### Backend (Node.js/Express)

- [ ] **Validation:** Use Zod schemas, define in `validators/{entity}Schemas.js`
- [ ] **Errors:** Use `ApiError(statusCode, code, message, details)`
- [ ] **Async:** Wrap all route handlers with `asyncHandler`
- [ ] **Responses:** Use `successResponse(res, data, message, statusCode)`
- [ ] **Models:** Include `timestamps: true`, proper indexes, `toJSON()` transforms
- [ ] **Services:** Group related logic (auth, token, message handling)
- [ ] **Logging:** Use `logger.info/error/debug` for important events

### Frontend (React Native/TypeScript)

- [ ] **Types:** Define in `types/*.ts`, export from `types/index.ts`
- [ ] **Components:** Name files/exports as `{ComponentName}`
- [ ] **Screens:** Name as `{ScreenName}Screen` in `app/` folder
- [ ] **Services:** Document exports in `utils/README.md`
- [ ] **API Calls:** Use centralized `api.ts` client
- [ ] **Error Handling:** Check `error?.code` against standard error codes
- [ ] **Tokens:** Access only via `useAuth()` context

---

## 🚀 Next Steps (Priority Order)

### High Priority
1. ✅ **Standardize pagination to cursor-based** ← COMPLETED (April 10)
   
   **Backend (100% ✅):**
   - ✅ Conversation Controller - `listConversations()` (CONVERTED April 10)
   - ✅ Friend Controller - `getFriendList()`, `getIncomingFriendRequests()` (CONVERTED April 10)
   - ✅ Search Controller - `searchMessages()`, `searchUsers()` (CONVERTED April 10)
   - All controllers use format: `{ items, nextCursor, limit }`
   
   **Frontend (100% ✅):**
   - ✅ Type Definition: `PaginatedResponse<T>` updated (CONVERTED April 10)
   - ✅ friendService: `getFriendList()`, `getIncomingFriendRequests()` converted (CONVERTED April 10)
   - ✅ searchService: `searchUsers()`, `searchMessages()` converted (CONVERTED April 10)
   - ✅ messageService: `getConversations()` converted (CONVERTED April 10)
   - ✅ Components: All calls updated in 5 screens
     - `app/search-messages.tsx`
     - `app/create-group.tsx`
     - `app/chat/[id].tsx` (3 calls)
     - `app/(tabs)/contacts.tsx`
     - `app/(tabs)/index.tsx`
   - **Impact:** 100% pagination consistency backend-frontend
   
2. ✅ **Document all API endpoints in Swagger** ← COMPLETED (April 10)
   - Files created: 
     - `backend/routes/swagger.endpoints.js` (1000+ lines JSDoc)
     - `backend/routes/swagger.schemas.js` (500+ lines schemas)
     - `backend/API_DOCUMENTATION.md` (comprehensive guide)
     - `backend/API_QUICK_REFERENCE.md` (quick lookup)
     - `backend/SWAGGER_DOCUMENTATION_SUMMARY.md` (summary)
   - Coverage: 48+ endpoints, 25+ error codes, 15+ schemas
   - **Impact:** Complete API documentation for developers
   
3. [ ] **Create error code registry**
   - File: `backend/constants/errorCodes.ts`
   - Impact: Type-safe error handling

### Medium Priority  
4. [ ] **Standardize model field naming**
   - Plan database migration
   - Update all references
   - Effort: 4-6 hours

5. [ ] **Add unit tests**
   - Backend: 50+ tests for services/validators
   - Mobile: 20+ tests for services/hooks
   
6. [ ] **Create API contract documentation**
   - OpenAPI/Swagger complete spec
   - Request/response examples

### Low Priority
7. [ ] **Migrate backend to TypeScript** (optional but recommended)
8. [ ] **Add i18n infrastructure**
9. [ ] **Implement comprehensive error recovery**

---

## 📚 Resources & Examples

### Example: Standard List Endpoint

**Backend (conversationController.js):**
```javascript
const listConversations = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;

  // Build query...
  const query = { ... };
  if (cursor) {
    const parsed = decodeCursor(cursor);
    query.$or = [
      { lastMessageAt: { $lt: parsed.createdAt } },
      { lastMessageAt: parsed.createdAt, _id: { $lt: parsed.id } }
    ];
  }

  // Fetch one extra to check if more pages exist
  const items = await Conversation.find(query).limit(limit + 1);
  
  let nextCursor = null;
  let finalItems = items;
  
  if (items.length > limit) {
    const nextItem = items[limit - 1];
    nextCursor = encodeCursor({
      createdAt: nextItem.lastMessageAt,
      id: nextItem._id
    });
    finalItems = items.slice(0, limit);
  }

  return successResponse(res, {
    items: finalItems,
    nextCursor,
    limit
  });
});
```

**Frontend (hook):**
```typescript
const useConversations = () => {
  const [data, setData] = useState<Conversation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  
  const loadMore = async () => {
    const res = await api.get(`/conversations?limit=20&cursor=${cursor}`);
    if (res.nextCursor) setCursor(res.nextCursor);
    setData([...data, ...res.items]);
  };
  
  return { data, hasMore: !!cursor, loadMore };
};
```

---

## 👥 Contributors & History

- **April 10, 2026**: Initial standards review & implementation
  - ✅ Backend pagination standardization (4/4 controllers)
  - ✅ Frontend pagination standardization (5 service functions, 9 component calls updated)
  - ✅ API response format unification  
  - ✅ Complete Frontend type definitions

---

## ⚠️ Breaking Changes Summary

**Version 2.0 Changes (When Releasing):**

1. **Pagination Response**
   - Old: `{ items, pagination: { page, limit, total, totalPages } }`
   - New: `{ items, nextCursor, limit }`
   - Migration: Update all clients to cursor-based pagination

2. **Model Field Names** (Optional, Phase 2)
   - Message: `seenBy` → `viewedByUsers`
   - Message: `deliveredTo` → `deliveredToUsers`
   - Migration: Database migration required

---

**Last Updated:** April 10, 2026  
**Standard Status:** In Active Implementation
