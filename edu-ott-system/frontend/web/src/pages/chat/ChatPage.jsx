import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  FaSearch, FaPlus, FaEllipsisV, FaPaperPlane, FaPaperclip,
  FaSmile, FaImage, FaVideo, FaUsers, FaUser, FaPhone,
  FaSpinner, FaVideo as FaVideoCall, FaThumbtack, FaCloud,
  FaDownload, FaEllipsisH, FaUserPlus, FaRegSmile,
  FaRegImage, FaFolder, FaFilm, FaRegFileAlt, FaThumbsUp,
  FaTimes, FaChevronRight, FaChevronLeft,
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { socketService } from "../../services/socketService";
import { uploadFile } from "../../services/mediaService";
import AddFriendModal from "../../components/Modals/AddFriendModal";
import "./ChatPage.css";

const TYPE_BADGE = {
  group: { label: "Nhóm", bg: "#F0FDF4", color: "#16A34A" },
  dm:    { label: "1-1",  bg: "#FDF4FF", color: "#9333EA" },
};
const TABS = ["Tất cả", "Nhóm", "1-1"];

// ── Sticker data (Zalo-style) ────────────────────────────────
const STICKER_PACKS = [
  {
    id: "bear", name: "Gấu dễ thương",
    stickers: [
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002734/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002735/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002736/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002737/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002738/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002739/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002740/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/52002741/iPhone/sticker@2x.png",
    ]
  },
  {
    id: "cat", name: "Mèo vui vẻ",
    stickers: [
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626494/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626495/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626496/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626497/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626498/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626499/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626500/iPhone/sticker@2x.png",
      "https://stickershop.line-scdn.net/stickershop/v1/sticker/51626501/iPhone/sticker@2x.png",
    ]
  },
];

// ── Sticker/Emoji Picker ─────────────────────────────────────
function StickerEmojiPicker({ onSelectEmoji, onSelectSticker, onClose }) {
  const [tab, setTab] = useState("sticker"); // sticker | emoji | gif
  const [packIdx, setPackIdx] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const pack = STICKER_PACKS[packIdx];

  return (
    <div className="sep-panel" ref={ref}>
      {/* Tabs */}
      <div className="sep-tabs">
        <button className={`sep-tab ${tab === "sticker" ? "active" : ""}`} onClick={() => setTab("sticker")}>STICKER</button>
        <button className={`sep-tab ${tab === "emoji" ? "active" : ""}`} onClick={() => setTab("emoji")}>EMOJI</button>
        <button className={`sep-tab ${tab === "gif" ? "active" : ""}`} onClick={() => setTab("gif")}>GIF</button>
      </div>

      {tab === "sticker" && (
        <div className="sep-sticker-body">
          <div className="sep-sticker-search">
            <FaSearch size={12} color="var(--text-tertiary)" />
            <input placeholder="Tìm kiếm sticker..." />
          </div>
          <div className="sep-sticker-label">Gần đây</div>
          <div className="sep-sticker-grid">
            {pack.stickers.map((url, i) => (
              <button key={i} className="sep-sticker-item" onClick={() => { onSelectSticker(url); onClose(); }}>
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          {/* Pack selector */}
          <div className="sep-pack-bar">
            <button className="sep-pack-nav" onClick={() => setPackIdx(Math.max(0, packIdx - 1))}><FaChevronLeft size={10} /></button>
            {STICKER_PACKS.map((p, i) => (
              <button key={p.id} className={`sep-pack-btn ${packIdx === i ? "active" : ""}`} onClick={() => setPackIdx(i)}>
                <img src={p.stickers[0]} alt={p.name} />
              </button>
            ))}
            <button className="sep-pack-nav" onClick={() => setPackIdx(Math.min(STICKER_PACKS.length - 1, packIdx + 1))}><FaChevronRight size={10} /></button>
            <button className="sep-pack-nav" title="Thêm sticker"><FaPlus size={10} /></button>
          </div>
        </div>
      )}

      {tab === "emoji" && (
        <div className="sep-emoji-body">
          <EmojiPicker
            onEmojiClick={(e) => { onSelectEmoji(e.emoji); onClose(); }}
            width="100%"
            height={360}
            searchPlaceholder="Tìm emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {tab === "gif" && (
        <div className="sep-gif-body">
          <div className="sep-gif-placeholder">
            <FaRegSmile size={32} />
            <p>GIF đang được phát triển</p>
          </div>
        </div>
      )}
    </div>
  );
}
function RoomItem({ room, active, onClick, isPinned, onTogglePin }) {
  const badge = TYPE_BADGE[room.type] || TYPE_BADGE["group"];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`room-item ${active ? "active" : ""} ${isPinned ? "pinned" : ""}`}
      onClick={onClick}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="room-avatar" style={{ background: room.color }}>
        {room.initials}
      </div>
      <div className="room-info">
        <div className="room-name">{room.name}</div>
        <div className="room-badge" style={{ background: badge.bg, color: badge.color }}>
          {room.type === "group" ? <FaUsers size={8} /> : <FaUser size={8} />}
          {badge.label}
        </div>
        <div className="room-last">{room.lastMsg}</div>
      </div>
      <div className="room-meta">
        <div className="rm-top">
          {isPinned && <FaThumbtack className="pin-icon" />}
          <span className="room-time">{room.time}</span>
        </div>
        <div className="rm-bottom">
          {room.unread > 0 ? (
            <span className="room-unread">{room.unread}</span>
          ) : (
            <div className="room-options" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
              <FaEllipsisH />
              {showMenu && (
                <div className="room-menu">
                  <div className="rm-item" onClick={(e) => { e.stopPropagation(); onTogglePin(); setShowMenu(false); }}>
                    {isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────
function Message({ msg, isMe }) {
  const isFile = msg.type === "file";
  const ext = (msg.fileName || "").split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const isDoc = ["doc","docx"].includes(ext);
  const isImg = ["jpg","jpeg","png","gif","webp"].includes(ext);
  const isSticker = msg.type === "text" && (msg.content?.startsWith("https://stickershop.line-scdn.net") || msg.content?.startsWith("https://sticker"));
  const fileColor = isPdf ? "#EF4444" : isDoc ? "#3B82F6" : "#10B981";

  return (
    <div className={`msg-wrap ${isMe ? "me" : ""}`}>
      {!isMe && (
        <div className="msg-avatar" style={{ background: msg.color }}>{msg.avatar}</div>
      )}
      <div className="msg-body">
        {!isMe && <div className="msg-sender">{msg.sender}</div>}

        {isSticker && (
          <img src={msg.content} alt="sticker" className="msg-sticker" />
        )}

        {!isSticker && msg.type === "text" && (
          <div className={`msg-bubble ${isMe ? "me" : ""}`}>{msg.content}</div>
        )}

        {isFile && isImg && msg.fileUrl && (
          <div className="msg-img-wrap">
            <img src={msg.fileUrl} alt={msg.fileName} className="msg-img" />
          </div>
        )}

        {isFile && !isImg && (
          <div className="msg-file-card">
            <div className="mfc-icon" style={{ background: fileColor }}>
              {isPdf ? "PDF" : isDoc ? "DOC" : ext.toUpperCase().slice(0,4)}
            </div>
            <div className="mfc-info">
              <div className="mfc-name">{msg.fileName || msg.content}</div>
              <div className="mfc-meta">
                <span>{msg.fileSize || ""}</span>
                <span className="mfc-cloud-tag"><FaCloud size={9} /> Cloud</span>
              </div>
            </div>
            {msg.fileUrl && (
              <a className="mfc-download" href={msg.fileUrl} target="_blank" rel="noreferrer">
                <FaDownload size={14} />
              </a>
            )}
          </div>
        )}

        {!isSticker && <div className="msg-time">{msg.time}</div>}
      </div>
    </div>
  );
}

// ── Adapters ─────────────────────────────────────────────────
const adaptConversation = (c, myUserId) => {
  if (!c) return null;
  let name, initials, subtitle, color;
  const type = c.type === "direct" ? "dm" : "group";

  if (c.type === "direct") {
    const other = c.participants?.find((p) => p._id !== myUserId);
    name = other?.username || "Người dùng";
    initials = name.substring(0, 2).toUpperCase();
    color = "#9333EA";
    subtitle = other?.isOnline ? "🟢 Đang hoạt động" : "Ngoại tuyến";
  } else {
    name = c.name || "Nhóm";
    initials = name.substring(0, 2).toUpperCase();
    color = "#16A34A";
    subtitle = `${c.participants?.length || 0} thành viên`;
  }

  let lastMsg = "Chưa có tin nhắn";
  if (c.latestMessage) {
    lastMsg = c.latestMessage.type === "text"
      ? c.latestMessage.content
      : "📎 Đã gửi file";
  }

  let time = "";
  try { if (c.lastMessageAt) time = format(new Date(c.lastMessageAt), "HH:mm"); } catch {}

  return { id: c._id, type, name, lastMsg, time, unread: c.preference?.unreadCount || 0, color, initials, subtitle, raw: c };
};

const adaptMessage = (m, myUserId) => {
  const isMe = m.senderId?._id === myUserId;
  let timeStr = "";
  try { timeStr = format(new Date(m.createdAt), "HH:mm"); } catch {}

  // Xác định loại message
  const hasMedia = m.mediaIds?.length > 0 || m.media?.length > 0;
  const mediaItem = m.media?.[0] || null;
  const isFile = hasMedia || m.type === "file";

  return {
    id: m._id,
    senderId: m.senderId?._id,
    sender: m.senderId?.username || "Unknown",
    content: m.content || "",
    time: timeStr,
    type: isFile ? "file" : "text",
    fileName: mediaItem?.fileName || m.content,
    fileUrl: mediaItem?.url || null,
    fileSize: mediaItem?.size ? `${(mediaItem.size / 1024).toFixed(0)} KB` : null,
    color: isMe ? "#E91E63" : "#4CAF50",
    avatar: m.senderId?.username?.substring(0, 1).toUpperCase() || "U",
    isMe,
    raw: m,
  };
};

// ── Main Component ────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore();
  const {
    conversations, fetchConversations, isFetchingConversations, hasMoreConversations,
    activeRoom, setActiveRoom, fetchMessages, messages, isFetchingMessages,
    hasMoreMessages, sendMessage, handleSocketNewMessage,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState(0);
  const [input, setInput] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pinned-rooms")) || []; } catch { return []; }
  });
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const togglePin = (roomId) => {
    setPinnedIds((prev) => {
      const next = prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId];
      localStorage.setItem("pinned-rooms", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeRoom]);

  useEffect(() => {
    fetchConversations(true);
    socketService.connect();
    socketService.on("new_message", handleSocketNewMessage);
    return () => socketService.disconnect();
  }, []);

  // Send file in chat
  const handleUpload = useCallback(async (file) => {
    if (!file || !activeRoom) return;
    try {
      setIsUploadingMedia(true);
      const media = await uploadFile(file, { folder: `zaloapp/chats/${activeRoom._id}` });
      await sendMessage(activeRoom._id, file.name, [media._id || media.id]);
    } catch (err) {
      alert("Gửi file thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsUploadingMedia(false);
    }
  }, [activeRoom, sendMessage]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }, [handleUpload]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoom) return;
    const ok = await sendMessage(activeRoom._id, input);
    if (ok) setInput("");
  };

  const handleStickerSend = async (url) => {
    if (!activeRoom) return;
    await sendMessage(activeRoom._id, url);
  };

  const handleEmojiSelect = (emoji) => {
    setInput((prev) => prev + emoji);
  };

  // Build room list
  let roomList = conversations.map((c) => adaptConversation(c, user?.id)).filter(Boolean);

  // Filter by tab + search
  let filtered = roomList.filter((r) => {
    if (activeTab === 1 && r.type !== "group") return false;
    if (activeTab === 2 && r.type !== "dm") return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort: pinned first
  filtered.sort((a, b) => {
    const aPin = pinnedIds.includes(a.id);
    const bPin = pinnedIds.includes(b.id);
    if (aPin === bPin) return 0;
    return aPin ? -1 : 1;
  });

  const activeUiRoom = activeRoom ? adaptConversation(activeRoom, user?.id) : null;
  const activeMessagesRaw = activeRoom && messages[activeRoom._id] ? messages[activeRoom._id] : [];
  const activeMessages = [...activeMessagesRaw].reverse().map((m) => adaptMessage(m, user?.id));

  return (
    <div className="chat-page">
      {/* ── ROOM SIDEBAR ── */}
      <div className="room-sidebar">
        <div className="rs-header">
          <span className="rs-title">Tin nhắn</span>
          <div className="rs-header-actions">
            <button className="rs-add-btn" onClick={() => setShowAddFriend(true)} title="Thêm bạn">
              <FaUserPlus size={16} />
            </button>
            <button className="rs-add-btn" title="Tạo nhóm">
              <FaPlus size={12} />
            </button>
          </div>
        </div>

        <div className="rs-search">
          <FaSearch size={12} color="#9CA3AF" />
          <input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rs-tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`rs-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
              {t}
            </button>
          ))}
        </div>

        <div className="rs-list">
          {isFetchingConversations && conversations.length === 0 ? (
            <div className="rs-loading"><FaSpinner className="spin" /> Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="rs-empty">Không có hội thoại nào</div>
          ) : (
            filtered.map((r) => (
              <RoomItem
                key={r.id}
                room={r}
                active={activeRoom?._id === r.raw._id}
                onClick={() => setActiveRoom(r.raw)}
                isPinned={pinnedIds.includes(r.id)}
                onTogglePin={() => togglePin(r.id)}
              />
            ))
          )}
          {hasMoreConversations && (
            <button className="load-more-btn" onClick={() => fetchConversations()} disabled={isFetchingConversations}>
              Tải thêm
            </button>
          )}
        </div>
      </div>

      {/* ── CHAT MAIN ── */}
      <div className="chat-main">
        {!activeUiRoom ? (
          <div className="chat-empty-state">
            <FaCommentDots size={48} />
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Chọn từ danh sách bên trái để bắt đầu nhắn tin</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <div className="ch-left">
                <div className="ch-avatar" style={{ background: activeUiRoom.color }}>
                  {activeUiRoom.initials}
                </div>
                <div>
                  <div className="ch-name">{activeUiRoom.name}</div>
                  <div className="ch-sub">{activeUiRoom.subtitle}</div>
                </div>
              </div>
              <div className="ch-actions">
                <button className="ch-btn-icon" title="Gọi thoại"><FaPhone size={14} /></button>
                <button className="ch-btn-icon" title="Video call"><FaVideoCall size={14} /></button>
                <button className="ch-btn-icon" title="Tùy chọn"><FaEllipsisV size={14} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {hasMoreMessages[activeRoom._id] && (
                <div style={{ textAlign: "center", padding: 10 }}>
                  <button className="load-more-btn" onClick={() => fetchMessages(activeRoom._id)} disabled={isFetchingMessages}>
                    {isFetchingMessages ? "Đang tải..." : "Tải thêm tin nhắn cũ"}
                  </button>
                </div>
              )}
              {activeMessages.map((msg) => (
                <Message key={msg.id} msg={msg} isMe={msg.isMe} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar - Zalo style */}
            <div className="chat-input-area">
              {/* Toolbar top */}
              <div className="cia-toolbar">
                {/* Hidden file inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileInput} />
                <input ref={videoInputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={handleFileInput} />
                <input ref={fileInputRef} type="file" accept="*/*" style={{ display:"none" }} onChange={handleFileInput} />

                <button className="cia-tool-btn" title="Sticker / Emoji" onClick={() => setShowStickerPicker(!showStickerPicker)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                </button>
                <button className="cia-tool-btn" title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <button className="cia-tool-btn" title="Đính kèm file" onClick={() => fileInputRef.current?.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button className="cia-tool-btn" title="Gửi video" onClick={() => videoInputRef.current?.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </button>
                <button className="cia-tool-btn" title="Gửi thư mục" onClick={() => { if(fileInputRef.current){ fileInputRef.current.setAttribute("webkitdirectory",""); fileInputRef.current.click(); } }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </button>
                <div className="cia-tool-divider" />
                <button className="cia-tool-btn" title="Tạo bình chọn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </button>
                <button className="cia-tool-btn" title="Nhắc hẹn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </button>
                <button className="cia-tool-btn" title="Thêm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>

              {/* Text input row */}
              <div className="cia-input-row">
                <div className="cia-input-wrap">
                  <input
                    className="cia-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập @, tin nhắn tới đây"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  />
                  <button className="cia-emoji-inline" onClick={() => setShowStickerPicker(!showStickerPicker)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </button>
                </div>
                {input.trim() ? (
                  <button className="cia-send-btn" onClick={handleSend}>
                    <FaPaperPlane size={16} />
                  </button>
                ) : (
                  <button className="cia-like-btn" onClick={() => activeRoom && sendMessage(activeRoom._id, "👍")}>
                    <FaThumbsUp size={18} />
                  </button>
                )}
              </div>

              {/* Sticker/Emoji picker */}
              {showStickerPicker && (
                <StickerEmojiPicker
                  onSelectEmoji={handleEmojiSelect}
                  onSelectSticker={handleStickerSend}
                  onClose={() => setShowStickerPicker(false)}
                />
              )}

              {/* Upload indicator */}
              {isUploadingMedia && (
                <div className="cia-uploading">
                  <FaSpinner className="spin" size={12} /> Đang gửi file...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      {activeUiRoom && (
        <div className="chat-right-panel">
          <div className="crp-header">
            <div className="crp-avatar" style={{ background: activeUiRoom.color }}>
              {activeUiRoom.initials}
            </div>
            <div className="crp-name">{activeUiRoom.name}</div>
            <div className="crp-sub">{activeUiRoom.subtitle}</div>
          </div>
          <div className="crp-section">
            <div className="crp-section-title">Thành viên</div>
            {activeUiRoom.raw.participants?.map((m) => (
              <div key={m._id} className="crp-member">
                <div className="crp-m-av" style={{ background: "#f3f4f6", color: "#1f2937" }}>
                  {m.username?.substring(0, 1).toUpperCase() || "U"}
                </div>
                <span className="crp-m-name">{m.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddFriendModal isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </div>
  );
}

// Missing import fix
function FaCommentDots(props) {
  return <svg viewBox="0 0 512 512" width={props.size || 16} height={props.size || 16} fill="currentColor" {...props}><path d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 2.7 466 2.2 466.5c-2.2 2.3-2.8 5.7-1.5 8.7S4.8 480 8 480c66.3 0 116-31.8 140.6-51.4C169.1 433.1 212.1 448 256 448c141.4 0 256-93.1 256-208S397.4 32 256 32z"/></svg>;
}
