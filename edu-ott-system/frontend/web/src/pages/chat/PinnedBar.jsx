import React, { useState } from 'react';
import { FaThumbtack, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';

export const PinnedBar = ({ pinnedMessages = [], jumpToMessage, setShowRightPanel, setUnpinTargetId, setShowUnpinConfirmModal }) => {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const latestPin = pinnedMessages[pinnedMessages.length - 1];
  const latestContent = latestPin?.messageId?.content || '[Hình ảnh/File]';
  const latestMsgId = latestPin?.messageId?._id || latestPin?.messageId;

  if (!expanded) {
    return (
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px',
          background: 'var(--z-bg-sidebar)',
          borderBottom: '1px solid var(--z-border)',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
        onClick={() => jumpToMessage(latestMsgId)}
      >
        <FaThumbtack size={12} color="#F59E0B" style={{ flexShrink: 0, transform: 'rotate(45deg)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--z-text-muted)', marginBottom: 1 }}>
            📌 {pinnedMessages.length} tin nhắn đã ghim
          </div>
          <div style={{ fontSize: 13, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestContent}</span>
            <span style={{ color: 'var(--z-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Xem</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', padding: 4 }}
          title="Xem tất cả"
        >
          <FaChevronDown size={12} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--z-bg-sidebar)',
      borderBottom: '1px solid var(--z-border)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--z-border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--z-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FaThumbtack size={11} color="#F59E0B" /> {pinnedMessages.length} tin nhắn đã ghim
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRightPanel(true)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-primary)', fontSize: 12, fontWeight: 600 }}
          >Xem tất cả</button>
          <button onClick={() => setExpanded(false)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', padding: 2 }}
          ><FaChevronUp size={12} /></button>
        </div>
      </div>
      {pinnedMessages.map((pin, idx) => {
        const msgContent = pin.messageId?.content || '[Hình ảnh/File]';
        const msgId = pin.messageId?._id || pin.messageId;
        return (
          <div key={pin._id || idx}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', cursor: 'pointer', borderBottom: '1px solid var(--z-border)' }}
            onClick={() => jumpToMessage(msgId)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <FaThumbtack size={10} color="#F59E0B" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {msgContent}
            </span>
            <button onClick={(e) => {
              e.stopPropagation();
              setUnpinTargetId(msgId);
              setShowUnpinConfirmModal(true);
            }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-muted)', padding: 2 }}
              title="Bỏ ghim"
            ><FaTimes size={10} /></button>
          </div>
        );
      })}
    </div>
  );
};
