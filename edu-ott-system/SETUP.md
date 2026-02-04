# Hướng dẫn Setup Development Environment

## Yêu cầu hệ thống

### Chung
- **Node.js**: >= 18.0.0
- **npm** hoặc **yarn**: >= 9.0.0 / >= 1.22.0
- **Git**: Latest version
- **MongoDB**: >= 6.0 (hoặc MongoDB Atlas)
- **Code Editor**: VS Code (khuyến nghị)

### Cho Mobile Development
- **React Native CLI**: Latest
- **Xcode**: >= 14.0 (cho iOS, chỉ macOS)
- **Android Studio**: Latest (cho Android)
- **Java JDK**: >= 11
- **CocoaPods**: Latest (cho iOS)

## Setup từ đầu

### 1. Clone repository

```bash
git clone <repository-url>
cd edu-ott-system
```

### 2. Setup Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chỉnh sửa file .env với các thông tin của bạn
# Ví dụ:
# MONGODB_URI=mongodb://localhost:27017/edu-ott-db
# JWT_SECRET=my-super-secret-key
```

**Khởi động MongoDB:**

```bash
# Nếu dùng MongoDB local
mongod

# Hoặc sử dụng Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

**Chạy Backend:**

```bash
npm run dev
```

Backend sẽ chạy tại `http://localhost:5000`

### 3. Setup Web Application

Mở terminal mới:

```bash
cd web

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chạy development server
npm start
```

Web app sẽ mở tại `http://localhost:3000`

### 4. Setup Mobile Application

#### 4.1 Setup chung

```bash
cd mobile

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env
```

#### 4.2 Setup cho iOS (chỉ macOS)

```bash
# Cài đặt CocoaPods dependencies
cd ios
pod install
cd ..

# Chạy trên iOS simulator
npm run ios

# Hoặc
npx react-native run-ios
```

#### 4.3 Setup cho Android

**Đảm bảo Android Studio đã được cài đặt và cấu hình:**

1. Mở Android Studio
2. SDK Manager → Install Android SDK (API 31+)
3. AVD Manager → Tạo Virtual Device

**Cấu hình biến môi trường (macOS/Linux):**

```bash
# Thêm vào ~/.bash_profile hoặc ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Chạy Android:**

```bash
# Khởi động emulator trước
# Hoặc kết nối thiết bị Android thật

# Chạy app
npm run android

# Hoặc
npx react-native run-android
```

## Cấu trúc workspace hoàn chỉnh

```
edu-ott-system/
├── backend/              ← Backend API (chạy trước)
│   ├── src/
│   ├── .env
│   └── package.json
│
├── web/                  ← Web App
│   ├── src/
│   ├── public/
│   ├── .env
│   └── package.json
│
├── mobile/               ← Mobile App
│   ├── src/
│   ├── ios/
│   ├── android/
│   ├── .env
│   └── package.json
│
├── shared/               ← Shared code
│   ├── constants/
│   ├── types/
│   └── utils/
│
└── docker-compose.yml    ← Docker setup
```

## Chạy toàn bộ hệ thống

### Cách 1: Chạy thủ công

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Web:**
```bash
cd web && npm start
```

**Terminal 3 - Mobile (optional):**
```bash
cd mobile && npm run ios
# hoặc
cd mobile && npm run android
```

### Cách 2: Sử dụng Docker

```bash
# Từ thư mục root
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng containers
docker-compose down
```

## VS Code Extensions khuyến nghị

- **ESLint**: Linting JavaScript/TypeScript
- **Prettier**: Code formatting
- **ES7+ React/Redux/React-Native snippets**: React snippets
- **GitLens**: Git integration
- **Thunder Client**: API testing
- **MongoDB for VS Code**: MongoDB integration
- **React Native Tools**: React Native debugging

## Debugging

### Backend (Node.js)

```bash
# Debug mode
node --inspect src/server.js

# Hoặc với nodemon
nodemon --inspect src/server.js
```

Trong VS Code, tạo file `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/server.js",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "console": "integratedTerminal"
    }
  ]
}
```

### Web (React)

React DevTools extension trong browser

### Mobile (React Native)

```bash
# React Native Debugger
npm install -g react-native-debugger

# Flipper (khuyến nghị)
# Download từ https://fbflipper.com/
```

## Testing

```bash
# Backend
cd backend && npm test

# Web
cd web && npm test

# Mobile
cd mobile && npm test
```

## Troubleshooting

### Backend không kết nối được MongoDB
- Kiểm tra MongoDB có đang chạy: `mongosh` hoặc `mongo`
- Kiểm tra MONGODB_URI trong .env
- Thử kết nối bằng MongoDB Compass

### Web không gọi được API
- Kiểm tra backend có đang chạy không
- Kiểm tra REACT_APP_API_URL trong .env
- Xem Network tab trong Browser DevTools

### Mobile không kết nối được API
- Đối với Android Emulator: Dùng `http://10.0.2.2:5000`
- Đối với iOS Simulator: Dùng `http://localhost:5000`
- Đối với thiết bị thật: Dùng IP của máy trong cùng mạng

### iOS pod install lỗi
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android build lỗi
```bash
cd android
./gradlew clean
cd ..
```

## Scripts hữu ích

```bash
# Cài đặt tất cả dependencies
npm run install:all

# Clean tất cả node_modules
npm run clean

# Lint toàn bộ code
npm run lint

# Format code
npm run format
```

## Tài liệu tham khảo

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)

## Liên hệ hỗ trợ

Nếu gặp vấn đề khi setup, vui lòng:
1. Kiểm tra Issues trên GitHub
2. Tạo Issue mới với mô tả chi tiết
3. Liên hệ team qua [Discord/Email]
