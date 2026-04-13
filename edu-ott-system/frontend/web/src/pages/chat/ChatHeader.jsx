import React from 'react';
import { FaPhone, FaVideo, FaEllipsisV, FaUsers, FaFileAlt } from 'react-icons/fa';

export const ChatHeader = ({ room, onCall, onVideo, onInfo }) => {
  if (!room) return null;
  const isOnline = room.isOnline; 

  return (
    <div className="flex justify-between items-center bg-white px-5 py-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden" 
            style={{ background: room.color || '#1b6ef3' }}
          >
            {room.avatar ? (
              <img src={room.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              room.initials || (room.name || '?').charAt(0).toUpperCase()
            )}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        
        <div>
          <div className="text-base font-bold text-gray-900">{room.name}</div>
          <div className="text-xs text-gray-500">
            {room.type === 'Class' ? (
              <span className="flex items-center gap-1">
                <FaUsers size={10} /> {room.memberCount ? `${room.memberCount} thành viên` : 'Đang hoạt động'}
              </span>
            ) : (
              isOnline ? <span className="text-green-600 font-medium">Đang trực tuyến</span> : 'Ngoại tuyến'
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {room.type === 'Class' && (
          <div className="flex gap-2 mr-4 border-r border-gray-200 pr-4">
            <button className="text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition">
              <FaFileAlt size={12} /> Tài liệu
            </button>
            <button className="text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition">
              <FaUsers size={12} /> Thành viên
            </button>
          </div>
        )}

        <button className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition" onClick={onCall} title="Gọi thoại">
          <FaPhone size={18} />
        </button>
        <button className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition" onClick={onVideo} title="Gọi video">
          <FaVideo size={18} />
        </button>
        <button className="text-gray-400 hover:text-gray-700 hover:bg-gray-50 p-2 rounded-full transition ml-2" onClick={onInfo} title="Tùy chọn">
          <FaEllipsisV size={18} />
        </button>
      </div>
    </div>
  );
};