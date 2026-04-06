import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit, UserPlus, ShieldAlert } from 'lucide-react';

import { userService } from '../../../shared/services/userService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Gọi API Lấy danh sách tất cả user
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
 
        const data = await userService.getAllUsers(); 
        setUsers(data);
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
        // Lưu ý: Đảm bảo ông đã thêm hàm deleteUser(id) vào file userService.ts nha
        await userService.deleteUser(userId);
        
        // Cập nhật lại UI sau khi xóa thành công
        setUsers(users.filter(user => user.userId !== userId));
        alert('Đã xóa người dùng thành công!');
      } catch (error) {
        console.error('Lỗi khi xóa user:', error);
        alert('Xóa thất bại, vui lòng kiểm tra lại quyền Admin!');
      }
    }
  };

  // Logic lọc danh sách theo từ khóa (Tìm theo username hoặc email)
  const filteredUsers = users.filter(user => 
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
            <p className="text-gray-500 mt-1">Quản trị viên hệ thống</p>
          </div>
          <button className="flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm">
            <UserPlus size={18} /> Thêm người dùng
          </button>
        </div>

        {/* Bảng dữ liệu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Thanh công cụ / Tìm kiếm */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo username hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#f0f3f8] text-gray-800 rounded-xl block w-full pl-10 pr-4 py-2.5 border-none focus:ring-2 focus:ring-[#1a56db] outline-none transition-all text-sm"
              />
            </div>
            <div className="text-sm text-gray-500 font-medium px-4 py-2 bg-gray-50 rounded-lg">
              Tổng số: <span className="font-bold text-[#1a56db]">{filteredUsers.length}</span> tài khoản
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-blue-600 font-medium">Đang tải dữ liệu từ máy chủ...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
                <ShieldAlert size={32} className="text-gray-300" />
                <p>Không tìm thấy người dùng nào.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold">Người dùng</th>
                    <th className="px-6 py-4 font-semibold">Liên hệ</th>
                    <th className="px-6 py-4 font-semibold">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.avatarUrl || 'https://i.pravatar.cc/150?img=11'} 
                            alt={user.username} 
                            className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100" 
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.lastName} {user.firstName}
                            </p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-600 font-medium capitalize">
                            {user.status || 'offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-2 text-gray-400 hover:text-[#1a56db] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.userId)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={18} />
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

      </div>
    </div>
  );
};

export default UserManagement;