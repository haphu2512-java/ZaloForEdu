import React, { useState, useEffect, useRef } from "react";
import { FaUserAlt, FaLock, FaSave, FaSpinner, FaEye, FaEyeSlash, FaShieldAlt, FaEdit, FaCamera, FaTimes, FaEnvelope, FaUserShield } from "react-icons/fa";
import { userService } from "../../services/userService";
import { authService } from "../../services/authService";

export default function AdminProfileSettings() {
  const [adminProfile, setAdminProfile] = useState({ 
    fullName: "", 
    email: "",
    avatarUrl: "",
    role: "admin"
  });
  
  // State quản lý chế độ Xem/Sửa
  const [isEditing, setIsEditing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const fileInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true);
      try {
        const res = await userService.getProfile();
        const userData = res.data?.data?.user || res.data?.user || res.data;
        if (userData) {
          setAdminProfile({ 
            fullName: userData.fullName || "", 
            email: userData.email || "",
            avatarUrl: userData.avatar || userData.avatarUrl || "https://i.pravatar.cc/150?img=11",
            role: userData.role || "Quản trị viên"
          });
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAdminChange = (e) => {
    setAdminProfile({ ...adminProfile, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarFile(file);
      setAdminProfile({ ...adminProfile, avatarUrl: previewUrl });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const updateData = {
        fullName: adminProfile.fullName,
      };
      if (avatarFile) {
        updateData.avatarFile = avatarFile;
      } else if (adminProfile.avatarUrl?.startsWith('http')) {
        updateData.avatar = adminProfile.avatarUrl;
      }
      const response = await userService.updateProfile(updateData);
      const updatedUser = response?.data?.user || response?.user || response?.data?.data?.user;
      if (updatedUser?.avatar) {
        setAdminProfile((prev) => ({ ...prev, avatarUrl: updatedUser.avatar }));
      }
      setAvatarFile(null);
      alert("Cập nhật hồ sơ thành công!");
      setIsEditing(false); // Lưu xong tự động quay về chế độ Xem
    } catch (error) { 
      alert("Cập nhật thất bại!"); 
    }
  };

  const handleUpdatePassword = async () => {
    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      return alert("Vui lòng điền đầy đủ thông tin mật khẩu!");
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      return alert("Mật khẩu xác nhận không khớp!");
    }
    try {
      await authService.changePassword({ 
        currentPassword: passForm.currentPassword, 
        newPassword: passForm.newPassword 
      });
      alert("Đổi mật khẩu thành công!");
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ!";
      alert(errorMsg);
    }
  };

  const toggleEye = (field) => setShowPass({ ...showPass, [field]: !showPass[field] });

  // CSS dùng chung
  const inputStyle = { width: "100%", padding: "14px 45px 14px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px", color: "#1e293b", outline: "none", boxSizing: "border-box", transition: "border 0.2s" };
  const labelStyle = { display: "block", fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "8px" };
  const cardStyle = { backgroundColor: "white", padding: "32px", borderRadius: "20px", marginBottom: "32px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" };
  const eyeIconStyle = { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#94a3b8" };

  if (isFetching) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px", color: "#3b82f6" }}><FaSpinner className="spin" size={28} /></div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.3s ease-out" }}>
      
      {/* Header Trang */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "28px", fontWeight: 800 }}>Thiết lập Tài khoản</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>Quản lý thông tin định danh và bảo mật của Quản trị viên.</p>
      </div>
      
      {/* ================= KHỐI 1: THÔNG TIN CÁ NHÂN ================= */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ backgroundColor: "#eff6ff", padding: "10px", borderRadius: "10px", color: "#2563eb" }}>
              <FaUserAlt size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>Thông tin cá nhân</h3>
          </div>
          
          {/* Nút Toggle Edit/View */}
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              style={{ background: "#f8fafc", color: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
            >
              <FaEdit /> Chỉnh sửa
            </button>
          )}
        </div>

        {/* --- DẠNG XEM (READ-ONLY) --- */}
        {!isEditing ? (
          <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
            <div style={{ width: "100px", height: "100px", borderRadius: "20px", overflow: "hidden", border: "4px solid #f1f5f9", flexShrink: 0 }}>
              <img src={adminProfile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Họ và Tên</p>
                <p style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>{adminProfile.fullName}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Vai trò</p>
                <p style={{ margin: 0, fontSize: "14px", color: "#2563eb", fontWeight: 700, backgroundColor: "#eff6ff", display: "inline-block", padding: "4px 10px", borderRadius: "6px" }}>
                  <FaUserShield style={{ marginRight: "4px" }}/> Quản trị viên hệ thống
                </p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Địa chỉ Email</p>
                <p style={{ margin: 0, fontSize: "16px", color: "#475569", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaEnvelope color="#cbd5e1"/> {adminProfile.email}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* --- DẠNG SỬA (FORM) --- */
          <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
            
            {/* Sửa Avatar */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "100px", height: "100px", borderRadius: "20px", overflow: "hidden", border: "4px solid #eff6ff", flexShrink: 0, position: "relative", cursor: "pointer" }}
            >
              <img src={adminProfile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
                <FaCamera size={24} />
              </div>
              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleAvatarChange} />
            </div>

            {/* Sửa Tên */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Họ và Tên hiển thị</label>
                <input 
                  type="text" name="fullName" value={adminProfile.fullName} 
                  onChange={handleAdminChange} style={{...inputStyle, paddingRight: "16px"}} 
                />
              </div>
              <div>
                <label style={labelStyle}>Địa chỉ Email <span style={{color: "#94a3b8", fontWeight: "normal"}}>(Cố định)</span></label>
                <input 
                  type="email" value={adminProfile.email} disabled 
                  style={{...inputStyle, paddingRight: "16px", backgroundColor: "#f8fafc", color: "#94a3b8", cursor: "not-allowed"}} 
                />
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button onClick={() => { setAvatarFile(null); setIsEditing(false); }} style={{ padding: "12px 20px", background: "#f1f5f9", color: "#475569", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", gap: "8px", alignItems: "center" }}>
                  <FaTimes /> Hủy bỏ
                </button>
                <button onClick={handleUpdateProfile} style={{ padding: "12px 24px", background: "#2563eb", color: "#fff", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}>
                  <FaSave /> Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= KHỐI 2: ĐỔI MẬT KHẨU ================= */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
          <div style={{ backgroundColor: "#fef2f2", padding: "10px", borderRadius: "10px", color: "#ef4444" }}>
            <FaShieldAlt size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>Bảo mật & Mật khẩu</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "500px" }}>
          
          <div>
            <label style={labelStyle}>Mật khẩu hiện tại</label>
            <div style={{ position: "relative" }}>
              <input 
                type={showPass.current ? "text" : "password"} 
                name="currentPassword" value={passForm.currentPassword} 
                onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} 
                placeholder="Nhập mật khẩu hiện tại" style={inputStyle} 
              />
              <div style={eyeIconStyle} onClick={() => toggleEye('current')}>
                {showPass.current ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Mật khẩu mới</label>
            <div style={{ position: "relative" }}>
              <input 
                type={showPass.new ? "text" : "password"} 
                name="newPassword" value={passForm.newPassword} 
                onChange={e => setPassForm({...passForm, newPassword: e.target.value})} 
                placeholder="Nhập mật khẩu mới" style={inputStyle} 
              />
              <div style={eyeIconStyle} onClick={() => toggleEye('new')}>
                {showPass.new ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Xác nhận mật khẩu mới</label>
            <div style={{ position: "relative" }}>
              <input 
                type={showPass.confirm ? "text" : "password"} 
                name="confirmPassword" value={passForm.confirmPassword} 
                onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} 
                placeholder="Nhập lại mật khẩu mới" style={inputStyle} 
              />
              <div style={eyeIconStyle} onClick={() => toggleEye('confirm')}>
                {showPass.confirm ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </div>
            </div>
          </div>

          <button 
            onClick={handleUpdatePassword} 
            style={{ padding: "12px 24px", background: "#0f172a", color: "#fff", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start", marginTop: "10px", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)", transition: "0.2s" }}
          >
            <FaLock /> Đổi Mật Khẩu
          </button>
        </div>
      </div>
      
    </div>
  );
}
