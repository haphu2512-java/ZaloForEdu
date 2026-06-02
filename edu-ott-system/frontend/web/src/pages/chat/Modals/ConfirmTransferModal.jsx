import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './ConfirmTransferModal.css';

export default function ConfirmTransferModal({ isOpen, onClose, onConfirm, memberName }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-transfer-overlay" onClick={onClose}>
      <div className="confirm-transfer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="confirm-transfer-header">
          <div className="confirm-transfer-icon-wrapper">
            <FaExclamationTriangle size={24} color="#F59E0B" />
          </div>
          <h3 className="confirm-transfer-title">Xác nhận chuyển quyền Trưởng nhóm</h3>
          <button className="confirm-transfer-close" onClick={onClose}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="confirm-transfer-body">
          <p className="confirm-transfer-question">
            Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho <strong>{memberName}</strong>?
          </p>

          <div className="confirm-transfer-warning">
            <div className="confirm-transfer-warning-item">
              <span className="confirm-transfer-warning-icon">❌</span>
              <span>Hành động này <strong>KHÔNG THỂ HOÀN TÁC</strong></span>
            </div>
            <div className="confirm-transfer-warning-item">
              <span className="confirm-transfer-warning-icon">❌</span>
              <span>Bạn sẽ trở thành <strong>Phó nhóm</strong> sau khi chuyển quyền</span>
            </div>
            <div className="confirm-transfer-warning-item">
              <span className="confirm-transfer-warning-icon">❌</span>
              <span>Chỉ <strong>Trưởng nhóm mới</strong> có thể chuyển quyền lại</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="confirm-transfer-footer">
          <button className="confirm-transfer-btn confirm-transfer-btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button className="confirm-transfer-btn confirm-transfer-btn-confirm" onClick={onConfirm}>
            Xác nhận chuyển quyền
          </button>
        </div>
      </div>
    </div>
  );
}
