import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { DEFAULT_AVATAR } from '../../../utils/constants';


export const ShareMessageModal = ({ isOpen, onClose, conversations, onForward, currentUserId }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', width: '400px', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Chuyển tiếp tin nhắn</h3>
          <FaTimes style={{ cursor: 'pointer', color: '#65676B' }} onClick={onClose} />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(!conversations || conversations.length === 0) ? <p style={{ textAlign: 'center', color: '#8A8D91' }}>Không có cuộc trò chuyện nào.</p> : (
            conversations.map((conv, index) => {
              const isGroup = conv.type === 'group';
              const otherUser = conv.participants?.find(p => p._id !== currentUserId);
              const displayName = isGroup ? conv.name : (otherUser?.fullName || otherUser?.username || 'Trò chuyện');
              const avatar = isGroup ? conv.avatarUrl : (otherUser?.avatarUrl || otherUser?.avatar);

              return (
                <div key={conv._id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={avatar || DEFAULT_AVATAR} alt="avt" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: '15px', fontWeight: '500' }}>{displayName}</span>
                  </div>
                  <button 
                    onClick={() => onForward(conv)}
                    style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#0084FF', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                  >Gửi</button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};