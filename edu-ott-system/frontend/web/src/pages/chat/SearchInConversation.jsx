import React, { useState, useCallback, useRef } from 'react';
import { FaSearch, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { conversationService } from '../../services/conversationService';
import { useTheme } from '../../contexts/ThemeContext';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay]
  );
}

export const SearchInConversation = ({ conversationId, onJumpToMessage, onClose }) => {
  const { appliedTheme } = useTheme();
  const isDark = appliedTheme === 'dark';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);

  const doSearch = useCallback(
    async (q, cursor = null) => {
      if (!q.trim() || !conversationId) {
        setResults([]);
        setNextCursor(null);
        return;
      }
      setIsLoading(true);
      try {
        const res = await conversationService.searchMessagesInConversation(conversationId, q.trim(), cursor);
        const items = res.data?.items || res.items || [];
        setResults((prev) => (cursor ? [...prev, ...items] : items));
        setNextCursor(res.data?.nextCursor ?? res.nextCursor ?? null);
        if (!cursor) setSelectedIdx(0);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId]
  );

  const debouncedSearch = useDebounce(doSearch, 350);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setResults([]);
    setNextCursor(null);
    debouncedSearch(val);
  };

  const jumpTo = (idx) => {
    setSelectedIdx(idx);
    onJumpToMessage?.(results[idx]);
  };

  const handlePrev = () => {
    if (selectedIdx > 0) jumpTo(selectedIdx - 1);
  };

  const handleNext = () => {
    const next = selectedIdx + 1;
    if (next < results.length) {
      jumpTo(next);
      // Prefetch more when near the end
      if (next >= results.length - 3 && nextCursor) doSearch(query, nextCursor);
    } else if (nextCursor) {
      doSearch(query, nextCursor);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose?.();
    if (e.key === 'Enter') handleNext();
    if (e.key === 'ArrowUp') { e.preventDefault(); handlePrev(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); handleNext(); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return (
      d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const highlight = (text, q) => {
    if (!q.trim() || !text) return text || '';
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((p, i) =>
      regex.test(p) ? (
        <mark key={i} style={{ background: '#fef08a', color: '#111', borderRadius: 2, padding: '0 1px' }}>
          {p}
        </mark>
      ) : (
        p
      )
    );
  };

  // Theme tokens
  const bg = isDark ? '#1e1f20' : '#ffffff';
  const border = isDark ? '#3a3b3c' : '#e5e7eb';
  const textPrimary = isDark ? '#e4e6eb' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const inputBg = isDark ? '#2d2e2f' : '#f3f4f6';
  const hoverBg = isDark ? '#2d4a7a' : '#eff6ff';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: bg,
        borderBottom: `1px solid ${border}`,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── Input row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: results.length || (!isLoading && query.trim()) ? 8 : 0 }}>
        <FaSearch size={14} color={textSecondary} style={{ flexShrink: 0 }} />
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Tìm trong cuộc trò chuyện..."
          style={{
            flex: 1,
            background: inputBg,
            border: 'none',
            outline: 'none',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 14,
            color: textPrimary,
          }}
        />

        {isLoading && (
          <span style={{ fontSize: 12, color: textSecondary, flexShrink: 0 }}>Đang tìm…</span>
        )}

        {results.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: textSecondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {selectedIdx + 1}/{results.length}{nextCursor ? '+' : ''}
            </span>
            <button
              onClick={handlePrev}
              disabled={selectedIdx === 0}
              title="Kết quả trước"
              style={{
                background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer',
                color: selectedIdx === 0 ? border : textSecondary, padding: 3, lineHeight: 1,
              }}
            >
              <FaChevronUp size={13} />
            </button>
            <button
              onClick={handleNext}
              disabled={selectedIdx === results.length - 1 && !nextCursor}
              title="Kết quả tiếp theo"
              style={{
                background: 'none', border: 'none',
                cursor: (selectedIdx === results.length - 1 && !nextCursor) ? 'default' : 'pointer',
                color: (selectedIdx === results.length - 1 && !nextCursor) ? border : textSecondary,
                padding: 3, lineHeight: 1,
              }}
            >
              <FaChevronDown size={13} />
            </button>
          </>
        )}

        <button
          onClick={onClose}
          title="Đóng tìm kiếm (Esc)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: 3, lineHeight: 1 }}
        >
          <FaTimes size={14} />
        </button>
      </div>

      {/* ── Results ── */}
      {results.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {results.map((msg, idx) => (
            <div
              key={msg._id}
              onClick={() => jumpTo(idx)}
              style={{
                padding: '7px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 2,
                background: idx === selectedIdx ? hoverBg : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <img
                  src={
                    msg.senderId?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderId?.username || '?')}&background=0068FF&color=fff&size=32`
                  }
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                  {msg.senderId?.username || msg.senderId?.fullName || 'Người dùng'}
                </span>
                <span style={{ fontSize: 11, color: textSecondary, marginLeft: 'auto', flexShrink: 0 }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: textSecondary,
                  paddingLeft: 28,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {msg.content ? highlight(msg.content, query) : <em>[Tệp đính kèm]</em>}
              </div>
            </div>
          ))}

          {nextCursor && !isLoading && (
            <div
              onClick={() => doSearch(query, nextCursor)}
              style={{
                textAlign: 'center',
                padding: '6px 0',
                fontSize: 12,
                color: 'var(--z-primary, #0068ff)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Xem thêm kết quả ↓
            </div>
          )}
        </div>
      )}

      {!isLoading && query.trim() && results.length === 0 && (
        <div style={{ fontSize: 13, color: textSecondary, padding: '4px 0' }}>
          Không tìm thấy tin nhắn nào khớp với "{query}".
        </div>
      )}
    </div>
  );
};
