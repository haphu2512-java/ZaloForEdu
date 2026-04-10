import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";
// Thêm icon mới để dùng cho Menu
import { FaSignOutAlt, FaUserShield, FaUsers, FaUserAlt, FaUserCog } from "react-icons/fa";

// Import 3 component con
import TeacherManager from "./TeacherManager";
import AdminProfileSettings from "./AdminProfileSettings";
import UserManagement from "./UserManagement"; // <-- Đã import ở đây

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // State quản lý tab (Mặc định vào trang quản lý người dùng chung)
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'teachers' | 'profile'

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
  
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f3f4f6", fontFamily: "Inter, Roboto, sans-serif" }}>
      
      {/* ================= SIDEBAR ================= */}
      <div style={{ width: "260px", backgroundColor: "#0f172a", color: "white", padding: "24px", display: "flex", flexDirection: "column", boxShadow: "4px 0 15px rgba(0,0,0,0.05)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div style={{ padding: "8px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "10px" }}>
            <FaUserShield size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "0.5px" }}>Zalo Edu OTT</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Quản trị hệ thống</p>
          </div>
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          
          {/* Nút 1: Quản lý TẤT CẢ người dùng (MỚI) */}
          <div 
            onClick={() => setActiveTab("users")}
            style={{ backgroundColor: activeTab === "users" ? "#1e293b" : "transparent", color: activeTab === "users" ? "#60a5fa" : "#cbd5e1", padding: "14px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", borderLeft: activeTab === "users" ? "4px solid #3b82f6" : "4px solid transparent", transition: "all 0.2s" }}
          >
            <FaUsers size={18} />
            <span style={{ fontWeight: 600, fontSize: "15px" }}>Quản lý Người dùng</span>
          </div>

          {/* Nút 2: Quản lý giảng viên */}
          <div 
            onClick={() => setActiveTab("teachers")}
            style={{ backgroundColor: activeTab === "teachers" ? "#1e293b" : "transparent", color: activeTab === "teachers" ? "#60a5fa" : "#cbd5e1", padding: "14px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", borderLeft: activeTab === "teachers" ? "4px solid #3b82f6" : "4px solid transparent", transition: "all 0.2s" }}
          >
            <FaUserCog size={18} />
            <span style={{ fontWeight: 600, fontSize: "15px" }}>Quản lý Giảng viên</span>
          </div>

          {/* Nút 3: Hồ sơ quản trị */}
          <div 
            onClick={() => setActiveTab("profile")}
            style={{ backgroundColor: activeTab === "profile" ? "#1e293b" : "transparent", color: activeTab === "profile" ? "#60a5fa" : "#cbd5e1", padding: "14px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", borderLeft: activeTab === "profile" ? "4px solid #3b82f6" : "4px solid transparent", transition: "all 0.2s" }}
          >
            <FaUserAlt size={16} />
            <span style={{ fontWeight: 600, fontSize: "15px" }}>Hồ sơ Quản trị</span>
          </div>
        </div>

        {/* User Card & Logout */}
        <div style={{ borderTop: "1px solid #334155", paddingTop: "20px", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "0 8px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{user?.fullName || "Admin"}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Hệ thống</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "10px", border: "1px solid rgba(239, 68, 68, 0.2)", cursor: "pointer", fontWeight: 600, transition: "0.3s" }}
          >
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>
      </div>

      {/* ================= MAIN CONTENT (Khu vực hiển thị các trang) ================= */}
      <div style={{ flex: 1, padding: "40px 50px", overflowY: "auto", position: "relative" }}>
        
        {/* Render theo Tab đang chọn */}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "teachers" && <TeacherManager />}
        {activeTab === "profile" && <AdminProfileSettings />}
        
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        /* Tinh chỉnh scrollbar cho đẹp */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}