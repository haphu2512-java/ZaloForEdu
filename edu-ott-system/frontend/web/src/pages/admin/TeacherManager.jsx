import React, { useState, useEffect } from "react";
import { FaUsers, FaPlus, FaTimes, FaSpinner, FaCheckCircle, FaExclamationCircle, FaEnvelope, FaIdBadge } from "react-icons/fa";
import { userService } from "../../services/userService";

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
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
      console.error("Lỗi:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    try {
      await userService.createTeacher(form);
      setMessage({ type: "success", text: "Thêm giảng viên thành công! Đã gửi email." });
      setForm({ fullName: "", email: "" });
      fetchTeachers();
      setTimeout(() => { setIsModalOpen(false); setMessage(null); }, 2500);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Lỗi tạo giảng viên!" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "28px", fontWeight: 800 }}>Mạng lưới Giảng viên</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>Quản lý tài khoản cho đội ngũ giảng dạy.</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setMessage(null); }} style={{ backgroundColor: "#2563eb", color: "white", padding: "12px 24px", borderRadius: "10px", border: "none", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 600 }}>
          <FaPlus /> Thêm Giảng viên
        </button>
      </div>

      {/* Thống kê nhỏ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "28px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", border: "1px solid #f1f5f9" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Tổng Giảng viên</p>
          <h3 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>{teachers.length}</h3>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", border: "1px solid #f1f5f9" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Đang Hoạt Động</p>
          <h3 style={{ margin: 0, fontSize: "28px", color: "#22c55e" }}>{teachers.filter(t => t.isActive).length}</h3>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px 24px", border: "1px solid #f1f5f9" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}>Mới thêm tháng này</p>
          <h3 style={{ margin: 0, fontSize: "28px", color: "#3b82f6" }}>
            {teachers.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length}
          </h3>
        </div>
      </div>

      {/* Bảng Danh Sách */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        {isFetching ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Đang tải...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>Giảng Viên</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>Email</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>Mã CBGV</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, idx) => (
                <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 700 }}>{t.fullName}</td>
                  <td style={{ padding: "16px 20px", color: "#475569" }}>{t.email}</td>
                  <td style={{ padding: "16px 20px", color: "#2563eb" }}>{t.teacherId || "—"}</td>
                  <td style={{ padding: "16px 20px", color: t.isActive ? "#16a34a" : "#dc2626" }}>{t.isActive ? "Hoạt động" : "Tạm dừng"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thêm */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", width: "400px", borderRadius: "20px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Thêm Giảng Viên</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><FaTimes /></button>
            </div>
            {message && <div style={{ color: message.type === 'success' ? 'green' : 'red', marginBottom: '15px' }}>{message.text}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <input type="text" name="fullName" required placeholder="Họ Tên" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }} />
              <input type="email" name="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }} />
              <button type="submit" disabled={loading} style={{ padding: "12px", backgroundColor: "#0f172a", color: "white", borderRadius: "8px", border: "none", cursor: "pointer" }}>
                {loading ? "Đang xử lý..." : "Lưu & Gửi Email"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}