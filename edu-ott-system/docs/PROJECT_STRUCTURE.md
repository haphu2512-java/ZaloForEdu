# Cấu trúc dự án Education OTT Platform

## Tổng quan

```
edu-ott-system/
├── backend/                 # Node.js/Express Backend API
├── web/                     # React Web Application
├── mobile/                  # React Native Mobile App
├── shared/                  # Shared utilities và constants
├── docs/                    # Documentation
├── docker-compose.yml       # Docker configuration
├── README.md               # Main documentation
├── SETUP.md                # Setup instructions
├── CONTRIBUTING.md         # Contribution guidelines
└── LICENSE                 # MIT License
```

---

## Backend Structure

```
backend/
├── src/
│   ├── config/             # Cấu hình (database, env)
│   │   └── database.js     # MongoDB connection
│   │
│   ├── controllers/        # Request handlers
│   │   ├── authController.js
│   │   ├── classController.js
│   │   ├── messageController.js
│   │   └── ...
│   │
│   ├── models/             # Mongoose schemas
│   │   ├── User.js
│   │   ├── Class.js
│   │   ├── Message.js
│   │   └── ...
│   │
│   ├── routes/             # API routes
│   │   ├── index.js        # Route aggregator
│   │   ├── authRoutes.js
│   │   ├── classRoutes.js
│   │   └── ...
│   │
│   ├── middlewares/        # Custom middlewares
│   │   ├── auth.js         # Authentication & authorization
│   │   ├── errorHandler.js # Global error handler
│   │   └── validate.js     # Input validation
│   │
│   ├── services/           # Business logic
│   │   ├── emailService.js
│   │   ├── fileService.js
│   │   └── ...
│   │
│   ├── utils/              # Helper functions
│   │   ├── appError.js
│   │   └── asyncHandler.js
│   │
│   ├── validators/         # Input validation schemas
│   │   └── ...
│   │
│   ├── socket/             # Socket.io configuration
│   │   └── index.js
│   │
│   └── server.js           # Entry point
│
├── uploads/                # File uploads (gitignored)
├── .env                    # Environment variables
├── .env.example            # Environment template
├── package.json
├── Dockerfile
└── README.md
```

### Backend Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator, Joi
- **File Upload**: Multer, Cloudinary
- **Security**: Helmet, CORS, Rate Limiting

---

## Web Structure

```
web/
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── components/         # Reusable components
│   │   ├── Layout/
│   │   ├── Chat/
│   │   ├── Class/
│   │   └── common/
│   │
│   ├── pages/              # Page components
│   │   ├── Auth/
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── Dashboard/
│   │   ├── Classes/
│   │   ├── Messages/
│   │   └── Profile/
│   │
│   ├── services/           # API services
│   │   ├── api.js          # Axios instance
│   │   ├── authService.js
│   │   ├── classService.js
│   │   └── ...
│   │
│   ├── store/              # Redux store
│   │   ├── index.js
│   │   └── slices/
│   │       ├── authSlice.js
│   │       ├── classSlice.js
│   │       └── ...
│   │
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.js
│   │   └── SocketContext.js
│   │
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useSocket.js
│   │   └── ...
│   │
│   ├── utils/              # Helper functions
│   │   ├── validators.js
│   │   └── formatters.js
│   │
│   ├── assets/             # Static assets
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── styles/             # Global styles
│   │   └── theme.js
│   │
│   ├── App.js              # Main app component
│   ├── index.js            # Entry point
│   └── index.css           # Global CSS
│
├── .env
├── .env.example
├── package.json
└── README.md
```

### Web Technologies
- **Framework**: React 18+
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **UI Library**: Material-UI (MUI)
- **Forms**: Formik + Yup
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Toast Notifications**: react-hot-toast

---

## Mobile Structure

```
mobile/
├── android/                # Android native code
├── ios/                    # iOS native code
│
├── src/
│   ├── screens/            # Screen components
│   │   ├── Auth/
│   │   ├── Home/
│   │   ├── Chat/
│   │   └── Profile/
│   │
│   ├── components/         # Reusable components
│   │   ├── Chat/
│   │   ├── Class/
│   │   └── common/
│   │
│   ├── navigation/         # Navigation configuration
│   │   ├── RootNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── MainNavigator.js
│   │
│   ├── services/           # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── ...
│   │
│   ├── store/              # Redux store (shared with web)
│   │
│   ├── contexts/           # React contexts
│   │
│   ├── hooks/              # Custom hooks
│   │
│   ├── utils/              # Helper functions
│   │
│   ├── assets/             # Images, fonts, etc.
│   │
│   └── constants/          # App constants
│       ├── theme.js
│       └── colors.js
│
├── App.js                  # Entry point
├── index.js
├── .env
├── .env.example
├── package.json
└── README.md
```

### Mobile Technologies
- **Framework**: React Native 0.72+
- **Navigation**: React Navigation v6
- **State Management**: Redux Toolkit
- **UI Library**: React Native Paper
- **Forms**: Formik + Yup
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Media**: react-native-image-picker, react-native-video
- **WebRTC**: react-native-webrtc (for video calls)

---

## Shared Structure

```
shared/
├── constants/
│   └── index.js           # Shared constants (roles, message types, etc.)
│
├── types/
│   └── index.js           # TypeScript types/interfaces (if using TS)
│
├── utils/
│   └── validators.js      # Shared validation functions
│
└── package.json
```

---

## Documentation

```
docs/
├── API.md                 # API documentation
├── DATABASE.md            # Database schema
├── SOCKET.md              # Socket.io events
├── DEPLOYMENT.md          # Deployment guide
└── FEATURES.md            # Feature specifications
```

---

## Configuration Files

### Root Level
- `docker-compose.yml` - Docker containers configuration
- `README.md` - Main project documentation
- `SETUP.md` - Development setup guide
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License
- `.gitignore` - Git ignore rules
- `package.json` - Workspace configuration

### Backend
- `.env` - Environment variables (gitignored)
- `.env.example` - Environment template
- `Dockerfile` - Docker image configuration
- `package.json` - Dependencies and scripts

### Web & Mobile
- `.env` - Environment variables (gitignored)
- `.env.example` - Environment template
- `package.json` - Dependencies and scripts

---

## Key Design Patterns

### Backend
- **MVC Pattern**: Model-View-Controller architecture
- **Repository Pattern**: Data access layer abstraction
- **Middleware Pattern**: Request processing pipeline
- **Service Layer**: Business logic separation

### Frontend (Web & Mobile)
- **Component-Based Architecture**: Reusable UI components
- **Container/Presenter Pattern**: Smart/Dumb components
- **Custom Hooks**: Reusable logic
- **Context API**: Global state management (for auth, socket)
- **Redux**: Complex state management

---

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Frontend sends POST to `/api/v1/auth/login`
3. Backend validates credentials
4. Backend returns JWT token
5. Frontend stores token in localStorage/AsyncStorage
6. Frontend includes token in subsequent requests

### Real-time Messaging Flow
1. User sends message in UI
2. Frontend emits `message:send` via Socket.io
3. Backend receives event, saves to database
4. Backend broadcasts `message:new` to room members
5. Frontend receives event, updates UI

### File Upload Flow
1. User selects file
2. Frontend uploads via `POST /api/v1/files/upload`
3. Backend uploads to Cloudinary
4. Backend saves file metadata to database
5. Backend returns file URL
6. Frontend displays file/sends as message

---

## Security Considerations

- JWT tokens for authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet for security headers
- MongoDB injection prevention
- File upload validation
- Socket.io authentication

---

## Testing Strategy

### Backend
- Unit tests for services and utilities
- Integration tests for API endpoints
- Socket.io event testing

### Frontend
- Component testing with React Testing Library
- Integration tests for user flows
- E2E tests with Cypress (optional)

---

## Deployment

### Backend
- Docker containerization
- Deploy to AWS EC2, Heroku, or DigitalOcean
- Use PM2 for process management
- MongoDB Atlas for database

### Web
- Build with `npm run build`
- Deploy to Vercel, Netlify, or AWS S3 + CloudFront
- Configure environment variables

### Mobile
- Build APK/IPA
- Submit to Google Play Store and Apple App Store
- Configure push notifications
