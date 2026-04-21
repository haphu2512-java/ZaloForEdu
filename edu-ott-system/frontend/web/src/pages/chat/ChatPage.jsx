import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaCloud, FaSpinner, FaUserPlus, FaCheck, FaTimes, FaArrowLeft } from "react-icons/fa";
import toast from "react-hot-toast";

import { uploadFile } from "../../services/mediaService";
import { useFriendStore } from "../../store/friendStore";
import { socketService } from "../../services/socketService";
import { MessageBubble } from "./MessageBubble";
import { ShareMessageModal } from "./Modals/ShareMessageModal";
import AddFriendModal from "./Modals/AddFriendModal";
import CreateGroupModal from "./Modals/CreateGroupModal";
import CreatePollModal from "./Modals/CreatePollModal";
import PinLimitModal from "./Modals/PinLimitModal";
import UnpinConfirmModal from "./Modals/UnpinConfirmModal";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { ChatRightPanel } from "./ChatRightPanel";
import { ChatSidebar } from "./ChatSidebar";
import { PinnedBar } from "./PinnedBar";
import { useChatSocket } from "./useChatSocket";
import MyDocumentsPage from "../cloud/MyDocumentsPage";
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategory } from './chatUtils';
import "./ChatPage.css";
import { conversationService } from "../../services/conversationService";
import { pollService } from "../../services/pollService";
import ConversationContextMenu from "./Modals/ConversationContextMenu";
import ReportUserModal from "./Modals/ReportUserModal";
import AddMemberModal from "./Modals/AddMemberModal";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23d8dadf'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23bcc0c4'/%3E%3Cpath d='M6 35 Q6 26 20 26 Q34 26 34 35' fill='%23bcc0c4'/%3E%3C/svg%3E";
const CLOUD_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%230068FF'/%3E%3Cpath d='M28 22a5 5 0 0 0-4.9-5 7 7 0 0 0-13.1 3A4 4 0 0 0 12 28h16a4 4 0 0 0 0-6z' fill='white'/%3E%3C/svg%3E";

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
  const [replyToMessage, setReplyToMessage] = useState(null);

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
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'primary' | 'work' | 'family' | 'other'

  // ── Context menu cho conversation item ──
  const [ctxMenu, setCtxMenu] = useState(null); // { conv, x, y }
  const [reportTarget, setReportTarget] = useState(null); // { id, name }
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenConvs, setHiddenConvs] = useState([]);

  // ── Bảo mật tin ẩn bằng PIN 4 số (hoàn toàn FE, không đụng BE) ──
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('unlock'); // 'unlock' | 'setup'
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinStep, setPinStep] = useState(1); // 1=nhập PIN, 2=xác nhận (khi setup)
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
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // ── Pin & Poll states ──
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinLimitModal, setShowPinLimitModal] = useState(false);
  const [pendingPinId, setPendingPinId] = useState(null);
  const [showUnpinConfirmModal, setShowUnpinConfirmModal] = useState(false);
  const [unpinTargetId, setUnpinTargetId] = useState(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

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
    if (!conv) return DEFAULT_AVATAR;
    if (conv.type === 'direct' && conv.participants?.length === 1) return CLOUD_AVATAR;
    if (conv.type === 'group' || conv.roomModel === 'Group') return conv.avatarUrl || conv.avatar || DEFAULT_AVATAR;
    const other = getOtherParticipant(conv);
    if (other && typeof other === 'object') return other.avatarUrl || other.avatar || DEFAULT_AVATAR;
    return DEFAULT_AVATAR;
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
      // "Cloud của tôi" (self-conversation) luôn đứng đầu tuyệt đối
      const aIsSelf = a.type === 'direct' && a.participants?.length === 1 ? 1 : 0;
      const bIsSelf = b.type === 'direct' && b.participants?.length === 1 ? 1 : 0;
      if (bIsSelf !== aIsSelf) return bIsSelf - aIsSelf;
      // Pinned conversations lên đầu (sau Cloud)
      const aPinned = a.preference?.isPinned ? 1 : 0;
      const bPinned = b.preference?.isPinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      // Cùng trạng thái → sort theo thời gian tin nhắn mới nhất
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (!searchQuery.trim()) {
      // Áp dụng filter category nếu không phải 'all'
      if (categoryFilter !== 'all') {
        return convs.filter(conv => (conv.preference?.category || 'primary') === categoryFilter);
      }
      return convs;
    }
    const searched = convs.filter(conv => getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase()));
    if (categoryFilter !== 'all') {
      return searched.filter(conv => (conv.preference?.category || 'primary') === categoryFilter);
    }
    return searched;
  }, [conversations, friends, searchQuery, categoryFilter, userId, getConversationName, getOtherParticipant]);
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

  // ==================== SOCKET (tách sang useChatSocket) ====================
  useChatSocket({
    token, userId,
    activeConvIdRef, activeConversationRef,
    setMessages, setConversations, setActiveConversation, setSelfConversation,
    setPinnedMessages, setReminders, setJoinRequests,
    fetchConversationsData, fetchIncomingRequests, fetchFriends, fetchOutgoingRequests,
    toast,
  });

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
    // Fetch pinned messages
    conversationService.getPinnedMessages(activeConversation._id)
      .then(res => setPinnedMessages(res.data?.items || res.data || []))
      .catch(() => setPinnedMessages([]));
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

  const resolveReply = (msg, existingMsgs) => {
    if (!msg || !msg.replyTo) return msg;
    if (typeof msg.replyTo === 'object' && msg.replyTo.content) return msg;
    
    const replyId = String(msg.replyTo._id || msg.replyTo);
    const originalMsg = existingMsgs.find(m => String(m._id || m.id) === replyId);
    
    if (originalMsg) {
      return { ...msg, replyTo: originalMsg };
    }
    return msg;
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
        { 
          content: content, 
          conversationId: currentConvId,
          replyTo: replyToMessage?._id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyToMessage(null);

      const realMsg = res.data.data || res.data;
      const realMsgId = String(realMsg._id || realMsg.id);

      // Cập nhật tin nhắn tạm bằng tin nhắn thật từ server
      // Nếu socket đã replace temp trước → realMsg đã có trong list, chỉ ensure không bị trùng
      setMessages(prev => {
        const normalizedMsg = {
          ...realMsg,
          mediaIds: (realMsg.mediaIds || []).map(media =>
            typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
              ? { ...media, url: `${API_ORIGIN}${media.url}` }
              : media
          )
        };
        const resolvedMsg = resolveReply(normalizedMsg, prev);

        if (prev.some(m => !String(m._id || m.id).startsWith('temp-') && String(m._id || m.id) === realMsgId)) {
          return prev.filter(m => m._id !== tempId);
        }
        const tempIdx = prev.findIndex(m => m._id === tempId);
        if (tempIdx !== -1) {
          const arr = [...prev];
          arr[tempIdx] = resolvedMsg;
          return arr;
        }
        return [...prev, resolvedMsg];
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

  // ==================== PIN MESSAGE HANDLERS ====================
  const pinnedMsgIds = useMemo(() => new Set(pinnedMessages.map(p => String(p.messageId?._id || p.messageId))), [pinnedMessages]);

  const handlePinMessage = async (messageId) => {
    if (!activeConversation) return;
    if (pinnedMessages.length >= 3) {
      setPendingPinId(messageId);
      setShowPinLimitModal(true);
      return;
    }
    // Optimistic update
    const tempPin = { _id: `temp-pin-${Date.now()}`, messageId: messageId, pinnedAt: new Date().toISOString() };
    setPinnedMessages(prev => [...prev, tempPin]);

    try {
      await conversationService.pinMessage(activeConversation._id, messageId);
      const res = await conversationService.getPinnedMessages(activeConversation._id);
      setPinnedMessages(res.data?.items || res.data || []);
      toast.success("📌 Đã ghim tin nhắn");
    } catch (err) {
      // Rollback
      setPinnedMessages(prev => prev.filter(p => p._id !== tempPin._id));
      toast.error(err.response?.data?.message || "Lỗi ghim tin nhắn");
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!activeConversation) return;
    try {
      await conversationService.unpinMessage(activeConversation._id, messageId);
      setPinnedMessages(prev => prev.filter(p => String(p.messageId?._id || p.messageId) !== String(messageId)));
      toast.success("Đã bỏ ghim tin nhắn");
    } catch (err) {
      toast.error("Lỗi bỏ ghim tin nhắn");
    }
  };

  const handleForcePin = async () => {
    if (!pendingPinId || !activeConversation) return;
    // Bỏ ghim tin cũ nhất rồi ghim tin mới
    const oldest = pinnedMessages[0];
    if (oldest) {
      await conversationService.unpinMessage(activeConversation._id, oldest.messageId?._id || oldest.messageId);
    }
    try {
      await conversationService.pinMessage(activeConversation._id, pendingPinId);
      const res = await conversationService.getPinnedMessages(activeConversation._id);
      setPinnedMessages(res.data?.items || res.data || []);
      toast.success("📌 Đã ghim tin nhắn");
    } catch (err) {
      toast.error("Lỗi ghim tin nhắn");
    }
    setShowPinLimitModal(false);
    setPendingPinId(null);
  };

  const jumpToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-msg');
      setTimeout(() => el.classList.remove('highlight-msg'), 1500);
    }
  };

  // ==================== POLL HANDLERS ====================
  const handleCreatePoll = async (pollData) => {
    if (!activeConversation) return;
    try {
      await pollService.createPoll({ ...pollData, conversationId: activeConversation._id });
      toast.success("📊 Đã tạo bình chọn");
      setShowCreatePollModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo bình chọn");
    }
  };

  const handlePollVoted = (updatedPoll) => {
    if (!updatedPoll) return;
    setMessages(prev => prev.map(m => {
      if (m.type === 'poll' && String(m.pollId?._id || m.pollId) === String(updatedPoll._id)) {
        return { ...m, pollId: updatedPoll };
      }
      return m;
    }));
  };

  // ── Ghim / bỏ ghim hội thoại — lưu DB qua ConversationPreference ──
  const handlePinConversation = useCallback(async (conv, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const currentlyPinned = conv.preference?.isPinned === true;
    setConversations(prev => prev.map(c =>
      String(c._id) === String(conv._id)
        ? { ...c, preference: { ...(c.preference || {}), isPinned: !currentlyPinned, pinnedAt: !currentlyPinned ? new Date().toISOString() : null } }
        : c
    ));
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { isPinned: !currentlyPinned },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(currentlyPinned ? 'Đã bỏ ghim hội thoại' : '📌 Đã ghim lên đầu');
    } catch {
      setConversations(prev => prev.map(c =>
        String(c._id) === String(conv._id)
          ? { ...c, preference: { ...(c.preference || {}), isPinned: currentlyPinned } }
          : c
      ));
      toast.error('Không thể ghim hội thoại');
    }
  }, [token]);

  // ── Phân loại hội thoại ──
  const handleClassifyConversation = useCallback(async (conv, category) => {
    setConversations(prev => prev.map(c =>
      String(c._id) === String(conv._id)
        ? { ...c, preference: { ...(c.preference || {}), category } }
        : c
    ));
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { category },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const labels = { primary: 'Chính', work: 'Công việc', family: 'Gia đình', other: 'Khác' };
      toast.success(`Đã phân loại: ${labels[category] || category}`);
    } catch {
      toast.error('Không thể phân loại hội thoại');
      fetchConversationsData();
    }
  }, [token]);

  // ── Tắt/bật thông báo từ context menu ──
  const handleMuteConversation = useCallback(async (conv, durationMinutes) => {
    try {
      let mutedUntil = null;
      if (durationMinutes === 0) {
        mutedUntil = null; // bật lại
      } else if (durationMinutes === -1) {
        mutedUntil = new Date(2099, 0, 1).toISOString();
      } else {
        mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      }
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { mutedUntil },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(prev => prev.map(c =>
        String(c._id) === String(conv._id)
          ? { ...c, preference: { ...(c.preference || {}), mutedUntil } }
          : c
      ));
      toast.success(durationMinutes === 0 ? 'Đã bật lại thông báo' : '🔕 Đã tắt thông báo');
    } catch {
      toast.error('Không thể cập nhật thông báo');
    }
  }, [token]);

  // ── Ẩn hội thoại (khỏi danh sách chính) ──
  const handleHideConversation = useCallback(async (conv) => {
    if (!window.confirm(`Ẩn hội thoại với "${getConversationName(conv)}"? Bạn có thể xem lại trong mục Hội thoại ẩn.`)) return;
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { isHidden: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(prev => prev.filter(c => String(c._id) !== String(conv._id)));
      if (String(activeConversation?._id) === String(conv._id)) {
        setActiveConversation(null);
        navigate('/chat');
      }
      toast.success('Đã ẩn hội thoại');
    } catch {
      toast.error('Không thể ẩn hội thoại');
    }
  }, [token, activeConversation, getConversationName, navigate]);

  // ── Xoá hội thoại từ context menu ──
  const handleDeleteConversationCtx = useCallback(async (conv) => {
    if (!window.confirm(`Xóa lịch sử trò chuyện với "${getConversationName(conv)}"?`)) return;
    try {
      await conversationService.updateConversationPreference(conv._id, {
        isHidden: true,
        clearHistoryAt: new Date().toISOString()
      });
      setConversations(prev => prev.filter(c => String(c._id) !== String(conv._id)));
      if (String(activeConversation?._id) === String(conv._id)) {
        setActiveConversation(null);
        navigate('/chat');
      }
      toast.success('Đã xóa cuộc trò chuyện');
    } catch {
      toast.error('Có lỗi xảy ra khi xóa');
    }
  }, [activeConversation, getConversationName, navigate]);

  // ── Rời nhóm từ context menu ──
  const handleLeaveGroupCtx = useCallback(async (conv) => {
    if (!window.confirm(`Rời nhóm "${getConversationName(conv)}"?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/conversations/${conv._id}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setConversations(prev => prev.filter(c => String(c._id) !== String(conv._id)));
      if (String(activeConversation?._id) === String(conv._id)) {
        setActiveConversation(null);
        navigate('/chat');
      }
      toast.success('Đã rời nhóm');
    } catch {
      toast.error('Không thể rời nhóm');
    }
  }, [token, activeConversation, getConversationName, navigate]);

  // ── Load hội thoại đã ẩn ──
  const fetchHiddenConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations/archived`, { headers: { Authorization: `Bearer ${token}` } });
      const items = res.data?.data?.items || res.data?.items || [];
      setHiddenConvs(items);
    } catch {
      setHiddenConvs([]);
    }
  }, [token]);

  // ── Bảo mật hội thoại ẩn bằng PIN 4 số (pure FE, không gọi BE) ──
  const getPinKey = () => `hidden_pin_${userId || 'guest'}`;
  const hashPin = (pin) => { let h = 5381; for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i); return String(h >>> 0); };
  const getSavedPin = () => localStorage.getItem(getPinKey());
  const savePin = (pin) => localStorage.setItem(getPinKey(), hashPin(pin));
  const isUnlocked = () => sessionStorage.getItem('hidden_unlocked') === '1';
  const setUnlocked = () => sessionStorage.setItem('hidden_unlocked', '1');
  const clearUnlocked = () => sessionStorage.removeItem('hidden_unlocked');

  const openHiddenList = async () => {
    await fetchHiddenConversations();
    setShowHidden(true);
  };

  const handlePinButtonClick = () => {
    if (showHidden) { setShowHidden(false); clearUnlocked(); return; }
    if (isUnlocked()) { openHiddenList(); return; }
    setPinInput(''); setPinConfirm(''); setPinError(''); setPinStep(1);
    setPinModalMode(getSavedPin() ? 'unlock' : 'setup');
    setShowPinModal(true);
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) { setPinError('PIN phải đúng 4 chữ số'); return; }
    if (pinModalMode === 'setup') {
      if (pinStep === 1) { setPinStep(2); setPinConfirm(pinInput); setPinInput(''); return; }
      if (pinInput !== pinConfirm) { setPinError('PIN không khớp, thử lại'); setPinInput(''); setPinStep(1); return; }
      savePin(pinInput); setUnlocked(); setShowPinModal(false); openHiddenList();
    } else {
      if (hashPin(pinInput) !== getSavedPin()) { setPinError('PIN không đúng'); setPinInput(''); return; }
      setUnlocked(); setShowPinModal(false); openHiddenList();
    }
  };

  // ── Bỏ ẩn hội thoại ──
  const handleUnhideConversation = useCallback(async (conv) => {
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { isHidden: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHiddenConvs(prev => prev.filter(c => String(c._id) !== String(conv._id)));
      fetchConversationsData();
      toast.success('Đã hiện lại hội thoại');
    } catch {
      toast.error('Không thể bỏ ẩn');
    }
  }, [token]);

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
                        <img src={p.avatarUrl || DEFAULT_AVATAR}
                          onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
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

      {/* ── BÊN TRÁI: SIDEBAR (Đã tách component) ── */}
      <ChatSidebar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        friendConvs={friendConvs} strangerConvs={strangerConvs}
        activeConversation={activeConversation} setActiveConversation={setActiveConversation}
        navigate={navigate}
        getConversationName={getConversationName}
        getConversationAvatar={getConversationAvatar}
        getOtherParticipant={getOtherParticipant}
        setShowAddFriendModal={setShowAddFriendModal}
        setShowCreateGroupModal={setShowCreateGroupModal}
        setShowStrangerPanel={setShowStrangerPanel}
        userId={userId} friendIds={friendIds}
        handlePinConversation={handlePinConversation}
        handleClassifyConversation={handleClassifyConversation}
        handleHideConversation={handleHideConversation}
        handleMuteConversation={handleMuteConversation}
        handleDeleteConversationCtx={handleDeleteConversation}
        handleLeaveGroupCtx={handleLeaveGroup}
        ctxMenu={ctxMenu} setCtxMenu={setCtxMenu}
        reportTarget={reportTarget} setReportTarget={setReportTarget}
        showHidden={showHidden} hiddenConvs={hiddenConvs}
        handlePinButtonClick={handlePinButtonClick}
        handleUnhideConversation={handleUnhideConversation}
        showPinModal={showPinModal} setShowPinModal={setShowPinModal}
        pinModalMode={pinModalMode} setPinModalMode={setPinModalMode}
        pinInput={pinInput} setPinInput={setPinInput}
        pinConfirm={pinConfirm} setPinConfirm={setPinConfirm}
        pinError={pinError} setPinError={setPinError}
        pinStep={pinStep} setPinStep={setPinStep}
        handlePinSubmit={handlePinSubmit}
        getSavedPin={getSavedPin}
      />


      {/* ── Cloud của tôi: dùng giao diện MyDocumentsPage ── */}
      {activeConversation?.type === 'direct' && activeConversation?.participants?.length === 1 ? (
        <MyDocumentsPage />
      ) : activeConversation ? (
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

          {/* ── THANH GHIM TIN NHẮN (Đã ghim) ── */}
          <PinnedBar
            pinnedMessages={pinnedMessages}
            jumpToMessage={jumpToMessage}
            setShowRightPanel={setShowRightPanel}
            setUnpinTargetId={setUnpinTargetId}
            setShowUnpinConfirmModal={setShowUnpinConfirmModal}
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
                            <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-main)', padding: '3px 10px', borderRadius: 10 }}>
                              {item.content}
                              {item.content?.includes('ghim') && pinnedMessages.length > 0 && (
                                <span
                                  style={{ color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, marginLeft: 6 }}
                                  onClick={() => jumpToMessage(pinnedMessages[pinnedMessages.length - 1]?.messageId?._id || pinnedMessages[pinnedMessages.length - 1]?.messageId)}
                                >
                                  Xem
                                </span>
                              )}
                            </span>
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
                             onReply={setReplyToMessage}
                             onPin={handlePinMessage}
                             onUnpin={handleUnpinMessage}
                             isPinned={pinnedMsgIds.has(String(item._id || item.id))}
                             onPollVoted={handlePollVoted}
                             userId={userId}
                             isGroup={activeConversation.type === 'group'}
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
                onShowPoll={() => setShowCreatePollModal(true)}
                members={activeConversation.participants || []}
                replyTo={replyToMessage}
                onCancelReply={() => setReplyToMessage(null)}
              />
            );
          })()}
        </main>
      ) : (
        <main className="chat-main" style={{ alignItems: 'center', justifyItems: 'center', display: 'flex' }}>
          <div style={{ color: 'var(--z-text-secondary)', fontSize: 16, margin: 'auto' }}>Chọn một cuộc trò chuyện để bắt đầu</div>
        </main>
      )}

      {/* ── BÊN PHẢI: RIGHT PANEL (ẩn khi đang xem Cloud của tôi vì MyDocumentsPage có right panel riêng) ── */}
      {activeConversation && showRightPanel && !(activeConversation.type === 'direct' && activeConversation.participants?.length === 1) && (
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
          onShowAddMember={() => setShowAddMemberModal(true)}
          onShowPoll={() => setShowCreatePollModal(true)}
          pinnedMessages={pinnedMessages}
          onUnpin={handleUnpinMessage}
          onJump={jumpToMessage}
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
      {/* ── MODALS GHIM & BÌNH CHỌN ── */}
      {showPinLimitModal && (
        <PinLimitModal
          isOpen={showPinLimitModal}
          onClose={() => setShowPinLimitModal(false)}
          onReplace={handleForcePin}
          currentPins={pinnedMessages}
        />
      )}
      {showCreatePollModal && (
        <CreatePollModal
          isOpen={showCreatePollModal}
          onClose={() => setShowCreatePollModal(false)}
          conversationId={activeConversation?._id}
        />
      )}
      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          activeConversation={activeConversation}
          friends={friends}
          onAdded={fetchConversationsData}
        />
      )}
      {showUnpinConfirmModal && (
        <UnpinConfirmModal
          isOpen={showUnpinConfirmModal}
          onClose={() => setShowUnpinConfirmModal(false)}
          onConfirm={() => {
            if (unpinTargetId) handleUnpinMessage(unpinTargetId);
          }}
        />
      )}

      {/* ── CONTEXT MENU & REPORT ── */}
      {ctxMenu && (
        <ConversationContextMenu
          conv={ctxMenu.conv}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
          onPin={(conv) => handlePinConversation(conv)}
          onClassify={handleClassifyConversation}
          onHide={handleHideConversation}
          onDelete={handleDeleteConversationCtx}
          onReport={(conv) => {
            const other = getOtherParticipant(conv);
            if (other) setReportTarget({ id: String(other._id || other.id), name: other.username || other.fullName || 'người dùng' });
            setCtxMenu(null);
          }}
          myId={userId}
        />
      )}

      {reportTarget && (
        <ReportUserModal
          targetUserId={reportTarget.id}
          targetUserName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

    </div>
  );
}