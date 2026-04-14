import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuthStore } from '../../store/authStore';

export default function VideoCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const containerRef = useRef(null);
  const joinedRef = useRef(false); // Guard tránh joinRoom 2 lần

  useEffect(() => {
    // Đợi đến khi có thông tin user và container ref đã được render
    if (!containerRef.current) return;

    let zp = null;

    if (joinedRef.current) return; // Đã join rồi, không join lại
    joinedRef.current = true;

    const startCall = async () => {
      try {
        const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
        const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

        // Lấy user mới nhất từ store tại thời điểm gọi (tránh stale closure)
        const { useAuthStore } = await import('../../store/authStore');
        const currentUser = useAuthStore.getState().user;
        const userID = currentUser?._id || currentUser?.id || "guest_" + Date.now();
        const userName = currentUser?.username || "Thành viên ZaloEdu";

        // Tạo token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,
          userID,
          userName
        );

        // Khởi tạo Zego instance
        zp = ZegoUIKitPrebuilt.create(kitToken);

        // Đọc param ?type=voice từ URL (truyền từ ContactsPage sang)
        const query = new URLSearchParams(location.search);
        const type = query.get("type");
        const isVideo = type !== "voice"; // Nếu là voice thì tắt video

        // Tham gia phòng và render giao diện
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
            navigate(-1);
          },
        });
      } catch (error) {
        console.error("Lỗi khởi tạo ZegoCloud:", error);
      }
    };

    startCall();

    // CLEANUP: Rất quan trọng. Hủy call khi component unmount để không bị kẹt chạy ngầm
    return () => {
      if (zp) {
        zp.destroy();
      }
    };
  }, [roomId, navigate, location.search]);

  // Nếu user chưa load xong, hiển thị một thông báo để tránh lỗi crash
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