import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { FaLink, FaCheck, FaCrown } from 'react-icons/fa';

const MAX_PARTICIPANTS = 5;

export default function GroupCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const containerRef = useRef(null);
  const joinedRef = useRef(false);
  const zpRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [showProModal, setShowProModal] = useState(false);

  // Link mời dạng Google Meet — dùng roomId
  const inviteLink = `${window.location.origin}/group-call/${roomId}${location.search}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    const startCall = async () => {
      try {
        const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
        const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

        const { useAuthStore } = await import('../../store/authStore');
        const currentUser = useAuthStore.getState().user;
        const userID = currentUser?._id || currentUser?.id || 'guest_' + Date.now();
        const userName = currentUser?.username || 'Thành viên';

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          userID,
          userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        const query = new URLSearchParams(location.search);
        const type = query.get('type');
        const isVideo = type !== 'voice';

        if (isVideo) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach((t) => t.stop());
          } catch (_) { }
        }

        zp.joinRoom({
          container: containerRef.current,
          scenario: { mode: ZegoUIKitPrebuilt.GroupCall },
          // Zego giới hạn mềm qua maxUsers — vẫn hiển thị cảnh báo phía app
          maxUsers: MAX_PARTICIPANTS,
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: isVideo,
          showMyCameraToggleButton: isVideo,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: isVideo,
          showUserList: true,
          showRoomTimer: true,
          layout: 'Auto',

          // ── Callback đúng tên theo Zego SDK ──
          onUserJoin: (users) => {
            // users là mảng user vừa join — cộng dồn
            setParticipantCount((prev) => {
              const next = prev + (users?.length || 1);
              // Nếu vượt giới hạn → hiện thông báo Pro (không kick)
              if (next > MAX_PARTICIPANTS) {
                setShowProModal(true);
              }
              return next;
            });
          },

          onUserLeave: (users) => {
            setParticipantCount((prev) => Math.max(1, prev - (users?.length || 1)));
          },

          onLeaveRoom: () => {
            navigate(-1);
          },
        });
      } catch (error) {
        console.error('Lỗi khởi tạo Group Call ZegoCloud:', error);
      }
    };

    startCall();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [roomId, navigate, location.search]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#111' }}>
      {/* Zego render container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Thanh thông tin phía trên ── */}
      <div style={styles.topBar}>
        {/* Số người trong phòng */}
        <div style={styles.countBadge}>
          <span>👥</span>
          <span>
            {participantCount}/{MAX_PARTICIPANTS}
            {participantCount >= MAX_PARTICIPANTS && (
              <span style={{ color: '#fbbf24', marginLeft: 4, fontWeight: 700 }}>• Đầy</span>
            )}
          </span>
        </div>

        {/* Nút copy invite link */}
        <button onClick={handleCopyLink} style={styles.copyBtn} title="Sao chép link mời">
          {copied ? <FaCheck size={12} /> : <FaLink size={12} />}
          <span>{copied ? 'Đã sao chép!' : 'Sao chép link mời'}</span>
        </button>
      </div>

      {/* ── Modal thông báo vượt giới hạn (Pro) ── */}
      {showProModal && (
        <div style={styles.proOverlay} onClick={() => setShowProModal(false)}>
          <div style={styles.proBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.proIconWrap}>
              <FaCrown size={28} color="#f59e0b" />
            </div>
            <h3 style={styles.proTitle}>Phòng đã đạt giới hạn {MAX_PARTICIPANTS} người</h3>
            <p style={styles.proDesc}>
              Tính năng nhóm lớn hơn sẽ có trong gói <strong>Zalo Edu Pro</strong> sắp ra mắt.
              Người mới tham gia vẫn có thể vào phòng nhưng trải nghiệm có thể bị ảnh hưởng.
            </p>
            <button style={styles.proBtn} onClick={() => setShowProModal(false)}>
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  topBar: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    zIndex: 999,
  },
  countBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,0,0,0.65)',
    color: '#fff', padding: '7px 14px', borderRadius: 20,
    fontSize: 13, fontWeight: 600, backdropFilter: 'blur(6px)',
  },
  copyBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(0,132,255,0.85)',
    color: '#fff', border: 'none', padding: '7px 16px',
    borderRadius: 20, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, backdropFilter: 'blur(6px)',
  },
  proOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  proBox: {
    background: '#fff', borderRadius: 18, padding: '36px 40px',
    textAlign: 'center', maxWidth: 380, width: '90%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
  },
  proIconWrap: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#fef3c7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  proTitle: { margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#111' },
  proDesc: { fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 24px' },
  proBtn: {
    padding: '10px 32px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff', border: 'none', borderRadius: 12,
    cursor: 'pointer', fontWeight: 700, fontSize: 14,
  },
};
