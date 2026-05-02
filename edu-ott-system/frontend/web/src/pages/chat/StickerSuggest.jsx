import React, { useEffect, useState, useRef, useCallback } from 'react';

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';
const DEBOUNCE_MS = 400;
const LIMIT = 12;

// ─── Bộ sticker tĩnh built-in (Google Noto Emoji, no CDN needed) ───────────
// Dùng emoji Unicode render thành ảnh qua API twemoji/emojicdn — hoàn toàn free
const STICKER_PACKS = [
  {
    id: 'emotions',
    label: '😀 Cảm xúc',
    stickers: [
      '😀', '😂', '🥹', '😍', '🥰', '😎', '🤩', '😭', '😤', '🥳',
      '😴', '🤔', '😱', '🤣', '😇', '🫡', '🥺', '😏', '🤯', '🫠',
    ],
  },
  {
    id: 'gestures',
    label: '👋 Cử chỉ',
    stickers: [
      '👋', '🤝', '👍', '👎', '🙏', '💪', '🤞', '✌️', '🫶', '❤️',
      '🔥', '💯', '✅', '🎉', '🎊', '💤', '💢', '💬', '👀', '🫂',
    ],
  },
  {
    id: 'animals',
    label: '🐱 Thú cưng',
    stickers: [
      '🐱', '🐶', '🐰', '🐼', '🐨', '🦊', '🐸', '🐻', '🐯', '🦁',
      '🐧', '🦆', '🐙', '🦋', '🐝', '🦄', '🐺', '🦔', '🐮', '🐷',
    ],
  },
];

// Emoji → ảnh PNG via emojicdn.elm.sh (free, no key)
function emojiToUrl(emoji) {
  const codePoints = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f') // remove variation selector
    .join('-');
  return `https://emojicdn.elm.sh/${emoji}?style=twitter`;
}

async function fetchGifs(query) {
  if (!GIPHY_KEY) return [];
  const url = query.trim()
    ? `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${LIMIT}&rating=g&lang=vi`
    : `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=${LIMIT}&rating=g`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const { data } = await res.json();
    return (data || []).map(g => ({
      id: g.id,
      title: g.title || '',
      preview: g.images?.fixed_width_small?.url || g.images?.downsized_small?.url || '',
      url: g.images?.fixed_width?.url || g.images?.downsized?.url || '',
      isGif: true,
    })).filter(g => g.preview && g.url);
  } catch { return []; }
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function StickerSuggest({ query, onSelect, onClose }) {
  const [tab, setTab] = useState('sticker');          // 'sticker' | 'gif'
  const [packIdx, setPackIdx] = useState(0);
  const [gifs, setGifs] = useState([]);
  const [loadingGif, setLoadingGif] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Auto switch sang GIF khi user gõ chữ
  useEffect(() => {
    if (query.trim().length >= 2) setTab('gif');
  }, [query]);

  // Load GIFs khi tab gif active
  const loadGifs = useCallback(async (q) => {
    setLoadingGif(true);
    const results = await fetchGifs(q);
    setGifs(results);
    setLoadingGif(false);
  }, []);

  useEffect(() => {
    if (tab !== 'gif') return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => loadGifs(query), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [tab, query, loadGifs]);

  // Click outside đóng panel
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSelectEmoji = (emoji) => {
    onSelect({
      id: emoji,
      url: emojiToUrl(emoji),
      preview: emojiToUrl(emoji),
      title: emoji,
      isGif: false,
    });
  };

  const currentPack = STICKER_PACKS[packIdx];

  return (
    <div ref={containerRef} style={s.panel}>
      {/* ── Tab bar ── */}
      <div style={s.tabBar}>
        <button
          style={{ ...s.tab, ...(tab === 'sticker' ? s.tabActive : {}) }}
          onClick={() => setTab('sticker')}
        >
          🎭 Sticker
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'gif' ? s.tabActive : {}) }}
          onClick={() => setTab('gif')}
        >
          🎞️ GIF
        </button>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
      </div>

      {/* ── STICKER TAB ── */}
      {tab === 'sticker' && (
        <>
          {/* Pack selector */}
          <div style={s.packBar}>
            {STICKER_PACKS.map((pack, i) => (
              <button
                key={pack.id}
                onClick={() => setPackIdx(i)}
                style={{ ...s.packBtn, ...(i === packIdx ? s.packBtnActive : {}) }}
              >
                {pack.label.split(' ')[0]}
              </button>
            ))}
          </div>
          {/* Sticker grid */}
          <div style={s.grid}>
            {currentPack.stickers.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSelectEmoji(emoji)}
                style={s.emojiBtn}
                title={emoji}
              >
                <span style={s.emojiSpan}>{emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── GIF TAB ── */}
      {tab === 'gif' && (
        <>
          <div style={s.gifHeader}>
            <span style={s.gifLabel}>
              {query.trim() ? `GIF: "${query}"` : '🔥 Trending'}
            </span>
          </div>
          <div style={s.grid}>
            {loadingGif
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} style={s.skeleton} />)
              : !GIPHY_KEY
                ? <div style={s.empty}>⚙️ Chưa có <code>VITE_GIPHY_API_KEY</code></div>
                : gifs.length === 0 && !loadingGif
                  ? <div style={s.empty}>Không tìm thấy GIF 😢</div>
                  : gifs.map(g => (
                    <button key={g.id} onClick={() => onSelect(g)} style={s.gifBtn} title={g.title}>
                      <img src={g.preview} alt={g.title} loading="lazy" style={s.gifImg} />
                    </button>
                  ))
            }
          </div>
          <div style={s.footer}>Powered by <strong style={{ color: '#00b140' }}>GIPHY</strong></div>
        </>
      )}
    </div>
  );
}

const s = {
  panel: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: 0,
    width: 320,
    maxHeight: 320,
    background: 'var(--z-bg-sidebar, #fff)',
    border: '1px solid var(--z-border, #e5e7eb)',
    borderRadius: 12,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--z-border, #e5e7eb)',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--z-text-secondary, #6b7280)',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: 'var(--z-primary, #0068ff)',
    borderBottom: '2px solid var(--z-primary, #0068ff)',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: 'var(--z-text-muted, #9ca3af)',
    padding: '0 10px', alignSelf: 'stretch',
  },
  packBar: {
    display: 'flex',
    gap: 4,
    padding: '6px 8px',
    borderBottom: '1px solid var(--z-border, #e5e7eb)',
    flexShrink: 0,
  },
  packBtn: {
    background: 'none', border: '1px solid transparent',
    borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
    fontSize: 16, transition: 'all 0.1s',
  },
  packBtnActive: {
    background: 'var(--z-bg-hover, #f3f4f6)',
    border: '1px solid var(--z-border, #e5e7eb)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 2,
    padding: 8,
    overflowY: 'auto',
    flex: 1,
  },
  emojiBtn: {
    background: 'none', border: 'none', borderRadius: 8,
    padding: 4, cursor: 'pointer', aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s',
    fontSize: 22,
  },
  emojiSpan: { lineHeight: 1, userSelect: 'none' },
  gifHeader: {
    padding: '4px 12px',
    flexShrink: 0,
  },
  gifLabel: { fontSize: 11, color: 'var(--z-text-muted, #9ca3af)' },
  gifBtn: {
    background: 'none', border: '2px solid transparent',
    borderRadius: 6, padding: 1, cursor: 'pointer',
    overflow: 'hidden', aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  gifImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block' },
  skeleton: { background: 'var(--z-bg-hover, #f3f4f6)', borderRadius: 6, aspectRatio: '1' },
  empty: {
    gridColumn: '1 / -1', padding: '20px 0',
    textAlign: 'center', fontSize: 13, color: 'var(--z-text-muted, #9ca3af)',
  },
  footer: {
    padding: '3px 12px', textAlign: 'right', fontSize: 10,
    color: 'var(--z-text-muted, #9ca3af)',
    borderTop: '1px solid var(--z-border, #e5e7eb)', flexShrink: 0,
  },
};