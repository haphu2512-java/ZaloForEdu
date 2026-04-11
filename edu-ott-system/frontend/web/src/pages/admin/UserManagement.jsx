import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit, UserPlus, ShieldAlert, Loader2, X, Save } from 'lucide-react';

import { userService } from '../../services/userService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // States cho chức năng Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Gọi API Lấy danh sách tất cả user
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const res = await userService.getAllUsers(); 
        
        // Bóc đúng mảng users từ response của Backend
        const usersArray = res?.data?.users || res?.data?.data?.users || [];
        setUsers(usersArray);
        
      } catch (error) {
        console.error('Lỗi khi lấy danh sách users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // 2. Gọi API Xóa user
  const handleDelete = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác.')) {
      try {
        await userService.deleteUser(userId);
        
        // Cập nhật lại UI sau khi xóa thành công
        setUsers(users.filter(user => user._id !== userId));
        alert('Đã xóa người dùng thành công!');
      } catch (error) {
        console.error('Lỗi khi xóa user:', error);
        alert('Xóa thất bại, vui lòng kiểm tra lại quyền Admin!');
      }
    }
  };

  // 3. Mở Modal & Set data user cần sửa
  const openEditModal = (user) => {
    setEditingUser({
      _id: user._id,
      fullName: user.fullName || `${user.lastName || ''} ${user.firstName || ''}`.trim(),
      phoneNumber: user.phoneNumber || user.phone || '',
      isActive: user.isActive !== undefined ? user.isActive : true // Mặc định là true nếu BE không trả về
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditingUser({ ...editingUser, [e.target.name]: value });
  };

  // 4. Gọi API Cập nhật user
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Data gửi lên BE
      const updateData = {
        fullName: editingUser.fullName,
        phoneNumber: editingUser.phoneNumber,
        isActive: editingUser.isActive
      };

      await userService.updateUser(editingUser._id, updateData);
      
      // Cập nhật lại UI không cần load lại trang
      setUsers(users.map(u => 
        u._id === editingUser._id 
          ? { ...u, fullName: editingUser.fullName, phoneNumber: editingUser.phoneNumber, isActive: editingUser.isActive } 
          : u
      ));
      
      alert('Cập nhật người dùng thành công!');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      alert('Cập nhật thất bại, vui lòng kiểm tra lại!');
    } finally {
      setIsSaving(false);
    }
  };

  // Logic lọc danh sách theo từ khóa
  const filteredUsers = users.filter(user => 
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", position: "relative" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "28px", fontWeight: 800 }}>Quản lý người dùng</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>Quản trị viên hệ thống</p>
        </div>
        <button 
          onClick={() => alert("Chức năng thêm người dùng đang được phát triển!")}
          style={{ backgroundColor: "#2563eb", color: "white", padding: "12px 24px", borderRadius: "10px", border: "none", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 600, fontSize: "15px", boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.39)", transition: "all 0.2s" }}
        >
          <UserPlus size={18} /> Thêm người dùng
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        
        {/* Thanh công cụ / Tìm kiếm */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff" }}>
          <div style={{ position: "relative", width: "400px" }}>
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex", pointerEvents: "none" }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border 0.2s" }}
            />
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, backgroundColor: "#f8fafc", padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            Tổng số: <span style={{ fontWeight: 700, color: "#2563eb" }}>{filteredUsers.length}</span> tài khoản
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "60px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "#3b82f6", fontWeight: 600 }}>
              <Loader2 size={32} className="spin" />
              Đang tải dữ liệu từ máy chủ...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "#94a3b8" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "50%" }}>
                <ShieldAlert size={40} color="#cbd5e1" />
              </div>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 500 }}>Không tìm thấy người dùng nào phù hợp.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Người dùng</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Liên hệ</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trạng thái</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr key={user._id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa", transition: "background 0.2s" }}>
                    
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <img 
                          src={user.avatarUrl || user.avatar || 'https://i.pravatar.cc/150?img=11'} 
                          alt="Avatar" 
                          style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", backgroundColor: "#f1f5f9", border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} 
                        />
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                            {user.fullName || `${user.lastName || ''} ${user.firstName || ''}`.trim() || 'Người dùng ẩn danh'}
                          </p>
                          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                            @{user.username || user.role || 'user'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#334155", fontWeight: 500 }}>{user.email}</p>
                      <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>{user.phoneNumber || user.phone || 'Chưa cập nhật SĐT'}</p>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: user.isActive ? "#f0fdf4" : "#fef2f2", padding: "6px 12px", borderRadius: "8px", width: "fit-content", border: `1px solid ${user.isActive ? '#bbf7d0' : '#fecaca'}` }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: user.isActive ? "#22c55e" : "#ef4444" }}></div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: user.isActive ? "#166534" : "#991b1b", textTransform: "capitalize" }}>
                          {user.isActive ? 'Hoạt động' : 'Tài khoản bị Khóa'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                        <button 
                          onClick={() => openEditModal(user)}
                          style={{ padding: "8px", backgroundColor: "#f8fafc", color: "#64748b", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Chỉnh sửa"
                        >
                          <Edit size={16} />
                        </button>
                        
                        <button 
                          onClick={() => handleDelete(user._id)}
                          style={{ padding: "8px", backgroundColor: "#fef2f2", color: "#ef4444", borderRadius: "8px", border: "1px solid #fecaca", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= MODAL CHỈNH SỬA ================= */}
      {isEditModalOpen && editingUser && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease-out" }}>
          <div style={{ backgroundColor: "white", width: "100%", maxWidth: "450px", borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>Chỉnh sửa thông tin</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Họ và Tên</label>
                  <input 
                    type="text" name="fullName" value={editingUser.fullName} onChange={handleEditChange} required
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Số điện thoại</label>
                  <input 
                    type="text" name="phoneNumber" value={editingUser.phoneNumber} onChange={handleEditChange}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
                  <input 
                    type="checkbox" id="isActive" name="isActive" 
                    checked={editingUser.isActive} onChange={handleEditChange} 
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="isActive" style={{ fontSize: "15px", fontWeight: 600, color: editingUser.isActive ? "#16a34a" : "#dc2626", cursor: "pointer" }}>
                    {editingUser.isActive ? "Tài khoản đang Hoạt động" : "Tài khoản đang bị Khóa"}
                  </label>
                </div>

                <div style={{ marginTop: "10px", display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: "12px", backgroundColor: "#f1f5f9", color: "#64748b", borderRadius: "10px", border: "none", fontWeight: 600, cursor: "pointer" }}>
                    Hủy
                  </button>
                  <button type="submit" disabled={isSaving} style={{ flex: 2, padding: "12px", backgroundColor: "#2563eb", color: "white", borderRadius: "10px", border: "none", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Lưu thay đổi
                  </button>
                </div>

              </form>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;