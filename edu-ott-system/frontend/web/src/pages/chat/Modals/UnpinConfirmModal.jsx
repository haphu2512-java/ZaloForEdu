import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function UnpinConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1e2124', width: 400, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: 'white' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #36393f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bỏ ghim</h3>
          <FaTimes style={{ cursor: 'pointer', opacity: 0.7 }} onClick={onClose} />
        </div>
        
        <div style={{ padding: '24px 20px' }}>
          <p style={{ margin: 0, fontSize: 15, color: '#dcddde', textAlign: 'center' }}>
            Bạn có chắc muốn bỏ ghim nội dung này không?
          </p>
        </div>

        <div style={{ padding: '16px 20px', background: '#2f3136', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#4f545c', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Không
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Bỏ ghim
          </button>
        </div>
      </div>
    </div>
  );
}
