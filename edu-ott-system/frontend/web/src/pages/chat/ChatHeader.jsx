import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPhone, FaVideo, FaEllipsisV, FaUsers, FaFileAlt, FaUserPlus, FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socketService';
import { useTheme } from '../../contexts/ThemeContext';
import { friendService } from '../../services/friendService';
import { useFriendStore } from '../../store/friendStore';

export const ChatHeader = ({ room, onCall, onVideo, onInfo }) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { appliedTheme } = useTheme();
  const isDark = appliedTheme === 'dark';
  const { outgoingRequests, incomingRequests, fetchOutgoingRequests, fetchIncomingRequests, acceptRequest, rejectRequest } = useFriendStore();
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const hasOutgoingRequest = outgoingRequests.some(r =>
    String(r.toUserId?._id || r.toUserId || '') === String(room?.strangerId || '')
  );
  const outgoingRequest = outgoingRequests.find(r =>
    String(r.toUserId?._id || r.toUserId || '') === String(room?.strangerId || '')
  );
  const incomingRequest = incomingRequests.find(r =>
    String(r.fromUserId?._id || r.fromUserId || '') === String(room?.strangerId || '')
  );

  useEffect(() => {
    if (room?.isStranger) {
      fetchOutgoingRequests();
      fetchIncomingRequests();
    }
  }, [room?.strangerId, room?.isStranger]);

  if (!room) return null;

  const isOnline = room.isOnline;
  const isClass = room.type?.toLowerCase() === 'class' || room.roomModel === 'Class';
  const isGroup = room.type === 'group' || room.roomModel === 'Group';
  const isStranger = room.isStranger && room.type === 'direct';
  const alreadySentRequest = isStranger && (hasOutgoingRequest || friendRequestSent);

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

  const handleSendFriendRequest = async () => {
    try {
      await friendService.sendFriendRequest(room.strangerId);
      setFriendRequestSent(true);
      fetchOutgoingRequests();
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'REVERSE_REQUEST_EXISTS') {
        fetchIncomingRequests();
      } else {
        alert(err.response?.data?.error?.message || err.response?.data?.message || 'Không thể gửi lời mời kết bạn');
      }
    }
  };

  const handleCancelFriendRequest = async () => {
    const requestId = outgoingRequest?._id;
    if (!requestId) return;
    setCancelLoading(true);
    try {
      await friendService.cancelFriendRequest(requestId);
      setFriendRequestSent(false);
      fetchOutgoingRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy lời mời');
    } finally { setCancelLoading(false); }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest?._id) return;
    setAcceptLoading(true);
    try {
      await acceptRequest(incomingRequest._id);
      fetchIncomingRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể chấp nhận');
    } finally { setAcceptLoading(false); }
  };

  const handleRejectRequest = async () => {
    if (!incomingRequest?._id) return;
    setRejectLoading(true);
    try {
      await rejectRequest(incomingRequest._id);
      fetchIncomingRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể từ chối');
    } finally { setRejectLoading(false); }
  };

  // ─── 1-1 Call handler ───
  const handleDirectCallClick = (type) => {
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

    const roomId = [myId, targetUserId].sort().join('_');
    const sent = socketService.callUser({
      targetUserId,
      roomId,
      callerName: currentUser?.username || 'Bạn',
      type,
    });

    if (!sent) {
      alert('Mất kết nối realtime, vui lòng thử lại.');
      return;
    }

    const url = type === 'audio' ? `/call/${roomId}?type=voice` : `/call/${roomId}`;
    navigate(url);
  };

  // ─── Group Call handler ───
  const handleGroupCallClick = (type) => {
    const myId = currentUser?._id || currentUser?.id;
    const conversationId = room._id || room.conversationId || room.id;

    if (!myId || !conversationId) {
      alert('Không tìm thấy thông tin nhóm.');
      return;
    }

    // roomId duy nhất theo conversationId + timestamp (tránh trùng nếu gọi nhiều lần)
    const roomId = `group_${conversationId}_${Date.now()}`;
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
      return;
    }

    const url = type === 'audio' ? `/group-call/${roomId}?type=voice` : `/group-call/${roomId}`;
    navigate(url);
  };

  // ─── Dispatch call ───
  const handleCall = (type) => {
    // Nếu ChatPage truyền callback (cũ) thì ưu tiên dùng
    if (type === 'audio' && onCall) return onCall();
    if (type === 'video' && onVideo) return onVideo();

    // Phân loại: nhóm → group call, 1-1 → direct call
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

  return (
    <div className={`flex justify-between items-center px-6 py-4 border-b ${headerBg} transition-colors duration-200`}>
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-sm"
            style={{ background: room.color || '#1b6ef3' }}
          >
            {room.avatar ? (
              <img src={room.avatar} alt="avatar" className="w-full h-full object-cover" />
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
            ) : room.lastSeen ? (
              <span className="mt-0.5 inline-block">{formatLastSeen(room.lastSeen)}</span>
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

        {/* Friend request bar (người lạ) */}
        {isStranger && incomingRequest && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
            <span style={{ fontSize: 12, color: '#888' }}>Đã gửi lời mời kết bạn</span>
            <button
              onClick={handleAcceptRequest} disabled={acceptLoading}
              style={{ background: '#0084ff', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {acceptLoading ? <FaSpinner className="spin" size={11} /> : <FaCheck size={11} />} Chấp nhận
            </button>
            <button
              onClick={handleRejectRequest} disabled={rejectLoading}
              style={{ background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {rejectLoading ? <FaSpinner className="spin" size={11} /> : <FaTimes size={11} />} Từ chối
            </button>
          </div>
        )}

        {isStranger && !incomingRequest && (
          alreadySentRequest ? (
            <button
              onClick={handleCancelFriendRequest} disabled={cancelLoading}
              className={`text-xs font-semibold ${subTextColor} flex items-center gap-1.5 px-3 py-1.5 rounded border ${isDark ? 'border-gray-600' : 'border-gray-300'} ${iconBgHover} transition mr-2`}
            >
              {cancelLoading ? <FaSpinner className="spin" size={11} /> : <FaTimes size={11} />} Hủy lời mời
            </button>
          ) : (
            <button
              onClick={handleSendFriendRequest}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-blue-50 transition mr-2"
            >
              <FaUserPlus size={13} /> Kết bạn
            </button>
          )
        )}

        {/* Nút gọi – ẩn với group lớp học */}
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
