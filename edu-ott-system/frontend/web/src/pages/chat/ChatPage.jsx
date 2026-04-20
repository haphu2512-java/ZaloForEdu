import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaSearch, FaUsers, FaCloud, FaSpinner, FaUserSecret, FaArrowLeft, FaUserPlus, FaCheck, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";

import { uploadFile } from "../../services/mediaService";
import { useFriendStore } from "../../store/friendStore";
import { socketService } from "../../services/socketService";
import { MessageBubble } from "./MessageBubble";
import { ShareMessageModal } from "./Modals/ShareMessageModal";
import AddFriendModal from "./Modals/AddFriendModal";
import CreateGroupModal from "./Modals/CreateGroupModal";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { ChatRightPanel } from "./ChatRightPanel";
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategory } from './chatUtils';
import "./ChatPage.css";
import { conversationService } from "../../services/conversationService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

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

const DIVIDER_GAP_MS = 60 * 60 * 1000; // 1 tiếng

const shouldShowDateDivider = (currentMsg, prevMsg) => {
  if (!prevMsg) return true;
  const curr = new Date(currentMsg.createdAt);
  const prev = new Date(prevMsg.createdAt);
  if (curr.toDateString() !== prev.toDateString()) return true;
  return curr - prev >= DIVIDER_GAP_MS;
};

const formatDateDivider = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24));
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  let label;
  if (diffDays === 0) label = 'Hôm nay';
  else if (diffDays === 1) label = 'Hôm qua';
  else if (diffDays < 7) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    label = days[d.getDay()];
  } else {
    label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return `${timeStr} ${label}`;
};

function UploadBubble({ name, percent }) {
  return (
    <div className="msg-wrap me" style={{ marginBottom: 16 }}>
      <div className="msg-body" style={{ alignItems: 'flex-end' }}>
        <div className="mdc-uploading-bubble msg-bubble" style={{ background: '#0084FF', color: 'white', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaSpinner className="spin" size={14} />
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
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selfConversation, setSelfConversation] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);

  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  useEffect(() => {
    if (activeConversation && activeConversation.type === 'group') {
      fetchReminders(activeConversation._id);
      fetchJoinRequests(activeConversation._id);
    } else {
      setReminders([]);
      setJoinRequests([]);
    }
  }, [activeConversation?._id]);

  const fetchReminders = async (convId) => {
    try {
      const res = await conversationService.getReminders(convId);
      setReminders(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách nhắc hẹn:", err);
    }
  };

  const fetchJoinRequests = async (convId) => {
    try {
      const res = await conversationService.listJoinRequests(convId);
      setJoinRequests(res.data?.items || []);
    } catch (err) {
      // not admin — ignore
    }
  };

  const handleCreateReminder = async (title, remindAt) => {
    if (!activeConversation) return;
    try {
      await conversationService.createReminder({
        conversationId: activeConversation._id,
        title,
        remindAt: remindAt.toISOString(),
      });
    } catch (err) {
      toast.error("Lỗi tạo nhắc hẹn");
    }
  };

  const handleUpdateReminder = async (reminderId, title, remindAt) => {
    try {
      const res = await conversationService.updateReminder(reminderId, {
        title,
        remindAt: new Date(remindAt).toISOString(),
      });
      setReminders(prev => prev.map(r => r._id === reminderId ? (res.data || r) : r));
      toast.success("Đã cập nhật nhắc hẹn");
    } catch (err) {
      toast.error("Lỗi cập nhật nhắc hẹn");
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      const res = await conversationService.deleteReminder(reminderId);
      const deletedTitle = res.data?.title || '';
      setReminders(prev => prev.filter(r => r._id !== reminderId));
      // Show transient system message in chat
      const sysMsgId = `sys_rem_del_${Date.now()}`;
      setMessages(prev => [...prev, {
        _id: sysMsgId,
        type: 'system',
        content: `Bạn đã xóa nhắc hẹn "${deletedTitle}"`,
        createdAt: new Date().toISOString(),
        conversationId: activeConversation._id,
      }]);
    } catch (err) {
      toast.error("Lỗi xóa nhắc hẹn");
    }
  };

  const [reminderDetailId, setReminderDetailId] = useState(null);
  const [pendingEditReminder, setPendingEditReminder] = useState(null);

  const handleJoinReminder = async (reminderId) => {
    try {
      const res = await conversationService.joinReminder(reminderId);
      const updated = res.data;
      setReminders(prev => prev.map(r => r._id === reminderId ? (updated || r) : r));
      // System message created by backend, arrives via conversation_updated socket
    } catch (err) {
      toast.error("Lỗi xác nhận tham gia");
    }
  };

  const handleDeclineReminder = async (reminderId) => {
    try {
      const res = await conversationService.declineReminder(reminderId);
      const updated = res.data;
      setReminders(prev => prev.map(r => r._id === reminderId ? (updated || r) : r));
      // System message created by backend, arrives via conversation_updated socket
    } catch (err) {
      toast.error("Lỗi từ chối nhắc hẹn");
    }
  };

  const handleProcessJoinRequest = async (requestId, action) => {
    if (!activeConversation) return;
    try {
      await conversationService.processJoinRequest(activeConversation._id, requestId, action);
      setJoinRequests(prev => prev.filter(r => r._id !== requestId));
      if (action === 'approve') {
        toast.success("Đã duyệt thành viên");
        fetchConversationsData();
      } else {
        toast.success("Đã từ chối yêu cầu");
      }
    } catch (err) {
      toast.error("Lỗi xử lý yêu cầu");
    }
  };
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStrangerPanel, setShowStrangerPanel] = useState(false);

  const { appliedTheme } = useTheme();
  const { t } = useLanguage();

  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [msgToShare, setMsgToShare] = useState(null);
  const [justSentRequestTo, setJustSentRequestTo] = useState(null); // track optimistic state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const pageRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConvIdRef = useRef(null);
  const activeConversationRef = useRef(null);

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
    } catch (e) { }
    return null;
  }, []);

  const token = localStorage.getItem("token");

  const openSelfConversation = useCallback(async () => {
    if (selfConversation) {
      setActiveConversation(selfConversation);
      navigate('/chat/' + selfConversation._id);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/conversations`, { type: 'direct', participantIds: [userId] }, { headers: { Authorization: `Bearer ${token}` } });
      const conv = res.data.data || res.data;
      setSelfConversation(conv);
      setActiveConversation(conv);
      navigate('/chat/' + conv._id);
    } catch (err) { console.error('Create self conv:', err); }
  }, [selfConversation, userId, token, navigate]);

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
    if (conv.type === 'direct' && conv.participants?.length === 1) return 'Cloud của tôi';
    if (conv.type === 'group' || conv.roomModel === 'Group') return conv.name || 'Nhóm chat';
    const other = getOtherParticipant(conv);
    if (other && typeof other === 'object') return other.username || other.fullName || other.name || 'Người dùng';
    return null;
  }, [getOtherParticipant]);

  const getConversationAvatar = useCallback((conv) => {
    if (!conv) return 'https://ui-avatars.com/api/?name=U&background=random';
    if (conv.type === 'direct' && conv.participants?.length === 1) {
      try {
        const me = JSON.parse(localStorage.getItem("user") || "{}");
        return me.avatarUrl || me.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(me.username || 'Me')}&background=0068FF&color=fff`;
      } catch { return 'https://ui-avatars.com/api/?name=Me&background=0068FF&color=fff'; }
    }
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
      if (c.type === 'direct' && c.participants?.length === 1) return true;
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

  const { friendConvs, strangerConvs } = useMemo(() => {
    const friendConvs = [];
    const strangerConvs = [];
    mergedConversations.forEach(conv => {
      if (conv.type === 'group' || conv.roomModel === 'Group' || conv.isMock) {
        friendConvs.push(conv);
        return;
      }
      if (conv.type === 'direct' && conv.participants?.length === 1) {
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

  useEffect(() => {
    if (!roomId) return;
    if (selfConversation && String(selfConversation._id) === String(roomId)) {
      if (!activeConversation || String(activeConversation._id) !== String(roomId)) {
        setActiveConversation(selfConversation);
      }
      return;
    }
    if (mergedConversations.length > 0) {
      const targetRoom = mergedConversations.find(c => String(c._id) === String(roomId));
      if (targetRoom) {
        if (!activeConversation || String(activeConversation._id) !== String(roomId) || targetRoom !== activeConversation) {
          setActiveConversation(targetRoom);
        }
      }
    }
  }, [roomId, mergedConversations, selfConversation, activeConversation]);
  useEffect(() => {
    activeConvIdRef.current = activeConversation?._id;
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const fetchConversationsData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const allConvs = res.data.data?.items || res.data.items || [];
      const self = allConvs.find(c => c.type === 'direct' && c.participants?.length === 1);
      setSelfConversation(self || null);
      setConversations(allConvs);
    } catch (err) { console.error("Lỗi lấy danh sách:", err); }
  }, [token]);

  // ==================== KHỞI TẠO SOCKET ====================
  useEffect(() => {
    if (!token) return;
    socketService.connect();
    fetchConversationsData();

    const handleConversationUpdated = (payload) => {
      const { conversationId, latestMessage } = payload;
      const convIdStr = String(conversationId);
      let activeIdStr = String(activeConvIdRef.current);
      const isMyMessage = String(latestMessage?.senderId?._id || latestMessage?.senderId) === String(userId);

      // FIX: Phát hiện khi đang mở mock conversation mà nhận được update của conversation thật tương ứng
      const activeCon = activeConversationRef.current;
      if (activeCon?.isMock && convIdStr !== activeIdStr) {
        const mockFriendId = String(activeCon._id).replace('mock_', '');
        const senderId = String(latestMessage?.senderId?._id || latestMessage?.senderId || '');
        if (senderId === mockFriendId || isMyMessage) {
          // Conversation thật đã được tạo - chuyển sang conversation thật
          const realConv = { ...activeCon, _id: convIdStr, isMock: false, latestMessage };
          setActiveConversation(realConv);
          activeConvIdRef.current = convIdStr;
          activeIdStr = convIdStr;
        }
      }

      if (convIdStr === activeIdStr) {
        const msgIdStr = String(latestMessage?._id || latestMessage?.id);
        const normalizedMsg = {
          ...latestMessage,
          mediaIds: (latestMessage.mediaIds || []).map(media =>
            typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
              ? { ...media, url: `${API_ORIGIN}${media.url}` }
              : media
          )
        };

        setMessages(prev => {
          if (prev.some(m => !String(m._id || m.id).startsWith('temp-') && String(m._id || m.id) === msgIdStr)) {
            return prev;
          }
          const tempIdx = prev.findIndex(m =>
            String(m._id || m.id).startsWith('temp-') &&
            (m.content || '').trim() === (normalizedMsg.content || '').trim()
          );
          if (tempIdx !== -1) {
            const arr = [...prev];
            arr[tempIdx] = normalizedMsg;
            return arr;
          }
          return [...prev, normalizedMsg];
        });

        socketService.socket?.emit("message_delivered", { messageId: latestMessage._id });
        socketService.socket?.emit("message_seen", { messageId: latestMessage._id });
      } else if (!isMyMessage && latestMessage?.type !== 'system' && latestMessage?.type !== 'system_reminder') {
        const senderObj = latestMessage?.senderId;
        const senderName = senderObj?.username || senderObj?.fullName || 'Ai đó';
        const shortContent = latestMessage?.content || '[Hình ảnh/File đính kèm]';
        const avatarSrc = senderObj?.avatarUrl || senderObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=0068FF&color=fff`;
        toast.custom((t) => (
          <div
            className={`push-notif-card ${t.visible ? 'entering' : 'leaving'}`}
            onClick={() => toast.dismiss(t.id)}
          >
            <img src={avatarSrc} alt="" className="push-notif-avatar" />
            <div className="push-notif-body">
              <div className="push-notif-sender">{senderName}</div>
              <div className="push-notif-content">{shortContent}</div>
            </div>
            <span className="push-notif-close">✕</span>
          </div>
        ), { position: 'bottom-right', duration: 4500, id: `notif_${latestMessage?._id}` });
      }

      setSelfConversation(prev => {
        if (prev && String(prev._id) === convIdStr) {
          return { ...prev, latestMessage };
        }
        return prev;
      });

      setConversations(prevConvs => {
        const index = prevConvs.findIndex(c => String(c._id) === convIdStr);
        if (index === -1) {
          fetchConversationsData();
          // Xóa mock conversation nếu đang có (đã được tạo thật)
          const mockId = `mock_${String(latestMessage?.senderId?._id || latestMessage?.senderId || '')}`;
          return prevConvs.filter(c => c._id !== mockId);
        }

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
    };

    const handleSettingsUpdated = (newSettings) => {
      setActiveConversation(prev => prev ? { ...prev, settings: newSettings } : prev);
      setConversations(prev => prev.map(c =>
        activeConversationRef.current && c._id === activeConversationRef.current._id
          ? { ...c, settings: newSettings } : c
      ));
    };

    const handleMessageRecalled = ({ messageId }) => {
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isRecalled: true, content: "", attachments: [], mediaIds: [] } : m));
      setConversations(prev => prev.map(c => {
        if (c.latestMessage && String(c.latestMessage._id) === String(messageId)) {
          return { ...c, latestMessage: { ...c.latestMessage, isRecalled: true, content: "" } };
        }
        return c;
      }));
    };

    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    };

    const handleNewNotification = (notif) => {
      if (notif?.type === 'friend_request') fetchIncomingRequests();
      if (notif?.type === 'friend_accepted') { fetchFriends(); fetchOutgoingRequests(); }
    };

    const handleReminderCreated = (reminder) => {
      setReminders(prev => {
        if (prev.some(r => r._id === reminder._id)) return prev;
        return [...prev, reminder].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
      });
      // System message is persisted by backend and arrives via conversation_updated
    };

    const handleReminderUpdated = (reminder) => {
      setReminders(prev => prev.map(r => r._id === reminder._id ? reminder : r));
    };

    const handleReminderDeleted = ({ reminderId }) => {
      setReminders(prev => prev.filter(r => r._id !== reminderId));
    };

    const handleJoinRequestReceived = ({ conversationId, conversationName, joinRequest }) => {
      const activeId = activeConvIdRef.current;
      if (activeId && activeId === conversationId) {
        setJoinRequests(prev => {
          if (prev.some(r => r._id === joinRequest._id)) return prev;
          return [joinRequest, ...prev];
        });
      }
      toast(`Yêu cầu tham gia nhóm "${conversationName}" mới`, { icon: '👥' });
    };

const handleJoinRequestProcessed = ({ conversationName, action }) => {
      if (action === 'approve') {
        toast.success(`Yêu cầu tham gia "${conversationName}" đã được chấp thuận!`);
        fetchConversationsData();
      } else {
        toast.error(`Yêu cầu tham gia "${conversationName}" đã bị từ chối.`);
      }
    };

    socketService.on("conversation_updated", handleConversationUpdated);
    socketService.on("conversation_settings_updated", handleSettingsUpdated);
    socketService.on("message_recalled", handleMessageRecalled);
    socketService.on("message_reacted", handleMessageReacted);
    socketService.on("new_notification", handleNewNotification);
    socketService.on("reminder_created", handleReminderCreated);
    socketService.on("reminder_updated", handleReminderUpdated);
    socketService.on("reminder_deleted", handleReminderDeleted);
    socketService.on("join_request_received", handleJoinRequestReceived);
    socketService.on("join_request_processed", handleJoinRequestProcessed);

    const handleReminderTriggered = ({ _id, title, participants }) => {
      setReminders(prev => prev.map(r => r._id === _id ? { ...r, status: 'done' } : r));
      const currentUserObj = JSON.parse(localStorage.getItem('user') || '{}');
      const myId = String(currentUserObj._id || currentUserObj.id || '');
      const isParticipant = (participants || []).some(p => String(p._id || p) === myId);
      if (!isParticipant) return;
      // Dùng browser Notification nếu được cấp quyền, fallback toast
      const msg = `🔔 Nhắc hẹn: ${title}`;
      if (Notification.permission === 'granted') {
        new Notification('Nhắc hẹn', { body: title, icon: '/favicon.ico' });
      } else {
        toast(msg, { duration: 8000, icon: '🔔', style: { fontWeight: 600 } });
      }
    };
    socketService.on("reminder_triggered", handleReminderTriggered);

    return () => {
      socketService.off("conversation_updated", handleConversationUpdated);
      socketService.off("conversation_settings_updated", handleSettingsUpdated);
      socketService.off("message_recalled", handleMessageRecalled);
      socketService.off("message_reacted", handleMessageReacted);
      socketService.off("new_notification", handleNewNotification);
      socketService.off("reminder_created", handleReminderCreated);
      socketService.off("reminder_updated", handleReminderUpdated);
      socketService.off("reminder_deleted", handleReminderDeleted);
      socketService.off("join_request_received", handleJoinRequestReceived);
      socketService.off("join_request_processed", handleJoinRequestProcessed);
      socketService.off("reminder_triggered", handleReminderTriggered);
    };
  }, [token, userId, fetchConversationsData]);

  // ==================== LOAD TIN NHẮN KHI VÀO PHÒNG ====================
  useEffect(() => {
    if (!activeConversation) return;
    setMessages([]);
    setJustSentRequestTo(null);

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
        // Dedup và merge với messages đã có từ socket trong lúc fetch, sort theo thời gian
        setMessages(prev => {
          const merged = [...normalized, ...prev];
          const seen = new Set();
          const deduped = merged.filter(m => {
            const id = String(m._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          return deduped.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        setConversations(prev => prev.map(c => String(c._id) === String(activeConversation._id) ? { ...c, unreadCount: 0 } : c));
      } catch (err) { setMessages([]); }
    };

    fetchMessages();
    // socket.io sẽ buffer emit này nếu chưa connect, và gửi khi connected
    socketService.socket?.emit("join_conversation", { conversationId: activeConversation._id });

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
    socketService.socket?.emit("join_conversation", { conversationId: currentConvId });
    navigate('/chat/' + currentConvId);
    return currentConvId;
  };

  // ==================== TƯƠNG TÁC ====================
  const handleSendText = async (content) => {
    if (!activeConversation || !content.trim()) return;

    // OPTIMISTIC UI: Thêm tin nhắn tạm thời
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      content: content,
      senderId: { _id: userId }, // Đóng vai trò sender là chính mình
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const currentConvId = await ensureRealConversation();
      const res = await axios.post(`${API_BASE_URL}/messages/send`,
        { content: content, conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const realMsg = res.data.data || res.data;
      const realMsgId = String(realMsg._id || realMsg.id);

      // Cập nhật tin nhắn tạm bằng tin nhắn thật từ server
      // Nếu socket đã replace temp trước → realMsg đã có trong list, chỉ ensure không bị trùng
      setMessages(prev => {
        // Kiểm tra realMsg đã có chưa (socket có thể đã add vào rồi)
        if (prev.some(m => !String(m._id || m.id).startsWith('temp-') && String(m._id || m.id) === realMsgId)) {
          // Đã có, chỉ xóa temp nếu còn sót
          return prev.filter(m => m._id !== tempId);
        }
        // Chưa có → replace temp bằng real
        return prev.map(m => m._id === tempId ? {
          ...realMsg,
          mediaIds: (realMsg.mediaIds || []).map(media =>
            typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
              ? { ...media, url: `${API_ORIGIN}${media.url}` }
              : media
          )
        } : m);
      });

    } catch (err) {
      toast.error("Lỗi gửi tin nhắn");
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  const handleSendLike = async () => {
    if (!activeConversation) return;

    // OPTIMISTIC LIKE
    const tempId = `temp-like-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      content: "👍",
      senderId: { _id: userId },
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const currentConvId = await ensureRealConversation();
      const res = await axios.post(`${API_BASE_URL}/messages/send`,
        { content: "👍", conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const realMsg = res.data.data || res.data;
      setMessages(prev => prev.map(m => m._id === tempId ? realMsg : m));

    } catch (err) {
      console.error("Lỗi gửi Like", err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
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
      await axios.put(
        `${API_BASE_URL}/messages/${msgId}/recall`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Đã thu hồi tin nhắn");
    } catch (err) {
      // Rollback optimistic recall nếu API fail
      setMessages(prev => prev.map(m => String(m._id) === String(msgId) ? { ...m, isRecalled: false } : m));
      toast.error("Lỗi thu hồi tin nhắn");
    }
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

  // --- Hàm xử lý Xóa cuộc trò chuyện cá nhân ---
  const handleDeleteConversation = async () => {
    if (!activeConversation) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa cuộc trò chuyện với ${getConversationName(activeConversation)} không?`)) {
      try {
        if (activeConversation.isMock) {
          setActiveConversation(null);
          navigate('/chat');
          return;
        }
        // Tạm thời gọi hàm Archive để làm nó biến mất vì BE chưa có API Delete thật
        await conversationService.archiveConversation(activeConversation._id);
        toast.success("Đã xóa cuộc trò chuyện");
        setActiveConversation(null); // Clear màn hình chat
        navigate('/chat');           // Đẩy URL về mặc định
        fetchConversationsData();    // Load lại danh sách bên trái
      } catch (err) {
        toast.error("Có lỗi xảy ra khi xóa cuộc trò chuyện");
      }
    }
  };

  // --- Các hàm quản lý nhóm nâng cao ---
  const handleUpdateGroupSettings = async (settings) => {
    if (!activeConversation) return;
    try {
      await axios.put(`${API_BASE_URL}/conversations/${activeConversation._id}/settings`, settings, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Đã cập nhật cài đặt nhóm");
      fetchConversationsData(); // Cập nhật lại UI
    } catch (err) {
      toast.error("Lỗi cập nhật cài đặt");
    }
  };

  const handleMute = async (durationMinutes) => {
    if (!activeConversation) return;
    try {
      let mutedUntil = null;
      if (durationMinutes !== -1) {
        mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      } else {
        mutedUntil = new Date(2099, 0, 1).toISOString(); // Mute forever
      }
      await conversationService.muteConversation(activeConversation._id, mutedUntil);
      toast.success(durationMinutes === 0 ? "Đã bật lại thông báo" : "Đã tắt thông báo");
      fetchConversationsData();
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái thông báo");
    }
  };

  const handleGroupAction = async (action, memberId) => {
    if (!activeConversation) return;
    try {
      if (action === 'promote') await conversationService.promoteGroupAdmin(activeConversation._id, memberId);
      else if (action === 'demote') await conversationService.demoteGroupAdmin(activeConversation._id, memberId);
      else if (action === 'remove') await conversationService.removeGroupMember(activeConversation._id, memberId);
      else if (action === 'transfer') await conversationService.transferGroupOwner(activeConversation._id, memberId);

      toast.success("Thao tác thành công");
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDisbandGroup = async () => {
    if (!activeConversation) return;
    if (!window.confirm("Giải tán nhóm sẽ xóa toàn bộ nội dung trò chuyện và các thành viên khỏi nhóm.\n\nBạn có chắc chắn muốn giải tán nhóm không?")) return;
    try {
      await conversationService.disbandGroup(activeConversation._id);
      toast.success("Đã giải tán nhóm thành công!");
      setActiveConversation(null);
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi giải tán nhóm");
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConversation) return;
    if (window.confirm(`Bạn có chắc chắn muốn rời khỏi nhóm ${getConversationName(activeConversation)} không?`)) {
      try {
        await conversationService.leaveGroup(activeConversation._id);
        toast.success("Đã rời nhóm thành công");
        setActiveConversation(null);
        navigate('/chat');
        fetchConversationsData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Lỗi khi rời nhóm");
      }
    }
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
  const imgFiles = allMedia.filter(m => ["image", "video"].includes(getCategory(m.name || m.fileName)));
  const docFiles = allMedia.filter(m => !["image", "video", "audio"].includes(getCategory(m.name || m.fileName)));
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

      {/* ── REMINDER DETAIL MODAL ── */}
      {reminderDetailId && (() => {
        const rem = reminders.find(r => r._id === reminderDetailId);
        if (!rem) return null;
        const remDate = new Date(rem.remindAt);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
        const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
        const participantCount = (rem.participants || []).length;
        const declinedCount = (rem.declinedBy || []).length;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setReminderDetailId(null)}>
            <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 16, width: 440, maxWidth: '94vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--z-border)' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--z-text-primary)' }}>Chi tiết nhắc hẹn</span>
                <button onClick={() => setReminderDetailId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ background: 'var(--z-primary)', borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 64, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{dayNames[remDate.getDay()]}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{remDate.getDate()}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Tháng {remDate.getMonth() + 1}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 6 }}>{rem.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🕐 {remDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', marginTop: 4 }}>
                      Tạo bởi: <strong>{rem.createdBy?.username || 'Ai đó'}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: 'var(--z-primary)', fontWeight: 600 }}>{participantCount} người tham gia</span>
                  {declinedCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>{declinedCount} không tham gia</span>}
                </div>
                {(rem.participants || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(rem.participants || []).map((p, i) => (
                      <div key={i} title={p.username || ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <img src={p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username || 'U')}&background=0068ff&color=fff&size=40`}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <span style={{ fontSize: 10, color: 'var(--z-text-muted)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '12px', background: 'var(--z-bg-main)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {hasJoined ? (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--z-primary)' }}>✓ Bạn xác nhận: Tham gia</span>
                      <button onClick={() => { handleDeclineReminder(rem._id); setReminderDetailId(null); }} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Thay đổi</button>
                    </>
                  ) : hasDeclined ? (
                    <>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>✗ Bạn xác nhận: Không tham gia</span>
                      <button onClick={() => { handleJoinReminder(rem._id); setReminderDetailId(null); }} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Thay đổi</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <button onClick={() => { handleJoinReminder(rem._id); setReminderDetailId(null); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Tham gia</button>
                      <button onClick={() => { handleDeclineReminder(rem._id); setReminderDetailId(null); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', fontSize: 13, cursor: 'pointer' }}>Từ chối</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--z-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => { setPendingEditReminder(rem); setReminderDetailId(null); }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Chỉnh sửa
                </button>
                <button onClick={() => { if (window.confirm(`Hủy nhắc hẹn "${rem.title}"?`)) { handleDeleteReminder(rem._id); setReminderDetailId(null); } }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ffe4e6', color: '#e11d48', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Hủy nhắc hẹn
                </button>
                <button onClick={() => setReminderDetailId(null)}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        outgoingRequestIds={outgoingRequestIds}
        friends={friends}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        friends={friends}
        onCreated={(newConv) => {
          fetchConversationsData();
          setActiveConversation(newConv);
        }}
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
          <div style={{ display: "flex", gap: 6 }}>
            <button
              title="Thêm bạn bè"
              onClick={() => setShowAddFriendModal(true)}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--z-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-secondary)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--z-border)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--z-bg-hover)"}
            >
              <FaUserPlus size={15} />
            </button>
            <button
              title="Tạo nhóm"
              onClick={() => setShowCreateGroupModal(true)}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--z-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-secondary)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--z-border)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--z-bg-hover)"}
            >
              <FaUsers size={15} />
            </button>
          </div>
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
              style={{ cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0068FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FaUserSecret size={20} color="#fff" />
              </div>
              <div className="cli-info">
                <div className="cli-top">
                  <span className="cli-name" style={{ fontWeight: 700 }}>Tin nhắn từ người lạ</span>
                  <span className="cli-time" style={{ color: 'var(--z-primary)' }}></span>
                </div>
                <div className="cli-bottom">
                  <span className="cli-msg">Gửi từ người chưa có trong danh bạ...</span>
                  <div className="cli-unread" style={{ background: '#ef4444' }}>●</div>
                </div>
              </div>
            </div>
          )}
          {friendConvs.map((conv) => {
            const isActive = activeConversation?._id === conv._id;
            const convName = getConversationName(conv);
            if (!convName) return null;
            const unread = conv.unreadCount || 0;
            const isSelf = conv.type === 'direct' && conv.participants?.length === 1;
            return (
              <div key={conv._id} className={`chat-list-item ${isActive ? 'active' : ''}`} onClick={() => { setActiveConversation(conv); navigate('/chat/' + conv._id); }}>
                {isSelf ? (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0068FF, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FaCloud size={20} color="#fff" />
                  </div>
                ) : (
                  <img className="cli-avatar" src={getConversationAvatar(conv)} alt="avt" />
                )}
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
              if (!activeConversation || activeConversation.type === 'group' || activeConversation.roomModel === 'Group') return null;
              const other = getOtherParticipant(activeConversation);
              const otherId = other && typeof other === 'object' ? String(other._id || other.id) : null;
              const otherName = other && typeof other === 'object' ? (other.username || other.fullName || 'Người dùng') : 'Người dùng';
              const isStranger = otherId && !friendIds.has(otherId);
              if (!isStranger) return null;

              const hasOutgoing = outgoingRequestIds.has(otherId) || justSentRequestTo === otherId;
              const incomingReq = incomingRequests.find(r => {
                const fromId = r.fromUserId?._id
                  ? String(r.fromUserId._id)
                  : r.fromUserId?.id
                    ? String(r.fromUserId.id)
                    : String(r.fromUserId || '');
                return fromId === otherId;
              });

              if (hasOutgoing) return (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, backdropFilter: 'blur(8px)' }}>
                  <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--z-text-secondary)' }}>
                    Đang chờ <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> đồng ý kết bạn
                  </span>
                </div>
              );

              if (incomingReq) return (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)' }}>
                  <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--z-text-secondary)' }}>
                    <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> đã gửi lời mời kết bạn
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={async () => {
                        try {
                          const reqId = String(incomingReq._id || incomingReq.id);
                          await acceptRequest(reqId);
                          await Promise.all([fetchIncomingRequests(), fetchFriends()]);
                        } catch (e) { alert('Không thể chấp nhận'); }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      <FaCheck size={11} />Đồng ý
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const reqId = String(incomingReq._id || incomingReq.id);
                          await rejectRequest(reqId);
                          await fetchIncomingRequests();
                        } catch (e) { alert('Không thể từ chối'); }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      <FaTimes size={11} />Từ chối
                    </button>
                  </div>
                </div>
              );

              return (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)' }}>
                  <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--z-text-secondary)' }}>
                    Bạn và <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> chưa kết bạn
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        const { friendService } = await import('../../services/friendService');
                        await friendService.sendFriendRequest(otherId);
                        setJustSentRequestTo(otherId); // optimistic update ngay lập tức
                        fetchOutgoingRequests();
                      } catch (e) {
                        const code = e.response?.data?.error?.code;
                        if (code === 'REVERSE_REQUEST_EXISTS') fetchIncomingRequests();
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--z-primary)', background: 'transparent', color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0 }}
                  >
                    <FaUserPlus size={11} />Gửi kết bạn
                  </button>
                </div>
              );
            })()}
            {messages.length === 0 && uploads.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img src={getConversationAvatar(activeConversation)} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', margin: '0 0 8px 0', textAlign: 'center' }}>{getConversationName(activeConversation)}</h3>
              </div>
            ) : (
              <>
                {(() => {
                  // Merge messages + reminders sorted by createdAt
                  const reminderItems = reminders.map(r => ({ ...r, _isReminder: true }));
                  const combined = [...messages, ...reminderItems].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                  );
                  return combined.map((item, index) => {
                    const prev = combined[index - 1];
                    const showDate = shouldShowDateDivider(item, prev);
                    if (item._isReminder) {
                      const rem = item;
                      const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
                      const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
                      const participantCount = (rem.participants || []).length;
                      const remDate = new Date(rem.remindAt);
                      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                      return (
                        <React.Fragment key={`rem-${rem._id}`}>
                          {showDate && <div className="msg-date-divider"><span>{formatDateDivider(rem.createdAt)}</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 16px' }}>
                            <div style={{ background: 'var(--z-bg-sidebar)', border: '1px solid var(--z-border)', borderRadius: 12, padding: '12px 16px', maxWidth: 320, width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer' }} onClick={() => setReminderDetailId(rem._id)}>
                              <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginBottom: 8 }}>
                                <strong>{rem.createdBy?.username || 'Ai đó'}</strong> đã tạo nhắc hẹn mới
                              </div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--z-primary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 56, flexShrink: 0 }}>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayNames[remDate.getDay()]}</div>
                                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{remDate.getDate()}</div>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Tháng {remDate.getMonth() + 1}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--z-text-primary)', marginBottom: 4 }}>{rem.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    🕐 {remDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 4 }}>
                                    {participantCount} người tham gia
                                  </div>
                                </div>
                              </div>
                              <div style={{ marginTop: 10, borderTop: '1px solid var(--z-border)', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
                                {hasJoined ? (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <span style={{ color: 'var(--z-primary)' }}>✓ Bạn xác nhận: Tham gia</span>
                                    <button onClick={() => handleDeclineReminder(rem._id)} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Thay đổi</button>
                                  </div>
                                ) : hasDeclined ? (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <span style={{ color: '#ef4444' }}>✗ Bạn xác nhận: Không tham gia</span>
                                    <button onClick={() => handleJoinReminder(rem._id)} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Thay đổi</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => handleJoinReminder(rem._id)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Tham gia</button>
                                    <button onClick={() => handleDeclineReminder(rem._id)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', fontSize: 13, cursor: 'pointer' }}>Từ chối</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }
                    const isMe = getSenderIdStr(item) === String(userId);
                    return (
                      <React.Fragment key={item._id}>
                        {showDate && <div className="msg-date-divider"><span>{formatDateDivider(item.createdAt)}</span></div>}
                        {item.type === 'system' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                            <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-main)', padding: '3px 10px', borderRadius: 10 }}>{item.content}</span>
                          </div>
                        ) : item.type === 'system_reminder' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                            <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-main)', padding: '4px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                              🔔 {item.content}
                              {(item.reminderId || item.reminderId?._id) && (
                                <span style={{ color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, marginLeft: 2 }} onClick={() => setReminderDetailId(String(item.reminderId?._id || item.reminderId))}>Xem</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <MessageBubble
                            message={item}
                            isMe={isMe}
                            onReaction={handleReaction}
                            onRecall={handleRecall}
                            onDelete={handleDelete}
                            onForward={openShareModal}
                            onReply={(msg) => console.log('Trả lời:', msg)}
                          />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
                {uploads.map(u => (
                  <UploadBubble key={u.id} name={u.name} percent={u.percent} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {(() => {
            const isGroupConv = activeConversation?.type === 'group' || activeConversation?.roomModel === 'Group';
            const isOwnerStr = activeConversation?.ownerId?._id || activeConversation?.ownerId || activeConversation?.createdBy;
            const isOwner = isOwnerStr && String(isOwnerStr) === String(userId);
            const isAdmin = activeConversation?.adminIds?.some(aid => String(aid._id || aid) === String(userId)) || isOwner;
            const isPrivileged = isOwner || isAdmin;
            const cannotSend = isGroupConv && !isPrivileged && activeConversation?.settings?.canMembersSendMessages === false;

            if (cannotSend) {
              return (
                <div style={{ padding: '16px', background: 'var(--z-bg-main)', borderTop: '1px solid var(--z-border)', display: 'flex', alignItems: 'flex-start', color: 'var(--z-text-secondary)', fontSize: 13, gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--z-primary)' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                    Chỉ trưởng/phó cộng đồng được gửi tin nhắn vào cộng đồng. <span style={{ color: 'var(--z-primary)', cursor: 'pointer' }}>Tìm hiểu thêm</span>
                  </div>
                </div>
              );
            }

            return (
              <MessageInput
                key={activeConversation._id}
                theme={appliedTheme}
                placeholder={`Nhập @, tin nhắn tới ${getConversationName(activeConversation)}`}
                onSend={handleSendText}
                onSendLike={handleSendLike}
                onUploadFiles={handleUploadFilesFromInput}
              />
            );
          })()}
        </main>
      ) : (
        <main className="chat-main" style={{ alignItems: 'center', justifyItems: 'center', display: 'flex' }}>
          <div style={{ color: 'var(--z-text-secondary)', fontSize: 16, margin: 'auto' }}>Chọn một cuộc trò chuyện để bắt đầu</div>
        </main>
      )}

      {/* ── BÊN PHẢI: RIGHT PANEL ── */}
      {activeConversation && showRightPanel && (
        <ChatRightPanel
          activeConversation={activeConversation}
          setActiveConversation={setActiveConversation}
          getConversationAvatar={getConversationAvatar}
          getConversationName={getConversationName}
          fetchConversations={fetchConversationsData}
          imgFiles={imgFiles}
          docFiles={docFiles}
          linkItems={linkItems}
          handleDeleteConversation={handleDeleteConversation}
          handleLeaveGroup={handleLeaveGroup}
          handleDisbandGroup={handleDisbandGroup}
          setShowCreateGroupModal={setShowCreateGroupModal}
          handleUpdateGroupSettings={handleUpdateGroupSettings}
          handleMute={handleMute}
          handleGroupAction={handleGroupAction}
          reminders={reminders}
          handleCreateReminder={handleCreateReminder}
          handleUpdateReminder={handleUpdateReminder}
          handleDeleteReminder={handleDeleteReminder}
          joinRequests={joinRequests}
          handleProcessJoinRequest={handleProcessJoinRequest}
          pendingEditReminder={pendingEditReminder}
          onPendingEditConsumed={() => setPendingEditReminder(null)}
        />
      )}

      {/* ── PANEL: Tin nhắn từ người lạ ── */}
      {showStrangerPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowStrangerPanel(false)} />
          {/* Panel */}
          <div style={{ position: 'relative', width: 360, height: '100%', background: 'var(--z-bg-sidebar)', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setShowStrangerPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--z-text-primary)', padding: 4 }}>
                <FaArrowLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--z-text-primary)' }}>Tin nhắn từ người lạ</span>
            </div>
            {/* Notice */}
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--z-text-secondary)', borderBottom: '1px solid var(--z-border)' }}>
              Người lạ có thể nhắn tin cho bạn.{' '}
              <span style={{ color: 'var(--z-primary)', cursor: 'pointer' }}>Cài đặt quyền riêng tư</span>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {strangerConvs.map(conv => {
                const unread = conv.unreadCount || 0;
                return (
                  <div
                    key={conv._id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--z-border)' }}
                    onClick={() => { setActiveConversation(conv); navigate('/chat/' + conv._id); setShowStrangerPanel(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <img src={getConversationAvatar(conv)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--z-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getConversationName(conv)}</span>
                        <span style={{ fontSize: 11, color: 'var(--z-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                          {conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--z-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.latestMessage?.content || '[Hình ảnh/File]'}
                        </span>
                        {unread > 0 && <div style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, flexShrink: 0 }}>{unread}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {strangerConvs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--z-text-muted)', fontSize: 13 }}>Không có tin nhắn từ người lạ</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}