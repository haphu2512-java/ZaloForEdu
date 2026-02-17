# Authentication Flows - Education OTT Platform

## Overview

Tài liệu này mô tả chi tiết các luồng authentication trong hệ thống.

---

## 1. Registration & Email Verification

### Current Implementation (Basic)

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant EmailService

    User->>Client: Sign Up (email, password, fullName, role)
    Client->>API: POST /auth/register
    API->>DB: Check if email exists
    alt Email exists
        DB-->>API: User found
        API-->>Client: 400 Bad Request
        Client->>User: Show error: "Email already registered"
    else Email new
        API->>DB: Create User (isEmailVerified=false)
        DB-->>API: User created
        
        Note over API: Generate JWT AccessToken
        API->>DB: Update lastLogin
        
        Note over API,EmailService: Email verification (Optional - Future)
        API->>EmailService: Send Verification Email (token)
        
        API-->>Client: 201 Created {user, token}
        Client->>Client: Store token in localStorage
        Client->>User: Redirect to /dashboard
    end
```

### Enhanced Implementation (Recommended)

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant EmailService
    participant Redis

    User->>Client: Sign Up (email, password, fullName, role)
    Client->>API: POST /auth/register
    
    API->>API: Validate input (email format, password strength)
    API->>DB: Check if email exists
    
    alt Email exists
        DB-->>API: User found
        API-->>Client: 400 Bad Request
        Client->>User: "Email already registered"
    else Email new
        API->>API: Hash password (bcrypt)
        API->>DB: Create User (isEmailVerified=false, isActive=false)
        DB-->>API: User created
        
        API->>API: Generate email verification token (JWT, 24h expiry)
        API->>DB: Store verification token & expiry
        
        API->>EmailService: Send Verification Email
        Note over EmailService: Email contains link:<br/>https://app.com/verify-email?token=xxx
        
        API-->>Client: 201 Created {message: "Check your email"}
        Client->>User: Show "Please verify your email"
    end

    Note over User: User checks email and clicks link
    
    User->>Client: Click verification link
    Client->>API: POST /auth/verify-email {token}
    
    API->>API: Verify token (JWT verify)
    alt Token invalid/expired
        API-->>Client: 400 Bad Request
        Client->>User: "Invalid or expired link"
    else Token valid
        API->>DB: Update User (isEmailVerified=true, isActive=true)
        API->>DB: Clear verification token
        
        API->>API: Generate AccessToken & RefreshToken
        API->>Redis: Store RefreshToken (30d TTL)
        
        API-->>Client: 200 OK {user, token, refreshToken}
        Client->>Client: Store tokens
        Client->>User: Redirect to /dashboard
    end
```

**Key Differences:**
- ✅ User phải verify email trước khi login (production)
- ✅ RefreshToken được lưu trong Redis
- ✅ isActive flag để control access
- ⚠️ Current implementation cho phép login ngay (development)

---

## 2. Login & Token Refresh

### Current Implementation

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB

    User->>Client: Enter credentials
    Client->>API: POST /auth/login {email, password}
    
    API->>DB: Find user by email (select +password)
    
    alt User not found
        API-->>Client: 401 Unauthorized
        Client->>User: "Invalid email or password"
    else User found
        API->>API: Compare password (bcrypt)
        
        alt Password incorrect
            API-->>Client: 401 Unauthorized
            Client->>User: "Invalid email or password"
        else Password correct
            alt User not active
                API-->>Client: 401 Unauthorized
                Client->>User: "Account deactivated"
            else User active
                API->>API: Generate AccessToken (7d expiry)
                API->>DB: Update lastLogin timestamp
                
                API-->>Client: 200 OK {user, token}
                Client->>Client: localStorage.setItem('token', token)
                Client->>Client: localStorage.setItem('user', user)
                Client->>User: Redirect to /dashboard
            end
        end
    end
```

### Enhanced with Refresh Token

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant Redis

    User->>Client: Login
    Client->>API: POST /auth/login
    
    API->>DB: Verify credentials
    alt Valid credentials
        API->>API: Generate AccessToken (15min)
        API->>API: Generate RefreshToken (30d)
        
        API->>Redis: Store RefreshToken {userId, token, expiry}
        API->>DB: Update lastLogin
        
        API-->>Client: 200 OK {user, accessToken, refreshToken}
        Client->>Client: localStorage: accessToken
        Client->>Client: httpOnly cookie: refreshToken
    end

    Note over Client: User continues using app
    Note over Client: AccessToken expires after 15min

    Client->>API: GET /classes (with expired token)
    API-->>Client: 401 Unauthorized
    
    Note over Client: Axios interceptor catches 401
    
    Client->>API: POST /auth/refresh {refreshToken}
    API->>Redis: Verify RefreshToken
    
    alt RefreshToken valid
        API->>API: Generate new AccessToken (15min)
        API->>Redis: Optionally rotate RefreshToken
        
        API-->>Client: 200 OK {accessToken}
        Client->>Client: Update localStorage
        
        Note over Client: Retry original request
        Client->>API: GET /classes (with new token)
        API-->>Client: 200 OK {classes}
        
    else RefreshToken invalid/expired
        API->>Redis: Delete RefreshToken
        API-->>Client: 401 Unauthorized
        
        Client->>Client: Clear localStorage
        Client->>User: Redirect to /login
    end
```

**Token Strategy:**
- **AccessToken**: Short-lived (15min - 1h), stored in localStorage
- **RefreshToken**: Long-lived (30d), stored in httpOnly cookie (more secure)
- Auto-refresh via Axios interceptor (transparent to user)

---

## 3. Password Reset Flow

### Current Implementation

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant DB
    participant EmailService

    User->>Client: Click "Forgot Password"
    Client->>API: POST /auth/forgot-password {email}
    
    API->>DB: Find user by email
    
    alt User not found
        Note over API: Security: Don't reveal if email exists
        API-->>Client: 200 OK "Check your email"
    else User found
        API->>API: Generate reset token (JWT, 1h expiry)
        API->>DB: Store resetPasswordToken & resetPasswordExpire
        
        API->>EmailService: Send reset email
        Note over EmailService: Email contains:<br/>https://app.com/reset-password/TOKEN
        
        API-->>Client: 200 OK {message, resetToken (dev only)}
        Client->>User: "Password reset email sent"
    end

    Note over User: User clicks link in email

    User->>Client: Navigate to /reset-password/:token
    User->>Client: Enter new password
    
    Client->>API: PUT /auth/reset-password/:token {password}
    
    API->>API: Verify reset token (JWT)
    alt Token invalid/expired
        API-->>Client: 400 Bad Request
        Client->>User: "Invalid or expired reset link"
    else Token valid
        API->>DB: Find user with token & check expiry
        
        alt Token expired in DB
            API-->>Client: 400 Bad Request
            Client->>User: "Reset link expired"
        else Token valid
            API->>API: Hash new password (bcrypt)
            API->>DB: Update password
            API->>DB: Clear resetPasswordToken & expiry
            
            API->>API: Generate new AccessToken
            
            API-->>Client: 200 OK {token, message}
            Client->>Client: Store new token
            Client->>User: "Password changed successfully"
            Client->>User: Redirect to /dashboard
        end
    end
```

**Security Considerations:**
- ✅ Reset token expires after 1 hour
- ✅ Token stored in DB for verification
- ✅ Don't reveal if email exists (timing attack prevention)
- ✅ Token is single-use (cleared after reset)
- ✅ Auto-login after successful reset

---

## 4. Logout Flow

### Simple Logout (Current)

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API

    User->>Client: Click Logout
    Client->>API: POST /auth/logout
    
    API-->>Client: 200 OK
    
    Client->>Client: localStorage.removeItem('token')
    Client->>Client: localStorage.removeItem('user')
    Client->>Client: Redux: dispatch(logout())
    Client->>User: Redirect to /login
```

### Enhanced Logout with Token Blacklist

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Redis
    participant DB

    User->>Client: Click Logout
    Client->>API: POST /auth/logout {token}
    
    API->>Redis: Add token to blacklist (TTL = token expiry)
    API->>Redis: Delete RefreshToken
    API->>DB: Update user lastLogout timestamp
    
    API-->>Client: 200 OK
    
    Client->>Client: Clear all storage
    Client->>Client: Clear Redux state
    Client->>User: Redirect to /login
```

---

## 5. Protected Route Access

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant PrivateRoute
    participant API
    participant DB

    User->>Client: Navigate to /dashboard
    Client->>PrivateRoute: Check authentication
    
    alt No token in localStorage
        PrivateRoute->>User: Redirect to /login
    else Token exists
        PrivateRoute->>PrivateRoute: Check token expiry (decode JWT)
        
        alt Token expired
            PrivateRoute->>API: POST /auth/refresh
            alt Refresh success
                API-->>PrivateRoute: New token
                PrivateRoute->>Client: Allow access
            else Refresh failed
                PrivateRoute->>User: Redirect to /login
            end
        else Token valid
            Note over PrivateRoute: Optional: Verify with backend
            PrivateRoute->>API: GET /auth/me
            
            alt User exists & active
                API->>DB: Get user
                API-->>PrivateRoute: User data
                PrivateRoute->>Client: Render protected component
            else User not found/inactive
                API-->>PrivateRoute: 401 Unauthorized
                PrivateRoute->>User: Redirect to /login
            end
        end
    end
```

---

## 6. Role-Based Authorization

```mermaid
sequenceDiagram
    participant Teacher
    participant Client
    participant API
    participant Middleware
    participant DB

    Teacher->>Client: Create Class
    Client->>API: POST /classes (with token)
    
    API->>Middleware: protect() - Verify JWT
    Middleware->>Middleware: Decode token → userId
    Middleware->>DB: Get user by userId
    
    alt User not found
        Middleware-->>API: 401 Unauthorized
        API-->>Client: User not authenticated
    else User found
        Middleware->>Middleware: restrictTo('teacher', 'admin')
        
        alt User.role not in ['teacher', 'admin']
            Middleware-->>API: 403 Forbidden
            API-->>Client: "No permission"
        else User has permission
            Middleware->>API: Continue to controller
            API->>DB: Create class
            API-->>Client: 201 Created {class}
        end
    end
```

---

## 7. Social Login (Future Feature)

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant GoogleOAuth
    participant DB

    User->>Client: Click "Login with Google"
    Client->>GoogleOAuth: Redirect to Google OAuth
    
    GoogleOAuth->>User: Show Google login
    User->>GoogleOAuth: Authorize
    
    GoogleOAuth->>Client: Redirect with code
    Client->>API: POST /auth/google {code}
    
    API->>GoogleOAuth: Exchange code for tokens
    GoogleOAuth-->>API: User info (email, name, picture)
    
    API->>DB: Find user by email
    
    alt User exists
        API->>DB: Update user info
    else New user
        API->>DB: Create user (no password)
        Note over DB: isEmailVerified=true<br/>provider=google
    end
    
    API->>API: Generate JWT tokens
    API-->>Client: 200 OK {user, token}
    Client->>User: Redirect to /dashboard
```

---

## Token Details

### AccessToken (JWT)

```javascript
// Payload
{
  id: "user_id_here",
  iat: 1234567890,      // Issued at
  exp: 1234567890       // Expires at
}

// Generated with
jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
  expiresIn: '7d'  // or '15m' for short-lived
});
```

### RefreshToken (JWT)

```javascript
// Payload
{
  id: "user_id_here",
  type: "refresh",
  iat: 1234567890,
  exp: 1234567890
}

// Generated with
jwt.sign(
  { id: user._id, type: 'refresh' }, 
  process.env.JWT_REFRESH_SECRET, 
  { expiresIn: '30d' }
);
```

### Password Reset Token

```javascript
// Generated with
jwt.sign(
  { id: user._id }, 
  process.env.JWT_SECRET, 
  { expiresIn: '1h' }
);

// Stored in DB
user.resetPasswordToken = token;
user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
```

---

## Security Best Practices

### ✅ Implemented

- [x] Password hashing with bcrypt (salt rounds: 10)
- [x] JWT for stateless authentication
- [x] Token expiry (7 days for access token)
- [x] HTTPS only (production)
- [x] Rate limiting (100 req/15min)
- [x] Input validation (express-validator)
- [x] MongoDB injection prevention (express-mongo-sanitize)
- [x] XSS protection (sanitize inputs)

### 🚀 Recommended Enhancements

- [ ] Implement RefreshToken rotation
- [ ] Short-lived AccessToken (15min instead of 7d)
- [ ] Store RefreshToken in httpOnly cookies
- [ ] Token blacklist in Redis (for logout)
- [ ] Email verification required before login
- [ ] Password strength requirements (8+ chars, numbers, special chars)
- [ ] Account lockout after failed login attempts
- [ ] Two-factor authentication (2FA)
- [ ] Session management (track active devices)
- [ ] CSRF protection
- [ ] Audit logging (login attempts, password changes)

---

## Error Handling

### Common Authentication Errors

| Error Code | Message | Scenario |
|------------|---------|----------|
| 400 | Email already registered | Registration with existing email |
| 400 | Invalid or expired token | Reset/verify token expired |
| 401 | Invalid email or password | Wrong credentials |
| 401 | You are not logged in | No token provided |
| 401 | Invalid token | Malformed or tampered JWT |
| 401 | Token expired | AccessToken expired |
| 401 | Account deactivated | User.isActive = false |
| 403 | No permission | Role-based access denied |

---

## Testing Checklist

### Registration
- [ ] Valid registration succeeds
- [ ] Duplicate email fails
- [ ] Invalid email format fails
- [ ] Weak password fails
- [ ] Missing required fields fails

### Login
- [ ] Valid credentials succeed
- [ ] Invalid credentials fail
- [ ] Inactive account fails
- [ ] Token is returned and valid
- [ ] LastLogin timestamp updated

### Token Refresh
- [ ] Valid RefreshToken returns new AccessToken
- [ ] Expired RefreshToken fails
- [ ] Invalid RefreshToken fails
- [ ] Blacklisted token fails

### Password Reset
- [ ] Reset email sent for valid email
- [ ] Reset with valid token succeeds
- [ ] Expired token fails
- [ ] Invalid token fails
- [ ] Token is single-use

### Authorization
- [ ] Protected routes require authentication
- [ ] Role restrictions work correctly
- [ ] Expired token redirects to login

---

## Migration Path (Current → Enhanced)

### Phase 1: Add RefreshToken
1. Update `/auth/login` to return refreshToken
2. Create `/auth/refresh` endpoint
3. Update Axios interceptor for auto-refresh
4. Store refreshToken in httpOnly cookie

### Phase 2: Shorten AccessToken TTL
1. Change JWT_EXPIRE from 7d → 15m
2. Test auto-refresh flow
3. Monitor for issues

### Phase 3: Email Verification
1. Make isEmailVerified required for login
2. Implement email sending (Nodemailer)
3. Add verification UI flow

### Phase 4: Advanced Security
1. Implement token blacklist (Redis)
2. Add 2FA support
3. Session management
4. Audit logging

---

## Related Documentation

- [API.md](./API.md) - API endpoints reference
- [DATABASE.md](./DATABASE.md) - User model schema
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Environment variables setup

---

**Last Updated:** 2024-02-05
**Status:** Current implementation is basic but functional. Enhancements recommended for production.