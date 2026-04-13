import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Loader2, ChevronLeft, ChevronRight, UserX, UserCheck, Trash2, Shield, Users, Activity, Eye, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { userService } from '../../services/userService';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // States cho Bộ lọc & Phân trang
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 1. STATES CHO CUSTOM MODALS (Giao diện xịn xò)
  const [modalState, setModalState] = useState({ isOpen: false, type: null, user: null }); // type: 'ban', 'unban', 'warn', 'delete'
  const [banReasonInput, setBanReasonInput] = useState('Vi phạm tiêu chuẩn cộng đồng');
  const [isProcessing, setIsProcessing] = useState(false);

  // LẤY DỮ LIỆU TỪ BACKEND
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await userService.getAllUsers();
      const usersArray = res?.data?.users || res?.data?.data?.users || res?.users || [];
      setUsers(usersArray);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. CÁC HÀM XỬ LÝ KHI BẤM NÚT TRÊN BẢNG (MỞ MODAL)
  const openModal = (type, user) => {
    setModalState({ isOpen: true, type, user });
    if (type === 'ban') setBanReasonInput('Vi phạm tiêu chuẩn cộng đồng'); // Reset lý do mặc định
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, user: null });
    setIsProcessing(false);
  };

  // 3. CÁC HÀM THỰC THI GỌI API (SAU KHI XÁC NHẬN TỪ MODAL)
  const executeBanOrUnban = async () => {
    const { type, user } = modalState;
    if (type === 'ban' && banReasonInput.trim() === '') {
      alert("Vui lòng không để trống lý do khóa!");
      return;
    }

    setIsProcessing(true);
    const userId = user.id || user._id;
    const isBanning = type === 'ban';
    const finalReason = isBanning ? banReasonInput : null;

    try {
      await userService.updateUserStatus({ 
        targetUserId: userId, 
        isActive: !isBanning,
        banReason: finalReason 
      });
      
      setUsers(users.map(u => 
        (u.id || u._id) === userId ? { ...u, isActive: !isBanning, banReason: finalReason } : u
      ));
      closeModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Thao tác thất bại!');
      setIsProcessing(false);
    }
  };

  const executeWarn = async () => {
    setIsProcessing(true);
    const { user } = modalState;
    const userId = user.id || user._id;

    try {
      const res = await userService.updateUserStatus({ targetUserId: userId, action: 'warn' });
      
      const newWarningCount = res.data?.warningCount || (user.warningCount || 0) + 1;
      const isNowBanned = res.data?.isActive === false || newWarningCount >= 3;

      setUsers(users.map(u => {
        if ((u.id || u._id) === userId) {
          return { 
            ...u, 
            warningCount: newWarningCount, 
            isActive: !isNowBanned,
            banReason: isNowBanned ? 'Hệ thống tự động khóa: Vượt quá 3 lần cảnh cáo vi phạm' : u.banReason
          };
        }
        return u;
      }));
      closeModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Ghi nhận vi phạm thất bại!');
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    setIsProcessing(true);
    const { user } = modalState;
    const userId = user.id || user._id;

    try {
      await userService.deleteUser(userId);
      setUsers(users.filter(u => (u.id || u._id) !== userId));
      closeModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Xóa thất bại!');
      setIsProcessing(false);
    }
  };

  // 4. LỌC DỮ LIỆU
  const filteredUsers = users.filter(user => {
    const searchStr = `${user.fullName || ''} ${user.username || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || (filterRole === 'Admin' ? user.role === 'admin' : user.role !== 'admin');
    const matchesTab = activeTab === 'All' || (activeTab === 'Active' ? user.isActive !== false : user.isActive === false);
    return matchesSearch && matchesRole && matchesTab;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive !== false).length,
    banned: users.filter(u => u.isActive === false).length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out", color: "#1e293b", position: "relative" }}>
      
      {/* STATS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {[
          { label: "Tổng người dùng", value: stats.total, icon: <Users size={20}/>, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Đang hoạt động", value: stats.active, icon: <Activity size={20}/>, color: "#10b981", bg: "#ecfdf5" },
          { label: "Quản trị viên", value: stats.admins, icon: <Shield size={20}/>, color: "#8b5cf6", bg: "#f5f3ff" },
          { label: "Đã bị khóa", value: stats.banned, icon: <ShieldAlert size={20}/>, color: "#ef4444", bg: "#fef2f2" },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ backgroundColor: s.bg, color: s.color, padding: "12px", borderRadius: "12px" }}>{s.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{s.label}</p>
              <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* CONTROL BAR */}
      <div style={{ backgroundColor: "#fff", borderRadius: "20px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            
            <div style={{ display: "flex", backgroundColor: "#f8fafc", padding: "4px", borderRadius: "12px" }}>
              {['All', 'Active', 'Banned'].map(t => (
                <button 
                  key={t}
                  onClick={() => {setActiveTab(t); setCurrentPage(1);}}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, backgroundColor: activeTab === t ? "#fff" : "transparent", color: activeTab === t ? "#3b82f6" : "#64748b", boxShadow: activeTab === t ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "0.2s" }}
                >
                  {t === 'All' ? 'Tất cả' : t === 'Active' ? 'Hoạt động' : 'Bị khóa'}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: "300px" }}>
              <div style={{ position: "relative", flex: 1, maxWidth: "350px" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input 
                  type="text" placeholder="Tìm tên, email..." 
                  value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  style={{ width: "100%", padding: "10px 16px 10px 42px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none" }}
                />
              </div>
              <select 
                value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                <option value="All">Mọi vai trò</option>
                <option value="User">Người dùng</option>
                <option value="Admin">Quản trị viên</option>
              </select>
            </div>

          </div>
        </div>

        {/* TABLE SECTION */}
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "100px", textAlign: "center", color: "#3b82f6" }}><Loader2 className="spin" size={40} /></div>
          ) : paginatedUsers.length === 0 ? (
            <div style={{ padding: "100px", textAlign: "center", color: "#94a3b8" }}>
              <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: "16px", margin: "0 auto" }} />
              <p>Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Thành viên</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Vai trò</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Cảnh cáo</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Trạng thái</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isBanned = user.isActive === false;
                  const isAdmin = user.role === 'admin';
                  const userId = user.id || user._id; 
                  const warnings = user.warningCount || 0;

                  return (
                    <tr key={userId} className="user-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "0.2s" }}>
                      
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img src={user.avatarUrl || 'https://i.pravatar.cc/150?img=11'} alt="Ava" style={{ width: "40px", height: "40px", borderRadius: "12px", objectFit: "cover" }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: isBanned ? "#94a3b8" : "#0f172a" }}>{user.fullName || user.username || 'Ẩn danh'}</p>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{user.email || user.phone || 'Chưa cập nhật'}</p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: isAdmin ? "#6366f1" : "#64748b", backgroundColor: isAdmin ? "#f5f3ff" : "#f1f5f9", padding: "4px 10px", borderRadius: "8px" }}>
                          {isAdmin ? <Shield size={12}/> : <Users size={12}/>}
                          {isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>

                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: warnings >= 2 ? "#ef4444" : warnings === 1 ? "#f59e0b" : "#10b981", backgroundColor: warnings >= 2 ? "#fef2f2" : warnings === 1 ? "#fffbeb" : "#ecfdf5", padding: "4px 8px", borderRadius: "6px" }}>
                          {warnings} Vi phạm
                        </span>
                      </td>

                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isBanned ? "#ef4444" : "#10b981" }} />
                          <span style={{ fontSize: "13px", fontWeight: 600, color: isBanned ? "#ef4444" : "#10b981" }}>
                            {isBanned ? 'Đã khóa' : 'Hoạt động'}
                          </span>
                        </div>
                        {isBanned && user.banReason && (
                          <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px", maxWidth: "250px", whiteSpace: "normal", wordWrap: "break-word", lineHeight: "1.4", padding: "6px 8px", backgroundColor: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca" }}>
                            {user.banReason}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div className="action-buttons" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          
                          <button onClick={() => openModal('warn', user)} disabled={isBanned} style={{ padding: "8px", borderRadius: "10px", border: "none", backgroundColor: isBanned ? "#f1f5f9" : "#fffbeb", color: isBanned ? "#cbd5e1" : "#d97706", cursor: isBanned ? "not-allowed" : "pointer" }} title="Ghi nhận vi phạm">
                            <AlertTriangle size={16}/>
                          </button>

                          <button onClick={() => openModal(isBanned ? 'unban' : 'ban', user)} style={{ padding: "8px", borderRadius: "10px", border: "none", backgroundColor: isBanned ? "#ecfdf5" : "#fff1f2", color: isBanned ? "#10b981" : "#ef4444", cursor: "pointer" }} title={isBanned ? "Mở khóa" : "Khóa tài khoản"}>
                            {isBanned ? <UserCheck size={16}/> : <UserX size={16}/>}
                          </button>

                          <button onClick={() => openModal('delete', user)} style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#fff", color: "#94a3b8", cursor: "pointer", border: "1px solid #e2e8f0" }} title="Xóa dữ liệu">
                            <Trash2 size={16}/>
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fafbfc" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Hiển thị <b>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</b> trên tổng <b>{filteredUsers.length}</b>
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, color: "#475569" }}><ChevronLeft size={16}/> Trước</button>
            <button disabled={currentPage === totalPages || filteredUsers.length === 0} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages || filteredUsers.length === 0 ? 0.5 : 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Sau <ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* =================== CÁC CUSTOM MODALS =================== */}
      {/* ========================================================= */}
      
      {modalState.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}>
          
          <div style={{ backgroundColor: "#fff", width: "100%", maxWidth: "450px", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            
            {/* Header Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                {modalState.type === 'ban' && <><UserX className="text-red-500" size={22}/> Khóa Tài Khoản</>}
                {modalState.type === 'unban' && <><UserCheck className="text-emerald-500" size={22}/> Mở Khóa Tài Khoản</>}
                {modalState.type === 'warn' && <><AlertTriangle className="text-amber-500" size={22}/> Ghi Nhận Vi Phạm</>}
                {modalState.type === 'delete' && <><Trash2 className="text-red-500" size={22}/> Xóa Vĩnh Viễn</>}
              </h3>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}><X size={20}/></button>
            </div>

            {/* Content Modal */}
            <div style={{ marginBottom: "24px" }}>
              
              {/* NỘI DUNG MODAL BAN */}
              {modalState.type === 'ban' && (
                <>
                  <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                    Bạn đang thực hiện vô hiệu hóa tài khoản <b>{modalState.user?.username || modalState.user?.fullName}</b>. Hành động này sẽ lập tức đăng xuất người dùng khỏi hệ thống.
                  </p>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>Lý do khóa (Bắt buộc):</label>
                    <select 
                      value={banReasonInput} 
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: "14px", outline: "none", color: "#0f172a", marginBottom: "12px", fontFamily: "inherit" }}
                    >
                      <option value="Vi phạm tiêu chuẩn cộng đồng">Vi phạm tiêu chuẩn cộng đồng</option>
                      <option value="Spam / Lừa đảo / Gian lận">Spam / Lừa đảo / Gian lận</option>
                      <option value="Phát tán nội dung độc hại">Phát tán nội dung độc hại</option>
                      <option value="Sử dụng tài khoản giả mạo">Sử dụng tài khoản giả mạo</option>
                      <option value="Khác...">Lý do khác...</option>
                    </select>
                    {banReasonInput === "Khác..." && (
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Nhập lý do cụ thể..." 
                        onChange={(e) => setBanReasonInput(e.target.value)}
                        style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* NỘI DUNG MODAL UNBAN */}
              {modalState.type === 'unban' && (
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                  Bạn có chắc chắn muốn khôi phục quyền truy cập cho tài khoản <b>{modalState.user?.username}</b>? Tài khoản này sẽ có thể đăng nhập lại vào hệ thống ngay lập tức.
                </p>
              )}

              {/* NỘI DUNG MODAL WARN */}
              {modalState.type === 'warn' && (
                <div style={{ backgroundColor: "#fffbeb", padding: "16px", borderRadius: "12px", border: "1px solid #fde68a" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#b45309", lineHeight: "1.5", fontWeight: 500 }}>
                    Ghi nhận 1 điểm vi phạm đối với <b>{modalState.user?.username}</b>.
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#d97706", lineHeight: "1.5" }}>
                    Tài khoản hiện đang có <b>{modalState.user?.warningCount || 0}/3</b> cảnh cáo. Nếu chạm mốc 3, hệ thống sẽ tự động vô hiệu hóa tài khoản này.
                  </p>
                </div>
              )}

              {/* NỘI DUNG MODAL DELETE */}
              {modalState.type === 'delete' && (
                <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#b91c1c", lineHeight: "1.5", fontWeight: 700 }}>CẢNH BÁO NGUY HIỂM</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#dc2626", lineHeight: "1.5" }}>
                    Hành động này sẽ xóa <b>VĨNH VIỄN</b> toàn bộ dữ liệu của <b>{modalState.user?.username}</b> khỏi Database. Không thể khôi phục!
                  </p>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button disabled={isProcessing} onClick={closeModal} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                Hủy bỏ
              </button>
              
              {modalState.type === 'ban' && (
                <button disabled={isProcessing} onClick={executeBanOrUnban} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#ef4444", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.2)" }}>
                  {isProcessing ? <Loader2 size={16} className="spin"/> : "Xác nhận Khóa"}
                </button>
              )}
              {modalState.type === 'unban' && (
                <button disabled={isProcessing} onClick={executeBanOrUnban} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#10b981", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}>
                  {isProcessing ? <Loader2 size={16} className="spin"/> : "Xác nhận Mở khóa"}
                </button>
              )}
              {modalState.type === 'warn' && (
                <button disabled={isProcessing} onClick={executeWarn} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#f59e0b", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.2)" }}>
                  {isProcessing ? <Loader2 size={16} className="spin"/> : "Ghi nhận Vi phạm"}
                </button>
              )}
              {modalState.type === 'delete' && (
                <button disabled={isProcessing} onClick={executeDelete} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(220, 38, 38, 0.2)" }}>
                  {isProcessing ? <Loader2 size={16} className="spin"/> : "Xóa vĩnh viễn"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      <style>{`
        .user-row:hover { background-color: #f8fafc; }
        .user-row .action-buttons { opacity: 0; transition: opacity 0.2s; }
        .user-row:hover .action-buttons { opacity: 1; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}