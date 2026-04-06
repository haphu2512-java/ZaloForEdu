import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ==========================================

// ==========================================
// import { useAuthStore } from "./store/authStore";
// import LoginPage from "./pages/auth/LoginPage";
// import RegisterPage from "./pages/auth/RegisterPage";
// import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
// import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
// import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
// import MainLayout from "./components/layout/MainLayout";
// import HomePage from "./pages/home/HomePage";
// import ChatPage from "./pages/chat/ChatPage";
// import ClassesPage from "./pages/classes/ClassesPage";
// import AnalyticsPage from "./pages/analytics/AnalyticsPage";
// import ChatbotPage from "./pages/chatbot/ChatbotPage";

// ==========================================

// ==========================================
import ProfilePage from "./users/UserProfile";       
import UserManagement from "./users/UserManagement"; 

// ==========================================

// ==========================================
// function PrivateRoute({ children }) {
//   const { isAuthenticated } = useAuthStore();
//   return isAuthenticated ? children : <Navigate to="/login" replace />;
// }
//
// function PublicRoute({ children }) {
//   const { isAuthenticated } = useAuthStore();
//   return isAuthenticated ? <Navigate to="/chat" replace /> : children;
// }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
     
            
        {/* Route xem Profile */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Route cho Admin quản lý user */}
        <Route path="/admin/users" element={<UserManagement />} />

        {/* Nếu gõ đường dẫn bậy bạ, tự động đá về trang profile luôn cho nhanh */}
        <Route path="*" element={<Navigate to="/profile" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}