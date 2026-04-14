import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPhone, FaVideo, FaEllipsisV, FaUsers, FaFileAlt } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socketService';
// THÊM: Import hook useTheme của bạn
import { useTheme } from '../../contexts/ThemeContext';

export const ChatHeader = ({ room, onCall, onVideo, onInfo }) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  
  // Lấy theme hiện tại từ Context
  const { appliedTheme } = useTheme();
  const isDark = appliedTheme === 'dark';

  if (!room) return null;

  const isOnline = room.isOnline;
  const isClass = room.type?.toLowerCase() === 'class' || room.roomModel === 'Class';

  const handleCallClick = (type) => {
    const myId = currentUser?._id || currentUser?.id;

    const targetUserId =
      room.targetUserId ||
      room.friendId ||
      room.otherUserId ||
      room.participantId;

    if (!myId || !targetUserId) {
      alert('Không tìm thấy thông tin người nhận.');
      return;
    }

    const roomId = `room_${myId}_${targetUserId}`;

    // FIX: Đã xóa cái check isConnected() ảo ma ở đây.
    // Cứ gọi thẳng giống hệt cách bên ContactsPage đang làm.
    const sent = socketService.callUser({
      targetUserId,
      roomId,
      callerName: currentUser?.username || "Bạn",
      type,
    });

    if (!sent) {
      alert('Mất kết nối realtime, vui lòng thử lại.');
      return;
    }

    const url = type === "audio" ? `/call/${roomId}?type=voice` : `/call/${roomId}`;
    navigate(url);
  };

  const handleCall = (type) => {
    if (type === 'audio' && onCall) return onCall();
    if (type === 'video' && onVideo) return onVideo();
    return handleCallClick(type);
  };

  // Các class CSS thay đổi dựa trên theme (sáng/tối)
  const headerBg = isDark ? 'bg-[#242526] border-gray-700' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const iconBgHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <div className={`flex justify-between items-center px-6 py-4 border-b ${headerBg} transition-colors duration-200`}>
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Tăng kích thước Avatar lên w-12 h-12 */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-sm"
            style={{ background: room.color || '#1b6ef3' }}
          >
            {room.avatar ? (
              <img
                src={room.avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              (room.name?.[0] || '?').toUpperCase()
            )}
          </div>

          {isOnline && !isClass && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        <div>
          {/* Tăng kích thước Text Tên */}
          <div className={`text-lg font-bold ${textColor}`}>
            {room.name}
          </div>

          <div className={`text-sm ${subTextColor}`}>
            {isClass ? (
              <span className="flex items-center gap-1.5 mt-0.5">
                <FaUsers size={12} />
                {room.memberCount
                  ? `${room.memberCount} thành viên`
                  : 'Đang hoạt động'}
              </span>
            ) : isOnline ? (
              <span className="text-green-500 font-medium mt-0.5 inline-block">
                Đang trực tuyến
              </span>
            ) : (
              <span className="mt-0.5 inline-block">Ngoại tuyến</span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {isClass && (
          <div className={`flex gap-3 mr-4 border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} pr-5`}>
            <button className={`text-sm font-semibold ${subTextColor} hover:text-blue-500 flex items-center gap-1.5 px-3 py-1.5 rounded ${iconBgHover} transition`}>
              <FaFileAlt size={14} /> Tài liệu
            </button>
            <button className={`text-sm font-semibold ${subTextColor} hover:text-blue-500 flex items-center gap-1.5 px-3 py-1.5 rounded ${iconBgHover} transition`}>
              <FaUsers size={14} /> Thành viên
            </button>
          </div>
        )}

        {!isClass && (
          <>
            <button
              className={`text-blue-500 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-blue-50'} p-2.5 rounded-full transition`}
              onClick={() => handleCall('audio')}
              title="Gọi thoại"
            >
              <FaPhone size={20} />
            </button>

            <button
              className={`text-blue-500 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-blue-50'} p-2.5 rounded-full transition`}
              onClick={() => handleCall('video')}
              title="Gọi video"
            >
              <FaVideo size={20} />
            </button>
          </>
        )}

        <button
          className={`${subTextColor} hover:text-blue-500 ${iconBgHover} p-2.5 rounded-full transition ml-2`}
          onClick={onInfo}
          title="Tùy chọn"
        >
          <FaEllipsisV size={20} />
        </button>
      </div>
    </div>
  );
};