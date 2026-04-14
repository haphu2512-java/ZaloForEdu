import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import MainLayout from "./components/Layout/MainLayout";
import ChatPage from "./pages/chat/ChatPage";
import ProfilePage from "./pages/profile/ProfilePage";
import ChatbotPage from "./pages/chatbot/ChatbotPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import MyDocumentsPage from "./pages/cloud/MyDocumentsPage";
import BlockedUsersPage from "./pages/blocked/BlockedUsersPage";
import ArchivedConversationsPage from "./pages/archived/ArchivedConversationsPage";
import CompleteProfilePage from "./pages/auth/CompleteProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import VideoCallPage from './pages/chat/VideoCallPage';
import CreateGroupPage from "./pages/group/CreateGroupPage";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/chat" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/chat" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route path="/verify-otp" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:roomId" element={<ChatPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="/call/:roomId" element={<VideoCallPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="cloud" element={<MyDocumentsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="blocked" element={<BlockedUsersPage />} />
          <Route path="archived" element={<ArchivedConversationsPage />} />
          <Route path="group/create" element={<CreateGroupPage />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
