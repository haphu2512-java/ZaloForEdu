import React, { useEffect, useRef, useState } from 'react';
import {
  FaThumbtack, FaTag, FaEyeSlash, FaFlag, FaChevronRight, FaCheck,
} from 'react-icons/fa';

const CATEGORIES = [
  { value: 'primary', label: '💬 Chính' },
  { value: 'work', label: '💼 Công việc' },
  { value: 'family', label: '🏠 Gia đình' },
  { value: 'other', label: '🗂️ Khác' },
];

/**
 * ConversationContextMenu
 *
 * Props:
 *  conv         – conversation object
 *  position     – { x, y } px từ viewport
 *  onClose      – () => void
 *  onPin        – (conv) => void
 *  onClassify   – (conv, category) => void
 *  onHide       – (conv) => void
 *  onReport     – (conv) => void   (1-1 only)
 *  myId         – string
 */
export default function ConversationContextMenu({
  conv,
  position,
  onClose,
  onPin,
  onClassify,
  onHide,
  onReport,
  myId,
}) {
  const menuRef = useRef(null);
  const [subMenu, setSubMenu] = useState(null); // 'classify'
  const [menuPos, setMenuPos] = useState(position);

  const isPinned = conv?.preference?.isPinned === true;
  const isGroup = conv?.type === 'group' || conv?.roomModel === 'Group';
  const currCat = conv?.preference?.category || 'primary';

  // Đóng khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Clamp vị trí để không bị ra ngoài viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setMenuPos({
      x: Math.min(position.x, vw - width - 8),
      y: Math.min(position.y, vh - height - 8),
    });
  }, [position]);

  const divider = () => (
    <div style={{ height: 1, background: 'var(--z-border)', margin: '4px 0' }} />
  );

  const menuItem = (icon, label, onClick, opts = {}) => (
    <div
      key={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 16px', cursor: 'pointer', fontSize: 13, borderRadius: 6,
        color: opts.danger ? '#ef4444' : 'var(--z-text-primary)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = opts.danger ? '#fff1f2' : 'var(--z-bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        {label}
      </span>
      {opts.arrow && <FaChevronRight size={10} color="#aaa" />}
    </div>
  );

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menuPos.y,
        left: menuPos.x,
        zIndex: 9000,
        background: 'var(--z-bg-sidebar)',
        border: '1px solid var(--z-border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        minWidth: 220,
        padding: '6px 4px',
        userSelect: 'none',
      }}
    >
      {/* ── Ghim / Bỏ ghim ── */}
      {menuItem(
        <FaThumbtack
          size={13}
          color={isPinned ? '#F59E0B' : 'currentColor'}
          style={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)', transition: 'transform 0.2s' }}
        />,
        isPinned ? 'Bỏ ghim hội thoại' : 'Ghim lên đầu',
        () => { onPin(conv); onClose(); }
      )}

      {/* ── Phân loại → sub-menu ── */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={(e) => { e.stopPropagation(); setSubMenu(subMenu === 'classify' ? null : 'classify'); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px', cursor: 'pointer', fontSize: 13,
            color: 'var(--z-text-primary)', borderRadius: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaTag size={13} color="#6366f1" />
            Phân loại
          </span>
          <FaChevronRight size={10} color="#aaa" />
        </div>

        {subMenu === 'classify' && (
          <div style={{
            position: 'absolute', left: '100%', top: 0,
            background: 'var(--z-bg-sidebar)',
            border: '1px solid var(--z-border)',
            borderRadius: 10,
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            minWidth: 175, padding: '6px 4px', zIndex: 9001,
          }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.value}
                onClick={(e) => { e.stopPropagation(); onClassify(conv, cat.value); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderRadius: 6,
                  color: currCat === cat.value ? '#6366f1' : 'var(--z-text-primary)',
                  fontWeight: currCat === cat.value ? 700 : 400,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cat.label}
                {currCat === cat.value && <FaCheck size={11} color="#6366f1" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {divider()}

      {/* ── Ẩn hội thoại ── */}
      {menuItem(
        <FaEyeSlash size={13} />,
        'Ẩn hội thoại',
        () => { onHide(conv); onClose(); }
      )}

      {/* ── Báo cáo (chỉ 1-1) ── */}
      {!isGroup && (
        <>
          {divider()}
          {menuItem(
            <FaFlag size={13} />,
            'Báo cáo tài khoản',
            () => { onReport(conv); onClose(); },
            { danger: true }
          )}
        </>
      )}
    </div>
  );
}

