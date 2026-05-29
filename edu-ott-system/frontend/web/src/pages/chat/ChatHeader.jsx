import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPhone, FaVideo, FaEllipsisV, FaUsers, FaFileAlt, FaSearch } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socketService';
import { useTheme } from '../../contexts/ThemeContext';
import { toAbsoluteUrl } from './chatUtils';

export const ChatHeader = ({ room, onCall, onVideo, onInfo, onSearchInConv }) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { appliedTheme } = useTheme();
  const isDark = appliedTheme === 'dark';

  const [isOnline, setIsOnline] = useState(!!room?.isOnline);
  const [lastSeen, setLastSeen] = useState(room?.lastSeen || null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setIsOnline(!!room?.isOnline);
    setLastSeen(room?.lastSeen || null);
    setAvatarError(false);
  }, [room?._id, room?.isOnline, room?.lastSeen]);

  useEffect(() => {
    if (!room || isGroup) return;
    const targetId = String(room.targetUserId || '');
    if (!targetId) return;

    const onUserOnline = ({ userId }) => {
      if (String(userId) === targetId) { setIsOnline(true); setLastSeen(null); }
    };
    const onUserOffline = ({ userId, lastSeen }) => {
      if (String(userId) === targetId) { setIsOnline(false); setLastSeen(lastSeen || new Date().toISOString()); }
    };

    socketService.on('user_online', onUserOnline);
    socketService.on('user_offline', onUserOffline);
    return () => {
      socketService.off('user_online', onUserOnline);
      socketService.off('user_offline', onUserOffline);
    };
  }, [room?._id, room?.targetUserId]);

  if (!room) return null;

  const isClass = room.type?.toLowerCase() === 'class' || room.roomModel === 'Class';
  const isGroup = room.type === 'group' || room.roomModel === 'Group';
  const isStranger = room.isStranger && !isGroup;

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Ngoại tuyến';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'Vừa truy cập';
    if (mins < 60) return `Truy cập ${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Truy cập ${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `Truy cập ${days} ngày trước`;
  };

  // ─── 1-1 Call handler ───
  const handleDirectCallClick = (type) => {
    const myId = currentUser?._id || currentUser?.id;

    let targetUserId = room.targetUserId || room.friendId || room.otherUserId || room.participantId;

    if (!targetUserId && room.participants && Array.isArray(room.participants)) {
      const otherParticipant = room.participants.find(p => {
        const pid = typeof p === 'string' ? p : (p._id || p.id);
        return String(pid) !== String(myId);
      });
      targetUserId = typeof otherParticipant === 'string' ? otherParticipant : (otherParticipant?._id || otherParticipant?.id);
    }

    if (!myId || !targetUserId) {
      alert('Không tìm thấy thông tin người nhận.');
      return;
    }

    const conversationId = room._id || room.conversationId || room.id;
    const roomId = [myId, targetUserId].sort().join('_');

    const sent = socketService.callUser({
      targetUserId,
      roomId,
      callerName: currentUser?.username || 'Bạn',
      type,
      conversationId,
    });

    if (!sent) {
      alert('Mất kết nối realtime, vui lòng thử lại.');
      return;
    }

    const url = type === 'audio' ? `/call/${roomId}?type=voice` : `/call/${roomId}`;
    navigate(url);
  };

  const [callLoading, setCallLoading] = useState(false);

  useEffect(() => {
    const onCallBusy = () => alert('Người dùng đang bận cuộc gọi khác.');
    const onCallAccepted = () => alert('Người dùng đã chấp nhận cuộc gọi.');
    const onMissedCall = () => alert('Cuộc gọi không được trả lời.');
    const onCallDeclined = () => alert('Người dùng đã từ chối cuộc gọi.');

    socketService.on('call_busy', onCallBusy);
    socketService.on('call:accepted', onCallAccepted);
    socketService.on('missed_call', onMissedCall);
    socketService.on('call_declined', onCallDeclined);

    return () => {
      socketService.off('call_busy', onCallBusy);
      socketService.off('call:accepted', onCallAccepted);
      socketService.off('missed_call', onMissedCall);
      socketService.off('call_declined', onCallDeclined);
    };
  }, []);

  // ─── Group Call handler ───
  const handleGroupCallClick = (type) => {
    if (callLoading) return;

    const myId = currentUser?._id || currentUser?.id;
    const conversationId = room._id || room.conversationId || room.id;

    if (!myId || !conversationId) {
      alert('Không tìm thấy thông tin nhóm.');
      return;
    }

    setCallLoading(true);

    const roomId = `call_${conversationId}_${Date.now()}`;
    const inviteLink = `${window.location.origin}/group-call/${roomId}${type === 'audio' ? '?type=voice' : ''}`;

    const sent = socketService.startGroupCall({
      conversationId,
      roomId,
      callerName: currentUser?.username || 'Trưởng nhóm',
      type,
      inviteLink,
    });

    if (!sent) {
      alert('Mất kết nối realtime, vui lòng thử lại.');
      setCallLoading(false);
      return;
    }

    const url = type === 'audio' ? `/group-call/${roomId}?type=voice` : `/group-call/${roomId}`;
    navigate(url);

    setTimeout(() => setCallLoading(false), 2000);
  };

  // ─── Dispatch call ───
  const handleCall = (type) => {
    if (type === 'audio' && onCall) return onCall();
    if (type === 'video' && onVideo) return onVideo();

    if (isGroup) {
      return handleGroupCallClick(type);
    }
    return handleDirectCallClick(type);
  };

  // CSS helpers
  const headerBg = isDark ? 'bg-[#242526] border-gray-700' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const iconBgHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const avatarUrl = toAbsoluteUrl(room.avatar);
  const showAvatar = avatarUrl && !avatarError;

  return (
    <div className={`flex justify-between items-center px-6 py-4 border-b ${headerBg} transition-colors duration-200`}>
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-sm"
            style={{ background: room.color || '#1b6ef3' }}
          >
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              (room.name?.[0] || '?').toUpperCase()
            )}
          </div>

          {isOnline && !isClass && !isGroup && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        <div>
          <div className={`text-lg font-bold ${textColor}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {room.name}
            {isStranger && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: 1 }}>
                NGƯỜI LẠ
              </span>
            )}
            {isGroup && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>
                NHÓM
              </span>
            )}
          </div>

          <div className={`text-sm ${subTextColor}`}>
            {isGroup ? (
              <span className="flex items-center gap-1.5 mt-0.5">
                <FaUsers size={12} />
                {room.memberCount
                  ? `${room.memberCount} thành viên`
                  : room.participants?.length
                    ? `${room.participants.length} thành viên`
                    : 'Nhóm'}
              </span>
            ) : isGroup ? (
              <span className="flex items-center gap-1.5 mt-0.5">
                <FaUsers size={12} />
                {room.memberCount || room.participants?.length || 0} thành viên
              </span>
            ) : isOnline ? (
              <span className="text-green-500 font-medium mt-0.5 inline-block">Đang trực tuyến</span>
            ) : lastSeen ? (
              <span className="mt-0.5 inline-block">{formatLastSeen(lastSeen)}</span>
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
              title={isGroup ? 'Gọi thoại nhóm' : 'Gọi thoại'}
            >
              <FaPhone size={20} />
            </button>

            <button
              className={`text-blue-500 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-blue-50'} p-2.5 rounded-full transition`}
              onClick={() => handleCall('video')}
              title={isGroup ? 'Gọi video nhóm' : 'Gọi video'}
            >
              <FaVideo size={20} />
            </button>
          </>
        )}

        <button
          className={`${subTextColor} hover:text-blue-500 ${iconBgHover} p-2.5 rounded-full transition`}
          onClick={onSearchInConv}
          title="Tìm trong cuộc trò chuyện"
        >
          <FaSearch size={18} />
        </button>
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
