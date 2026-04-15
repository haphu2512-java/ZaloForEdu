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

  // Check xem đã gửi lời mời chưa (A → B)
  const hasOutgoingRequest = outgoingRequests.some(r =>
    String(r.toUserId?._id || r.toUserId || '') === String(room?.strangerId || '')
  );
  const outgoingRequest = outgoingRequests.find(r =>
    String(r.toUserId?._id || r.toUserId || '') === String(room?.strangerId || '')
  );

  // Check xem có lời mời đến không (B nhận từ A)
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
  const isStranger = room.isStranger && room.type === 'direct';
  const alreadySentRequest = isStranger && (hasOutgoingRequest || friendRequestSent);

  const handleSendFriendRequest = async () => {
    try {
      await friendService.sendFriendRequest(room.strangerId);
      setFriendRequestSent(true);
      fetchOutgoingRequests();
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'REVERSE_REQUEST_EXISTS') {
        // Người kia đã gửi lời mời → refresh để hiện nút Chấp nhận/Từ chối
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
  };  const handleCallClick = (type) => {
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

    // Sort 2 userId để roomId luôn nhất quán dù ai gọi trước
    const roomId = [myId, targetUserId].sort().join('_');

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
          <div className={`text-lg font-bold ${textColor}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
            {room.name}
            {isStranger && (
              <span style={{ fontSize:10, fontWeight:700, background:'#ef4444', color:'#fff', padding:'2px 6px', borderRadius:4, letterSpacing:1 }}>
                NGƯỜI LẠ
              </span>
            )}
          </div>

          <div className={`text-sm ${subTextColor}`}>
            {isClass ? (
              <span className="flex items-center gap-1.5 mt-0.5">
                <FaUsers size={12} />
                {room.memberCount ? `${room.memberCount} thành viên` : 'Đang hoạt động'}
              </span>
            ) : isOnline ? (
              <span className="text-green-500 font-medium mt-0.5 inline-block">Đang trực tuyến</span>
            ) : (
              <span className="mt-0.5 inline-block">Ngoại tuyến</span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* Nút kết bạn khi chat với người lạ */}
        {isStranger && (
          incomingRequest ? (
            // B nhận lời mời từ A → hiện Chấp nhận / Từ chối
            <div style={{ display:'flex', gap:8 }}>
              <button
                onClick={handleAcceptRequest}
                disabled={acceptLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:'var(--primary-color)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
              >
                {acceptLoading ? <FaSpinner size={13} className="spin" /> : <FaCheck size={13} />}
                Chấp nhận
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={rejectLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13 }}
              >
                {rejectLoading ? <FaSpinner size={13} className="spin" /> : <FaTimes size={13} />}
                Từ chối
              </button>
            </div>
          ) : alreadySentRequest ? (
            // A đã gửi lời mời → hiện Hủy lời mời
            <button
              onClick={handleCancelFriendRequest}
              disabled={cancelLoading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:600, fontSize:13 }}
            >
              {cancelLoading ? <FaSpinner size={13} className="spin" /> : <FaTimes size={13} />}
              Hủy lời mời
            </button>
          ) : (
            // Chưa có gì → hiện Gửi kết bạn
            <button
              onClick={handleSendFriendRequest}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--primary-color)', background:'transparent', color:'var(--primary-color)', cursor:'pointer', fontWeight:600, fontSize:13 }}
            >
              <FaUserPlus size={13} /> Gửi kết bạn
            </button>
          )
        )}
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