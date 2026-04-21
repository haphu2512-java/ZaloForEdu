import React, { useState } from 'react';
import { FaFlag, FaTimes, FaCheck } from 'react-icons/fa';
import { userService } from '../../../services/userService';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
  { value: 'spam', label: '🚫 Spam / Quảng cáo' },
  { value: 'harassment', label: '😡 Quấy rối / Bắt nạt' },
  { value: 'fake', label: '🎭 Tài khoản giả mạo' },
  { value: 'inappropriate', label: '🔞 Nội dung không phù hợp' },
  { value: 'hate', label: '💬 Ngôn từ thù địch' },
  { value: 'other', label: '❓ Lý do khác' },
];

/**
 * ReportUserModal
 * Props:
 *  - targetUserId: string
 *  - targetUserName: string
 *  - onClose: () => void
 */
export default function ReportUserModal({ targetUserId, targetUserName, onClose }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Đóng khi click overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Vui lòng chọn lý do báo cáo');
      return;
    }
    const fullReason = note.trim()
      ? `${selectedReason}: ${note.trim()}`
      : selectedReason;

    setLoading(true);
    try {
      await userService.reportUser(targetUserId, fullReason);
      setDone(true);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Không thể gửi báo cáo';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <FaFlag color="#ef4444" size={15} />
            <span style={styles.headerTitle}>Báo cáo tài khoản</span>
          </div>
          {/* FIX: dùng div thay vì button để tránh conflict nested button */}
          <div style={styles.closeBtn} onClick={onClose} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}>
            <FaTimes size={15} />
          </div>
        </div>

        {done ? (
          /* ── Màn hình thành công ── */
          <div style={styles.doneBox}>
            <div style={styles.doneIcon}><FaCheck size={26} color="#16a34a" /></div>
            <h3 style={styles.doneTitle}>Đã gửi báo cáo</h3>
            <p style={styles.doneDesc}>
              Cảm ơn bạn đã phản ánh. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.
            </p>
            <div style={styles.doneBtn} onClick={onClose} role="button">
              Đóng
            </div>
          </div>
        ) : (
          /* ── Form báo cáo ── */
          <div style={styles.body}>
            <p style={styles.subtitle}>
              Bạn đang báo cáo tài khoản <strong>{targetUserName || 'này'}</strong>
            </p>

            {/* Danh sách lý do */}
            <div style={styles.reasonList}>
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.value}
                  onClick={() => setSelectedReason(r.value)}
                  style={{
                    ...styles.reasonItem,
                    ...(selectedReason === r.value ? styles.reasonItemActive : {}),
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selectedReason === r.value ? '#0084ff' : '#d1d5db'}`,
                    background: selectedReason === r.value ? '#0084ff' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedReason === r.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={styles.reasonLabel}>{r.label}</span>
                </div>
              ))}
            </div>

            {/* Ghi chú */}
            <textarea
              placeholder="Mô tả thêm (tuỳ chọn)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              style={styles.textarea}
            />
            <div style={styles.charCount}>{note.length}/300</div>

            <div style={styles.footer}>
              <div style={styles.cancelBtn} onClick={onClose} role="button">Huỷ</div>
              <div
                style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                onClick={!loading ? handleSubmit : undefined}
                role="button"
              >
                {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: 430, maxWidth: '95vw',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerTitle: { fontWeight: 700, fontSize: 15, color: '#111' },
  closeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8,
    color: '#888', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  body: { padding: '18px 22px' },
  subtitle: { fontSize: 14, color: '#555', margin: '0 0 14px' },
  reasonList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  reasonItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
    border: '1.5px solid #e5e7eb', transition: 'all 0.15s', userSelect: 'none',
  },
  reasonItemActive: { border: '1.5px solid #0084ff', background: '#eff6ff' },
  reasonLabel: { fontSize: 14, color: '#222' },
  textarea: {
    width: '100%', height: 76, resize: 'none',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#333',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  charCount: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 3 },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelBtn: {
    padding: '9px 20px', background: '#f3f4f6', color: '#555',
    borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    userSelect: 'none',
  },
  submitBtn: {
    padding: '9px 22px', background: '#ef4444', color: '#fff',
    borderRadius: 10, fontWeight: 700, fontSize: 14, userSelect: 'none',
  },
  // Done screen
  doneBox: { padding: '34px 28px', textAlign: 'center' },
  doneIcon: {
    width: 58, height: 58, borderRadius: '50%',
    background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px',
  },
  doneTitle: { margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#111' },
  doneDesc: { fontSize: 14, color: '#555', margin: '0 0 22px', lineHeight: 1.6 },
  doneBtn: {
    display: 'inline-block', padding: '10px 32px', background: '#0084ff', color: '#fff',
    borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, userSelect: 'none',
  },
};
