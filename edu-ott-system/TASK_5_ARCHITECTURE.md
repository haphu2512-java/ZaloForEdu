# 🏗️ TASK 5 - Architecture & Flow Diagrams

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         WEB CLIENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  ThemeContext    │         │ NotificationSettings│       │
│  │  (Provider)      │         │   (Component)      │       │
│  └────────┬─────────┘         └────────┬──────────┘       │
│           │                             │                   │
│           │ uses                        │ uses              │
│           ▼                             ▼                   │
│  ┌─────────────────────────────────────────────┐          │
│  │       settingsService.js                     │          │
│  │  - getMySettings()                           │          │
│  │  - updateMySettings(data)                    │          │
│  └────────────────┬────────────────────────────┘          │
│                   │                                         │
│                   │ uses                                    │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────┐          │
│  │       authService.js (axios)                 │          │
│  │  - Auto-attach Bearer token                  │          │
│  │  - Auto-handle 401 errors                    │          │
│  └────────────────┬────────────────────────────┘          │
│                   │                                         │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    │ HTTP Requests
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────┐             │
│  │  Routes: /api/v1/settings                │             │
│  │  - GET  /me  (get settings)              │             │
│  │  - PUT  /me  (update settings)           │             │
│  └────────────────┬─────────────────────────┘             │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────┐             │
│  │  settingsController.js                   │             │
│  │  - getMySettings()                       │             │
│  │  - updateMySettings()                    │             │
│  └────────────────┬─────────────────────────┘             │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────┐             │
│  │  UserSettings Model (MongoDB)            │             │
│  │  {                                        │             │
│  │    userId: ObjectId,                     │             │
│  │    theme: 'light'|'dark'|'system',       │             │
│  │    notifications: {                      │             │
│  │      pushEnabled: Boolean,               │             │
│  │      messageEnabled: Boolean,            │             │
│  │      groupEnabled: Boolean,              │             │
│  │      soundEnabled: Boolean               │             │
│  │    }                                      │             │
│  │  }                                        │             │
│  └───────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Theme Sync Flow

```
┌─────────────┐
│   User      │
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ ThemeContext Mount                                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 1. setIsLoading(true)                           │   │
│ │ 2. Call settingsService.getMySettings()         │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ API Call: GET /api/v1/settings/me               │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│         ┌─────────┴─────────┐                          │
│         ▼                   ▼                          │
│    ┌─────────┐         ┌─────────┐                    │
│    │ Success │         │  Error  │                    │
│    └────┬────┘         └────┬────┘                    │
│         │                   │                          │
│         ▼                   ▼                          │
│ ┌──────────────┐    ┌──────────────────┐             │
│ │ Set theme    │    │ Fallback to      │             │
│ │ from API     │    │ localStorage     │             │
│ └──────┬───────┘    └──────┬───────────┘             │
│        │                   │                          │
│        └─────────┬─────────┘                          │
│                  ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 3. Cache to localStorage                        │   │
│ │ 4. Apply theme to DOM                           │   │
│ │ 5. setIsLoading(false)                          │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ User Changes Theme                                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 1. setThemeMode(newTheme) - instant update      │   │
│ │ 2. localStorage.setItem() - cache immediately   │   │
│ │ 3. Apply to DOM - instant visual feedback       │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Background: settingsService.updateMySettings()  │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ API Call: PUT /api/v1/settings/me               │   │
│ │ Body: { theme: 'dark' }                         │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│         ┌─────────┴─────────┐                          │
│         ▼                   ▼                          │
│    ┌─────────┐         ┌─────────┐                    │
│    │ Success │         │  Error  │                    │
│    └────┬────┘         └────┬────┘                    │
│         │                   │                          │
│         ▼                   ▼                          │
│ ┌──────────────┐    ┌──────────────────┐             │
│ │ ✅ Synced    │    │ ⚠️ Log error     │             │
│ │ to server    │    │ (still works     │             │
│ │              │    │  locally)        │             │
│ └──────────────┘    └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔔 Notification Settings Flow

```
┌─────────────┐
│   User      │
│ Opens       │
│ Settings    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ NotificationSettings Component Mount                    │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 1. setIsLoading(true)                           │   │
│ │ 2. Call loadSettings()                          │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ API Call: GET /api/v1/settings/me               │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│         ┌─────────┴─────────┐                          │
│         ▼                   ▼                          │
│    ┌─────────┐         ┌─────────┐                    │
│    │ Success │         │  Error  │                    │
│    └────┬────┘         └────┬────┘                    │
│         │                   │                          │
│         ▼                   ▼                          │
│ ┌──────────────┐    ┌──────────────────┐             │
│ │ Set settings │    │ Keep defaults    │             │
│ │ from API     │    │ Log error        │             │
│ └──────┬───────┘    └──────┬───────────┘             │
│        │                   │                          │
│        └─────────┬─────────┘                          │
│                  ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 3. Render UI with current settings              │   │
│ │ 4. setIsLoading(false)                          │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ User Toggles Option (e.g., Sound OFF)                  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 1. Optimistic Update                            │   │
│ │    setSettings({ ...settings, soundEnabled: false })│
│ │    → UI updates instantly                       │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 2. Show "Đang lưu..." (spinner)                 │   │
│ │    setIsSaving(true)                            │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 3. API Call: PUT /api/v1/settings/me            │   │
│ │    Body: {                                      │   │
│ │      notifications: {                           │   │
│ │        pushEnabled: true,                       │   │
│ │        messageEnabled: true,                    │   │
│ │        groupEnabled: true,                      │   │
│ │        soundEnabled: false  ← changed           │   │
│ │      }                                           │   │
│ │    }                                             │   │
│ └─────────────────┬───────────────────────────────┘   │
│                   │                                     │
│         ┌─────────┴─────────┐                          │
│         ▼                   ▼                          │
│    ┌─────────┐         ┌─────────┐                    │
│    │ Success │         │  Error  │                    │
│    └────┬────┘         └────┬────┘                    │
│         │                   │                          │
│         ▼                   ▼                          │
│ ┌──────────────┐    ┌──────────────────┐             │
│ │ 4. Show      │    │ 4. Revert state  │             │
│ │ "Đã lưu"     │    │    setSettings(  │             │
│ │ (checkmark)  │    │      oldSettings)│             │
│ │              │    │ 5. Log error     │             │
│ └──────┬───────┘    └──────┬───────────┘             │
│        │                   │                          │
│        └─────────┬─────────┘                          │
│                  ▼                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 5. setIsSaving(false)                           │   │
│ │ 6. Auto-hide success after 2s                   │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🌐 Cross-Device Sync

```
┌──────────────┐                    ┌──────────────┐
│  Device 1    │                    │  Database    │
│  (Web)       │                    │  (MongoDB)   │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. User changes theme to Dark     │
       ├──────────────────────────────────►│
       │    PUT /settings/me               │
       │    { theme: 'dark' }              │
       │                                   │
       │ 2. Save to database               │
       │                                   │
       │◄──────────────────────────────────┤
       │    200 OK                         │
       │                                   │
       │                                   │
       │                                   │
┌──────┴───────┐                    ┌──────┴───────┐
│  Device 2    │                    │  Database    │
│  (Mobile)    │                    │  (MongoDB)   │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 3. User opens app / refreshes     │
       ├──────────────────────────────────►│
       │    GET /settings/me               │
       │                                   │
       │ 4. Load settings from database    │
       │                                   │
       │◄──────────────────────────────────┤
       │    200 OK                         │
       │    { theme: 'dark', ... }         │
       │                                   │
       │ 5. Apply Dark theme               │
       │    ✅ Synced!                     │
       │                                   │
```

---

## 🔐 Error Handling Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Error Scenarios                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Scenario 1: API Unavailable (Network Error)           │
│  ┌────────────────────────────────────────────┐       │
│  │ Action: Load theme on mount                │       │
│  │ Error: Network timeout                     │       │
│  │ Fallback: Load from localStorage           │       │
│  │ Result: ✅ App still works                 │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  Scenario 2: API Returns Error (500)                   │
│  ┌────────────────────────────────────────────┐       │
│  │ Action: Save theme change                  │       │
│  │ Error: 500 Internal Server Error           │       │
│  │ Fallback: Keep local change, log error     │       │
│  │ Result: ✅ Theme applied locally           │       │
│  │         ⚠️ Not synced to server            │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  Scenario 3: Unauthorized (401)                        │
│  ┌────────────────────────────────────────────┐       │
│  │ Action: Any API call                       │       │
│  │ Error: 401 Unauthorized                    │       │
│  │ Fallback: Auto-redirect to login           │       │
│  │ Result: ✅ User re-authenticates           │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  Scenario 4: Invalid Data                              │
│  ┌────────────────────────────────────────────┐       │
│  │ Action: Toggle notification                │       │
│  │ Error: Validation error                    │       │
│  │ Fallback: Revert to previous state         │       │
│  │ Result: ✅ UI shows old state              │       │
│  │         ⚠️ User sees error message         │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Component Hierarchy

```
App
└── ThemeProvider (Context)
    └── MainLayout
        ├── Sidebar
        │   ├── Navigation
        │   └── Avatar Menu
        │       └── Settings Button
        │
        └── SettingsModal (when opened)
            ├── Tabs
            │   ├── General ← Active
            │   ├── Messaging
            │   ├── Security
            │   ├── Data
            │   ├── Language
            │   └── Support
            │
            └── Content (General Tab)
                ├── Theme Section
                │   └── Theme Picker (uses ThemeContext)
                │       ├── Light Button
                │       ├── Dark Button
                │       └── System Button
                │
                ├── Notification Section ← NEW
                │   └── NotificationSettings Component
                │       ├── Push Toggle
                │       ├── Message Toggle
                │       ├── Group Toggle
                │       ├── Sound Toggle
                │       └── Save Status
                │
                └── Language Section
                    └── Language Selector
```

---

## 🎯 Data Flow Summary

### Theme:
```
User Action → ThemeContext → settingsService → API → Database
                    ↓
              localStorage (cache)
                    ↓
              DOM (data-theme attribute)
```

### Notifications:
```
User Toggle → NotificationSettings → settingsService → API → Database
                    ↓
              Optimistic Update (instant UI)
                    ↓
              Success/Error Feedback
```

### Cross-Device:
```
Device 1: Change → API → Database
                           ↓
Device 2: Load ← API ← Database
```

---

## 🚀 Performance Optimizations

```
┌─────────────────────────────────────────────────────────┐
│              Optimization Strategies                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Optimistic Updates                                 │
│     ┌──────────────────────────────────────┐          │
│     │ UI updates BEFORE API call           │          │
│     │ → Instant feedback                   │          │
│     │ → Better perceived performance       │          │
│     └──────────────────────────────────────┘          │
│                                                         │
│  2. localStorage Caching                               │
│     ┌──────────────────────────────────────┐          │
│     │ Cache settings locally               │          │
│     │ → Instant load on mount              │          │
│     │ → Works offline                      │          │
│     └──────────────────────────────────────┘          │
│                                                         │
│  3. Lazy Loading                                       │
│     ┌──────────────────────────────────────┐          │
│     │ Settings only load when modal opens  │          │
│     │ → Faster initial page load           │          │
│     │ → Less API calls                     │          │
│     └──────────────────────────────────────┘          │
│                                                         │
│  4. Debouncing (future enhancement)                    │
│     ┌──────────────────────────────────────┐          │
│     │ Batch multiple changes               │          │
│     │ → Reduce API calls                   │          │
│     │ → Better server performance          │          │
│     └──────────────────────────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 State Management

```
┌─────────────────────────────────────────────────────────┐
│                  State Locations                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ThemeContext (Global State)                           │
│  ┌────────────────────────────────────────────┐       │
│  │ - themeMode: 'light' | 'dark' | 'system'  │       │
│  │ - appliedTheme: 'light' | 'dark'          │       │
│  │ - isLoading: boolean                       │       │
│  │ - setThemeMode: (theme) => Promise<void>  │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  NotificationSettings (Local State)                    │
│  ┌────────────────────────────────────────────┐       │
│  │ - settings: {                              │       │
│  │     pushEnabled: boolean,                  │       │
│  │     messageEnabled: boolean,               │       │
│  │     groupEnabled: boolean,                 │       │
│  │     soundEnabled: boolean                  │       │
│  │   }                                         │       │
│  │ - isLoading: boolean                       │       │
│  │ - isSaving: boolean                        │       │
│  │ - saveSuccess: boolean                     │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  localStorage (Persistent Cache)                       │
│  ┌────────────────────────────────────────────┐       │
│  │ - app-theme-mode: string                   │       │
│  │ - token: string (for API auth)             │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  Database (Source of Truth)                            │
│  ┌────────────────────────────────────────────┐       │
│  │ UserSettings Collection:                   │       │
│  │ {                                           │       │
│  │   userId: ObjectId,                        │       │
│  │   theme: string,                           │       │
│  │   notifications: object,                   │       │
│  │   createdAt: Date,                         │       │
│  │   updatedAt: Date                          │       │
│  │ }                                           │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Architecture is clean, scalable, and production-ready! 🏗️**
