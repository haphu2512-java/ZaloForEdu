import React, { useState, useEffect } from 'react';
import { User, Mail, Camera, Save, Lock } from 'lucide-react';
// TODO: Sửa lại đường dẫn này trỏ tới file userService.ts của ông
import { userService } from '../../../shared/services/userService'; 

const UserProfile = () => {
  const [profile, setProfile] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lấy thông tin user đã lưu trong localStorage lúc đăng nhập
//   const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
// Thay bằng dòng này:
const currentUser = JSON.parse(localStorage.getItem('user') || '{"userId": "user_ao_123"}');

  // 1. Gọi API GET Profile khi vào trang
  // useEffect(() => {
  //   const fetchUserProfile = async () => {
  //     if (!currentUser?.userId) {
  //       setIsLoading(false);
  //       return;
  //     }
      
  //     try {
  //       setIsLoading(true);
  //       const data = await userService.getProfile(currentUser.userId);
  //       setProfile({
  //         userId: data.userId,
  //         firstName: data.firstName || '',
  //         lastName: data.lastName || '',
  //         email: data.email || '',
  //         avatarUrl: data.avatarUrl || 'https://i.pravatar.cc/150?img=11',
  //       });
  //     } catch (error) {
  //       console.error('Lỗi khi lấy thông tin user:', error);
  //       alert('Không thể tải thông tin người dùng!');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchUserProfile();
  // }, []);

  useEffect(() => {
const fetchUserProfile = async () => {
  try {
    setIsLoading(true);
    const res = await userService.getProfile("698a046f3376d32ca9132449");
    
    // Dựa vào ảnh Console ông chụp:
    // Dữ liệu nằm ở: res.data.user
    const userData = res.data?.user;

    if (userData) {
      console.log("Tìm thấy user nè:", userData);
      
      setProfile({
        userId: userData._id || userData.id,
        firstName: userData.fullName || '', // BE dùng fullName thì mình gán vào đây
        lastName: '', // Để trống hoặc xử lý tách chuỗi nếu muốn
        email: userData.email || '',
        avatarUrl: userData.avatar || 'https://i.pravatar.cc/150?img=11',
      });
    }
  } catch (error) {
    console.error("Lỗi gán data:", error);
  } finally {
    setIsLoading(false);
  }
};
  fetchUserProfile();
}, []);
  // Xử lý khi gõ vào input
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // 2. Gọi API PUT Update Profile khi bấm lưu
  const handleSave = async () => {
    try {
      await userService.updateProfile(profile.userId, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl
      });
      
      alert('Cập nhật thông tin thành công!');
      setIsEditing(false);
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      alert('Cập nhật thất bại, vui lòng thử lại!');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-blue-600 font-medium">Đang tải dữ liệu...</div>;
  }

  // if (!currentUser?.userId) {
  //   return <div className="min-h-screen flex items-center justify-center text-red-500">Vui lòng đăng nhập để xem thông tin!</div>;
  // }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-[#1a56db] p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Hồ sơ cá nhân</h2>
          <p className="text-blue-200 text-sm mt-1">Quản lý thông tin tài khoản của bạn</p>
        </div>

        <div className="p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8 relative">
            <div className="relative">
              <img 
                src={profile.avatarUrl} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-gray-100"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-[#1a56db] text-white p-2 rounded-full hover:bg-blue-700 transition shadow-md">
                  <Camera size={16} />
                </button>
              )}
            </div>
            <h3 className="mt-3 font-bold text-xl text-gray-800">
              {profile.lastName} {profile.firstName}
            </h3>
            <span className="bg-blue-100 text-[#1a56db] text-xs font-semibold px-3 py-1 rounded-full mt-1">
              Thành viên
            </span>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Họ</label>
                <input
                  type="text"
                  name="lastName"
                  disabled={!isEditing}
                  value={profile.lastName}
                  onChange={handleChange}
                  className="bg-[#f0f3f8] text-gray-800 rounded-xl block w-full px-4 py-3 border-none focus:ring-2 focus:ring-[#1a56db] outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Tên</label>
                <input
                  type="text"
                  name="firstName"
                  disabled={!isEditing}
                  value={profile.firstName}
                  onChange={handleChange}
                  className="bg-[#f0f3f8] text-gray-800 rounded-xl block w-full px-4 py-3 border-none focus:ring-2 focus:ring-[#1a56db] outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  disabled={true} // Thường email không cho đổi tùy tiện
                  value={profile.email}
                  className="bg-[#f0f3f8] text-gray-800 rounded-xl block w-full pl-10 pr-4 py-3 border-none outline-none transition-all opacity-70 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-3">
              {!isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-[#1a56db] hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition-colors shadow-sm"
                  >
                    Chỉnh sửa thông tin
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-3 transition-colors flex items-center justify-center" title="Đổi mật khẩu">
                     <Lock size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl py-3 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1a56db] hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition-colors shadow-sm"
                  >
                    <Save size={18} /> Lưu thay đổi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;