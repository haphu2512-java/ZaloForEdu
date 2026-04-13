import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  FaSearch,
  FaPlus,
  FaEllipsisV,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaImage,
  FaFile,
  FaVideo,
  FaBook,
  FaUsers,
  FaUser,
  FaChevronDown,
  FaPhone,
  FaSpinner,
  FaVideo as FaVideoCall,
  FaThumbtack,
  FaCloud,
  FaCloudDownloadAlt,
  FaDownload,
  FaEllipsisH,
  FaTrash,
  FaFilePdf,
  FaFileAlt,
  FaFileArchive,
  FaFileVideo,
  FaCheckCircle,
  FaUserPlus
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { socketService } from "../../services/socketService";
import { uploadFile, deleteMedia, getFileCategory, ALL_ALLOWED_EXTENSIONS } from "../../services/mediaService";
import AddFriendModal from "../../components/Modals/AddFriendModal";
import "./ChatPage.css";

const TYPE_BADGE = {
  group: { label: "Nhóm", bg: "#F0FDF4", color: "#16A34A" },
  dm: { label: "1-1", bg: "#FDF4FF", color: "#9333EA" },
};

const TABS = ["Tất cả", "Nhóm", "1-1"];

function RoomItem({ room, active, onClick, isPinned, onTogglePin }) {
  const badge = TYPE_BADGE[room.type] || TYPE_BADGE["group"];
  const isCloud = room.type === 'cloud';
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className={`room-item ${active ? "active" : ""} ${isPinned ? "pinned" : ""}`} 
      onClick={onClick}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="room-avatar" style={{ background: isCloud ? '#0068FF' : room.color }}>
        {isCloud ? <FaCloud size={16} color="white" /> : room.initials}
      </div>
      <div className="room-info">
        <div className="room-name">{room.name}</div>
        <div
          className="room-badge"
          style={{ background: badge.bg, color: badge.color }}
        >
          {room.type === "group" && <FaUsers size={8} />}
          {room.type === "dm" && <FaUser size={8} />}
          {room.type === "cloud" && <FaCloud size={8} />}
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

// ── File Icon helper ──────────────────────────────────
function FileIcon({ category, ext }) {
  const style = { fontSize: 22 };
  if (category === "image") return <FaImage style={style} color="#10B981" />;
  if (category === "video") return <FaFileVideo style={style} color="#8B5CF6" />;
  if (ext?.toLowerCase() === "pdf") return <FaFilePdf style={style} color="#EF4444" />;
  if (category === "archive") return <FaFileArchive style={style} color="#F59E0B" />;
  return <FaFileAlt style={style} color="#3B82F6" />;
}

function formatBytes(bytes) {
  if (!bytes) return "–";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function Message({ msg, isMe }) {
  const isFile = msg.type === "file";
  const isDoc = isFile && msg.content?.toLowerCase().includes('.doc');
  const isPdf = isFile && msg.content?.toLowerCase().includes('.pdf');
  const fileColor = isPdf ? '#EF4444' : isDoc ? '#3B82F6' : '#10B981';

  return (
    <div className={`msg-wrap ${isMe ? "me" : ""}`}>
      {!isMe && (
        <div className="msg-avatar" style={{ background: msg.color }}>
          {msg.avatar}
        </div>
      )}
      <div className="msg-body">
        {!isMe && <div className="msg-sender">{msg.sender}</div>}
        
        {msg.type === "text" && (
          <div className={`msg-bubble ${isMe ? "me" : ""}`}>{msg.content}</div>
        )}
        
        {isFile && (
          <div className="msg-file-card">
            <div className="mfc-icon" style={{ background: fileColor }}>
              {isPdf ? "PDF" : isDoc ? "DOC" : "FILE"}
            </div>
            <div className="mfc-info">
              <div className="mfc-name">{msg.content}</div>
              <div className="mfc-meta">
                <span>{msg.fileSize || "1.2 MB"}</span>
                <span className="mfc-cloud-tag"><FaCloud size={9} /> Đã có trên Cloud</span>
              </div>
            </div>
            <button className="mfc-download">
              <FaDownload size={14} />
            </button>
          </div>
        )}
        
        <div className="msg-time">{msg.time}</div>
      </div>
    </div>
  );
}

// ---------------- ADAPTERS ----------------
const adaptConversation = (c, myUserId) => {
  if (!c) return null;
  let name = "";
  let initials = "";
  let subtitle = "";
  let color = "#1B6EF3";
  let type = c.type === "direct" ? "dm" : "group"; // temporarily no class separation

  // Nhận diện My Cloud
  const isCloud = c.type === "cloud" || (c.type === "direct" && c.participants?.length === 1 && c.participants[0]._id === myUserId) || (c.participants?.length === 2 && c.participants[0]._id === c.participants[1]._id);
  
  if (isCloud) {
    type = "cloud";
    name = "My Documents";
    initials = "☁️";
    color = "#0068FF";
    subtitle = "Lưu và đồng bộ dữ liệu giữa các thiết bị";
  } else if (c.type === "direct") {
    const other = c.participants?.find((p) => p._id !== myUserId);
    name = other ? other.username : "Unknown User";
    initials = name.substring(0, 2).toUpperCase();
    color = "#9333EA";
    subtitle = "Bạn bè";
  } else {
    name = c.name || "Nhóm";
    initials = name.substring(0, 2).toUpperCase();
    color = "#16A34A";
    subtitle = `${c.participants?.length || 0} thành viên`;
  }

  let lastMsg = "Chưa có tin nhắn";
  if (c.latestMessage) {
    if (c.latestMessage.type === "text") lastMsg = c.latestMessage.content;
    else lastMsg = "Đã gửi file đính kèm";
  }

  let time = "";
  if (c.lastMessageAt) {
    try {
      time = format(new Date(c.lastMessageAt), "HH:mm");
    } catch (e) {}
  }

  return {
    id: c._id,
    type,
    name,
    lastMsg,
    time,
    unread: c.preference?.unreadCount || 0,
    color,
    initials,
    subtitle,
    isCloud,
    raw: c,
  };
};

const adaptMessage = (m, myUserId) => {
  const isMe = m.senderId?._id === myUserId;
  let timeStr = "";
  try {
    timeStr = format(new Date(m.createdAt), "HH:mm");
  } catch (e) {}

  return {
    id: m._id,
    senderId: m.senderId?._id,
    sender: m.senderId?.username || "Unknown",
    content: m.content,
    time: timeStr,
    type: m.type === "text" || !m.type ? "text" : "file",
    color: isMe ? "#E91E63" : "#4CAF50",
    avatar: m.senderId?.username?.substring(0, 1).toUpperCase() || "U",
    isMe,
    raw: m,
  };
};
// ------------------------------------------

export default function ChatPage({ defaultCloud = false }) {
  const { user } = useAuthStore();
  const {
    conversations,
    fetchConversations,
    isFetchingConversations,
    hasMoreConversations,
    activeRoom,
    setActiveRoom,
    fetchMessages,
    messages,
    isFetchingMessages,
    hasMoreMessages,
    sendMessage,
    handleSocketNewMessage,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState(0);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cloud files state
  const [cloudFiles, setCloudFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // null | { name, percent }
  const [uploadError, setUploadError] = useState("");
  const [cloudTab, setCloudTab] = useState("all"); // "all" | "image" | "video" | "doc" | "archive"
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pinned-rooms')) || []; } catch(e) { return []; }
  });

  const togglePin = (roomId) => {
    setPinnedIds(prev => {
      const newIds = prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId];
      localStorage.setItem('pinned-rooms', JSON.stringify(newIds));
      return newIds;
    });
  };

  // Scroll to bottom when new messages come
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeRoom]);

  // Initial fetch and Socket connection
  useEffect(() => {
    fetchConversations(true);

    socketService.connect();
    socketService.on("new_message", (msg) => {
      handleSocketNewMessage(msg);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Load My Documents files from backend when entering cloud view
  const activeIsCloudCheck = !!activeRoom && (activeRoom._id === 'mock-cloud-id' || activeRoom.type === 'cloud');
  useEffect(() => {
    if (!activeIsCloudCheck) return;
    let cancelled = false;
    (async () => {
      try {
        const { getMyMedia } = await import("../../services/mediaService");
        const data = await getMyMedia(1, 50);
        if (!cancelled) setCloudFiles(data?.media || []);
      } catch {
        // Cloudinary chưa configure hoặc lỗi mạng — bỏ qua, cho phép upload bình thường
      }
    })();
    return () => { cancelled = true; };
  }, [activeIsCloudCheck]);

  // ── Upload file handler ──────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input để có thể chọn lại cùng file
    e.target.value = "";

    setUploadError("");
    setUploadProgress({ name: file.name, percent: 0 });

    try {
      const media = await uploadFile(file, {
        folder: `zaloapp/cloud/${user?.id}`,
        onProgress: (pct) => setUploadProgress({ name: file.name, percent: pct }),
      });
      setCloudFiles((prev) => [{ ...media, uploadedAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      setUploadError(err.message || "Upload thất bại");
    } finally {
      setUploadProgress(null);
    }
  }, [user]);

  const handleDeleteCloudFile = useCallback(async (mediaId) => {
    if (!window.confirm("Xoá file này khỏi My Documents?")) return;
    try {
      await deleteMedia(mediaId);
      setCloudFiles((prev) => prev.filter((f) => f._id !== mediaId));
    } catch {
      alert("Xoá thất bại, vui lòng thử lại.");
    }
  }, []);

  const handleMediaSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    e.target.value = "";

    try {
      setIsUploadingMedia(true);
      const media = await uploadFile(file, {
        folder: `zaloapp/chats/${activeRoom._id}`,
      });
      // Gửi tin nhắn kèm mediaId
      await sendMessage(activeRoom._id, null, [media._id || media.id]);
    } catch (err) {
      alert("Gửi file thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsUploadingMedia(false);
    }
  }, [activeRoom, sendMessage]);

  // Handle auto-select for defaultCloud
  useEffect(() => {
    if (defaultCloud) {
      const cloudRoom = roomList.find((r) => r.isCloud);
      if (cloudRoom && (!activeRoom || activeRoom._id !== cloudRoom.raw._id)) {
        setActiveRoom(cloudRoom.raw);
      }
    } else {
      if (activeRoom && activeRoom._id === 'mock-cloud-id') {
        setActiveRoom(null);
      }
    }
  }, [defaultCloud, conversations, activeRoom]);

  // UI mapping
  let roomList = conversations.map((c) => adaptConversation(c, user?.id)).filter(Boolean);
  
  // Tự động ghim hoặc thêm My Cloud nếu chưa có (Mocking purpose)
  const hasCloud = roomList.some(r => r.isCloud);
  if (!hasCloud && user) {
    const fakeCloud = {
      id: 'mock-cloud-id',
      type: 'cloud',
      name: 'My Documents',
      lastMsg: "Lưu và đồng bộ dữ liệu...",
      time: "",
      unread: 0,
      color: "#0068FF",
      initials: "☁️",
      subtitle: "Lưu trữ và đồng bộ dữ liệu giữa các thiết bị",
      isCloud: true,
      raw: { _id: 'mock-cloud-id', type: 'cloud', participants: [{ _id: user.id }] }
    };
    roomList.unshift(fakeCloud);
  }

  let filtered = roomList.filter((r) => {
    if (defaultCloud) return r.isCloud;
    if (activeTab === 0) return true;
    if (activeTab === 1) return r.type === "group";
    if (activeTab === 2) return r.type === "dm";
    return true;
  });

  // Sort: Pinned first
  filtered.sort((a, b) => {
    const aPin = pinnedIds.includes(a.id) || a.isCloud; // Ưu tiên mây
    const bPin = pinnedIds.includes(b.id) || b.isCloud;
    if (aPin === bPin) return 0;
    return aPin ? -1 : 1;
  });

  let activeUiRoom = null;
  if (activeRoom) {
    if (activeRoom._id === 'mock-cloud-id') {
      activeUiRoom = roomList.find(r => r.id === 'mock-cloud-id') || null;
    } else {
      activeUiRoom = adaptConversation(activeRoom, user?.id);
    }
  }
  const activeIsCloud = activeUiRoom?.isCloud;
  
  // Notice: The backend returns latest messages FIRST. 
  // We need to reverse them before displaying so newest are at the bottom.
  const activeMessagesRaw = activeRoom && messages[activeRoom._id] ? messages[activeRoom._id] : [];
  const activeMessages = [...activeMessagesRaw].reverse().map((m) => adaptMessage(m, user?.id));

  // Tính dung lượng ảo (Storage Calculation Mock)
  const storageData = useMemo(() => {
    if (!activeIsCloud) return { used: 0, total: 1024, files: 0, images: 0 };
    const filesSize = activeMessages.filter(m => m.type === 'file').length * 2.1;
    const imagesSize = activeMessages.filter(m => m.type === 'image').length * 3.5;
    const others = 500; // Base system files mock
    return {
      used: parseFloat((filesSize + imagesSize + others).toFixed(1)),
      total: 1024,
      files: filesSize,
      images: imagesSize
    };
  }, [activeMessages, activeIsCloud]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoom) return;
    const ok = await sendMessage(activeRoom._id, input);
    if (ok) setInput("");
  };

  return (
    <div className="chat-page">
      {/* ── DANH SÁCH ROOM ── */}
      <div className="room-sidebar">
        <div className="rs-header">
          <span className="rs-title">Tin nhắn</span>
          {!defaultCloud && (
            <div className="rs-header-actions">
              <button className="rs-add-btn" onClick={() => setShowAddFriend(true)} title="Thêm bạn">
                <FaUserPlus size={16} />
              </button>
              <button className="rs-add-btn" title="Tạo nhóm">
                <FaPlus size={12} />
              </button>
            </div>
          )}
        </div>
        {!defaultCloud && (
          <>
            <div className="rs-search">
              <FaSearch size={12} color="#9CA3AF" />
              <input placeholder="Tìm kiếm..." />
            </div>
            <div className="rs-tabs">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  className={`rs-tab ${activeTab === i ? "active" : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="rs-list">
          {isFetchingConversations && conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
              <FaSpinner className="spin" /> Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#6b7280", fontSize: 13 }}>
              Không có hội thoại nào
            </div>
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
            <button 
              className="load-more-btn"
              onClick={() => fetchConversations()}
              disabled={isFetchingConversations}
            >
              Tải thêm
            </button>
          )}
        </div>
      </div>

      {/* ── VÙNG CHAT ── */}
      <div className="chat-main">
        {!activeUiRoom ? (
          <div className="chat-empty-state">
            Vui lòng chọn một cuộc trò chuyện để bắt đầu
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
                {activeUiRoom.type === "class" && (
                  <>
                    <button className="ch-btn">
                      <FaFile size={13} /> Tài liệu
                    </button>
                    <button className="ch-btn">
                      <FaUsers size={13} /> Thành viên
                    </button>
                  </>
                )}
                {!activeIsCloud && (
                  <>
                    <button className="ch-btn-icon">
                      <FaPhone size={14} />
                    </button>
                    <button className="ch-btn-icon">
                      <FaVideoCall size={14} />
                    </button>
                  </>
                )}
                <button className="ch-btn-icon" onClick={() => document.querySelector('.chat-page').classList.toggle('panel-hidden')}>
                  <FaEllipsisV size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {hasMoreMessages[activeRoom._id] && (
                <div style={{ textAlign: "center", padding: 10 }}>
                   <button 
                     onClick={() => fetchMessages(activeRoom._id)} 
                     className="load-more-btn"
                   >
                     {isFetchingMessages ? "Đang tải..." : "Tải thêm tin nhắn cũ"}
                   </button>
                </div>
              )}

              {activeMessages.map((msg) => (
                <Message key={msg.id} msg={msg} isMe={msg.isMe} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeIsCloud ? (
              /* ── Cloud Upload Bar ── */
              <div className="chat-input-bar" style={{ gap: 10, flexWrap: "wrap", minHeight: 60, alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.tar,.gz"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                {uploadProgress ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Đang upload: {uploadProgress.name}</span>
                    <div style={{ height: 6, background: "var(--border-color)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${uploadProgress.percent}%`, background: "var(--primary)", transition: "width 0.2s ease", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--primary)" }}>{uploadProgress.percent}%</span>
                  </div>
                ) : (
                  <>
                    <button className="cib-btn" style={{ fontSize: 13, gap: 6, display: "flex", alignItems: "center", padding: "8px 14px", background: "var(--primary)", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => fileInputRef.current?.click()}>
                      <FaPlus size={12} /> Tải lên file
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Hỗ trợ: Ảnh, Video, PDF, Word, ZIP, RAR,...</span>
                  </>
                )}
                {uploadError && <span style={{ fontSize: 12, color: "#EF4444", flex: "0 0 100%" }}>{uploadError}</span>}
              </div>
            ) : (
              <div className="chat-input-bar">
                <input
                  type="file"
                  id="chat-file-input"
                  style={{ display: "none" }}
                  onChange={handleMediaSelect}
                />
                <button className="cib-btn" onClick={() => document.getElementById('chat-file-input').click()} disabled={isUploadingMedia}>
                  {isUploadingMedia ? <FaSpinner className="spin" /> : <FaPaperclip size={15} />}
                </button>
                <button className="cib-btn" onClick={() => document.getElementById('chat-file-input').click()} disabled={isUploadingMedia}>
                  <FaImage size={15} />
                </button>
                <button className="cib-btn" onClick={() => document.getElementById('chat-file-input').click()} disabled={isUploadingMedia}>
                  <FaVideo size={15} />
                </button>
                <div className="cib-input">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                </div>
                <button className="cib-btn">
                  <FaSmile size={15} />
                </button>
                <button className="cib-send" onClick={handleSend}>
                  <FaPaperPlane size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>


      {/* ── RIGHT PANEL ── */}
      {activeUiRoom && (
        <div className="chat-right-panel">
          {activeIsCloud ? (
            <div className="cloud-panel">
              <div className="cloud-panel-header">
                <div className="cp-icon"><FaCloud size={24} /></div>
                <h3>My Documents</h3>
                <p>Lưu trữ và truy cập nhanh. Tải lên ảnh, video, tài liệu và file nén.</p>
              </div>

              <div className="cp-storage">
                <div className="cp-storage-top">
                   <span>Dung lượng</span>
                   <span className="cp-storage-value">{storageData.used} MB / 1 GB</span>
                </div>
                <div className="cp-progress">
                  <div className="cp-pg-bar image" style={{ width: `${(storageData.images / storageData.total) * 100}%` }}></div>
                  <div className="cp-pg-bar video" style={{ width: "0%" }}></div>
                  <div className="cp-pg-bar file" style={{ width: `${(storageData.files / storageData.total) * 100}%` }}></div>
                  <div className="cp-pg-bar other" style={{ width: `${((storageData.used - storageData.images - storageData.files) / storageData.total) * 100}%` }}></div>
                </div>
                <div className="cp-legend">
                  <span><div className="lg-dot image"></div>Ảnh ({cloudFiles.filter(f => f.providerResourceType === "image").length})</span>
                  <span><div className="lg-dot video"></div>Video ({cloudFiles.filter(f => f.providerResourceType === "video").length})</span>
                  <span><div className="lg-dot file"></div>File ({cloudFiles.filter(f => f.providerResourceType === "raw").length})</span>
                  <span><div className="lg-dot other"></div>Khác</span>
                </div>
              </div>

              {/* ── Section: Ảnh/Video ── */}
              <div className="cp-section-card">
                <div className="cp-card-header">
                  <h4>Ảnh/Video</h4>
                  <button className="cp-view-all" onClick={() => setCloudTab("image")}>Xem tất cả</button>
                </div>
                <div className="cp-media-grid">
                  {cloudFiles.filter(f => f.providerResourceType === "image").slice(0, 4).map(f => (
                    <div key={f._id} className="cp-media-item">
                      <img src={f.url} alt="" />
                    </div>
                  ))}
                  {cloudFiles.filter(f => f.providerResourceType === "image").length === 0 && (
                    <div style={{ gridColumn: "span 4", textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", padding: "10px 0" }}>Trống</div>
                  )}
                </div>
              </div>

              {/* ── Section: File ── */}
              <div className="cp-section-card">
                <div className="cp-card-header">
                  <h4>File</h4>
                  <button className="cp-view-all" onClick={() => setCloudTab("doc")}>Xem tất cả</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cloudFiles.filter(f => f.providerResourceType === "raw").slice(0, 3).map(f => {
                    const ext = f.fileName?.split(".").pop();
                    const cat = getFileCategory(`.${ext}`);
                    return (
                      <div key={f._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileIcon category={cat} ext={ext} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</div>
                           <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{formatBytes(f.size)} • {format(new Date(f.createdAt), "dd/MM/yyyy")}</div>
                        </div>
                      </div>
                    );
                  })}
                  {cloudFiles.filter(f => f.providerResourceType === "raw").length === 0 && (
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)" }}>Trống</div>
                  )}
                </div>
              </div>

              {/* ── Section: Link ── */}
              <div className="cp-section-card">
                <div className="cp-card-header">
                  <h4>Link</h4>
                  <button className="cp-view-all">Xem tất cả</button>
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)" }}>Chưa có link nào được lưu</div>
              </div>
            </div>
          ) : (
            <>
              <div className="crp-header">
                <div className="crp-avatar" style={{ background: activeUiRoom.color }}>
                  {activeUiRoom.initials}
                </div>
                <div className="crp-name">{activeUiRoom.name}</div>
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
            </>
          )}
        </div>
      )}
      {/* ── MODALS ── */}
      <AddFriendModal isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </div>
  );
}
