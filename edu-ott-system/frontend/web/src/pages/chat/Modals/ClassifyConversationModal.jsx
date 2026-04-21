import React, { useState } from 'react';
import { FaTimes, FaCheck, FaTag } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

const CATEGORIES = [
  { value: 'primary',  label: 'Chính',   emoji: '💬', color: '#0084ff', desc: 'Hội thoại thông thường, bạn bè' },
  { value: 'work',     label: 'Công việc', emoji: '💼', color: '#6366f1', desc: 'Nhóm, đồng nghiệp, công việc' },
  { value: 'family',   label: 'Gia đình', emoji: '🏠', color: '#16a34a', desc: 'Người thân trong gia đình' },
  { value: 'other',    label: 'Khác',     emoji: '🗂️', color: '#f59e0b', desc: 'Các hội thoại còn lại' },
];

/**
 * ClassifyConversationModal
 * Props:
 *  - conversationId: string
 *  - currentCategory: 'primary' | 'work' | 'family' | 'other'
 *  - onClose: () => void
 *  - onUpdated: (newCategory) => void  -- callback để ChatPage/ChatRightPanel cập nhật local state
 */
export default function ClassifyConversationModal({
  conversationId,
  currentCategory = 'primary',
  onClose,
  onUpdated,
}) {
  const [selected, setSelected] = useState(currentCategory);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (selected === currentCategory) { onClose(); return; }

    setLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conversationId}/preferences`,
        { category: selected },
        getAuthHeaders()
      );
      toast.success(`Đã phân loại: ${CATEGORIES.find(c => c.value === selected)?.label}`);
      onUpdated?.(selected);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Không thể cập nhật phân loại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <FaTag color="#6366f1" size={15} />
            <span style={styles.headerTitle}>Phân loại hội thoại</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes /></button>
        </div>

        <div style={styles.body}>
          <p style={styles.desc}>Chọn nhãn để sắp xếp hội thoại vào đúng mục:</p>

          <div style={styles.catList}>
            {CATEGORIES.map(cat => {
              const isActive = selected === cat.value;
              return (
                <div
                  key={cat.value}
                  onClick={() => setSelected(cat.value)}
                  style={{
                    ...styles.catItem,
                    border: `2px solid ${isActive ? cat.color : '#e5e7eb'}`,
                    background: isActive ? `${cat.color}10` : '#fff',
                  }}
                >
                  <div style={{ ...styles.catEmoji, background: `${cat.color}22` }}>
                    {cat.emoji}
                  </div>
                  <div style={styles.catInfo}>
                    <span style={{ ...styles.catLabel, color: isActive ? cat.color : '#222' }}>
                      {cat.label}
                    </span>
                    <span style={styles.catDesc}>{cat.desc}</span>
                  </div>
                  {isActive && (
                    <div style={{ ...styles.checkBadge, background: cat.color }}>
                      <FaCheck size={10} color="#fff" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Huỷ</button>
          <button
            style={{ ...styles.saveBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.48)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9998,
  },
  modal: {
    background: '#fff', borderRadius: 18, width: 400,
    boxShadow: '0 10px 40px rgba(0,0,0,0.16)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: '1px solid #f0f0f0',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerTitle: { fontWeight: 700, fontSize: 15, color: '#111' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#888', padding: 4, display: 'flex', alignItems: 'center',
  },
  body: { padding: '20px 22px' },
  desc: { fontSize: 13, color: '#666', margin: '0 0 16px' },
  catList: { display: 'flex', flexDirection: 'column', gap: 10 },
  catItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s', position: 'relative',
  },
  catEmoji: {
    width: 40, height: 40, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  catInfo: { display: 'flex', flexDirection: 'column', gap: 3 },
  catLabel: { fontSize: 14, fontWeight: 700 },
  catDesc: { fontSize: 12, color: '#888' },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '16px 22px', borderTop: '1px solid #f0f0f0',
  },
  cancelBtn: {
    padding: '9px 20px', background: '#f3f4f6', color: '#555',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  saveBtn: {
    padding: '9px 24px', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
  },
};
