import React, { useState, useEffect, useRef } from 'react';


import { Camera, Save, Mail, Phone, Sparkles, User, Image as ImageIcon, Lock, Bell, Shield, Info, Edit3, Eye, EyeOff, Users, Circle, Trash2, AlertTriangle, X, CheckCircle, ShieldAlert, LogOut } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { userService } from '../../services/userService'; 
import { authService } from '../../services/authService'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Thuật toán kiểm tra độ mạnh mật khẩu chuẩn Regex (Hoa, thường, số, ký tự đặc biệt)
const getStrength = (pw) => {
  if (!pw) return null;
  
  let score = 0;
  if (/[A-Z]/.test(pw)) score += 1; // Có chữ hoa
  if (/[a-z]/.test(pw)) score += 1; // Có chữ thường
  if (/[0-9]/.test(pw)) score += 1; // Có số
  if (/[^A-Za-z0-9]/.test(pw)) score += 1; // Có ký tự đặc biệt (VD: @, #, $, ...)
  if (pw.length >= 8) score += 1; // Khuyến khích dài hơn 8 ký tự

  // Theo chuẩn Backend, mật khẩu phải >= 6 ký tự
  if (pw.length < 6) return "weak";
  
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState({
    id: '',
    username: '',
    email: '',
    phone: '',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
    createdAt: '',
    friends: [],
    isOnline: true
  });

  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null); 
  const [activeTab, setActiveTab] = useState('view_profile'); 
  const [avatarFile, setAvatarFile] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // OTP verification modal state
  const [otpModal, setOtpModal] = useState(null); // { type: 'phone'|'email', contact: string }
  const [otpDigits, setOtpDigits] = useState(['','','','','','']);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [verifiedContacts, setVerifiedContacts] = useState({ email: true, phone: true });
  const otpInputRefs = useRef([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getProfile();
        
        const userData = response?.data?.data?.user || response?.data?.user || response?.user || response?.data || response;

        if (userData) {
          let joinDate = '01/2024';
          if (userData.createdAt) {
             const createdObj = new Date(userData.createdAt);
             if (!isNaN(createdObj)) joinDate = `${createdObj.getMonth() + 1}/${createdObj.getFullYear()}`;
          }

          setProfile({
            id: userData._id || userData.id || '',
            username: userData.username || userData.fullName || '', 
            email: userData.email || '',
            phone: userData.phone || userData.phoneNumber || '',
            avatarUrl: userData.avatarUrl || userData.avatar || 'https://i.pravatar.cc/150?img=11',
            createdAt: joinDate,
            friends: userData.friends || [],
            isOnline: true
          });
          setVerifiedContacts({
            email: userData.isEmailVerified !== false,
            phone: userData.isPhoneVerified !== false,
          });
        }
      } catch (error) {
        console.error("Lỗi lấy data profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setProfile({ ...profile, avatarUrl: URL.createObjectURL(file) });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      const userId = profile.id;
      if (!userId) {
        alert("Lỗi: Không tìm thấy ID User. Vui lòng F5 lại trang!");
        setIsSaving(false);
        return;
      }

      let finalAvatarUrl = profile.avatarUrl;

      if (avatarFile) {
        try {
          const uploadRes = await userService.uploadAvatar(avatarFile);
          // uploadRes.url trả về URL tuyệt đối từ Cloudinary
          finalAvatarUrl = uploadRes.url || profile.avatarUrl;
        } catch (err) {
          console.error("Lỗi upload ảnh:", err);
          alert("Tải ảnh lên thất bại. Hệ thống hủy cập nhật để tránh lỗi dữ liệu!");
          setIsSaving(false); 
          return; 
        }
      }

      const updateData = {};
      if (profile.username) updateData.username = profile.username.trim();

      if (profile.phone && profile.phone.trim().length >= 8) {
        updateData.phone = profile.phone.trim();
      } else {
        updateData.phone = null;
      }
      if (profile.email && profile.email.trim() !== '') {
        updateData.email = profile.email.trim();
      } else {
        updateData.email = null;
      }
      // Lưu avatarUrl nếu có (bất kể relative hay absolute — đã convert ở trên)
      updateData.avatarUrl = finalAvatarUrl || null;

      const response = await userService.updateProfile(userId, updateData);
      
      const resData = response?.data?.data || response?.data || response;
      const updatedUser = resData?.user || resData;
      const requiresPhoneVerification = resData?.requiresPhoneVerification;
      const requiresEmailVerification = resData?.requiresEmailVerification;

      if (updatedUser) {
        setProfile((prev) => ({ 
          ...prev, 
          avatarUrl: updatedUser.avatarUrl || prev.avatarUrl,
          username: updatedUser.username || prev.username,
          phone: updatedUser.phone || prev.phone,
          email: updatedUser.email !== undefined ? updatedUser.email : prev.email
        }));
        setVerifiedContacts({
          email: updatedUser.isEmailVerified !== false,
          phone: updatedUser.isPhoneVerified !== false,
        });
      }
      
      setAvatarFile(null);
      setActiveTab('view_profile');

      // Mở modal OTP nếu cần xác thực contact mới
      if (requiresPhoneVerification && updateData.phone) {
        setOtpDigits(['','','','','','']);
        setOtpError('');
        setOtpModal({ type: 'phone', contact: updateData.phone });
      } else if (requiresEmailVerification && updateData.email) {
        setOtpDigits(['','','','','','']);
        setOtpError('');
        setOtpModal({ type: 'email', contact: updateData.email });
      } else {
        alert('Cập nhật thông tin thành công!');
      }
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      alert('Cập nhật thất bại, kiểm tra lại số điện thoại (nếu có thì phải đủ 8 số) nhé!');
    } finally {
      setIsSaving(false);
    }
  };

  // ── OTP verification handlers ──
  const handleOtpDigitChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    const next = [...otpDigits];
    next[i] = v;
    setOtpDigits(next);
    setOtpError('');
    if (v && i < 5) otpInputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpInputRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpInputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleOtpSubmit = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) { setOtpError('Vui lòng nhập đủ 6 chữ số'); return; }
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    try {
      setOtpVerifying(true);
      const payload = { token: otp };
      if (otpModal.type === 'phone') payload.phone = otpModal.contact;
      else payload.email = otpModal.contact;
      await axios.post(`${API_BASE_URL}/auth/verify-otp`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setVerifiedContacts(prev => ({ ...prev, [otpModal.type]: true }));
      setOtpModal(null);
      alert(`Xác thực ${otpModal.type === 'phone' ? 'số điện thoại' : 'email'} thành công! Bạn có thể đăng nhập bằng ${otpModal.type === 'phone' ? 'SĐT' : 'email'} này.`);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn');
      setOtpDigits(['','','','','','']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setOtpVerifying(false);
    }
  };

  // Mở modal + tự gửi OTP mới (dùng khi click "Xác thực ngay" từ view)
  const openOtpModal = async (type, contact) => {
    setOtpDigits(['','','','','','']);
    setOtpError('');
    setOtpModal({ type, contact });
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    try {
      const payload = type === 'phone' ? { phone: contact } : { email: contact };
      await axios.post(`${API_BASE_URL}/auth/resend-otp`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      // Nếu OTP cũ còn hạn cooldown → báo lỗi nhẹ, không đóng modal
      const msg = err.response?.data?.message || '';
      if (msg) setOtpError(msg);
    }
  };

  const submitPasswordChange = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      return alert("Vui lòng điền đầy đủ thông tin mật khẩu!");
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("Mật khẩu xác nhận không khớp!");
    }
    
    try {
      // Đã gỡ bỏ lệnh chặn độ dài thủ công ở Frontend để API thực hiện trọn vẹn luồng
      await authService.changePassword({ 
        currentPassword: passwordForm.oldPassword, 
        newPassword: passwordForm.newPassword 
      });
      
      alert('Đổi mật khẩu thành công!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setActiveTab('view_profile'); 
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      alert(error.response?.data?.message || 'Đổi mật khẩu thất bại! Vui lòng kiểm tra lại mật khẩu hiện tại.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert("Vui lòng nhập mật khẩu để xác nhận!");
      return;
    }

    try {
      setIsDeleting(true);
      await userService.deleteUser(profile.id, { password: deletePassword });
      
      alert("Tài khoản của bạn đã được xóa thành công.");
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error("Lỗi xóa tài khoản:", error);
      alert(error.response?.data?.message || "Xóa tài khoản thất bại. Sai mật khẩu hoặc lỗi hệ thống!");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword("");
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
      // Dispatch logout event for ThemeContext
      window.dispatchEvent(new Event('user-logout'));
      navigate('/login');
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất trên tất cả thiết bị?')) {
      return;
    }
    
    try {
      await authService.logoutAll();
      alert('Đã đăng xuất trên tất cả thiết bị thành công!');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
      // Dispatch logout event for ThemeContext
      window.dispatchEvent(new Event('user-logout'));
      navigate('/login');
    } catch (error) {
      console.error('Lỗi đăng xuất tất cả thiết bị:', error);
      alert(error.response?.data?.message || 'Đăng xuất thất bại!');
    }
  };

  const togglePasswordVisibility = (field) => setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));

  // Khởi tạo các giá trị cho thanh đo độ mạnh mật khẩu
  const strength = getStrength(passwordForm.newPassword);
  const getStrengthColor = () => {
    if (strength === 'weak') return '#EF4444'; // Đỏ
    if (strength === 'medium') return '#F59E0B'; // Vàng cam
    if (strength === 'strong') return '#10B981'; // Xanh lá
    return '#E2E8F0'; // Xám mặc định
  };
  const activeBars = { weak: 1, medium: 2, strong: 3 }[strength] || 0;

  // --- UI STYLES ---
  const styles = {
    scrollWrapper: { flex: 1, height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    pageLayout: { display: 'flex', flexWrap: 'wrap', maxWidth: '1600px', margin: '0 auto', padding: '40px 40px 100px 40px', gap: '30px', alignItems: 'flex-start' },
    mainContent: { flex: '1 1 600px', minWidth: 0, backgroundColor: 'var(--bg-primary)', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '50px' },
    sidebar: { flexShrink: 0, width: '320px', backgroundColor: 'var(--bg-primary)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'sticky', top: '40px' },
    
    menuGroup: { marginBottom: '24px' },
    menuTitle: { fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '12px' },
    menuItem: (isActive, isDanger = false) => ({ 
      display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', 
      backgroundColor: isActive ? (isDanger ? '#FEE2E2' : 'var(--primary-light)') : 'transparent', 
      color: isDanger ? '#DC2626' : (isActive ? 'var(--primary-color)' : 'var(--text-primary)'), 
      fontWeight: isActive ? '700' : '600', transition: 'all 0.2s ease', marginBottom: '4px' 
    }),
    menuIcon: (isActive, isDanger = false) => ({ color: isDanger ? '#DC2626' : (isActive ? 'var(--primary-color)' : 'var(--text-tertiary)') }),

    headerSection: { display: 'flex', gap: '40px', marginBottom: '40px', paddingBottom: '40px', borderBottom: '2px solid var(--border-color)' },
    avatarWrapper: { flexShrink: 0, width: '160px', height: '160px', position: 'relative', cursor: activeTab === 'edit_profile' ? 'pointer' : 'default' },
    avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-color)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
    avatarOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: activeTab === 'edit_profile' ? 1 : 0, transition: '0.2s', color: 'white' },
    
    infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '15px' },
    usernameRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' },
    username: { fontSize: '28px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' },
    statusBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#DCFCE7', color: '#16A34A' },
    
    statsRow: { display: 'flex', gap: '40px', marginBottom: '24px', fontSize: '16px', color: 'var(--text-primary)' },
    statNumber: { fontWeight: '700', fontSize: '18px' },

    sectionTitle: { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' },
    viewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' },
    miniCard: { backgroundColor: 'var(--input-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' },
    iconWrap: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    viewLabel: { fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 6px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
    viewValue: { fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' },

    editGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' },
    editLabel: { fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' },
    editInput: { padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', color: 'var(--text-primary)', transition: 'border 0.2s' },
    
    actionRow: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '30px', paddingTop: '30px', borderTop: '2px solid var(--border-color)' },
    btnPrimary: { backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', opacity: isSaving ? 0.7 : 1 },
    btnSecondary: { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
    btnDanger: { backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isDeleting ? 0.7 : 1 },
    comingSoon: { height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: '16px' },
    eyeIconWrap: { position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    friendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' },
    friendCard: { backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' },

    strengthContainer: { display: 'flex', gap: '4px', marginTop: '8px', alignItems: 'center' },
    strengthBar: (isActive) => ({ height: '4px', flex: 1, borderRadius: '2px', backgroundColor: isActive ? getStrengthColor() : '#E2E8F0', transition: '0.3s' }),
    strengthLabel: { fontSize: '12px', fontWeight: '600', marginLeft: '8px', minWidth: '70px', color: getStrengthColor() },

    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'var(--bg-primary)', padding: '32px', borderRadius: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    modalTitle: { display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626', fontSize: '20px', fontWeight: '700', marginBottom: '16px' },
    modalText: { color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '22px', marginBottom: '24px' }
  };

  if (isLoading) return <div style={{...styles.scrollWrapper, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4F46E5', fontWeight: 'bold', fontSize: '18px'}}>Đang tải dữ liệu hồ sơ...</div>;

  return (
    <div style={styles.scrollWrapper}>
      <div style={styles.pageLayout}>
        
        <div style={styles.mainContent}>
          
          {(activeTab === 'view_profile' || activeTab === 'edit_profile') && (
            <>
              <div style={styles.headerSection}>
                <div style={styles.avatarWrapper} onClick={() => activeTab === 'edit_profile' && fileInputRef.current?.click()}>
                  <img src={profile.avatarUrl} alt="Avatar" style={styles.avatarImg} />
                  {activeTab === 'edit_profile' && <div style={styles.avatarOverlay}><Camera size={36} /></div>}
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
                </div>
                <div style={styles.infoWrapper}>
                  <div style={styles.usernameRow}>
                    <h2 style={styles.username}>{profile.username || 'Chưa cập nhật tên'}</h2>
                    <span style={styles.statusBadge}>
                      <Circle size={10} fill="currentColor" /> Đang hoạt động
                    </span>
                  </div>
                  <div style={styles.statsRow}>
                    <span><span style={styles.statNumber}>{profile.friends?.length || 0}</span> Bạn bè</span>
                    <span>Tham gia từ <span style={styles.statNumber}>{profile.createdAt}</span></span>
                  </div>
                </div>
              </div>

              <div>
                {activeTab === 'view_profile' ? (
                  <>
                    <h3 style={styles.sectionTitle}><Sparkles size={22} color="#4F46E5" /> Thông tin liên hệ</h3>
                    <div style={styles.viewGrid}>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><User size={24} /></div>
                        <div>
                          <p style={styles.viewLabel}>Tên hiển thị</p>
                          <p style={styles.viewValue}>{profile.username || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Phone size={24} /></div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.viewLabel}>Số điện thoại</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ ...styles.viewValue, margin: 0 }}>{profile.phone || 'Chưa cập nhật'}</p>
                            {profile.phone && (
                              verifiedContacts.phone
                                ? <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#16a34a', fontWeight:600 }}><CheckCircle size={13}/> Đã xác thực</span>
                                : <button onClick={() => openOtpModal('phone', profile.phone)} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#f59e0b', fontWeight:700, background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'2px 8px', cursor:'pointer' }}><ShieldAlert size={13}/> Xác thực ngay</button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Mail size={24} /></div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.viewLabel}>Email</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ ...styles.viewValue, margin: 0 }}>{profile.email || 'Chưa cập nhật'}</p>
                            {profile.email && (
                              verifiedContacts.email
                                ? <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#16a34a', fontWeight:600 }}><CheckCircle size={13}/> Đã xác thực</span>
                                : <button onClick={() => openOtpModal('email', profile.email)} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#f59e0b', fontWeight:700, background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'2px 8px', cursor:'pointer' }}><ShieldAlert size={13}/> Xác thực ngay</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={styles.sectionTitle}><Edit3 size={22} color="#4F46E5" /> Cập nhật thông tin</h3>
                    <div>
                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Tên hiển thị (Username / FullName)</label>
                        <input type="text" name="username" value={profile.username} onChange={handleChange} style={styles.editInput} placeholder="Nhập tên hiển thị..." />
                      </div>
                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Số điện thoại</label>
                        <input type="text" name="phone" value={profile.phone} onChange={handleChange} style={styles.editInput} placeholder="Nhập số điện thoại..." />
                      </div>
                      <div style={styles.editGroup}>
                      <label style={styles.editLabel}>Email</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={profile.email} 
                        onChange={handleChange} 
                        style={styles.editInput} 
                        placeholder="Nhập email..." 
                      />
                    </div>

                      <div style={styles.actionRow}>
                        <button onClick={() => { setAvatarFile(null); setActiveTab('view_profile'); }} style={styles.btnSecondary} disabled={isSaving}>Hủy bỏ</button>
                        <button onClick={handleSaveProfile} style={styles.btnPrimary} disabled={isSaving}>
                          <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === 'friends' && (
            <div>
              <h3 style={styles.sectionTitle}><Users size={24} color="#4F46E5" /> Danh sách bạn bè ({profile.friends?.length || 0})</h3>
              {profile.friends && profile.friends.length > 0 ? (
                <div style={styles.friendGrid}>
                  {profile.friends.map((friend, idx) => {
                    const isObj = typeof friend === 'object' && friend !== null;
                    const fName = isObj ? (friend.username || friend.fullName || 'Người dùng Zalo') : 'Người dùng ẩn danh';
                    const fAva = isObj ? (friend.avatarUrl || friend.avatar || 'https://i.pravatar.cc/150?img=11') : 'https://i.pravatar.cc/150?img=11';
                    
                    return (
                      <div key={idx} style={styles.friendCard}>
                        <img src={fAva} alt="friend" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: '2px solid var(--border-color)' }} />
                        <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', textAlign: 'center' }}>{fName}</span>
                        {isObj && friend.email && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{friend.email}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.comingSoon}>
                  <Users size={64} opacity={0.2} />
                  <h3>Chưa có bạn bè</h3>
                  <p>Hãy kết bạn thêm để trò chuyện nhé!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
             <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
              <h3 style={{...styles.sectionTitle, fontSize: '24px', marginBottom: '32px'}}><Lock size={28} color="#4F46E5" /> Đổi mật khẩu</h3>
              
              <div style={styles.editGroup}>
                <label style={styles.editLabel}>Mật khẩu hiện tại</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.old ? "text" : "password"} name="oldPassword" value={passwordForm.oldPassword} onChange={handlePasswordChange} style={styles.editInput} />
                  <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('old')}>{showPassword.old ? <EyeOff size={20} /> : <Eye size={20} />}</div>
                </div>
              </div>

              <div style={styles.editGroup}>
                <label style={styles.editLabel}>Mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.new ? "text" : "password"} name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} style={styles.editInput} placeholder="Tối thiểu 6 ký tự" />
                  <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('new')}>{showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}</div>
                </div>
                
                {/* THANH ĐO ĐỘ MẠNH CHUẨN XÁC THEO SỐ LƯỢNG VẠCH */}
                {passwordForm.newPassword && (
                  <div style={styles.strengthContainer}>
                    {[1, 2, 3].map((num) => (
                      <div key={num} style={styles.strengthBar(num <= activeBars)} />
                    ))}
                    <span style={styles.strengthLabel}>
                      {strength === "weak" ? "Yếu" : strength === "medium" ? "Trung bình" : "Mạnh"}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.editGroup}>
                <label style={styles.editLabel}>Xác nhận mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.confirm ? "text" : "password"} name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} style={styles.editInput} />
                  <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('confirm')}>{showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}</div>
                </div>
              </div>
              
              <div style={styles.actionRow}>
                <button onClick={submitPasswordChange} style={styles.btnPrimary}><Shield size={20} style={{marginRight:'8px'}}/> Xác nhận đổi mật khẩu</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={styles.comingSoon}>
              <Bell size={64} opacity={0.2} />
              <h2>Thông báo</h2>
              <p>Xem thông báo ở góc trên bên phải (biểu tượng chuông).</p>
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h3 style={styles.sectionTitle}><Info size={22} color="#4F46E5" /> Về hệ thống</h3>
              <div style={styles.viewGrid}>
                <div style={styles.miniCard}>
                  <div style={styles.iconWrap}><Info size={24} /></div>
                  <div>
                    <p style={styles.viewLabel}>Tên ứng dụng</p>
                    <p style={styles.viewValue}>Zalo Edu Web</p>
                  </div>
                </div>
                <div style={styles.miniCard}>
                  <div style={styles.iconWrap}><Info size={24} /></div>
                  <div>
                    <p style={styles.viewLabel}>Phiên bản</p>
                    <p style={styles.viewValue}>1.0.0</p>
                  </div>
                </div>
                <div style={styles.miniCard}>
                  <div style={styles.iconWrap}><Info size={24} /></div>
                  <div>
                    <p style={styles.viewLabel}>Năm phát hành</p>
                    <p style={styles.viewValue}>2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={styles.comingSoon}>
              <h2>Đang xây dựng...</h2>
              <p>Tính năng này sẽ sớm ra mắt.</p>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          <div style={styles.menuGroup}>
            <div style={styles.menuTitle}>Tài khoản</div>
            <div style={styles.menuItem(activeTab === 'view_profile')} onClick={() => setActiveTab('view_profile')}>
              <User size={22} style={styles.menuIcon(activeTab === 'view_profile')} />
              <div style={{fontSize: '15px'}}>Hồ sơ của tôi</div>
            </div>
            <div style={styles.menuItem(activeTab === 'edit_profile')} onClick={() => setActiveTab('edit_profile')}>
              <Edit3 size={22} style={styles.menuIcon(activeTab === 'edit_profile')} />
              <div style={{fontSize: '15px'}}>Chỉnh sửa hồ sơ</div>
            </div>
            <div style={styles.menuItem(false)} onClick={() => { setActiveTab('edit_profile'); setTimeout(() => fileInputRef.current?.click(), 100); }}>
              <ImageIcon size={22} style={styles.menuIcon(false)} />
              <div style={{fontSize: '15px'}}>Đổi ảnh đại diện</div>
            </div>
            <div style={styles.menuItem(activeTab === 'password')} onClick={() => setActiveTab('password')}>
              <Lock size={22} style={styles.menuIcon(activeTab === 'password')} />
              <div style={{fontSize: '15px'}}>Đổi mật khẩu</div>
            </div>
          </div>

          <div style={styles.menuGroup}>
            <div style={styles.menuTitle}>Khác</div>
            <div style={styles.menuItem(activeTab === 'friends')} onClick={() => setActiveTab('friends')}>
              <Users size={22} style={styles.menuIcon(activeTab === 'friends')} />
              <div style={{fontSize: '15px'}}>Danh sách bạn bè</div>
            </div>
            <div style={styles.menuItem(activeTab === 'notifications')} onClick={() => setActiveTab('notifications')}>
              <Bell size={22} style={styles.menuIcon(activeTab === 'notifications')} />
              <div style={{fontSize: '15px'}}>Thông báo</div>
            </div>
            <div style={styles.menuItem(activeTab === 'privacy')} onClick={() => setActiveTab('privacy')}>
              <Shield size={22} style={styles.menuIcon(activeTab === 'privacy')} />
              <div style={{fontSize: '15px'}}>Quyền riêng tư</div>
            </div>
            <div style={styles.menuItem(activeTab === 'about')} onClick={() => setActiveTab('about')}>
              <Info size={22} style={styles.menuIcon(activeTab === 'about')} />
              <div style={{fontSize: '15px'}}>Về hệ thống</div>
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <div style={styles.menuItem(false)} onClick={handleLogout}>
                <LogOut size={22} style={styles.menuIcon(false)} />
                <div style={{fontSize: '15px'}}>Đăng xuất</div>
              </div>
              <div style={styles.menuItem(false)} onClick={handleLogoutAll}>
                <LogOut size={22} style={styles.menuIcon(false)} />
                <div style={{fontSize: '15px'}}>Đăng xuất tất cả thiết bị</div>
              </div>
              <div style={styles.menuItem(false, true)} onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={22} style={styles.menuIcon(false, true)} />
                <div style={{fontSize: '15px'}}>Xóa tài khoản</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={styles.modalTitle}><AlertTriangle size={24} /> Xóa tài khoản</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={styles.modalText}>
              Hành động này không thể hoàn tác. Mọi dữ liệu của bạn bao gồm bạn bè, tin nhắn sẽ bị xóa vĩnh viễn. Vui lòng nhập mật khẩu để xác nhận.
            </p>

            <div style={{...styles.editGroup, marginBottom: '24px'}}>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword.confirm ? "text" : "password"} 
                  value={deletePassword} 
                  onChange={(e) => setDeletePassword(e.target.value)} 
                  style={{...styles.editInput, borderColor: '#DC2626'}} 
                  placeholder="Nhập mật khẩu của bạn" 
                />
                <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('confirm')}>
                  {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteModal(false)} style={styles.btnSecondary} disabled={isDeleting}>Hủy</button>
              <button onClick={handleDeleteAccount} style={styles.btnDanger} disabled={isDeleting}>
                {isDeleting ? 'Đang xử lý...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── OTP VERIFY MODAL ── */}
      {otpModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ ...styles.modalTitle, color: '#4F46E5', margin: 0, fontSize: 18 }}>
                <ShieldAlert size={22} style={{ marginRight: 8 }} />
                Xác thực {otpModal.type === 'phone' ? 'Số điện thoại' : 'Email'}
              </h3>
              <button onClick={() => setOtpModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ ...styles.modalText, marginBottom: 20, fontSize: 14 }}>
              Mã OTP đã được gửi đến <strong>{otpModal.contact}</strong>.
              {otpModal.type === 'phone' && (
                <span style={{ display: 'block', marginTop: 6, color: '#3b82f6', fontSize: 12 }}>
                  💡 Xem mã OTP ở Terminal Backend (màn hình đang chạy server)
                </span>
              )}
            </p>

            {otpError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: 16, fontSize: 13 }}>
                {otpError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }} onPaste={handleOtpPaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpInputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{ width: 46, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700, borderRadius: 12, border: `1.5px solid ${otpError ? '#ef4444' : 'var(--border-color)'}`, background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setOtpModal(null)} style={styles.btnSecondary} disabled={otpVerifying}>Hủy</button>
              <button onClick={handleOtpSubmit} style={{ ...styles.btnPrimary, opacity: otpVerifying ? 0.7 : 1 }} disabled={otpVerifying}>
                {otpVerifying ? 'Đang xác thực...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}