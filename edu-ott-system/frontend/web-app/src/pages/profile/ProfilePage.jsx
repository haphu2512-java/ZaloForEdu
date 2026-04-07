import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Mail, Phone, Calendar, Briefcase, MapPin, Sparkles, User, Image as ImageIcon, Lock, Bell, Shield, Info, Edit3, Eye, EyeOff } from 'lucide-react';

import { userService } from '../../services/userService'; 
import { authService } from '../../services/authService'; 

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
    role: '',
    phoneNumber: '',
    dateOfBirth: '',
    bio: '',
    department: '',
    createdAt: '', 
    location: 'Hồ Chí Minh, VN',
    skills: 'Giao tiếp, Làm việc nhóm, Tiếng Anh'
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State quản lý việc ẩn/hiện con mắt cho từng ô nhập mật khẩu
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null); 
  const [activeTab, setActiveTab] = useState('view_profile'); 
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getProfile();
        
        let userData = null;
        if (response?.data?.data?.user) userData = response.data.data.user;
        else if (response?.data?.user) userData = response.data.user;
        else if (response?.user) userData = response.user;
        else if (response?.data) userData = response.data;
        else userData = response;

        if (userData && (userData._id || userData.email || userData.fullName)) {
          const fullName = userData.fullName || userData.firstName || '';
          const nameParts = fullName.trim().split(' ');
          const lastName = nameParts.length > 1 ? nameParts[0] : '';
          const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

          let dob = '';
          if (userData.dateOfBirth) {
             const dateObj = new Date(userData.dateOfBirth);
             if (!isNaN(dateObj)) dob = dateObj.toISOString().split('T')[0];
          }

          let joinDate = '01/2024';
          if (userData.createdAt) {
             const createdObj = new Date(userData.createdAt);
             if (!isNaN(createdObj)) {
               joinDate = `${createdObj.getMonth() + 1}/${createdObj.getFullYear()}`;
             }
          }

          setProfile(prev => ({
            ...prev,
            firstName: firstName || '',
            lastName: lastName || '',
            email: userData.email || '',
            avatarUrl: userData.avatar || userData.avatarUrl || 'https://i.pravatar.cc/150?img=11',
            role: userData.role || 'student',
            phoneNumber: userData.phoneNumber || '',
            dateOfBirth: dob,
            bio: userData.bio || '',
            department: userData.department || '',
            createdAt: joinDate
          }));
        }
      } catch (error) {
        console.error("❌ Lỗi lấy data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarFile(file);
      setProfile({ ...profile, avatarUrl: previewUrl });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const fullName = `${profile.lastName} ${profile.firstName}`.trim();
      const updateData = {
        fullName: fullName,
        phoneNumber: profile.phoneNumber,
        dateOfBirth: profile.dateOfBirth,
        bio: profile.bio,
        department: profile.department
      };

      if (avatarFile) {
        updateData.avatarFile = avatarFile;
      } else if (profile.avatarUrl?.startsWith('http')) {
        updateData.avatar = profile.avatarUrl;
      }

      const response = await userService.updateProfile(updateData);
      const updatedUser = response?.data?.user || response?.user || response?.data?.data?.user;
      if (updatedUser?.avatar) {
        setProfile((prev) => ({ ...prev, avatarUrl: updatedUser.avatar }));
      }
      setAvatarFile(null);
      alert('Cập nhật thông tin thành công!');
      setActiveTab('view_profile');
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật:', error);
      alert('Cập nhật thất bại, vui lòng kiểm tra lại!');
    }
  };

 const submitPasswordChange = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert("Vui lòng điền đầy đủ thông tin mật khẩu!");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    
    try {
      
      await authService.changePassword({
        currentPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      
      alert('Đổi mật khẩu thành công!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setActiveTab('view_profile'); 
    } catch (error) {
      console.error('❌ Lỗi đổi mật khẩu:', error.response?.data || error);
      const errorMsg = error.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ!';
      alert(errorMsg);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // --- CSS HỆ THỐNG ---
  const styles = {
    scrollWrapper: { flex: 1, height: '100vh', overflowY: 'auto', backgroundColor: '#F3F4F6', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    pageLayout: { display: 'flex', flexWrap: 'wrap', maxWidth: '1600px', margin: '0 auto', padding: '40px 40px 100px 40px', gap: '30px', alignItems: 'flex-start' },
    mainContent: { flex: '1 1 600px', minWidth: 0, backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '50px' },
    sidebar: { flexShrink: 0, width: '320px', backgroundColor: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'sticky', top: '40px' },
    
    menuGroup: { marginBottom: '24px' },
    menuTitle: { fontSize: '13px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '12px' },
    menuItem: (isActive) => ({ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', backgroundColor: isActive ? '#EEF2FF' : 'transparent', color: isActive ? '#4F46E5' : '#374151', fontWeight: isActive ? '700' : '600', transition: 'all 0.2s ease', marginBottom: '4px' }),
    menuIcon: (isActive) => ({ color: isActive ? '#4F46E5' : '#9CA3AF' }),

    headerSection: { display: 'flex', gap: '40px', marginBottom: '40px', paddingBottom: '40px', borderBottom: '2px solid #F3F4F6' },
    avatarWrapper: { flexShrink: 0, width: '160px', height: '160px', position: 'relative', cursor: activeTab === 'edit_profile' ? 'pointer' : 'default' },
    avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #F3F4F6', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
    avatarOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: activeTab === 'edit_profile' ? 1 : 0, transition: '0.2s', color: '#fff' },
    
    infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '5px' },
    usernameRow: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' },
    username: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#111827' },
    
    statsRow: { display: 'flex', gap: '40px', marginBottom: '24px', fontSize: '16px', color: '#111827' },
    statNumber: { fontWeight: '700', fontSize: '18px' },
    
    bioSection: { fontSize: '15px', lineHeight: '24px' },
    fullNameText: { fontWeight: '700', color: '#111827', display: 'block', marginBottom: '8px', fontSize: '18px' },
    categoryRow: { display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' },
    roleTag: { backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' },
    deptTag: { backgroundColor: '#F3F4F6', color: '#4B5563', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' },
    locationRow: { color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '12px', fontWeight: '500' },
    bioText: { whiteSpace: 'pre-wrap', color: '#374151' },
    skillsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' },
    skillPill: { border: '1px solid #E5E7EB', color: '#374151', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', backgroundColor: '#fff' },

    sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' },
    viewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' },
    miniCard: { backgroundColor: '#F9FAFB', padding: '24px', borderRadius: '16px', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'flex-start', gap: '16px' },
    iconWrap: { backgroundColor: '#E0E7FF', color: '#4F46E5', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    viewLabel: { fontSize: '13px', color: '#6B7280', margin: '0 0 6px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
    viewValue: { fontSize: '16px', color: '#111827', margin: 0, fontWeight: '600' },

    editGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    editLabel: { fontSize: '14px', fontWeight: '600', color: '#374151' },
    // Căn phải padding to hơn cho cái con mắt nó nằm
    editInput: { padding: '16px 45px 16px 20px', borderRadius: '12px', border: '1px solid #D1D5DB', backgroundColor: '#FAFAFA', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', color: '#111827', transition: 'border 0.2s' },
    editRow: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
    textarea: { padding: '16px 20px', borderRadius: '12px', border: '1px solid #D1D5DB', backgroundColor: '#FAFAFA', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: '120px', resize: 'vertical', color: '#111827' },
    
    actionRow: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '20px', paddingTop: '30px', borderTop: '2px solid #F3F4F6' },
    btnPrimary: { backgroundColor: '#4F46E5', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' },
    btnSecondary: { backgroundColor: '#F3F4F6', color: '#111827', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
    comingSoon: { height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: '16px' },
    
    // Style cho con mắt
    eyeIconWrap: { position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  };

  if (isLoading) {
    return <div style={{...styles.scrollWrapper, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4F46E5', fontWeight: 'bold', fontSize: '18px'}}>Đang tải dữ liệu hồ sơ...</div>;
  }

  return (
    <div style={styles.scrollWrapper}>
      <div style={styles.pageLayout}>
        
        {/* ================= CỘT TRÁI ================= */}
        <div style={styles.mainContent}>
          
          {(activeTab === 'view_profile' || activeTab === 'edit_profile') && (
            <>
              {/* HEADER INFO */}
              <div style={styles.headerSection}>
                <div 
                  style={styles.avatarWrapper} 
                  onClick={() => activeTab === 'edit_profile' && fileInputRef.current?.click()}
                >
                  <img src={profile.avatarUrl} alt="Avatar" style={styles.avatarImg} />
                  {activeTab === 'edit_profile' && (
                    <div style={styles.avatarOverlay}>
                      <Camera size={36} />
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
                </div>

                <div style={styles.infoWrapper}>
                  <div style={styles.usernameRow}>
                    <h2 style={styles.username}>{profile.lastName} {profile.firstName}</h2>
                  </div>

                  <div style={styles.statsRow}>
                    <span><span style={styles.statNumber}>12</span> nhóm</span>
                    <span><span style={styles.statNumber}>8</span> môn học</span>
                    <span>Tham gia <span style={styles.statNumber}>{profile.createdAt}</span></span>
                  </div>

                  {activeTab === 'view_profile' && (
                    <div style={styles.bioSection}>
                      <span style={styles.fullNameText}>{profile.lastName} {profile.firstName}</span>
                      <div style={styles.categoryRow}>
                        <span style={styles.roleTag}>{profile.role === 'student' ? 'Sinh viên' : profile.role}</span>
                        <span style={styles.deptTag}>{profile.department || 'Chưa cập nhật khoa'}</span>
                      </div>
                      <div style={styles.locationRow}><MapPin size={18} /> {profile.location}</div>
                      <div style={styles.bioText}>{profile.bio || 'Chưa có giới thiệu bản thân.'}</div>
                      <div style={styles.skillsRow}>
                        {profile.skills.split(',').map((skill, idx) => (
                          <span key={idx} style={styles.skillPill}>{skill.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CHI TIẾT */}
              <div>
                {activeTab === 'view_profile' ? (
                  <>
                    <h3 style={styles.sectionTitle}><Sparkles size={22} color="#4F46E5" /> Thông tin liên hệ & Cơ bản</h3>
                    <div style={styles.viewGrid}>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Mail size={24} /></div>
                        <div>
                          <p style={styles.viewLabel}>Địa chỉ Email</p>
                          <p style={styles.viewValue}>{profile.email}</p>
                        </div>
                      </div>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Phone size={24} /></div>
                        <div>
                          <p style={styles.viewLabel}>Số điện thoại</p>
                          <p style={styles.viewValue}>{profile.phoneNumber || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Calendar size={24} /></div>
                        <div>
                          <p style={styles.viewLabel}>Ngày sinh</p>
                          <p style={styles.viewValue}>{profile.dateOfBirth || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div style={styles.miniCard}>
                        <div style={styles.iconWrap}><Briefcase size={24} /></div>
                        <div>
                          <p style={styles.viewLabel}>Phòng ban / Khoa</p>
                          <p style={styles.viewValue}>{profile.department || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={styles.sectionTitle}><Edit3 size={22} color="#4F46E5" /> Cập nhật thông tin cá nhân</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div style={styles.editRow}>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Họ và tên đệm</label>
                          <input type="text" name="lastName" value={profile.lastName} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Tên</label>
                          <input type="text" name="firstName" value={profile.firstName} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                      </div>

                      <div style={styles.editRow}>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Số điện thoại</label>
                          <input type="text" name="phoneNumber" value={profile.phoneNumber} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Ngày sinh</label>
                          <input type="date" name="dateOfBirth" value={profile.dateOfBirth} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                      </div>

                      <div style={styles.editRow}>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Khoa / Phòng ban</label>
                          <input type="text" name="department" value={profile.department} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                        <div style={{ ...styles.editGroup, flex: '1 1 300px' }}>
                          <label style={styles.editLabel}>Vị trí (Location)</label>
                          <input type="text" name="location" value={profile.location} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} />
                        </div>
                      </div>

                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Kỹ năng nổi bật (Cách nhau bằng dấu phẩy)</label>
                        <input type="text" name="skills" value={profile.skills} onChange={handleChange} style={{...styles.editInput, paddingRight: '20px'}} placeholder="React, Node.js, Tiếng Anh..." />
                      </div>

                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Tiểu sử (Bio)</label>
                        <textarea name="bio" value={profile.bio} onChange={handleChange} style={styles.textarea} placeholder="Viết vài dòng giới thiệu..." />
                      </div>

                      <div style={styles.actionRow}>
                        <button onClick={() => { setAvatarFile(null); setActiveTab('view_profile'); }} style={styles.btnSecondary}>Hủy bỏ</button>
                        <button onClick={handleSaveProfile} style={styles.btnPrimary}><Save size={20} /> Lưu thay đổi</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* TAB: MẬT KHẨU CÓ CHỨC NĂNG ẨN/HIỆN (MẮT) */}
          {activeTab === 'password' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
              <h3 style={{...styles.sectionTitle, fontSize: '24px', marginBottom: '32px'}}><Lock size={28} color="#4F46E5" /> Đổi mật khẩu</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={styles.editGroup}>
                  <label style={styles.editLabel}>Mật khẩu hiện tại</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword.old ? "text" : "password"} 
                      name="oldPassword" 
                      value={passwordForm.oldPassword} 
                      onChange={handlePasswordChange} 
                      style={styles.editInput} 
                      placeholder="Nhập mật khẩu hiện tại" 
                    />
                    <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('old')}>
                      {showPassword.old ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                  </div>
                </div>
                
                <div style={styles.editGroup}>
                  <label style={styles.editLabel}>Mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword.new ? "text" : "password"} 
                      name="newPassword" 
                      value={passwordForm.newPassword} 
                      onChange={handlePasswordChange} 
                      style={styles.editInput} 
                      placeholder="Nhập mật khẩu mới" 
                    />
                    <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('new')}>
                      {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                  </div>
                </div>
                
                <div style={styles.editGroup}>
                  <label style={styles.editLabel}>Xác nhận mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword.confirm ? "text" : "password"} 
                      name="confirmPassword" 
                      value={passwordForm.confirmPassword} 
                      onChange={handlePasswordChange} 
                      style={styles.editInput} 
                      placeholder="Nhập lại mật khẩu mới" 
                    />
                    <div style={styles.eyeIconWrap} onClick={() => togglePasswordVisibility('confirm')}>
                      {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                  </div>
                </div>
                
                <div style={{...styles.actionRow, marginTop: '10px'}}>
                  <button onClick={submitPasswordChange} style={styles.btnPrimary}><Shield size={20} /> Xác nhận đổi mật khẩu</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={styles.comingSoon}>
              <Bell size={64} opacity={0.2} />
              <h2>Thông báo</h2>
              <p>Chưa có thông báo nào mới.</p>
            </div>
          )}

          {(activeTab === 'privacy' || activeTab === 'about') && (
            <div style={styles.comingSoon}>
              <h2>Đang xây dựng...</h2>
            </div>
          )}

        </div>

        {/* ================= CỘT PHẢI: MENU SETTINGS ================= */}
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
              <div style={{fontSize: '15px'}}>Về ứng dụng</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
