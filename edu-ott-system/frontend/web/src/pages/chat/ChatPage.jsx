import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  FaSearch, FaPlus, FaEllipsisV, FaPaperPlane, FaPaperclip,
  FaSmile, FaImage, FaVideo, FaUsers, FaUser, FaPhone,
  FaSpinner, FaVideo as FaVideoCall, FaThumbtack, FaCloud,
  FaDownload, FaEllipsisH, FaTrash, FaFilePdf, FaFileAlt,
  FaFileArchive, FaFileVideo, FaUserPlus,
} from "react-icons/fa";
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

// ── Room list item ───────────────────────────────────────────
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
  const ext = (msg.fileName || msg.content || "").split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const isDoc = ["doc","docx"].includes(ext);
  const isImg = ["jpg","jpeg","png","gif","webp"].includes(ext);
  const fileColor = isPdf ? "#EF4444" : isDoc ? "#3B82F6" : "#10B981";

  return (
    <div className={`msg-wrap ${isMe ? "me" : ""}`}>
      {!isMe && (
        <div className="msg-avatar" style={{ background: msg.color }}>{msg.avatar}</div>
      )}
      <div className="msg-body">
        {!isMe && <div className="msg-sender">{msg.sender}</div>}

        {msg.type === "text" && (
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

        <div className="msg-time">{msg.time}</div>
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
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pinned-rooms")) || []; } catch { return []; }
  });
  const messagesEndRef = useRef(null);
  const mediaInputRef = useRef(null);

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
  const handleMediaSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    e.target.value = "";
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

  const handleSend = async () => {
    if (!input.trim() || !activeRoom) return;
    const ok = await sendMessage(activeRoom._id, input);
    if (ok) setInput("");
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

            {/* Input bar */}
            <div className="chat-input-bar">
              <input
                ref={mediaInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleMediaSelect}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
              />
              <button className="cib-btn" title="Đính kèm file" onClick={() => mediaInputRef.current?.click()} disabled={isUploadingMedia}>
                {isUploadingMedia ? <FaSpinner className="spin" size={14} /> : <FaPaperclip size={15} />}
              </button>
              <button className="cib-btn" title="Gửi ảnh" onClick={() => { if (mediaInputRef.current) { mediaInputRef.current.accept = "image/*"; mediaInputRef.current.click(); } }}>
                <FaImage size={15} />
              </button>
              <button className="cib-btn" title="Gửi video" onClick={() => { if (mediaInputRef.current) { mediaInputRef.current.accept = "video/*"; mediaInputRef.current.click(); } }}>
                <FaVideo size={15} />
              </button>
              <div className="cib-input">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
              </div>
              <button className="cib-btn"><FaSmile size={15} /></button>
              <button className="cib-send" onClick={handleSend} disabled={!input.trim()}>
                <FaPaperPlane size={14} />
              </button>
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
