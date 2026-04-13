import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { FaSearch, FaPaperPlane, FaPhoneAlt, FaVideo, FaInfoCircle, FaBell, FaThumbtack, FaUsers, FaSun, FaMoon, FaFileAlt, FaTimes, FaSpinner } from "react-icons/fa";
import toast from "react-hot-toast";

import { uploadFile } from "../../services/mediaService"; 
import { useFriendStore } from "../../store/friendStore"; 
import { MessageBubble } from "./MessageBubble";
import "./ChatPage.css";

const API_BASE_URL = "http://localhost:5000/api/v1";
const socket = io("http://localhost:5000", { 
  autoConnect: false,
  transports: ['websocket'] 
});

const formatChatTimestamp = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return d.toLocaleDateString('vi-VN');
};

const shouldShowDateDivider = (currentMsg, prevMsg) => {
  if (!prevMsg) return true;
  return new Date(currentMsg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
};

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); 
  const [theme, setTheme] = useState("light");
  
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  const location = useLocation();
  const messagesEndRef = useRef(null);
  
  const { friends, fetchFriends } = useFriendStore();

  useEffect(() => {
    if (friends.length === 0) fetchFriends();
  }, [friends.length, fetchFriends]);

  const userId = useMemo(() => {
    let id = localStorage.getItem("userId");
    if (id) return String(id).trim();
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      if (userObj && (userObj._id || userObj.id)) return String(userObj._id || userObj.id).trim();
    } catch (e) {}
    return null;
  }, []); 

  const token = localStorage.getItem("token");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getOtherParticipant = useCallback((conv) => {
    if (!conv || !conv.participants) return null;
    const others = conv.participants.filter(p => {
      const pId = typeof p === 'string' ? p : (p._id || p.id);
      return String(pId) !== String(userId);
    });
    if (others.length > 0) return others[0];
    return null;
  }, [userId]);

  const getConversationName = useCallback((conv) => {
    if (!conv) return '';
    if (conv.type === 'group' || conv.roomModel === 'Group') return conv.name || 'Nhóm chat';
    const other = getOtherParticipant(conv);
    if (other && typeof other === 'object') return other.username || other.fullName || other.name || 'Người dùng';
    return 'Người dùng ẩn danh';
  }, [getOtherParticipant]);

  const getConversationAvatar = useCallback((conv) => {
    if (!conv) return 'https://ui-avatars.com/api/?name=U&background=random';
    if (conv.type === 'group' || conv.roomModel === 'Group') return conv.avatarUrl || conv.avatar || `https://ui-avatars.com/api/?name=${conv.name || 'G'}&background=random`;
    const other = getOtherParticipant(conv);
    let name = 'U';
    let avatar = null;
    if (other && typeof other === 'object') {
      name = other.username || other.fullName || other.name || 'U';
      avatar = other.avatarUrl || other.avatar;
    }
    return avatar || `https://ui-avatars.com/api/?name=${name}&background=random`;
  }, [getOtherParticipant]);

  const mergedConversations = useMemo(() => {
    const validConvs = conversations.filter(c => {
      if (c.type === 'group' || c.roomModel === 'Group') return true;
      if (c.participants && c.participants.length > 0) {
        const others = c.participants.filter(p => String(p._id || p.id || p) !== String(userId));
        return others.length > 0; 
      }
      return false;
    });

    const convs = [...validConvs];
    const directMap = new Set();
    
    convs.forEach(c => {
      if (c.type === 'direct' && !c.isMock) {
        const other = getOtherParticipant(c);
        if (other) {
          const oId = typeof other === 'string' ? other : (other._id || other.id);
          directMap.add(String(oId));
        }
      }
    });

    friends.forEach(friend => {
      const fId = String(friend._id || friend.id);
      if (!directMap.has(fId)) {
        convs.push({
          _id: `mock_${fId}`,
          isMock: true, 
          type: 'direct',
          participants: [{ _id: userId }, friend],
          latestMessage: null,
          unreadCount: 0
        });
      }
    });

    convs.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (!searchQuery.trim()) return convs;
    return convs.filter(conv => 
      getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, friends, searchQuery, userId, getConversationName, getOtherParticipant]);

  useEffect(() => {
    if (!token) return;
    socket.auth = { token };
    socket.connect();

    const fetchAllData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const formatted = res.data.data?.items || res.data.items || [];
        setConversations(formatted);
        
        if (location.state?.activeConversationId) {
          const target = formatted.find(c => String(c._id) === String(location.state.activeConversationId));
          if (target) setActiveConversation(target);
        }
      } catch (err) { console.error("Lỗi lấy danh sách:", err); }
    };
    fetchAllData();

    socket.on("message:new", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setConversations(prevConvs => {
        const index = prevConvs.findIndex(c => String(c._id) === String(msg.conversationId));
        if (index === -1) return prevConvs;
        const newConvs = [...prevConvs];
        const [target] = newConvs.splice(index, 1);
        target.latestMessage = msg;
        // Đếm unreadCount nếu đang không ở phòng đó
        if (activeConversation?._id !== target._id) {
            target.unreadCount = (target.unreadCount || 0) + 1;
        }
        return [target, ...newConvs];
      });
    });

    return () => socket.disconnect();
  }, [token, location.state, activeConversation?._id]);

  useEffect(() => {
    if (!activeConversation) return;

    setMessages([]);
    setPendingFiles([]); 
    setTextInput("");

    if (activeConversation.isMock) return; 

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/messages/conversation/${activeConversation._id}?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedMessages = res.data.data?.items || res.data.items || [];
        setMessages(fetchedMessages.reverse());
        
        // Đặt unreadCount về 0 khi chọn vào phòng
        setConversations(prev => prev.map(c => String(c._id) === String(activeConversation._id) ? { ...c, unreadCount: 0 } : c));
      } catch (err) { setMessages([]); }
    };

    fetchMessages();
    socket.emit("join:room", activeConversation._id);

    return () => {
      socket.emit("leave:room", activeConversation._id);
    };
  }, [activeConversation?._id, token]);

  useEffect(() => { scrollToBottom(); }, [messages, pendingFiles]);

  const getSenderIdStr = (msg) => {
    if (!msg) return null;
    const s = msg.senderId || msg.sender;
    if (!s) return null;
    if (typeof s === 'object') return String(s._id || s.id);
    return String(s);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = ""; 
  };
  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = textInput.trim();
    if ((!content && pendingFiles.length === 0) || !activeConversation || isSending) return;

    setIsSending(true);

    try {
      let currentConvId = activeConversation._id;

      if (activeConversation.isMock) {
        const otherParticipant = getOtherParticipant(activeConversation);
        const targetId = otherParticipant._id || otherParticipant.id;
        
        const createRes = await axios.post(`${API_BASE_URL}/conversations`, {
          type: "direct", participantIds: [targetId]
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        const realConv = createRes.data.data || createRes.data;
        realConv.participants = activeConversation.participants; 
        currentConvId = realConv._id || realConv.id;
        
        setActiveConversation(realConv);
        setConversations(prev => [realConv, ...prev.filter(c => c._id !== activeConversation._id)]);
        socket.emit("join:room", currentConvId);
      }

      let uploadedMediaIds = [];
      let uploadedMediaObjects = [];

      if (pendingFiles.length > 0) {
        for (let file of pendingFiles) {
          const media = await uploadFile(file, { folder: "zaloapp/chat" });
          uploadedMediaIds.push(media._id || media.id);
          uploadedMediaObjects.push(media);
        }
      }

      const res = await axios.post(`${API_BASE_URL}/messages/send`,
        { content: content, conversationId: currentConvId, mediaIds: uploadedMediaIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newMsg = res.data.data || res.data; 
      if (newMsg) {
        // Gắn đối tượng file vào message để hiện ngay
        if (uploadedMediaObjects.length > 0) {
          newMsg.attachments = uploadedMediaObjects; 
        }

        setMessages(prev => {
          if (prev.find(m => String(m._id) === String(newMsg._id))) return prev;
          return [...prev, newMsg];
        });
      }

      setTextInput("");
      setPendingFiles([]);
    } catch (err) { 
      console.error("Gửi tin thất bại", err);
      toast.error("Gửi tin nhắn/file thất bại!");
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await axios.put(`${API_BASE_URL}/messages/${messageId}/react`, 
        { emoji }, { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {}
  };

  const toggleTheme = () => { setTheme(prev => prev === "light" ? "dark" : "light"); };

  return (
    <div className="chat-page" data-theme={theme}>
      
      {/* ── TRÁI ── */}
      <aside className="room-sidebar">
        <div className="rs-header">
          <span style={{ fontWeight: 800, fontSize: 18 }}>Đoạn chat</span>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--z-text-primary)', cursor: 'pointer' }}>
            {theme === "light" ? <FaMoon size={18} /> : <FaSun size={18} color="#FBBF24" />}
          </button>
        </div>
        <div className="rs-search-bar">
          <FaSearch color="var(--z-text-secondary)" size={14} />
          <input 
            placeholder="Tìm kiếm bạn bè, nhóm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="rs-list">
          {mergedConversations.map((conv) => {
            const isActive = activeConversation?._id === conv._id;
            const unread = conv.unreadCount || 0;
            return (
              <div key={conv._id} className={`chat-list-item ${isActive ? 'active' : ''}`} onClick={() => setActiveConversation(conv)}>
                <img className="cli-avatar" src={getConversationAvatar(conv)} alt="avt" />
                <div className="cli-info">
                  <div className="cli-top">
                    <span className="cli-name" style={{ fontWeight: unread > 0 ? 800 : 600, color: unread > 0 ? 'var(--z-text-primary)' : '' }}>
                        {getConversationName(conv)}
                    </span>
                    <span className="cli-time" style={{ color: unread > 0 ? 'var(--z-primary)' : 'var(--z-text-muted)' }}>
                        {conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div className="cli-bottom">
                    <span className="cli-msg" style={{ fontWeight: unread > 0 ? 700 : 400, color: unread > 0 ? 'var(--z-text-primary)' : 'var(--z-text-secondary)' }}>
                        {conv.latestMessage?.content || (conv.latestMessage?.mediaIds?.length > 0 || conv.latestMessage?.attachments?.length > 0 ? '[Hình ảnh/File]' : 'Chưa có tin nhắn')}
                    </span>
                    {/* THÊM BADGE ĐỎ Ở ĐÂY */}
                    {unread > 0 && <div className="cli-unread">{unread > 99 ? '99+' : unread}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {mergedConversations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--z-text-muted)', fontSize: 13 }}>
              Không tìm thấy cuộc trò chuyện nào
            </div>
          )}
        </div>
      </aside>

      {/* ── GIỮA ── */}
      {activeConversation ? (
        <main className="chat-main">
          <header className="chat-header">
            <div className="ch-info">
              <img className="cli-avatar" style={{width: 40, height: 40}} src={getConversationAvatar(activeConversation)} alt="avt" />
              <div>
                <div className="ch-name">{getConversationName(activeConversation)}</div>
                <div className="ch-status">Vừa mới truy cập</div>
              </div>
            </div>
            <div className="ch-actions">
              <FaPhoneAlt className="ch-icon" size={18} />
              <FaVideo className="ch-icon" size={19} />
              <FaInfoCircle className="ch-icon" size={19} />
            </div>
          </header>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={getConversationAvatar(activeConversation)} 
                  alt="avatar" 
                  style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} 
                />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', margin: '0 0 8px 0' }}>
                  {getConversationName(activeConversation)}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--z-text-secondary)', margin: 0 }}>Hãy bắt đầu cùng nhau chia sẻ những câu chuyện thú vị...</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const showDate = shouldShowDateDivider(msg, messages[index - 1]);
                  const isMe = getSenderIdStr(msg) === String(userId);
                  return (
                    <React.Fragment key={msg._id}>
                      {showDate && <div className="msg-date">{formatChatTimestamp(msg.createdAt)}</div>}
                      <MessageBubble message={msg} isMe={isMe} onReaction={handleReaction} />
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* HIỂN THỊ FILE ĐANG CHỜ GỬI TRƯỚC KHI BẤM SEND */}
          {pendingFiles.length > 0 && (
            <div className="pending-files-container">
              {pendingFiles.map((file, idx) => {
                const isImg = file.type.startsWith('image/');
                return (
                  <div key={idx} className="pending-file-item">
                    {isImg ? (
                      <img src={URL.createObjectURL(file)} alt="preview" className="pf-img" />
                    ) : (
                      <div className="pf-doc">
                        <FaFileAlt size={20} color="var(--z-primary)" />
                        <span className="pf-doc-name">{file.name}</span>
                      </div>
                    )}
                    <button type="button" className="pf-remove" onClick={() => removePendingFile(idx)}>
                      <FaTimes size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="chat-toolbar">
            <input ref={imageInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
            <input ref={videoInputRef} type="file" accept="video/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
            <input ref={fileInputRef} type="file" multiple style={{display:"none"}} onChange={handleFileInput} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"/>
            <input ref={folderInputRef} type="file" webkitdirectory="true" multiple style={{display:"none"}} onChange={handleFileInput} />
            
            <button className="chat-tool-btn" title="Gửi ảnh" onClick={()=>imageInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
            <button className="chat-tool-btn" title="Đính kèm file" onClick={()=>fileInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
            <button className="chat-tool-btn" title="Gửi video" onClick={()=>videoInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></button>
            <button className="chat-tool-btn" title="Gửi thư mục" onClick={()=>folderInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <div className="chat-input-box">
              <input 
                placeholder={`Nhập tin nhắn tới ${getConversationName(activeConversation)}...`} 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (textInput.trim() || pendingFiles.length > 0) handleSend(e);
                  }
                }}
              />
            </div>
            <button type="submit" className="btn-send" disabled={(textInput.trim() === "" && pendingFiles.length === 0) || isSending}>
              {isSending ? <FaSpinner className="spin" size={16} color="white" /> : <FaPaperPlane size={16} />}
            </button>
          </form>
        </main>
      ) : (
        <main className="chat-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--z-text-secondary)', fontSize: 16 }}>Chọn một cuộc trò chuyện để bắt đầu</div>
        </main>
      )}

      {/* ── PHẢI ── */}
      {activeConversation && (
        <aside className="chat-right-panel">
          <div className="crp-header">
            <img className="crp-avatar" src={getConversationAvatar(activeConversation)} alt="avt" />
            <div className="crp-name">{getConversationName(activeConversation)}</div>
            <div className="crp-actions">
              <div className="crp-action-btn">
                <div className="crp-action-icon"><FaBell size={14}/></div>
                Tắt thông báo
              </div>
              <div className="crp-action-btn">
                <div className="crp-action-icon"><FaThumbtack size={14}/></div>
                Ghim
              </div>
              <div className="crp-action-btn">
                <div className="crp-action-icon"><FaUsers size={14}/></div>
                Tạo nhóm
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}