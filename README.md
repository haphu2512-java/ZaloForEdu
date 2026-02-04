# Hệ thống OTT Giáo dục - Education OTT Platform

## Giới thiệu

Hệ thống OTT (Over-The-Top) phục vụ giao tiếp và hỗ trợ quản lý hoạt động dạy học trong môi trường giáo dục.

### Tính năng chính

- **Quản lý tài khoản**: Đăng ký, đăng nhập, phân quyền (Giảng viên, Học viên, Admin)
- **Quản lý lớp học và nhóm**: Tạo và quản lý lớp học, nhóm môn học
- **Nhắn tin**: 
  - Chat 1-1
  - Chat nhóm
  - Hỗ trợ văn bản, hình ảnh, video, tài liệu
- **Chatbot AI**: Hỗ trợ học tập tự động
- **Thống kê & Phân tích**: Theo dõi hoạt động giảng viên và học viên
- **Quản lý tài liệu**: Upload, chia sẻ tài liệu học tập

## Kiến trúc hệ thống

```
edu-ott-system/
├── backend/          # Node.js/Express API Server
├── web/              # ReactJS Web Application
├── mobile/           # React Native Mobile App
├── shared/           # Shared utilities, types, constants
└── docs/             # Documentation
```

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB/PostgreSQL
- **Real-time**: Socket.io
- **Authentication**: JWT
- **File Storage**: AWS S3 / Cloudinary

### Web Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit / Zustand
- **Routing**: React Router v6
- **UI Library**: Material-UI / Ant Design
- **Real-time**: Socket.io Client

### Mobile
- **Framework**: React Native 0.72+
- **Navigation**: React Navigation
- **State Management**: Redux Toolkit
- **UI**: React Native Paper

## Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm >= 9.0.0 hoặc yarn >= 1.22.0
- MongoDB >= 6.0 hoặc PostgreSQL >= 14
- React Native CLI (cho mobile development)

## Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd edu-ott-system
```

### 2. Cài đặt dependencies

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Cấu hình biến môi trường trong file .env
npm run dev
```

#### Web
```bash
cd web
npm install
cp .env.example .env
npm start
```

#### Mobile
```bash
cd mobile
npm install
cp .env.example .env

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## Development

### Backend API
```bash
cd backend
npm run dev          # Development mode với hot-reload
npm run build        # Build production
npm start            # Start production server
npm test             # Run tests
```

### Web Application
```bash
cd web
npm start            # Development server
npm run build        # Production build
npm test             # Run tests
```

### Mobile Application
```bash
cd mobile
npm start            # Start Metro bundler
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm test             # Run tests
```

## API Documentation

API documentation sẽ có sẵn tại `http://localhost:5000/api-docs` khi chạy backend server.

## Deployment

### Backend
- Sử dụng Docker để containerize
- Deploy lên AWS EC2, Heroku, hoặc DigitalOcean
- Sử dụng PM2 cho process management

### Web
- Build static files: `npm run build`
- Deploy lên Vercel, Netlify, hoặc AWS S3 + CloudFront

### Mobile
- Build APK/IPA files
- Submit lên Google Play Store và Apple App Store

## Contributing

Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết chi tiết về quy trình đóng góp.

## License

MIT License - xem file [LICENSE](LICENSE)

## Team

- **Nhóm sinh viên**:  Nhóm 3
- **Giảng viên hướng dẫn**: Tôn Long Phước
- **Trường**: IUH

