import React from 'react';
import { FaSchool, FaUser } from 'react-icons/fa';

export const ChatListItem = ({ room, active, onClick }) => {
  const isUnread = room.unreadCount > 0;
  const isOnline = room.isOnline; // Giả sử backend trả về field này
  const isActiveAccount = room.isActive !== false; // Check tài khoản vô hiệu hóa

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 border-r-4 ${
        active 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : 'hover:bg-gray-50 border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div 
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm ${!isActiveAccount ? 'opacity-40 grayscale' : ''}`} 
          style={{ backgroundColor: room.color || '#6366f1' }}
        >
          {room.avatar ? (
            <img src={room.avatar} alt="avt" className="w-full h-full object-cover" />
          ) : (
            /* FIX LỖI CHAR AT TẠI ĐÂY */
            (room?.name || '?').charAt(0).toUpperCase()
          )}
        </div>

        {/* Chấm Online */}
        {isOnline && isActiveAccount && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
        )}

        {/* Icon Badge Model */}
        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white shadow-sm z-0 ${
          room.roomModel === 'Class' ? 'bg-yellow-500' : 'bg-green-500'
        }`}>
          {room.roomModel === 'Class' ? (
            <FaSchool size={8} color="white" />
          ) : (
            <FaUser size={8} color="white" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h4 className={`text-[13.5px] truncate flex-1 ${
            isUnread ? 'font-bold text-black' : 'font-semibold text-gray-700'
          }`}>
            {room?.name || 'Người dùng ẩn danh'}
          </h4>
          
          {/* Tag vô hiệu hóa */}
          {!isActiveAccount && (
            <span className="text-[10px] text-red-500 font-bold ml-1 mr-1 flex-shrink-0">
              VÔ HIỆU HÓA
            </span>
          )}

          <span className={`text-[10px] flex-shrink-0 ${
            isUnread ? 'text-blue-600 font-bold' : 'text-gray-400'
          }`}>
            {room.time || room.updatedAt 
              ? new Date(room.time || room.updatedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) 
              : ''}
          </span>
        </div>

        <p className={`text-xs truncate transition-colors ${
          isUnread 
            ? 'font-bold text-blue-600 opacity-100' 
            : 'text-gray-400 font-normal opacity-80'
        }`}>
          {room.lastMessage || 'Chưa có tin nhắn'}
        </p>
      </div>

      {isUnread && (
        <div className="bg-blue-600 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 shadow-sm animate-in fade-in zoom-in">
          {room.unreadCount > 99 ? '99+' : room.unreadCount}
        </div>
      )}
    </div>
  );
};