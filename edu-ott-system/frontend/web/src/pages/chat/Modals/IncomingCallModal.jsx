import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../../services/socketService';
import { FaPhoneAlt, FaVideo, FaTimes, FaCheck, FaUsers } from 'react-icons/fa';

const RING_TIMEOUT_SECONDS = 30;

/**
 * IncomingCallModal
 * Xử lý cả 2 loại cuộc gọi:
 *  - incoming_call       → gọi 1-1
 *  - incoming_group_call → gọi nhóm
 *
 * Features:
 *  - Countdown timer (30s)
 *  - Auto-close on timeout
 *  - Emit call:accept trước khi navigate
 *  - Ringtone audio
 */
export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [countdown, setCountdown] = useState(RING_TIMEOUT_SECONDS);
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const ringtoneRef = useRef(null);

  // Cleanup timer + audio
  const stopRinging = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    // ── 1-1 call ──
    const handleIncomingCall = (data) => {
      setIncomingCall({ ...data, isGroup: false });
      setCountdown(RING_TIMEOUT_SECONDS);
    };

    // ── Group call ──
    const handleIncomingGroupCall = (data) => {
      setIncomingCall({ ...data, isGroup: true });
      setCountdown(RING_TIMEOUT_SECONDS);
    };

    // ── Call ended/timeout externally ──
    const handleCallTimeout = ({ roomId }) => {
      if (incomingCall?.roomId === roomId) {
        stopRinging();
        setIncomingCall(null);
      }
    };

    const handleCallEnded = ({ roomId }) => {
      if (incomingCall?.roomId === roomId) {
        stopRinging();
        setIncomingCall(null);
      }
    };

    // ── Caller cancelled ──
    const handleCallDeclined = ({ roomId }) => {
      if (incomingCall?.roomId === roomId) {
        stopRinging();
        setIncomingCall(null);
      }
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("incoming_group_call", handleIncomingGroupCall);
    socket.on("call:timeout", handleCallTimeout);
    socket.on("call:ended", handleCallEnded);
    socket.on("call_declined", handleCallDeclined);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("incoming_group_call", handleIncomingGroupCall);
      socket.off("call:timeout", handleCallTimeout);
      socket.off("call:ended", handleCallEnded);
      socket.off("call_declined", handleCallDeclined);
    };
  }, [incomingCall]);

  // Countdown timer
  useEffect(() => {
    if (!incomingCall) {
      stopRinging();
      return;
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Timeout — auto decline
          declineCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopRinging();
  }, [incomingCall?.roomId]);

  const acceptCall = () => {
    if (!incomingCall) return;
    stopRinging();

    // Emit call:accept to server BEFORE navigating
    if (socketService.socket?.connected) {
      socketService.socket.emit('call:accept', {
        roomId: incomingCall.roomId,
        callerId: incomingCall.fromUserId,
      });
    }

    let url;
    if (incomingCall.isGroup) {
      url = incomingCall.type === "audio"
        ? `/group-call/${incomingCall.roomId}?type=voice`
        : `/group-call/${incomingCall.roomId}`;
    } else {
      url = incomingCall.type === "audio"
        ? `/call/${incomingCall.roomId}?type=voice`
        : `/call/${incomingCall.roomId}`;
    }

    setIncomingCall(null);
    navigate(url);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    stopRinging();

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

  const progress = countdown / RING_TIMEOUT_SECONDS;

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        {/* Icon + tiêu đề */}
        <div style={styles.iconWrap}>
          <div style={{
            ...styles.iconCircle,
            background: incomingCall.isGroup ? '#6366f1' : '#0084ff',
          }}>
            <Icon size={22} color="#fff" />
          </div>
        </div>

        <h3 style={styles.title}>{callTypeLabel}</h3>
        <p style={styles.caller}>
          <strong>{incomingCall.callerName || 'Một người bạn'}</strong>
          {incomingCall.isGroup ? ' đang khởi động cuộc gọi nhóm...' : ' đang gọi cho bạn...'}
        </p>

        {/* Countdown progress bar */}
        <div style={styles.progressBarOuter}>
          <div style={{
            ...styles.progressBarInner,
            width: `${progress * 100}%`,
            backgroundColor: countdown <= 10 ? '#ef4444' : '#0084ff',
          }} />
        </div>
        <p style={styles.countdownText}>{countdown}s</p>

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
    animation: 'pulse-ring 2s infinite',
  },
  iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  iconCircle: {
    width: 56, height: 56, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  title: { margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' },
  caller: { margin: '0 0 12px', color: '#444', fontSize: 14 },
  progressBarOuter: {
    width: '100%', height: 4, backgroundColor: '#e5e7eb',
    borderRadius: 2, overflow: 'hidden', marginBottom: 4,
  },
  progressBarInner: {
    height: '100%', borderRadius: 2,
    transition: 'width 1s linear, background-color 0.3s',
  },
  countdownText: {
    fontSize: 12, color: '#888', margin: '0 0 12px',
  },
  inviteHint: { fontSize: 12, color: '#888', margin: '0 0 14px', wordBreak: 'break-all' },
  actions: { display: 'flex', justifyContent: 'space-around', marginTop: 8 },
  btn: {
    padding: '10px 22px', color: '#fff', border: 'none', borderRadius: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: 'bold',
  },
};
