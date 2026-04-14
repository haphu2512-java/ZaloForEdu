import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../../services/socketService';
import { FaPhoneAlt, FaVideo, FaTimes, FaCheck } from 'react-icons/fa';

export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    // Lắng nghe sự kiện gọi đến. 
    // Tùy backend của bạn code, có thể nó trả về event "incoming_call" hoặc giữ nguyên "call_user"
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_user", handleIncomingCall); 

    // Cleanup khi component unmount
    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_user", handleIncomingCall);
    };
  }, []);

  const acceptCall = () => {
    if (incomingCall) {
      // Khi nhấn Nghe máy, tài khoản B mới được chuyển hướng vào chung Room với A
      const url = incomingCall.type === "audio" 
        ? `/call/${incomingCall.roomId}?type=voice` 
        : `/call/${incomingCall.roomId}`;
      setIncomingCall(null);
      navigate(url);
    }
  };

  const declineCall = () => {
    // Báo cho A biết B đã từ chối - gửi callerId (fromUserId của A) để server forward đúng
    socketService.declineCall({
      callerId: incomingCall.fromUserId,
      roomId: incomingCall.roomId,
    });
    setIncomingCall(null);
  };

  // Nếu không có ai gọi thì không hiển thị gì cả
  if (!incomingCall) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h3 style={{ margin: '0 0 10px 0' }}>
          {incomingCall.type === 'audio' ? <FaPhoneAlt size={16}/> : <FaVideo size={16}/>} Cuộc gọi đến
        </h3>
        <p><strong>{incomingCall.callerName || "Một người bạn"}</strong> đang gọi cho bạn...</p>
        
        <div style={styles.actions}>
          <button style={{...styles.btn, backgroundColor: '#ef4444'}} onClick={declineCall}>
            <FaTimes /> Từ chối
          </button>
          <button style={{...styles.btn, backgroundColor: '#16a34a'}} onClick={acceptCall}>
            <FaCheck /> Nghe máy
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline styles cho nhanh, bạn có thể chuyển qua file CSS sau
const styles = {
  overlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    display: 'flex', justifyContent: 'center', alignItems: 'center', 
    zIndex: 9999 
  },
  box: { 
    backgroundColor: '#fff', padding: '20px 30px', borderRadius: '12px', 
    textAlign: 'center', minWidth: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' 
  },
  actions: { display: 'flex', justifyContent: 'space-around', marginTop: '20px' },
  btn: { 
    padding: '10px 20px', color: '#fff', border: 'none', borderRadius: '8px', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' 
  }
};