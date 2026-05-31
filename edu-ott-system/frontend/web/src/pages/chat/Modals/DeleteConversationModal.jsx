import { FaTimes } from 'react-icons/fa';
import './ConfirmTransferModal.css'; 

export default function DeleteConversationModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-transfer-overlay" onClick={onClose}>
      <div className="confirm-transfer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="confirm-transfer-header">
          <h3 className="confirm-transfer-title">Xác nhận</h3>
          <button className="confirm-transfer-close" onClick={onClose}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="confirm-transfer-body">
          <p className="confirm-transfer-question">
            Toàn bộ nội dung trò chuyện sẽ bị xóa vĩnh viễn.<br />
            Bạn có chắc chắn muốn xóa?
          </p>
        </div>

        {/* Footer */}
        <div className="confirm-transfer-footer">
          <button className="confirm-transfer-btn confirm-transfer-btn-cancel" onClick={onClose}>
            Không
          </button>
          <button
            className="confirm-transfer-btn confirm-transfer-btn-confirm"
            style={{ background: '#E53E3E' }}
            onClick={onConfirm}
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}