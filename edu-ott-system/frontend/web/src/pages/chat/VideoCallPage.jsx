import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socketService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function VideoCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let zp = null;
    let isMounted = true;

    const startCall = async () => {
      try {
        // --- Fetch token from backend (no secret on client) ---
        const token = localStorage.getItem('token');
        const currentUser = useAuthStore.getState().user;
        const userName = currentUser?.username || 'Thành viên ZaloEdu';

        const res = await fetch(`${API_BASE_URL}/calls/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomId, userName }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Token request failed (${res.status})`);
        }

        const { data } = await res.json();
        
        const zegoUserId = (currentUser?._id || currentUser?.id || 'unknown').toString();
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          data.appID,
          data.serverSecret,
          roomId,
          zegoUserId,
          userName,
        );

        if (!isMounted) return;
        
        // Khởi tạo Zego instance
        zp = ZegoUIKitPrebuilt.create(kitToken);

        // Đọc param ?type=voice từ URL (truyền từ ContactsPage sang)
        const query = new URLSearchParams(location.search);
        const type = query.get("type");
        const isVideo = type !== "voice"; // Nếu là voice thì tắt video

        // Xin quyền camera/mic trước khi joinRoom để tránh màn hình đen
        if (isVideo) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(track => track.stop()); // Dừng lại, Zego sẽ tự mở lại
          } catch (err) {
            console.warn("Không lấy được quyền camera:", err);
          }
        }

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: isVideo,
          showMyCameraToggleButton: isVideo,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: isVideo,
          useFrontFacingCamera: true,
          onLeaveRoom: () => {
            // Thông báo kết thúc cho server
            socketService.endCall({ roomId, reason: 'normal' });
            navigate(-1);
          },
        });
      } catch (err) {
        console.error("Lỗi khởi tạo ZegoCloud:", err);
        setError(err.message);
      }
    };

    startCall();

    // CLEANUP: Rất quan trọng. Hủy call khi component unmount
    return () => {
      isMounted = false;
      if (zp) {
        zp.destroy();
      }
    };
  }, [roomId, navigate, location.search]);

  if (error) {
    return (
      <div style={{
        width: '100vw', height: '100vh', backgroundColor: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', flexDirection: 'column', gap: 16,
      }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Không thể kết nối cuộc gọi</p>
        <p style={{ fontSize: 14, color: '#aaa' }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 24px', background: '#0084ff', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    // QUAN TRỌNG NHẤT LÀ ĐÂY: Thẻ div bắt buộc phải có width và height rõ ràng
    // Đã set background màu tối để dễ nhận biết UI đang load
    <div
      className="video-call-container"
      ref={containerRef}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#1a1a1a' 
      }}
    />
  );
}
