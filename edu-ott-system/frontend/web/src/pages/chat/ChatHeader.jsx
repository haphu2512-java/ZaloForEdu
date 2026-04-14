import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPhone, FaVideo, FaEllipsisV, FaUsers, FaFileAlt } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socketService';

export const ChatHeader = ({ room, onCall, onVideo, onInfo }) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  if (!room) return null;

  const isOnline = room.isOnline;
  const isClass = room.type?.toLowerCase() === 'class';


  const handleCallClick = (type) => {
    const currentUser = useAuthStore.getState().user;
    const myId = currentUser?._id || currentUser?.id;

    const targetUserId =
      room.targetUserId ||
      room.friendId ||
      room.otherUserId ||
      room.participantId;

    if (!myId || !targetUserId) return;

    const roomId = `room_${myId}_${targetUserId}`;

    const sent = socketService.callUser({
      targetUserId,
      roomId,
      callerName: currentUser?.username || "Bạn",
      type,
    });

    if (!sent) return;

    const url =
      type === "audio"
        ? `/call/${roomId}?type=voice`
        : `/call/${roomId}`;

    navigate(url);
  };

  const handleCall = (type) => {
    // Ưu tiên handler từ parent
    if (type === 'audio' && onCall) return onCall();
    if (type === 'video' && onVideo) return onVideo();

    // fallback dùng logic ContactPage
    return handleCallClick(type);



    const myId = currentUser?._id || currentUser?.id;
    if (!myId) {
      alert('Vui lòng đăng nhập lại.');
      return;
    }

    const targetUserId =
      room.targetUserId ||
      room.friendId ||
      room.otherUserId ||
      room.participantId;

    if (!targetUserId) {
      alert('Không tìm thấy thông tin người nhận.');
      return;
    }

    const roomId = [myId, targetUserId].sort().join('_');

    if (!socketService?.isConnected?.()) {
      alert('Mất kết nối realtime, vui lòng thử lại.');
      return;
    }

    const sent = socketService.callUser({
      targetUserId,
      roomId,
      callerName: currentUser?.username || 'Bạn',
      type,
    });

    if (!sent) {
      alert('Không thể gửi yêu cầu gọi.');
      return;
    }

    const url =
      type === 'audio'
        ? `/call/${roomId}?type=voice`
        : `/call/${roomId}`;

    navigate(url);
  };

  return (
    <div className="flex justify-between items-center bg-white px-5 py-3 border-b border-gray-200">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
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
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        <div>
          <div className="text-base font-bold text-gray-900">
            {room.name}
          </div>

          <div className="text-xs text-gray-500">
            {isClass ? (
              <span className="flex items-center gap-1">
                <FaUsers size={10} />
                {room.memberCount
                  ? `${room.memberCount} thành viên`
                  : 'Đang hoạt động'}
              </span>
            ) : isOnline ? (
              <span className="text-green-600 font-medium">
                Đang trực tuyến
              </span>
            ) : (
              'Ngoại tuyến'
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {isClass && (
          <div className="flex gap-2 mr-4 border-r border-gray-200 pr-4">
            <button className="text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition">
              <FaFileAlt size={12} /> Tài liệu
            </button>
            <button className="text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition">
              <FaUsers size={12} /> Thành viên
            </button>
          </div>
        )}

        {!isClass && (
          <>
            <button
              className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
              onClick={() => handleCall('audio')}
              title="Gọi thoại"
            >
              <FaPhone size={18} />
            </button>

            <button
              className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
              onClick={() => handleCall('video')}
              title="Gọi video"
            >
              <FaVideo size={18} />
            </button>
          </>
        )}

        <button
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-50 p-2 rounded-full transition ml-2"
          onClick={onInfo}
          title="Tùy chọn"
        >
          <FaEllipsisV size={18} />
        </button>
      </div>
    </div>
  );
};