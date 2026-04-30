import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../../services/socketService';
import { FaPhoneAlt, FaVideo, FaTimes, FaCheck, FaUsers } from 'react-icons/fa';

/**
 * IncomingCallModal
 * Xử lý cả 2 loại cuộc gọi:
 *  - incoming_call       → gọi 1-1
 *  - incoming_group_call → gọi nhóm (tất cả thành viên đều nhận)
 */
export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    // ── 1-1 call ──
    const handleIncomingCall = (data) => {
      setIncomingCall({ ...data, isGroup: false });
    };

    // ── Group call ──
    const handleIncomingGroupCall = (data) => {
      setIncomingCall({ ...data, isGroup: true });
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("incoming_group_call", handleIncomingGroupCall);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("incoming_group_call", handleIncomingGroupCall);
    };
  }, []);

  const acceptCall = () => {
    if (!incomingCall) return;

    let url;
    if (incomingCall.isGroup) {
      // Group call → /group-call/:roomId?type=voice (nếu audio)
      url = incomingCall.type === "audio"
        ? `/group-call/${incomingCall.roomId}?type=voice`
        : `/group-call/${incomingCall.roomId}`;
    } else {
      // 1-1 call → /call/:roomId?type=voice
      url = incomingCall.type === "audio"
        ? `/call/${incomingCall.roomId}?type=voice`
        : `/call/${incomingCall.roomId}`;
    }

    setIncomingCall(null);
    navigate(url);
  };

  const declineCall = () => {
    if (!incomingCall) return;

    if (incomingCall.isGroup) {
      socketService.declineGroupCall({
        conversationId: incomingCall.conversationId,
        roomId: incomingCall.roomId,
      });
    } else {
      socketService.declineCall({
        callerId: incomingCall.fromUserId,
        roomId: incomingCall.roomId,
      });
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const isAudio = incomingCall.type === 'audio';
  const Icon = incomingCall.isGroup ? FaUsers : (isAudio ? FaPhoneAlt : FaVideo);
  const callTypeLabel = incomingCall.isGroup
    ? `Cuộc gọi nhóm ${isAudio ? '(thoại)' : '(video)'}`
    : `Cuộc gọi ${isAudio ? 'thoại' : 'video'} đến`;

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        {/* Icon + tiêu đề */}
        <div style={styles.iconWrap}>
          <div style={{ ...styles.iconCircle, background: incomingCall.isGroup ? '#6366f1' : '#0084ff' }}>
            <Icon size={22} color="#fff" />
          </div>
        </div>

        <h3 style={styles.title}>{callTypeLabel}</h3>
        <p style={styles.caller}>
          <strong>{incomingCall.callerName || 'Một người bạn'}</strong>
          {incomingCall.isGroup ? ' đang khởi động cuộc gọi nhóm...' : ' đang gọi cho bạn...'}
        </p>

        {/* Invite link cho group call */}
        {incomingCall.isGroup && incomingCall.inviteLink && (
          <p style={styles.inviteHint}>
            Bạn cũng có thể tham gia qua link:{' '}
            <a href={incomingCall.inviteLink} target="_blank" rel="noreferrer" style={{ color: '#0084ff', fontSize: 12 }}>
              {incomingCall.inviteLink}
            </a>
          </p>
        )}

        <div style={styles.actions}>
          <button style={{ ...styles.btn, backgroundColor: '#ef4444' }} onClick={declineCall}>
            <FaTimes /> Từ chối
          </button>
          <button style={{ ...styles.btn, backgroundColor: '#16a34a' }} onClick={acceptCall}>
            <FaCheck /> Nghe máy
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999,
  },
  box: {
    backgroundColor: '#fff', padding: '28px 36px', borderRadius: '16px',
    textAlign: 'center', minWidth: '320px', maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  iconCircle: {
    width: 56, height: 56, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  title: { margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' },
  caller: { margin: '0 0 16px', color: '#444', fontSize: 14 },
  inviteHint: { fontSize: 12, color: '#888', margin: '0 0 14px', wordBreak: 'break-all' },
  actions: { display: 'flex', justifyContent: 'space-around', marginTop: 8 },
  btn: {
    padding: '10px 22px', color: '#fff', border: 'none', borderRadius: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: 'bold',
  },
};
