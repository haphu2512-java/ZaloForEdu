import React from 'react';
import { FaTimes, FaThumbtack } from 'react-icons/fa';

export default function PinLimitModal({ isOpen, onClose, onReplace, currentPins }) {
  if (!isOpen) return null;

  // Lấy ghim cũ nhất (thường là cái đầu tiên trong danh sách)
  const oldestPin = currentPins[0]; 
  const displayContent = oldestPin?.messageId?.content || '[Hình ảnh/File]';
  const senderName = oldestPin?.messageId?.senderId?.fullName || oldestPin?.messageId?.senderId?.username || 'Thành viên';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1e2124', width: 440, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: 'white' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #36393f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cập nhật danh sách ghim</h3>
          <FaTimes style={{ cursor: 'pointer', opacity: 0.7 }} onClick={onClose} />
        </div>
        
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#dcddde', lineHeight: 1.5 }}>
            Đã đạt giới hạn 3 ghim. Ghim cũ dưới đây sẽ được bỏ để cập nhật nội dung mới.
          </p>

          {oldestPin && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #36393f' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,104,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0068FF' }}>
                <FaThumbtack size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Tin nhắn</div>
                <div style={{ fontSize: 12, color: '#b9bbbe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {senderName}: {displayContent}
                </div>
              </div>
              <button 
                style={{ background: 'none', border: 'none', color: '#0068FF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {/* Có thể cho phép chọn ghim khác để thay thế nếu cần */}}
              >
                Thay đổi
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', background: '#2f3136', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#4f545c', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Hủy
          </button>
          <button 
            onClick={() => {
              if (oldestPin) onReplace(oldestPin.messageId?._id || oldestPin.messageId);
              onClose();
            }}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#0068FF', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
