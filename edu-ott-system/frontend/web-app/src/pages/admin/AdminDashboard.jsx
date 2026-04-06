import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUserShield, FaUsers, FaPlus, FaTimes, FaSpinner, FaCheckCircle, FaExclamationCircle, FaEnvelope, FaIdBadge } from "react-icons/fa";
import { userService } from "../../services/userService";

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Danh sách giảng viên từ DB
  const [teachers, setTeachers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  // Thêm Giảng viên Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchTeachers = async () => {
    try {
      setIsFetching(true);
      const res = await userService.getAllTeachers();
      setTeachers(res.data?.data?.teachers || []);
    } catch (err) {
      console.error("Không thể tải danh sách giảng viên:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await userService.createTeacher(form);
      setMessage({ type: "success", text: "Thêm giảng viên thành công! Email chứa mật khẩu đã được gửi đi." });
      setForm({ fullName: "", email: "" });
      fetchTeachers(); // Refresh danh sách ngay lập tức
      // Tự động đóng modal sau 2s khi thành công
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
      }, 2500);
    } catch (err) {
      const errorText = err.response?.data?.message || "Đã xảy ra lỗi khi tạo giảng viên!";
      setMessage({ type: "error", text: errorText });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f3f4f6", fontFamily: "Inter, Roboto, sans-serif" }}>
      
      {/* Sidebar */}
      <div style={{ width: "260px", backgroundColor: "#0f172a", color: "white", padding: "24px", display: "flex", flexDirection: "column", boxShadow: "4px 0 15px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div style={{ padding: "8px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "10px" }}>
            <FaUserShield size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "0.5px" }}>Zalo Edu OTT</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Quản trị hệ thống</p>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ backgroundColor: "#1e293b", color: "#60a5fa", padding: "14px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", borderLeft: "4px solid #3b82f6", transition: "all 0.2s" }}>
            <FaUsers size={18} />
            <span style={{ fontWeight: 600, fontSize: "15px" }}>Quản lý Giảng viên</span>
          </div>
        </div>

        {/* User Card */}
        <div style={{ borderTop: "1px solid #334155", paddingTop: "20px", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "0 8px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>A</div>
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

      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px 50px", overflowY: "auto", position: "relative" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "28px", fontWeight: 800 }}>Mạng lưới Giảng viên</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>Quản lý tài khoản cho đội ngũ giảng dạy của nhà trường.</p>
          </div>
          
          <button 
            onClick={() => { setIsModalOpen(true); setMessage(null); }}
            style={{ backgroundColor: "#2563eb", color: "white", padding: "12px 24px", borderRadius: "10px", border: "none", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 600, fontSize: "15px", boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.39)", transition: "all 0.2s" }}
          >
            <FaPlus /> Thêm Giảng viên
          </button>
        </div>
        
        {/* Stats Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "28px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Tổng Giảng viên</p>
            <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>{teachers.length}</h3>
          </div>
          <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Đang Hoạt Động</p>
            <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#22c55e" }}>{teachers.filter(t => t.isActive).length}</h3>
          </div>
          <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Mới thêm tháng này</p>
            <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#3b82f6" }}>
              {teachers.filter(t => { const d = new Date(t.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length}
            </h3>
          </div>
        </div>

        {/* Teacher Table */}
        <div style={{ backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
          {isFetching ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "#94a3b8", gap: "12px" }}>
              <FaSpinner className="spin" size={24} /> Đang tải danh sách...
            </div>
          ) : teachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 30px", color: "#94a3b8" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <FaUsers size={36} color="#cbd5e1" />
              </div>
              <h3 style={{ margin: "0 0 12px", color: "#334155", fontSize: "18px" }}>Chưa có giảng viên nào trên hệ thống</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6 }}>Bấm "Thêm Giảng viên" để cấp tài khoản mới.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giảng Viên</th>
                  <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                  <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mã CBGV</th>
                  <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ngày Tạo</th>
                  <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => (
                  <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: `hsl(${t.fullName.charCodeAt(0) * 15}, 65%, 55%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "15px", flexShrink: 0 }}>
                          {t.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{t.fullName}</p>
                          {t.department && <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>{t.department}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "13px", color: "#475569" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaEnvelope size={11} color="#94a3b8" /> {t.email}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {t.teacherId ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", backgroundColor: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                          <FaIdBadge size={11} /> {t.teacherId}
                        </span>
                      ) : <span style={{ color: "#cbd5e1", fontSize: "13px" }}>—</span>}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "13px", color: "#64748b" }}>
                      {new Date(t.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: t.isActive ? "#22c55e" : "#ef4444", marginRight: "6px" }} />
                      <span style={{ fontSize: "13px", color: t.isActive ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{t.isActive ? "Hoạt động" : "Tạm dừng"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modern Modal Overlay */}
      {isModalOpen && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{ 
            backgroundColor: "white", width: "100%", maxWidth: "480px", borderRadius: "20px", 
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" 
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: "24px 30px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>Tạo Mới Giảng Viên</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Điền thông tin cơ bản để cấp quyền hệ thống</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "30px" }}>
              {message && (
                <div style={{ 
                  padding: "16px", borderRadius: "10px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px",
                  backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: message.type === 'success' ? '#166534' : '#991b1b',
                  fontSize: "14px", fontWeight: 500
                }}>
                  {message.type === 'success' ? <FaCheckCircle size={18} color="#22c55e" /> : <FaExclamationCircle size={18} color="#ef4444" />}
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Họ và Tên <span style={{color: "#ef4444"}}>*</span></label>
                  <input 
                    type="text" name="fullName" required 
                    value={form.fullName} onChange={handleInputChange}
                    placeholder="VD: Tiến sĩ Nguyễn Văn A"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", transition: "border 0.2s", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Địa chỉ Email hợp lệ <span style={{color: "#ef4444"}}>*</span></label>
                  <input 
                    type="email" name="email" required 
                    value={form.email} onChange={handleInputChange}
                    placeholder="VD: teacher@university.edu.vn"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", transition: "border 0.2s", boxSizing: "border-box" }}
                  />
                  <small style={{ display: "block", color: "#64748b", marginTop: "6px", fontSize: "12.5px" }}>Email này sẽ là Tên Đăng Nhập và cũng là nơi nhận mật khẩu.</small>
                </div>

                {/* Không cần nhập trường Mã CBGV nữa do Backend tự sinh */}

                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: "14px", backgroundColor: "#f1f5f9", color: "#64748b", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}>
                    Hủy bỏ
                  </button>
                  <button type="submit" disabled={loading} style={{ flex: 2, padding: "14px", backgroundColor: "#0f172a", color: "white", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)" }}>
                    {loading ? <><FaSpinner className="spin" /> Đang tạo & Gửi Email...</> : "Tạo Tài Khoản & Gửi Mail"}
                  </button>
                </div>
              </form>
            </div>
            
          </div>
        </div>
      )}
      
      {/* CSS Animation embedded softly */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
      `}</style>
    </div>
  );
}
