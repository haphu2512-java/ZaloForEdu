import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";
import { FaSearch, FaBell, FaThumbtack, FaUsers, FaCloud, FaSpinner, FaLink, FaUserSecret, FaArrowLeft, FaUserPlus, FaCheck, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";

import { uploadFile } from "../../services/mediaService"; 
import { useFriendStore } from "../../store/friendStore"; 
import { socketService } from "../../services/socketService"; // Đã import dịch vụ socket dùng chung
import { MessageBubble } from "./MessageBubble";
import { ShareMessageModal } from "./Modals/ShareMessageModal";
import { ChatHeader } from "./ChatHeader"; 
import { MessageInput } from "./MessageInput"; 
import { useTheme } from '../../contexts/ThemeContext'; 
import { useLanguage } from '../../contexts/LanguageContext';
import "./ChatPage.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

// FIX TẠI ĐÂY: Dùng socket chung của app, tránh việc khởi tạo 2 socket cắn nhau rớt mạng.
const socket = socketService?.socket || io(API_ORIGIN, { autoConnect: false, transports: ['websocket'] });

const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];
const DOC_EXTS = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"];
const ARCHIVE_EXTS = ["zip","rar","7z","tar","gz"];

export function getExt(s=""){return(s.split(".").pop()||"").toLowerCase();}
export function getCategory(n=""){const e=getExt(n);if(IMAGE_EXTS.includes(e))return"image";if(VIDEO_EXTS.includes(e))return"video";if(DOC_EXTS.includes(e))return"doc";if(ARCHIVE_EXTS.includes(e))return"archive";return"other";}
export function getFileColor(n=""){const e=getExt(n);if(IMAGE_EXTS.includes(e))return"#10B981";if(VIDEO_EXTS.includes(e))return"#8B5CF6";if(e==="pdf")return"#EF4444";if(["doc","docx"].includes(e))return"#2563EB";if(["xls","xlsx"].includes(e))return"#16A34A";if(["ppt","pptx"].includes(e))return"#EA580C";if(ARCHIVE_EXTS.includes(e))return"#D97706";return"#6B7280";}
export function formatBytes(b){if(!b)return"0 B";const k=1024,s=["B","KB","MB","GB"];const i=Math.floor(Math.log(b)/Math.log(k));return parseFloat((b/Math.pow(k,i)).toFixed(1))+" "+s[i];}

const formatChatTimestamp = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (isToday) return timeStr;
  if (isYesterday) return `Hôm qua ${timeStr}`;
  return `${timeStr} ngày ${dateStr}`;
};

const shouldShowDateDivider = (currentMsg, prevMsg) => {
  if (!prevMsg) return true;
  const currTime = new Date(currentMsg.createdAt).getTime();
  const prevTime = new Date(prevMsg.createdAt).getTime();
  const diffHours = (currTime - prevTime) / (1000 * 60 * 60);
  if (diffHours >= 6) return true;
  return new Date(currentMsg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
};

function UploadBubble({ name, percent }) {
  return (
    <div className="msg-wrap me" style={{ marginBottom: 16 }}>
      <div className="msg-body" style={{ alignItems: 'flex-end' }}>
        <div className="mdc-uploading-bubble msg-bubble" style={{ background: '#0084FF', color: 'white', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaSpinner className="spin" size={14}/>
          <div className="mdc-upl-info" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="mdc-upl-name" style={{ fontSize: 13 }}>{name}</span>
            <div className="mdc-upl-bar" style={{ background: 'rgba(255,255,255,0.3)', height: 4, borderRadius: 2, width: 100 }}>
              <div className="mdc-upl-fill" style={{ width: `${percent}%`, background: 'white', height: '100%', borderRadius: 2 }} />
            </div>
            <span className="mdc-upl-pct" style={{ fontSize: 10 }}>{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'strangers'
  const [showStrangerPanel, setShowStrangerPanel] = useState(false);
  
  const { appliedTheme } = useTheme();
  const { t } = useLanguage();
  
  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true); 

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [msgToShare, setMsgToShare] = useState(null);

  const pageRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConvIdRef = useRef(null);

  const { friends, fetchFriends, fetchOutgoingRequests, fetchIncomingRequests } = useFriendStore();

  useEffect(() => {
    fetchFriends();
    fetchOutgoingRequests();
    fetchIncomingRequests();
  }, []);

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

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const getOtherParticipant = useCallback((conv) => {
    if (!conv || !conv.participants) return null;
    const others = conv.participants.filter(p => {
      const pId = typeof p === 'string' ? p : (p._id || p.id);
      return String(pId) !== String(userId);
    });
    return others.length > 0 ? others[0] : null;
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
    if (!friends || friends.length === 0) return conversations;
    const validConvs = conversations.filter(c => {
      if (c.type === 'group' || c.roomModel === 'Group') return true;
      return getOtherParticipant(c) !== null; 
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
    return convs.filter(conv => getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, friends, searchQuery, userId, getConversationName, getOtherParticipant]);

  // Phân loại: bạn bè vs người lạ
  const friendIds = useMemo(() => new Set(friends.map(f => String(f._id || f.id))), [friends]);

  const { outgoingRequests, incomingRequests, acceptRequest, rejectRequest } = useFriendStore();
  const outgoingRequestIds = useMemo(() =>
    new Set(outgoingRequests.map(r =>
      r.toUserId?._id ? String(r.toUserId._id) : String(r.toUserId || '')
    )),
    [outgoingRequests]
  );
  const incomingRequestIds = useMemo(() =>
    new Set(incomingRequests.map(r =>
      r.fromUserId?._id
        ? String(r.fromUserId._id)
        : r.fromUserId?.id
        ? String(r.fromUserId.id)
        : String(r.fromUserId || '')
    )),
    [incomingRequests]
  );

  const { friendConvs, strangerConvs } = useMemo(() => {
    const friendConvs = [];
    const strangerConvs = [];
    mergedConversations.forEach(conv => {
      if (conv.type === 'group' || conv.roomModel === 'Group' || conv.isMock) {
        friendConvs.push(conv);
        return;
      }
      const other = getOtherParticipant(conv);
      const otherId = other && typeof other === 'object' ? String(other._id || other.id) : null;
      const isOtherFriend = otherId && friendIds.has(otherId);

      if (isOtherFriend) {
        friendConvs.push(conv);
      } else {
        // Phân loại dựa vào người gửi tin nhắn đầu tiên
        const firstSenderId = String(conv.firstSenderId?._id || conv.firstSenderId || conv.createdBy?._id || conv.createdBy || '');
        const myId = String(userId || '');
        const iSentFirst = !firstSenderId || firstSenderId === myId;
        if (iSentFirst) {
          friendConvs.push(conv);
        } else {
          strangerConvs.push(conv);
        }
      }
    });
    return { friendConvs, strangerConvs };
  }, [mergedConversations, friendIds, getOtherParticipant, userId]);

  const displayedConvs = activeTab === 'strangers' ? strangerConvs : friendConvs;

  useEffect(() => {
    activeConvIdRef.current = activeConversation?._id;
  }, [activeConversation]);

  const fetchConversationsData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const allConvs = res.data.data?.items || res.data.items || [];
      // Lọc bỏ self-conversation (My Documents) khỏi danh sách chat
      const filtered = allConvs.filter(c => !(c.type === 'direct' && c.participants?.length === 1));
      setConversations(filtered);
    } catch (err) { console.error("Lỗi lấy danh sách:", err); }
  }, [token]);

  // ==================== KHỞI TẠO SOCKET ====================
  useEffect(() => {
    if (!token) return;
    
    // FIX TẠI ĐÂY: Chỉ connect khi socket thực sự chưa được bật để tránh đá mất socketService
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    fetchConversationsData();

    socket.on("conversation_updated", (payload) => {
      const { conversationId, latestMessage } = payload;
      const convIdStr = String(conversationId);
      const activeIdStr = String(activeConvIdRef.current);
      const isMyMessage = String(latestMessage?.senderId?._id || latestMessage?.senderId) === String(userId);

      if (convIdStr === activeIdStr) {
        setMessages(prev => {
          if (prev.some(m => String(m._id) === String(latestMessage._id))) return prev;
          const normalizedMsg = {
            ...latestMessage,
            mediaIds: (latestMessage.mediaIds || []).map(media =>
              typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
                ? { ...media, url: `${API_ORIGIN}${media.url}` }
                : media
            )
          };
          // Dedup toàn bộ trước khi thêm
          const deduped = [...prev.filter(m => String(m._id) !== String(normalizedMsg._id)), normalizedMsg];
          return deduped;
        });
        socket.emit("message_delivered", { messageId: latestMessage._id });
        socket.emit("message_seen", { messageId: latestMessage._id });
      } else if (!isMyMessage) {
        const senderName = latestMessage?.senderId?.username || 'Ai đó';
        const shortContent = latestMessage?.content || '[Hình ảnh/File đính kèm]';
        toast.success(`💬 ${senderName}: ${shortContent}`, { position: "top-right", duration: 3000 });
      }

      setConversations(prevConvs => {
        const index = prevConvs.findIndex(c => String(c._id) === convIdStr);
        if (index === -1) { fetchConversationsData(); return prevConvs; }

        const newConvs = [...prevConvs];
        const target = { ...newConvs[index], latestMessage };

        if (convIdStr !== activeIdStr && !isMyMessage) {
           target.unreadCount = (target.unreadCount || 0) + 1;
        } else if (convIdStr === activeIdStr) {
           target.unreadCount = 0; 
        }

        newConvs.splice(index, 1);
        return [target, ...newConvs]; 
      });
    });

    socket.on("message_recalled", ({ messageId }) => {
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isRecalled: true, content: "", attachments: [], mediaIds: [] } : m));
      setConversations(prev => prev.map(c => {
        if (c.latestMessage && String(c.latestMessage._id) === String(messageId)) {
          return { ...c, latestMessage: { ...c.latestMessage, isRecalled: true, content: "" } };
        }
        return c;
      }));
    });

    socket.on("message_reacted", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    });

    // Refresh lời mời kết bạn khi nhận notification mới
    socket.on("new_notification", (notif) => {
      if (notif?.type === 'friend_request') fetchIncomingRequests();
      if (notif?.type === 'friend_accepted') { fetchFriends(); fetchOutgoingRequests(); }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket lỗi kết nối:", err.message);
    });

    return () => {
      socket.off("conversation_updated");
      socket.off("message_recalled");
      socket.off("message_reacted");
      socket.off("new_notification");
      socket.off("connect_error");
    };
  }, [token, userId, fetchConversationsData]);

  // ==================== LOAD TIN NHẮN KHI VÀO PHÒNG ====================
  useEffect(() => {
    if (!activeConversation) return;
    setMessages([]);

    if (activeConversation.isMock) return; 

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/messages/conversation/${activeConversation._id}?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        const fetchedMessages = res.data.data?.items || res.data.items || [];
        const normalized = fetchedMessages.map(m => ({
          ...m,
          mediaIds: (m.mediaIds || []).map(media =>
            typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
              ? { ...media, url: `${API_ORIGIN}${media.url}` }
              : media
          )
        }));
        // Dedup và merge với messages đã có từ socket trong lúc fetch
        setMessages(prev => {
          const merged = [...normalized.reverse(), ...prev];
          const seen = new Set();
          return merged.filter(m => {
            const id = String(m._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        setConversations(prev => prev.map(c => String(c._id) === String(activeConversation._id) ? { ...c, unreadCount: 0 } : c));
      } catch (err) { setMessages([]); }
    };

    fetchMessages();
    socket.emit("join_conversation", { conversationId: activeConversation._id });

  }, [activeConversation?._id, token]);

  useEffect(() => { scrollToBottom(); }, [messages, uploads]);

  useEffect(() => {
    const zone = pageRef.current;
    if (!zone || !activeConversation) return;
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e) => { if (!zone.contains(e.relatedTarget)) setIsDragging(false); };
    const onDrop = (e) => {
      e.preventDefault(); setIsDragging(false);
      Array.from(e.dataTransfer.files).forEach(handleUploadFile);
    };
    zone.addEventListener("dragover", onDragOver);
    zone.addEventListener("dragleave", onDragLeave);
    zone.addEventListener("drop", onDrop);
    return () => {
      zone.removeEventListener("dragover", onDragOver);
      zone.removeEventListener("dragleave", onDragLeave);
      zone.removeEventListener("drop", onDrop);
    };
  }, [activeConversation]);

  const getSenderIdStr = (msg) => {
    if (!msg) return null;
    const s = msg.senderId || msg.sender;
    if (!s) return null;
    if (typeof s === 'object') return String(s._id || s.id);
    return String(s);
  };

  const ensureRealConversation = async () => {
    if (!activeConversation.isMock) return activeConversation._id;
    const otherParticipant = getOtherParticipant(activeConversation);
    const targetId = otherParticipant._id || otherParticipant.id;
    
    const createRes = await axios.post(`${API_BASE_URL}/conversations`, {
      type: "direct", participantIds: [targetId]
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    const realConv = createRes.data.data || createRes.data;
    realConv.participants = activeConversation.participants; 
    const currentConvId = realConv._id || realConv.id;
    
    setActiveConversation(realConv);
    setConversations(prev => [realConv, ...prev.filter(c => c._id !== activeConversation._id)]);
    socket.emit("join_conversation", { conversationId: currentConvId });
    return currentConvId;
  };

  // ==================== TƯƠNG TÁC ====================
  const handleSendText = async (content) => {
    if (!activeConversation) return;
    try {
      const currentConvId = await ensureRealConversation();
      await axios.post(`${API_BASE_URL}/messages/send`,
        { content: content, conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) { toast.error("Lỗi gửi tin nhắn"); }
  };

  const handleSendLike = async () => {
    if (!activeConversation) return;
    try {
      const currentConvId = await ensureRealConversation();
      await axios.post(`${API_BASE_URL}/messages/send`,
        { content: "👍", conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) { console.error("Lỗi gửi Like", err); }
  };

  const handleUploadFile = async (file) => {
    if (!activeConversation) return;
    const uid = Date.now() + Math.random();
    setUploads(prev => [...prev, { id: uid, name: file.name, percent: 0 }]);

    try {
      const currentConvId = await ensureRealConversation();
      const media = await uploadFile(file, { 
        folder: "zaloapp/chat",
        onProgress: (pct) => setUploads(prev => prev.map(u => u.id === uid ? { ...u, percent: pct } : u))
      });

      await axios.post(`${API_BASE_URL}/messages/send`,
        { content: "", mediaIds: [media._id || media.id], conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      toast.error(`Lỗi tải lên: ${file.name}`);
    } finally {
      setUploads(prev => prev.filter(u => u.id !== uid));
    }
  };

  const handleUploadFilesFromInput = async (files) => {
    if (!files || files.length === 0) return;
    if (!activeConversation) return;

    if (files.length === 1) {
      handleUploadFile(files[0]);
      return;
    }

    const uid = Date.now() + Math.random();
    const label = `${files.length} file`;
    setUploads(prev => [...prev, { id: uid, name: label, percent: 0 }]);

    try {
      const currentConvId = await ensureRealConversation();
      let doneCount = 0;
      const mediaList = await Promise.all(
        Array.from(files).map(file =>
          uploadFile(file, {
            folder: "zaloapp/chat",
            onProgress: () => {
              doneCount++;
              const pct = Math.round((doneCount / files.length) * 100);
              setUploads(prev => prev.map(u => u.id === uid ? { ...u, percent: pct } : u));
            }
          })
        )
      );

      const mediaIds = mediaList.map(m => m._id || m.id);

      await axios.post(`${API_BASE_URL}/messages/send`,
        { content: "", mediaIds, conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      toast.error("Lỗi tải lên file");
    } finally {
      setUploads(prev => prev.filter(u => u.id !== uid));
    }
  };

  const handleReaction = async (messageId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (String(m._id) === String(messageId)) {
        const currentReactions = m.reactions || [];
        const filtered = currentReactions.filter(r => String(r.userId) !== String(userId));
        return { ...m, reactions: [...filtered, { emoji, userId: userId }] };
      }
      return m;
    }));
    try {
      await axios.put(`${API_BASE_URL}/messages/${messageId}/react`, { emoji }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { toast.error("Lỗi thả cảm xúc"); }
  };

  const handleRecall = async (msgId) => {
    setMessages(prev => prev.map(m => String(m._id) === String(msgId) ? { ...m, isRecalled: true, content: "", attachments: [], mediaIds: [] } : m));
    try {
      await axios.put(`${API_BASE_URL}/messages/${msgId}/recall`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Đã thu hồi tin nhắn");
    } catch (err) { toast.error("Lỗi thu hồi tin nhắn"); }
  };

  const handleDelete = async (msgId) => {
    setMessages(prev => prev.filter(m => m._id !== msgId));
    try {
      await axios.delete(`${API_BASE_URL}/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { toast.error("Lỗi xóa tin nhắn"); }
  };

  const openShareModal = (msg) => {
    setMsgToShare(msg);
    setShareModalOpen(true);
  };

  const executeForward = async (friend) => {
    try {
      const targetId = friend._id || friend.id;
      let targetConvId = null;

      const existingConv = conversations.find(c => c.type === 'direct' && c.participants.some(p => (p._id || p.id) === targetId));

      if (existingConv) {
         targetConvId = existingConv._id;
      } else {
         const createRes = await axios.post(`${API_BASE_URL}/conversations`, { type: "direct", participantIds: [targetId] }, { headers: { Authorization: `Bearer ${token}` } });
         targetConvId = createRes.data.data?._id || createRes.data?._id;
      }

      const content = msgToShare.content || "";
      const mediaIds = (msgToShare.attachments || msgToShare.mediaIds || []).map(m => m._id || m.id || m);

      await axios.post(`${API_BASE_URL}/messages/send`,
        { content, mediaIds, conversationId: targetConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Đã chuyển tiếp tới ${friend.fullName || friend.username}`);
      setShareModalOpen(false);
    } catch (error) {
      toast.error("Lỗi chuyển tiếp tin nhắn");
    }
  };

  const allMedia = messages.flatMap(m => m.attachments || m.mediaIds || m.media || []).filter(m => typeof m !== 'string');
  const imgFiles = allMedia.filter(m => ["image","video"].includes(getCategory(m.name || m.fileName)));
  const docFiles = allMedia.filter(m => !["image","video"].includes(getCategory(m.name || m.fileName)));
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const linkItems = [];
  messages.forEach(m => {
    if (m.content) {
      const urls = m.content.match(linkRegex);
      if (urls) urls.forEach(u => linkItems.push(u));
    }
  });

  return (
    <div className={`chat-page ${appliedTheme === 'dark' ? 'dark-mode' : ''}`} ref={pageRef}> 
      
      <ShareMessageModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        friends={friends} 
        onForward={executeForward} 
      />

      {isDragging && (
        <div className="mdc-drag-overlay">
          <div className="mdc-drag-inner">
            <FaCloud size={52} />
            <p>Thả file vào đây để gửi</p>
          </div>
        </div>
      )}

      {/* ── BÊN TRÁI: SIDEBAR ── */}
      <aside className="room-sidebar">
        <div className="rs-header">
          <span style={{ fontWeight: 800, fontSize: 18 }}>Đoạn chat</span>
        </div>
        <div className="rs-search-bar">
          <FaSearch color="var(--z-text-secondary)" size={14} />
          <input placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="rs-list">
          {/* Item đặc biệt: Tin nhắn từ người lạ */}
          {strangerConvs.length > 0 && (
            <div
              className="chat-list-item"
              onClick={() => setShowStrangerPanel(true)}
              style={{ cursor:'pointer' }}
            >
              <div style={{ width:44, height:44, borderRadius:'50%', background:'#0068FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <FaUserSecret size={20} color="#fff" />
              </div>
              <div className="cli-info">
                <div className="cli-top">
                  <span className="cli-name" style={{ fontWeight:700 }}>Tin nhắn từ người lạ</span>
                  <span className="cli-time" style={{ color:'var(--z-primary)' }}></span>
                </div>
                <div className="cli-bottom">
                  <span className="cli-msg">Gửi từ người chưa có trong danh bạ...</span>
                  <div className="cli-unread" style={{ background:'#ef4444' }}>●</div>
                </div>
              </div>
            </div>
          )}
          {friendConvs.map((conv) => {
            const isActive = activeConversation?._id === conv._id;
            const unread = conv.unreadCount || 0;
            return (
              <div key={conv._id} className={`chat-list-item ${isActive ? 'active' : ''}`} onClick={() => setActiveConversation(conv)}>
                <img className="cli-avatar" src={getConversationAvatar(conv)} alt="avt" />
                <div className="cli-info">
                  <div className="cli-top">
                    <span className="cli-name" style={{ fontWeight: unread > 0 ? 800 : 600, color: unread > 0 ? 'var(--z-text-primary)' : '' }}>{getConversationName(conv)}</span>
                    <span className="cli-time" style={{ color: unread > 0 ? 'var(--z-primary)' : 'var(--z-text-muted)' }}>
                        {conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div className="cli-bottom">
                    <span className="cli-msg" style={{ fontWeight: unread > 0 ? 700 : 400, color: unread > 0 ? 'var(--z-text-primary)' : 'var(--z-text-secondary)' }}>
                        {conv.latestMessage?.isRecalled ? t('recalledMessage') || 'Tin nhắn đã thu hồi' : (conv.latestMessage?.content || (conv.latestMessage?.mediaIds?.length > 0 || conv.latestMessage?.attachments?.length > 0 ? '[Hình ảnh/File]' : t('noMessages') || 'Chưa có tin nhắn'))}
                    </span>
                    {unread > 0 && <div className="cli-unread">{unread > 99 ? '99+' : unread}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {friendConvs.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--z-text-muted)', fontSize: 13 }}>Không tìm thấy cuộc trò chuyện nào</div>}
        </div>
      </aside>

      {/* ── Ở GIỮA: CHAT KHU VỰC CHÍNH ── */}
      {activeConversation ? (
        <main className="chat-main">
          <ChatHeader 
            room={{
              ...activeConversation,
              name: getConversationName(activeConversation),
              avatar: getConversationAvatar(activeConversation),
              targetUserId: getOtherParticipant(activeConversation)?._id || getOtherParticipant(activeConversation)?.id,
              isOnline: true,
              isStranger: (() => {
                const other = getOtherParticipant(activeConversation);
                const otherId = other && typeof other === 'object' ? String(other._id || other.id) : null;
                return otherId ? !friendIds.has(otherId) : false;
              })(),
              strangerId: getOtherParticipant(activeConversation)?._id || getOtherParticipant(activeConversation)?.id,
            }}
            onInfo={() => setShowRightPanel(!showRightPanel)}
          />

          <div className="chat-messages">
            {/* Banner thông báo trạng thái kết bạn */}
            {(() => {
              const other = getOtherParticipant(activeConversation);
              const otherId = other && typeof other === 'object' ? String(other._id || other.id) : null;
              const otherName = other && typeof other === 'object' ? (other.username || other.fullName || 'Người dùng') : 'Người dùng';
              const isStranger = otherId && !friendIds.has(otherId);
              if (!isStranger) return null;

              const hasOutgoing = outgoingRequestIds.has(otherId);
              const incomingReq = incomingRequests.find(r => {
                const fromId = r.fromUserId?._id
                  ? String(r.fromUserId._id)
                  : r.fromUserId?.id
                  ? String(r.fromUserId.id)
                  : String(r.fromUserId || '');
                return fromId === otherId;
              });

              if (hasOutgoing) return (
                <div style={{ padding:'12px 20px', background:'rgba(0,104,255,0.06)', borderBottom:'1px solid var(--z-border)', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--z-text-secondary)' }}>
                  <FaUserPlus size={13} color="var(--z-primary)" />
                  Đang chờ <strong style={{ color:'var(--z-text-primary)' }}>{otherName}</strong> đồng ý kết bạn
                </div>
              );

              if (incomingReq) return (
                <div style={{ padding:'12px 20px', background:'rgba(0,104,255,0.06)', borderBottom:'1px solid var(--z-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--z-text-secondary)' }}>
                    <FaUserPlus size={13} color="var(--z-primary)" />
                    <strong style={{ color:'var(--z-text-primary)' }}>{otherName}</strong> đã gửi lời mời kết bạn cho bạn
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <button
                      onClick={async () => {
                        try {
                          const reqId = String(incomingReq._id || incomingReq.id);
                          await acceptRequest(reqId);
                          await Promise.all([fetchIncomingRequests(), fetchFriends()]);
                        } catch (e) { alert('Không thể chấp nhận'); }
                      }}
                      style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'var(--z-primary)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
                    >
                      <FaCheck size={11} style={{ marginRight:4 }} />Đồng ý
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const reqId = String(incomingReq._id || incomingReq.id);
                          await rejectRequest(reqId);
                          await fetchIncomingRequests();
                        } catch (e) { alert('Không thể từ chối'); }
                      }}
                      style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--z-border)', background:'transparent', color:'var(--z-text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13 }}
                    >
                      <FaTimes size={11} style={{ marginRight:4 }} />Từ chối
                    </button>
                  </div>
                </div>
              );

              return null;
            })()}
            {messages.length === 0 && uploads.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img src={getConversationAvatar(activeConversation)} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', margin: '0 0 8px 0', textAlign: 'center' }}>{getConversationName(activeConversation)}</h3>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const showDate = shouldShowDateDivider(msg, messages[index - 1]);
                  const isMe = getSenderIdStr(msg) === String(userId);
                  return (
                    <React.Fragment key={msg._id}>
                      {showDate && <div className="msg-date">{formatChatTimestamp(msg.createdAt)}</div>}
                      <MessageBubble 
                        message={msg} 
                        isMe={isMe} 
                        onReaction={handleReaction} 
                        onRecall={handleRecall}
                        onDelete={handleDelete} 
                        onForward={openShareModal} 
                        onReply={(msg) => console.log('Trả lời:', msg)}
                      />
                    </React.Fragment>
                  );
                })}
                {uploads.map(u => (
                  <UploadBubble key={u.id} name={u.name} percent={u.percent} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <MessageInput 
            key={activeConversation._id} 
            theme={appliedTheme} 
            placeholder={`Nhập @, tin nhắn tới ${getConversationName(activeConversation)}`}
            onSend={handleSendText}
            onSendLike={handleSendLike}
            onUploadFiles={handleUploadFilesFromInput}
          />
        </main>
      ) : (
        <main className="chat-main" style={{ alignItems: 'center', justifyItems: 'center', display: 'flex' }}>
          <div style={{ color: 'var(--z-text-secondary)', fontSize: 16, margin: 'auto' }}>Chọn một cuộc trò chuyện để bắt đầu</div>
        </main>
      )}

      {/* ── BÊN PHẢI: RIGHT PANEL ── */}
      {activeConversation && showRightPanel && (
        <aside className="chat-right-panel">
          <div className="crp-header">
            <img className="crp-avatar" src={getConversationAvatar(activeConversation)} alt="avt" />
            <div className="crp-name">{getConversationName(activeConversation)}</div>
            <div className="crp-actions">
              <div className="crp-action-btn"><div className="crp-action-icon"><FaBell size={16}/></div>Tắt thông báo</div>
              <div className="crp-action-btn"><div className="crp-action-icon"><FaThumbtack size={16}/></div>Ghim</div>
              <div className="crp-action-btn"><div className="crp-action-icon"><FaUsers size={16}/></div>Tạo nhóm</div>
            </div>
          </div>
          
          <div className="crp-section">
            <div className="crp-sec-title">{t('imageVideo')}</div>
            {imgFiles.length > 0 ? (
              <>
                <div className="crp-grid">
                  {imgFiles.slice(0, 6).map((m, i) => (
                    <img key={i} src={m.url} alt="" className="crp-grid-img" />
                  ))}
                </div>
                <button className="crp-view-all">Xem tất cả</button>
              </>
            ) : <div style={{fontSize: 12, color: 'var(--z-text-muted)'}}>{t('noImageVideo')}</div>}
          </div>

          <div className="crp-section">
            <div className="crp-sec-title">File</div>
            {docFiles.length > 0 ? (
              <>
                {docFiles.slice(0, 3).map((m, i) => {
                  const fname = m.name || m.fileName;
                  return (
                    <div key={i} className="crp-file-row">
                      <div className="crp-file-icon" style={{background: getFileColor(fname)}}>{getExt(fname).substring(0,3).toUpperCase()}</div>
                      <div className="crp-file-info">
                        <div className="crp-file-name">{fname}</div>
                        <div className="crp-file-meta">{formatBytes(m.size)}</div>
                      </div>
                    </div>
                  );
                })}
                <button className="crp-view-all">Xem tất cả</button>
              </>
            ) : <div style={{fontSize: 12, color: 'var(--z-text-muted)'}}>Chưa có File nào</div>}
          </div>

          <div className="crp-section">
            <div className="crp-sec-title">Link</div>
            {linkItems.length > 0 ? (
              <>
                {linkItems.slice(0, 3).map((link, i) => (
                  <div key={i} className="crp-link-row">
                    <div className="crp-link-icon"><FaLink size={14}/></div>
                    <a href={link} target="_blank" rel="noreferrer" className="crp-link-url">{link}</a>
                  </div>
                ))}
                <button className="crp-view-all">Xem tất cả</button>
              </>
            ) : <div style={{fontSize: 12, color: 'var(--z-text-muted)'}}>Chưa có Link nào</div>}
          </div>
        </aside>
      )}

      {/* ── PANEL: Tin nhắn từ người lạ ── */}
      {showStrangerPanel && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex' }}>
          {/* Overlay */}
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)' }} onClick={() => setShowStrangerPanel(false)} />
          {/* Panel */}
          <div style={{ position:'relative', width:360, height:'100%', background:'var(--z-bg-sidebar)', display:'flex', flexDirection:'column', boxShadow:'4px 0 20px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--z-border)', display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setShowStrangerPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--z-text-primary)', padding:4 }}>
                <FaArrowLeft size={16} />
              </button>
              <span style={{ fontWeight:700, fontSize:16, color:'var(--z-text-primary)' }}>Tin nhắn từ người lạ</span>
            </div>
            {/* Notice */}
            <div style={{ padding:'10px 16px', fontSize:12, color:'var(--z-text-secondary)', borderBottom:'1px solid var(--z-border)' }}>
              Người lạ có thể nhắn tin cho bạn.{' '}
              <span style={{ color:'var(--z-primary)', cursor:'pointer' }}>Cài đặt quyền riêng tư</span>
            </div>
            {/* List */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {strangerConvs.map(conv => {
                const unread = conv.unreadCount || 0;
                return (
                  <div
                    key={conv._id}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--z-border)' }}
                    onClick={() => { setActiveConversation(conv); setShowStrangerPanel(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <img src={getConversationAvatar(conv)} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'var(--z-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{getConversationName(conv)}</span>
                        <span style={{ fontSize:11, color:'var(--z-text-muted)', flexShrink:0, marginLeft:8 }}>
                          {conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : ''}
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                        <span style={{ fontSize:12, color:'var(--z-text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {conv.latestMessage?.content || '[Hình ảnh/File]'}
                        </span>
                        {unread > 0 && <div style={{ background:'#ef4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:11, flexShrink:0 }}>{unread}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {strangerConvs.length === 0 && (
                <div style={{ textAlign:'center', padding:40, color:'var(--z-text-muted)', fontSize:13 }}>Không có tin nhắn từ người lạ</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}