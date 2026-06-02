import React, { useEffect, useState } from 'react';
import { FaThumbtack, FaTimes, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import axios from "../../../../services/authService";
import { toAbsoluteUrl } from '../chatUtils';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * PinnedMessagesPanel
 * Props:
 *  - conversationId: string
 *  - isPrivileged: boolean (owner / admin hoặc thành viên có quyền pin)
 *  - canPin: boolean (settings.canMembersPin)
 *  - onClose: () => void
 *  - onJumpToMessage: (messageId) => void  -- scroll đến tin nhắn gốc
 */
export default function PinnedMessagesPanel({
  conversationId,
  isPrivileged,
  canPin,
  onClose,
  onJumpToMessage,
}) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  const canUnpin = isPrivileged || canPin;

  const fetchPins = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/conversations/${conversationId}/pins`,
        getAuthHeaders()
      );
      const data = res.data?.data || res.data || [];
      setPins(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải tin nhắn đã ghim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPins(); }, [conversationId]);

  const handleUnpin = async (messageId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/conversations/${conversationId}/pins/${messageId}`,
        getAuthHeaders()
      );
      setPins(prev => prev.filter(p => {
        const id = p.messageId?._id || p.messageId;
        return String(id) !== String(messageId);
      }));
      toast.success('Đã bỏ ghim tin nhắn');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Không thể bỏ ghim');
    }
  };

  const renderPinContent = (pin) => {
    const msg = pin.messageId;
    if (!msg) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>Tin nhắn đã bị xoá</span>;

    if (msg.isRecalled) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>Tin nhắn đã thu hồi</span>;

    const mediaList = msg.mediaIds || msg.media || [];
    const sender = msg.senderId;
    const senderName = sender?.username || 'Người dùng';

    return (
      <div>
        <span style={styles.pinSenderName}>{senderName}: </span>
        {msg.content && <span style={styles.pinText}>{msg.content}</span>}
        {mediaList.length > 0 && (
          <div style={styles.mediaRow}>
            {mediaList.slice(0, 3).map((m, i) => {
              const url = toAbsoluteUrl(m.url);
              const isImg = m.mimeType?.startsWith('image/');
              return isImg ? (
                <img key={i} src={url} alt="" style={styles.mediaThumbnail} />
              ) : (
                <span key={i} style={styles.fileChip}>📎 {m.fileName || 'File'}</span>
              );
            })}
            {mediaList.length > 3 && (
              <span style={styles.moreMedia}>+{mediaList.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <FaThumbtack color="#F59E0B" size={15} />
          <span style={styles.headerTitle}>Tin nhắn đã ghim</span>
          {!loading && <span style={styles.countBadge}>{pins.length}</span>}
        </div>
        <button style={styles.closeBtn} onClick={onClose}><FaTimes size={14} /></button>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {loading ? (
          <div style={styles.emptyText}>Đang tải...</div>
        ) : pins.length === 0 ? (
          <div style={styles.emptyBox}>
            <FaThumbtack size={32} color="#d1d5db" style={{ marginBottom: 10 }} />
            <div style={styles.emptyText}>Chưa có tin nhắn nào được ghim</div>
          </div>
        ) : (
          pins.map((pin, i) => {
            const msgId = pin.messageId?._id || pin.messageId;
            const pinnedByName = pin.pinnedBy?.username || 'Ai đó';

            return (
              <div key={String(msgId) + i} style={styles.pinCard}>
                <div style={styles.pinCardTop}>
                  <div style={styles.pinNumber}>#{pins.length - i}</div>
                  <div style={styles.pinContent}>{renderPinContent(pin)}</div>

                  <div style={styles.pinActions}>
                    {onJumpToMessage && msgId && (
                      <button
                        style={styles.iconBtn}
                        onClick={() => { onJumpToMessage(msgId); onClose(); }}
                        title="Đến tin nhắn"
                      >
                        <FaExternalLinkAlt size={11} />
                      </button>
                    )}
                    {canUnpin && msgId && (
                      <button
                        style={{ ...styles.iconBtn, color: '#ef4444' }}
                        onClick={() => handleUnpin(msgId)}
                        title="Bỏ ghim"
                      >
                        <FaTrash size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.pinMeta}>
                  Ghim bởi <strong>{pinnedByName}</strong> · {formatTime(pin.pinnedAt)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex', flexDirection: 'column',
    height: '100%', background: 'var(--z-bg-main, #fff)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid var(--z-border, #e5e7eb)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: 700, fontSize: 15, color: 'var(--z-text, #111)' },
  countBadge: {
    background: '#F59E0B', color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '1px 7px', borderRadius: 10,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--z-text-muted, #888)', padding: 4, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  emptyBox: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 0',
  },
  emptyText: { color: 'var(--z-text-muted, #aaa)', fontSize: 13, textAlign: 'center' },
  pinCard: {
    background: 'var(--z-bg-sub, #f9fafb)',
    border: '1px solid var(--z-border, #e5e7eb)',
    borderLeft: '3px solid #F59E0B',
    borderRadius: 10, padding: '12px 14px',
  },
  pinCardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  pinNumber: {
    fontSize: 11, fontWeight: 700, color: '#F59E0B',
    minWidth: 22, paddingTop: 2,
  },
  pinContent: { flex: 1, minWidth: 0 },
  pinSenderName: { fontSize: 13, fontWeight: 700, color: 'var(--z-text, #222)' },
  pinText: { fontSize: 13, color: 'var(--z-text, #333)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  mediaRow: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  mediaThumbnail: {
    width: 48, height: 48, objectFit: 'cover',
    borderRadius: 6, border: '1px solid #e5e7eb',
  },
  fileChip: {
    fontSize: 12, background: '#e0e7ff', color: '#3730a3',
    padding: '2px 8px', borderRadius: 6,
  },
  moreMedia: { fontSize: 12, color: '#888' },
  pinActions: { display: 'flex', gap: 4, flexShrink: 0 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--z-text-muted, #888)', padding: '4px 6px',
    borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.15s',
  },
  pinMeta: {
    fontSize: 11, color: 'var(--z-text-muted, #aaa)',
    marginTop: 8, paddingTop: 8,
    borderTop: '1px solid var(--z-border, #f0f0f0)',
  },
};
