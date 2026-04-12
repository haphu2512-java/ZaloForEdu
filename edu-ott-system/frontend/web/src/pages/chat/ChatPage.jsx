import { useState, useEffect, useRef, useMemo } from "react";
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
  FaEllipsisH
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { socketService } from "../../services/socketService";
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
            <button className="rs-add-btn">
              <FaPlus size={12} />
            </button>
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
            <div className="chat-input-bar">
              <button className="cib-btn">
                <FaPaperclip size={15} />
              </button>
              <button className="cib-btn">
                <FaImage size={15} />
              </button>
              <button className="cib-btn">
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
                <p>Lưu trữ và truy cập nhanh những nội dung quan trọng của bạn ngay trên Zalo</p>
              </div>
              
              <div className="cp-storage">
                <div className="cp-storage-top">
                  <span>Dung lượng</span>
                  <span className="cp-storage-value">{storageData.used} MB / 1 GB</span>
                </div>
                <div className="cp-progress">
                  <div className="cp-pg-bar image" style={{ width: `${(storageData.images / storageData.total) * 100}%` }}></div>
                  <div className="cp-pg-bar video" style={{ width: `0%` }}></div>
                  <div className="cp-pg-bar file" style={{ width: `${(storageData.files / storageData.total) * 100}%` }}></div>
                  <div className="cp-pg-bar other" style={{ width: `${((storageData.used - storageData.images - storageData.files) / storageData.total) * 100}%` }}></div>
                </div>
                <div className="cp-legend">
                  <span><div className="lg-dot image"></div>Ảnh</span>
                  <span><div className="lg-dot video"></div>Video</span>
                  <span><div className="lg-dot file"></div>File</span>
                  <span><div className="lg-dot other"></div>Khác</span>
                </div>
                
                <button className="cp-clean-btn">Xem và dọn dẹp My Documents</button>
              </div>

              <div className="cp-upgrade-card">
                <div className="cp-upgrade-icon">🚀</div>
                <div className="cp-upgrade-info">
                  <h4>Nâng cấp dung lượng My Documents</h4>
                  <p>Mở rộng lên đến 100GB. Đồng bộ dữ liệu vĩnh viễn với zCloud.</p>
                </div>
                <button className="cp-upgrade-btn">Thêm dung lượng</button>
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
    </div>
  );
}
