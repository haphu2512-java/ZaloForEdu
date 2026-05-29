import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaUsers, FaCloud, FaSpinner, FaUserSecret, FaArrowLeft, FaUserPlus, FaCheck, FaTimes, FaLock, FaGlobe, FaUserFriends, FaInbox, FaShieldAlt } from "react-icons/fa";
import toast from "react-hot-toast";

import { uploadFile } from "../../services/mediaService";
import { useFriendStore } from "../../store/friendStore";
import { socketService } from "../../services/socketService";
import { useChatSocket } from "./useChatSocket";
import { MessageBubble } from "./MessageBubble";
import { SearchInConversation } from "./SearchInConversation";
import { ShareMessageModal } from "./Modals/ShareMessageModal";
import AddFriendModal from "./Modals/AddFriendModal";
import CreateGroupModal from "./Modals/CreateGroupModal";
import TransferOwnerModal from "./Modals/TransferOwnerModal";
import CreatePollModal from "./Modals/CreatePollModal";
import PinLimitModal from "./Modals/PinLimitModal";
import UnpinConfirmModal from "./Modals/UnpinConfirmModal";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { ChatRightPanel } from "./ChatRightPanel";
import { ChatSidebar } from "./ChatSidebar";
import { PinnedBar } from "./PinnedBar";
import { TypingIndicator } from "./TypingIndicator";
import { ReminderListPage } from "./ReminderListPage";
import MyDocumentsPage from "../cloud/MyDocumentsPage";
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategory, toAbsoluteUrl } from './chatUtils';
import "./ChatPage.css";
import { conversationService } from "../../services/conversationService";
import ConversationContextMenu from "./Modals/ConversationContextMenu";
import ReportUserModal from "./Modals/ReportUserModal";
import AddMemberModal from "./Modals/AddMemberModal";

// ── Custom hooks ──────────────────────────────────────────────────────────────
import { useMessages } from "./hooks/useMessages";
import { useReminders } from "./hooks/useReminders";
import { usePinnedMessages } from "./hooks/usePinnedMessages";
import { useConversationActions } from "./hooks/useConversationActions";
import { useHiddenConversations } from "./hooks/useHiddenConversations";
import { DEFAULT_AVATAR } from '../../utils/constants';


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const CLOUD_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%230068FF'/%3E%3Cpath d='M28 22a5 5 0 0 0-4.9-5 7 7 0 0 0-13.1 3A4 4 0 0 0 12 28h16a4 4 0 0 0 0-6z' fill='white'/%3E%3C/svg%3E";

const formatChatTimestamp = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (isToday) return timeStr;
  if (isYesterday) return `Hôm qua ${timeStr}`;
  return `${timeStr} ngày ${dateStr}`;
};

const DIVIDER_GAP_MS = 60 * 60 * 1000;
const shouldShowDateDivider = (curr, prev) => {
  if (!prev) return true;
  const c = new Date(curr.createdAt), p = new Date(prev.createdAt);
  if (c.toDateString() !== p.toDateString()) return true;
  return c - p >= DIVIDER_GAP_MS;
};

const formatDateDivider = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  let label;
  if (diffDays === 0) label = 'Hôm nay';
  else if (diffDays === 1) label = 'Hôm qua';
  else if (diffDays < 7) label = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
  else label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${timeStr} ${label}`;
};

function UploadBubble({ name, percent }) {
  return (
    <div className="msg-wrap me" style={{ marginBottom: 16 }}>
      <div className="msg-body" style={{ alignItems: 'flex-end' }}>
        <div className="mdc-uploading-bubble msg-bubble" style={{ background: '#0084FF', color: 'white', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaSpinner className="spin" size={14} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13 }}>{name}</span>
            <div style={{ background: 'rgba(255,255,255,0.3)', height: 4, borderRadius: 2, width: 100 }}>
              <div style={{ width: `${percent}%`, background: 'white', height: '100%', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10 }}>{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReminderDetailModal (tách ra khỏi ChatPage render) ────────────────────────
function ReminderDetailModal({ reminderId, reminders, userId, onClose, onEdit, onDelete, onJoin, onDecline }) {
  const rem = reminders.find(r => r._id === reminderId);
  if (!rem) return null;
  const remDate = new Date(rem.remindAt);
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
  const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
  const participantCount = (rem.participants || []).length;
  const declinedCount = (rem.declinedBy || []).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 16, width: 440, maxWidth: '94vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--z-border)' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--z-text-primary)' }}>Chi tiết nhắc hẹn</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
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
              <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {remDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
              <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', marginTop: 4 }}>Tạo bởi: <strong>{rem.createdBy?.username || 'Ai đó'}</strong></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--z-primary)', fontWeight: 600 }}>{participantCount} người tham gia</span>
            {declinedCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>{declinedCount} không tham gia</span>}
          </div>
          {(rem.participants || []).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {(rem.participants || []).map((p, i) => (
                <div key={String(p._id || p.id || i)} title={p.username || ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <img src={toAbsoluteUrl(p.avatarUrl || p.avatar) || DEFAULT_AVATAR} onError={e => { e.currentTarget.src = DEFAULT_AVATAR }} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  <span style={{ fontSize: 10, color: 'var(--z-text-muted)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '12px', background: 'var(--z-bg-main)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {hasJoined ? (
              <><span style={{ fontSize: 13, color: 'var(--z-primary)' }}>✓ Bạn xác nhận: Tham gia</span><button onClick={() => { onDecline(rem._id); onClose(); }} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Thay đổi</button></>
            ) : hasDeclined ? (
              <><span style={{ fontSize: 13, color: '#ef4444' }}>✗ Bạn xác nhận: Không tham gia</span><button onClick={() => { onJoin(rem._id); onClose(); }} style={{ border: 'none', background: 'none', color: 'var(--z-text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Thay đổi</button></>
            ) : (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button onClick={() => { onJoin(rem._id); onClose(); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Tham gia</button>
                <button onClick={() => { onDecline(rem._id); onClose(); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', fontSize: 13, cursor: 'pointer' }}>Từ chối</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--z-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => { onEdit(rem); onClose(); }} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Chỉnh sửa</button>
          <button onClick={() => { if (window.confirm(`Hủy nhắc hẹn "${rem.title}"?`)) { onDelete(rem._id); onClose(); } }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ffe4e6', color: '#e11d48', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Hủy nhắc hẹn</button>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const { appliedTheme } = useTheme();
  const { t } = useLanguage();

  // ── Core state ────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [selfConversation, setSelfConversation] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showStrangerPanel, setShowStrangerPanel] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [reminderDetailId, setReminderDetailId] = useState(null);
  const [pendingEditReminder, setPendingEditReminder] = useState(null);
  const [showReminderListPage, setShowReminderListPage] = useState(false);
  const [showSearchInConv, setShowSearchInConv] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: [{userId, username}] }
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const { blockedUsers, unblockUser: unblockUserStore, fetchBlockedUsers, previouslyBlockedIds } = useFriendStore();

  const [showBlockWarningModal, setShowBlockWarningModal] = useState(false);
  const [blockConflictDetails, setBlockConflictDetails] = useState(null);
  const [acceptedBlockWarnings, setAcceptedBlockWarnings] = useState({});
  const pageRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConvIdRef = useRef(null);
  const activeConversationRef = useRef(null);
  const conversationsRef = useRef([]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = useMemo(() => {
    let id = localStorage.getItem("userId");
    if (id) return String(id).trim();
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u._id || u.id) return String(u._id || u.id).trim();
    } catch { }
    return null;
  }, []);
  const token = localStorage.getItem("token");

  // ── Friends ───────────────────────────────────────────────────────────────
  const { friends, outgoingRequests, incomingRequests, fetchFriends, fetchOutgoingRequests, fetchIncomingRequests, acceptRequest, rejectRequest } = useFriendStore();

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setTimeout(() => { 
      fetchFriends(); 
      fetchOutgoingRequests(1, true); 
      fetchIncomingRequests(); 
      fetchBlockedUsers(); // Tải danh sách chặn
    }, 100);
  }, []);

  const friendIds = useMemo(() => new Set(friends.map(f => String(f._id || f.id))), [friends]);
  const outgoingRequestIds = useMemo(() => new Set(outgoingRequests.map(r => {
    return typeof r.toUserId === 'object' && r.toUserId !== null
      ? String(r.toUserId._id || r.toUserId.id || '')
      : String(r.toUserId || '');
  })), [outgoingRequests]);

  // ── Conversation helpers ──────────────────────────────────────────────────
  const getOtherParticipant = useCallback((conv) => {
    if (!conv?.participants) return null;
    const others = conv.participants.filter(p => String(typeof p === 'string' ? p : (p._id || p.id)) !== String(userId));
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

  // Memoize isBlockedByMe based on store and active conversation
  const isBlockedByMe = useMemo(() => {
    if (!activeConversation || activeConversation.type === "group") return false;
    const other = getOtherParticipant(activeConversation);
    if (!other) return false;
    const otherId = String(other._id || other.id || "");
    return blockedUsers.some(u => String(u._id || u.id || "") === otherId);
  }, [activeConversation, blockedUsers, getOtherParticipant]);

  const getConversationAvatar = useCallback((conv) => {
    if (!conv) return DEFAULT_AVATAR;
    if (conv.type === 'direct' && conv.participants?.length === 1) return CLOUD_AVATAR;
    if (conv.type === 'group' || conv.roomModel === 'Group') return toAbsoluteUrl(conv.avatarUrl || conv.avatar) || DEFAULT_AVATAR;
    const other = getOtherParticipant(conv);
    if (other && typeof other === 'object') return toAbsoluteUrl(other.avatarUrl || other.avatar) || DEFAULT_AVATAR;
    return DEFAULT_AVATAR;
  }, [getOtherParticipant]);

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConversationsData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const allConvs = res.data.data?.items || res.data.items || [];
      const self = allConvs.find(c => c.type === 'direct' && c.participants?.length === 1);
      setSelfConversation(self || null);
      setConversations(allConvs);
    } catch (err) { console.error("Lỗi lấy danh sách:", err); }
  }, [token]);

  // ── Sync activeConversation ───────────────────────────────────────────────
  useEffect(() => {
    if (activeConversation && !activeConversation.isMock) {
      const updatedConv = conversations.find(c => String(c._id) === String(activeConversation._id));
      if (updatedConv) {
        setActiveConversation(prev => {
          if (!prev) return prev;
          const prevParticipantsStr = JSON.stringify(prev.participants || []);
          const updatedParticipantsStr = JSON.stringify(updatedConv.participants || []);
          
          if (
            prevParticipantsStr !== updatedParticipantsStr ||
            prev.name !== updatedConv.name ||
            prev.avatarUrl !== updatedConv.avatarUrl ||
            prev.avatar !== updatedConv.avatar
          ) {
            return { ...prev, ...updatedConv, settings: prev.settings }; // keep optimistic settings
          }
          return prev;
        });
      }
    }
  }, [conversations]);

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const {
    messages, setMessages,
    replyToMessage, setReplyToMessage,
    uploads,
    ensureRealConversation,
    handleSendText, handleSendSticker, handleSendLike,
    handleUploadFile, handleUploadFilesFromInput,
    handleReaction, handleRecall, handleDelete,
    // handleEdit, // TODO: uncomment khi BE sẵn sàng
  } = useMessages({ activeConversation, userId, token, getOtherParticipant, navigate, setConversations });

  const {
    reminders, setReminders,
    joinRequests, triggeredReminder, setTriggeredReminder,
    polls, loadingPolls, fetchPolls,
    handleCreateReminder, handleUpdateReminder, handleDeleteReminder,
    handleJoinReminder, handleDeclineReminder,
    handleProcessJoinRequest, handleCreatePoll, handlePollVoted,
  } = useReminders({ activeConversation, setMessages });

  const {
    pinnedMessages, setPinnedMessages, pinnedMsgIds,
    showPinLimitModal, setShowPinLimitModal,
    pendingPinId, setPendingPinId,
    showUnpinConfirmModal, setShowUnpinConfirmModal,
    unpinTargetId, setUnpinTargetId,
    handlePinMessage, handleUnpinMessage, handleForcePin, jumpToMessage,
  } = usePinnedMessages({ activeConversation });

  const {
    showTransferOwnerModal, setShowTransferOwnerModal,
    transferOwnerLoading,
    showPrivacyModal, setShowPrivacyModal,
    messagePrivacy, setMessagePrivacy,
    shareModalOpen, setShareModalOpen,
    msgToShare,
    justSentRequestTo, setJustSentRequestTo,
    handlePinConversation, handleClassifyConversation,
    handleMuteConversation, handleMute,
    handleHideConversation, handleDeleteConversationCtx, handleLeaveGroupCtx,
    handleDeleteConversation, handleUpdateGroupSettings,
    handleGroupAction, handleDisbandGroup, handleLeaveGroup, handleTransferOwnerAndLeave,
    openShareModal, executeForward, saveMessagePrivacy,
  } = useConversationActions({
    token, userId, navigate,
    activeConversation, setActiveConversation,
    setConversations, getConversationName, fetchConversationsData,
  });

  const {
    showHidden, setShowHidden, hiddenConvs,
    showPinModal, setShowPinModal,
    pinModalMode, setPinModalMode,
    pinInput, setPinInput, pinConfirm, setPinConfirm,
    pinCurrentInput, setPinCurrentInput,
    pinError, setPinError, pinStep, setPinStep,
    hasPin,
    handlePinButtonClick, handlePinSubmit, handleUnhideConversation,
    handleEnterChangeMode, handleEnterForgotMode, resetPinModal,
  } = useHiddenConversations({ token, fetchConversationsData });

  // ── Socket ────────────────────────────────────────────────────────────────
  useChatSocket({
    token, userId,
    activeConvIdRef, activeConversationRef,
    setMessages, setConversations, setActiveConversation, setSelfConversation,
    setPinnedMessages, setReminders: setReminders, setJoinRequests: () => { }, setPolls: () => { },
    setTriggeredReminder,
    fetchConversationsData, fetchIncomingRequests, fetchFriends, fetchOutgoingRequests,
    toast,
    setTypingUsers,
  });

  // ── Merged conversation list ───────────────────────────────────────────────
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
        if (other) directMap.add(String(typeof other === 'string' ? other : (other._id || other.id)));
      }
    });
    // Build set of participant IDs who have a hidden conversation — skip mock for them
    const hiddenParticipantIds = new Set(
      hiddenConvs.flatMap(c =>
        (c.participants || []).map(p => String(p._id || p.id || p)).filter(id => id !== String(userId))
      )
    );
    friends.forEach(friend => {
      const fId = String(friend._id || friend.id);
      if (!directMap.has(fId) && !hiddenParticipantIds.has(fId)) {
        convs.push({ _id: `mock_${fId}`, isMock: true, type: 'direct', participants: [{ _id: userId }, friend], latestMessage: null, unreadCount: 0 });
      }
    });
    convs.sort((a, b) => {
      const aS = a.type === 'direct' && a.participants?.length === 1 ? 1 : 0, bS = b.type === 'direct' && b.participants?.length === 1 ? 1 : 0;
      if (bS !== aS) return bS - aS;
      const aP = a.preference?.isPinned ? 1 : 0, bP = b.preference?.isPinned ? 1 : 0;
      if (bP !== aP) return bP - aP;
      const tA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
      const tB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
      return tB - tA;
    });
    let selfSeen = false;
    const deduped = convs.filter(c => {
      if (c.type === 'direct' && c.participants?.length === 1) { if (selfSeen) return false; selfSeen = true; }
      return true;
    });
    const filtered = categoryFilter !== 'all' ? deduped.filter(c => (c.preference?.category || 'primary') === categoryFilter) : deduped;
    if (!searchQuery.trim()) return filtered;
    return filtered.filter(c => getConversationName(c).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, friends, hiddenConvs, searchQuery, categoryFilter, userId, getConversationName, getOtherParticipant]);

  const activeIdStr = String(activeConversation?._id || '');
  const { friendConvs, strangerConvs } = useMemo(() => {
    const friendConvs = [], strangerConvs = [];
    mergedConversations.forEach(conv => {
      if (conv.type === 'group' || conv.roomModel === 'Group' || conv.isMock) { friendConvs.push(conv); return; }
      if (conv.type === 'direct' && conv.participants?.length === 1) { friendConvs.push(conv); return; }
      const other = getOtherParticipant(conv);
      const otherId = other ? typeof other === 'object' ? String(other._id || other.id || '') : String(other) : null;
      if (!!otherId && friendIds.has(otherId)) { friendConvs.push(conv); return; }
      if (!conv.latestMessage) { if (String(conv._id) === activeIdStr) friendConvs.push(conv); return; }
      const firstSenderId = String(conv.firstSenderId?._id || conv.firstSenderId || '');
      const myId = String(userId || '');
      // Nếu mình nhắn trước, đã reply, hoặc đã từng chặn → không phải người lạ
      const iHaveInteracted = !firstSenderId || firstSenderId === myId;
      const hadBlockRelation = !!otherId && (
        blockedUsers.some(u => String(u._id || u.id) === otherId) ||
        previouslyBlockedIds?.has(otherId)
      );
      if (iHaveInteracted || hadBlockRelation) friendConvs.push(conv);
      else strangerConvs.push(conv);
    });
    return { friendConvs, strangerConvs };
  }, [mergedConversations, friendIds, getOtherParticipant, userId, activeIdStr]);

  // ── Sync effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    const incoming = location.state?.newConversation;
    if (!incoming) return;
    const convId = String(incoming._id);
    setConversations(prev => {
      const idx = prev.findIndex(c => String(c._id) === convId);
      if (idx === -1) return [incoming, ...prev];
      const updated = [...prev]; updated[idx] = { ...prev[idx], ...incoming }; return updated;
    });
    window.history.replaceState({}, '');
  }, [location.state]);

  useEffect(() => {
    if (!roomId) return;
    if (selfConversation && String(selfConversation._id) === String(roomId)) {
      if (String(activeConvIdRef.current) !== String(roomId)) setActiveConversation(selfConversation);
      return;
    }
    const target = mergedConversations.find(c => String(c._id) === String(roomId));
    if (target && String(activeConvIdRef.current) !== String(roomId)) setActiveConversation(target);
  }, [roomId, mergedConversations, selfConversation]);

  useEffect(() => { activeConvIdRef.current = activeConversation?._id; activeConversationRef.current = activeConversation; }, [activeConversation]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => {
    if (!activeConversation) return;
    setMessages([]);
    setJustSentRequestTo(null);
    if (activeConversation.isMock) return;

    const isGroup = activeConversation.type === 'group' || activeConversation.roomModel === 'Group';
    setIsBlockedByThem(false); // Reset on conv change
    if (isGroup && !acceptedBlockWarnings[activeConversation._id]) {
      conversationService.checkBlockConflict(activeConversation._id).then(res => {
        const hasConflict = res.data?.hasConflict || res.hasConflict;
        if (hasConflict) {
          setBlockConflictDetails(res.data?.details || res.details);
          setShowBlockWarningModal(true);
        }
      }).catch(console.error);
    } else if (!isGroup) {
      conversationService.checkBlockConflict(activeConversation._id).then(res => {
        const details = res.data?.details || res.details;
        if (details?.blockedMe?.length > 0) {
          setIsBlockedByThem(true);
        }
      }).catch(console.error);
    }

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/messages/conversation/${activeConversation._id}?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        const fetched = res.data.data?.items || res.data.items || [];
        const normalized = fetched.map(m => ({
          ...m,
          mediaIds: (m.mediaIds || []).map(media => typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url) ? { ...media, url: `${API_ORIGIN}${media.url}` } : media)
        }));
        setMessages(prev => {
          const merged = [...normalized, ...prev];
          const seen = new Set();
          return merged.filter(m => { const id = String(m._id); if (seen.has(id)) return false; seen.add(id); return true; })
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        setConversations(prev => prev.map(c => String(c._id) === String(activeConversation._id) ? { ...c, unreadCount: 0 } : c));
      } catch { setMessages([]); }
    };

    fetchMessages();
    conversationService.getPinnedMessages(activeConversation._id)
      .then(res => setPinnedMessages(res.data?.items || res.data || []))
      .catch(() => setPinnedMessages([]));
    socketService.socket?.emit("join_conversation", { conversationId: activeConversation._id });

  }, [activeConversation?._id, token]);

  useEffect(() => {
    if (!activeConversation || activeConversation.isMock) return;
    const participants = activeConversation.participants || [];
    const needsEnrich = participants.some(p => typeof p === 'object' && p !== null && p.messagePrivacy === undefined);
    if (!needsEnrich) return;
    Promise.all(participants.map(async p => {
      if (typeof p !== 'object' || p === null || p.messagePrivacy !== undefined) return p;
      const pid = p._id || p.id; if (!pid) return p;
      try {
        const res = await axios.get(`${API_BASE_URL}/users/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
        return { ...p, messagePrivacy: res.data?.data?.messagePrivacy || 'everyone' };
      } catch { return { ...p, messagePrivacy: 'everyone' }; }
    })).then(enriched => {
      setActiveConversation(prev => prev && String(prev._id) === String(activeConversation._id) ? { ...prev, participants: enriched } : prev);
    });
  }, [activeConversation?._id]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { const p = res.data?.data?.messagePrivacy || res.data?.messagePrivacy; if (p) { setMessagePrivacy(p); localStorage.setItem('messagePrivacy', p); } })
      .catch(() => { });
  }, [userId, token]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, uploads]);

  useEffect(() => {
    const zone = pageRef.current; if (!zone || !activeConversation) return;
    const onDragOver = e => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = e => { if (!zone.contains(e.relatedTarget)) setIsDragging(false); };
    const onDrop = e => { e.preventDefault(); setIsDragging(false); Array.from(e.dataTransfer.files).forEach(handleUploadFile); };
    zone.addEventListener("dragover", onDragOver); zone.addEventListener("dragleave", onDragLeave); zone.addEventListener("drop", onDrop);
    return () => { zone.removeEventListener("dragover", onDragOver); zone.removeEventListener("dragleave", onDragLeave); zone.removeEventListener("drop", onDrop); };
  }, [activeConversation]);

  const getSenderIdStr = m => { const s = m?.senderId || m?.sender; if (!s) return null; return typeof s === 'object' ? String(s._id || s.id) : String(s); };

  // ── Media/link lists for right panel ─────────────────────────────────────
  const allMedia = messages.flatMap(m => m.attachments || m.mediaIds || m.media || []).filter(m => typeof m !== 'string');
  const imgFiles = allMedia.filter(m => ["image", "video"].includes(getCategory(m.name || m.fileName)));
  const docFiles = allMedia.filter(m => !["image", "video", "audio"].includes(getCategory(m.name || m.fileName)));
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const linkItems = [];
  messages.forEach(m => { if (m.content) { const urls = m.content.match(linkRegex); if (urls) urls.forEach(u => linkItems.push(u)); } });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`chat-page ${appliedTheme === 'dark' ? 'dark-mode' : ''}`} ref={pageRef}>

      <ShareMessageModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} conversations={conversations.filter(c => c._id !== activeConversation?._id)} currentUserId={userId} onForward={c => executeForward(c)} />

      {reminderDetailId && (
        <ReminderDetailModal
          reminderId={reminderDetailId}
          reminders={reminders}
          userId={userId}
          onClose={() => setReminderDetailId(null)}
          onEdit={rem => { setPendingEditReminder(rem); setReminderDetailId(null); }}
          onDelete={handleDeleteReminder}
          onJoin={handleJoinReminder}
          onDecline={handleDeclineReminder}
        />
      )}

      <AddFriendModal isOpen={showAddFriendModal} onClose={() => setShowAddFriendModal(false)} outgoingRequestIds={outgoingRequestIds} friends={friends} />
      <CreateGroupModal isOpen={showCreateGroupModal} onClose={() => setShowCreateGroupModal(false)} friends={friends} onCreated={newConv => { fetchConversationsData(); setActiveConversation(newConv); }} />
      <TransferOwnerModal isOpen={showTransferOwnerModal} onClose={() => setShowTransferOwnerModal(false)}
        members={(activeConversation?.participants || []).filter(p => String(p._id || p) !== String(userId)).map(p => p._id ? p : { _id: p })}
        adminIds={activeConversation?.adminIds || []} loading={transferOwnerLoading} onConfirm={handleTransferOwnerAndLeave} />

      {showBlockWarningModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'var(--z-bg-sidebar)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px', color: '#E11D48' }}>Cảnh báo chặn</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--z-text-secondary)', fontSize: '15px' }}>
              {blockConflictDetails?.iBlocked?.length > 0 && blockConflictDetails?.blockedMe?.length > 0 ? (
                <>Bạn đã chặn <b>{blockConflictDetails.iBlocked.join(', ')}</b> và bị <b>{blockConflictDetails.blockedMe.join(', ')}</b> chặn. Bạn có muốn tiếp tục cuộc trò chuyện?</>
              ) : blockConflictDetails?.iBlocked?.length > 0 ? (
                <>Bạn đã chặn <b>{blockConflictDetails.iBlocked.join(', ')}</b>. Bạn có muốn tiếp tục cuộc trò chuyện?</>
              ) : blockConflictDetails?.blockedMe?.length > 0 ? (
                <>Bạn đã bị <b>{blockConflictDetails.blockedMe.join(', ')}</b> chặn. Bạn có muốn tiếp tục cuộc trò chuyện?</>
              ) : (
                'Trong nhóm có thành viên đang có xung đột chặn với bạn (bạn chặn họ hoặc họ chặn bạn). Bạn có muốn tiếp tục cuộc trò chuyện?'
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowBlockWarningModal(false);
                  setActiveConversation(null); // Quay lại / rời khỏi chat
                }}
                style={{ padding: '8px 24px', borderRadius: '8px', border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Không
              </button>
              <button
                onClick={() => {
                  setShowBlockWarningModal(false);
                  setAcceptedBlockWarnings(prev => ({ ...prev, [activeConversation._id]: true }));
                }}
                style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--z-primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Có
              </button>
            </div>
          </div>
        </div>
      )}

      {isDragging && <div className="mdc-drag-overlay"><div className="mdc-drag-inner"><FaCloud size={52} /><p>Thả file vào đây để gửi</p></div></div>}

      {/* ── SIDEBAR ── */}
      <ChatSidebar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        friendConvs={friendConvs} strangerConvs={strangerConvs}
        activeConversation={activeConversation} setActiveConversation={setActiveConversation}
        navigate={navigate} getConversationName={getConversationName} getConversationAvatar={getConversationAvatar} getOtherParticipant={getOtherParticipant}
        setShowAddFriendModal={setShowAddFriendModal} setShowCreateGroupModal={setShowCreateGroupModal} setShowStrangerPanel={setShowStrangerPanel}
        userId={userId} friendIds={friendIds}
        handlePinConversation={handlePinConversation} handleClassifyConversation={handleClassifyConversation}
        handleHideConversation={handleHideConversation} handleMuteConversation={handleMuteConversation}
        handleDeleteConversationCtx={handleDeleteConversationCtx} handleLeaveGroupCtx={handleLeaveGroupCtx}
        ctxMenu={ctxMenu} setCtxMenu={setCtxMenu} reportTarget={reportTarget} setReportTarget={setReportTarget}
        showHidden={showHidden} hiddenConvs={hiddenConvs} handlePinButtonClick={handlePinButtonClick} handleUnhideConversation={handleUnhideConversation}
        showPinModal={showPinModal} setShowPinModal={setShowPinModal} pinModalMode={pinModalMode} setPinModalMode={setPinModalMode}
        pinInput={pinInput} setPinInput={setPinInput} pinConfirm={pinConfirm} setPinConfirm={setPinConfirm}
        pinCurrentInput={pinCurrentInput} setPinCurrentInput={setPinCurrentInput}
        pinError={pinError} setPinError={setPinError} pinStep={pinStep} setPinStep={setPinStep}
        hasPin={hasPin} handlePinSubmit={handlePinSubmit}
        handleEnterChangeMode={handleEnterChangeMode} handleEnterForgotMode={handleEnterForgotMode} resetPinModal={resetPinModal}
      />

      {/* ── MAIN CHAT AREA ── */}
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
              isOnline: (() => {
                const other = getOtherParticipant(activeConversation);
                return other && typeof other === 'object' ? !!other.isOnline : false;
              })(),
              lastSeen: (() => {
                const other = getOtherParticipant(activeConversation);
                return other && typeof other === 'object' ? other.lastSeen : null;
              })(),
              isStranger: (() => { const o = getOtherParticipant(activeConversation); const id = o && typeof o === 'object' ? String(o._id || o.id) : null; if (!id || friends.length === 0) return false; if (blockedUsers.some(u => String(u._id || u.id) === id)) return false; if (previouslyBlockedIds?.has(id)) return false; const firstSenderId = String(activeConversation.firstSenderId?._id || activeConversation.firstSenderId || ''); return !friendIds.has(id) && !!firstSenderId && firstSenderId !== String(userId); })(),
              strangerId: getOtherParticipant(activeConversation)?._id || getOtherParticipant(activeConversation)?.id,
            }}
            onInfo={() => setShowRightPanel(!showRightPanel)}
            onSearchInConv={() => setShowSearchInConv(prev => !prev)}
          />
          <PinnedBar pinnedMessages={pinnedMessages} jumpToMessage={jumpToMessage} setShowRightPanel={setShowRightPanel} setUnpinTargetId={setUnpinTargetId} setShowUnpinConfirmModal={setShowUnpinConfirmModal} />

          <div className="chat-messages" style={{ position: 'relative' }}>
            {showSearchInConv && (
              <SearchInConversation
                conversationId={activeConversation._id}
                onClose={() => setShowSearchInConv(false)}
                onJumpToMessage={(msg) => {
                  const el = document.getElementById(`msg-${msg._id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-msg');
                    setTimeout(() => el.classList.remove('highlight-msg'), 1800);
                  }
                }}
              />
            )}
            {/* Friend request banner */}
            {(() => {
              if (!activeConversation || activeConversation.type === 'group' || activeConversation.roomModel === 'Group') return null;
              const other = getOtherParticipant(activeConversation);
              const otherId = other && typeof other === 'object' ? String(other._id || other.id) : null;
              const otherName = other && typeof other === 'object' ? (other.username || other.fullName || 'Người dùng') : 'Người dùng';
              if (!otherId || friendIds.has(otherId)) return null;
              // Ẩn banner khi đang chặn hoặc đã từng chặn người này
              if (blockedUsers.some(u => String(u._id || u.id) === otherId) || previouslyBlockedIds?.has(otherId)) return null;
              const hasOutgoing = outgoingRequestIds.has(otherId) || justSentRequestTo === otherId;
              const incomingReq = incomingRequests.find(r => {
                const fromId = String(r.fromUserId?._id || r.fromUserId?.id || r.fromUserId || r.from?._id || r.from?.id || r.from || '');
                return fromId === otherId;
              });
              if (hasOutgoing) {
                const outReq = outgoingRequests.find(r => String(r.toUserId?._id || r.toUserId?.id || r.toUserId || r.to?._id || r.to?.id || r.to || '') === otherId);
                return (
                  <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, backdropFilter: 'blur(8px)' }}>
                    <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--z-text-secondary)' }}>Đã gửi lời mời kết bạn tới <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong></span>
                    <button onClick={async () => {
                      try {
                        const { friendService } = await import('../../services/friendService');
                        // FIX: Tìm reqId từ outReq trước
                        let reqId = outReq ? String(outReq._id || outReq.id) : null;
                        // Nếu không tìm được (race condition), refresh store và thử lại
                        if (!reqId) {
                          await fetchOutgoingRequests();
                          const freshOut = useFriendStore.getState().outgoingRequests;
                          const freshReq = freshOut.find(r => String(r.toUserId?._id || r.toUserId || '') === otherId);
                          reqId = freshReq ? String(freshReq._id || freshReq.id) : null;
                        }
                        if (reqId) {
                          await friendService.cancelFriendRequest(reqId);
                          // Xóa khỏi store ngay lập tức để UI cập nhật tức thì
                          useFriendStore.setState(prev => ({
                            outgoingRequests: prev.outgoingRequests.filter(r => String(r.toUserId?._id || r.toUserId || '') !== otherId)
                          }));
                        }
                        setJustSentRequestTo(null);
                        fetchOutgoingRequests();
                      } catch { toast.error('Không thể hủy lời mời'); }
                    }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                      <FaTimes size={11} />Hủy lời mời
                    </button>
                  </div>
                );
              }
              if (incomingReq) return (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)' }}>
                  <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--z-text-secondary)' }}><strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> đã gửi lời mời kết bạn</span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={async () => { try { await acceptRequest(String(incomingReq._id || incomingReq.id)); await Promise.all([fetchIncomingRequests(), fetchFriends()]); } catch { alert('Không thể chấp nhận'); } }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}><FaCheck size={11} />Đồng ý</button>
                    <button onClick={async () => { try { await rejectRequest(String(incomingReq._id || incomingReq.id)); await fetchIncomingRequests(); } catch { alert('Không thể từ chối'); } }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}><FaTimes size={11} />Từ chối</button>
                  </div>
                </div>
              );
              return (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 20px', background: 'rgba(0,104,255,0.06)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)' }}>
                  <FaUserPlus size={14} color="var(--z-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--z-text-secondary)' }}>Bạn và <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> chưa kết bạn</span>
                  <button onClick={async () => { try { const { friendService } = await import('../../services/friendService'); const result = await friendService.sendFriendRequest(otherId); setJustSentRequestTo(otherId); const reqId = result?._id || `temp_${Date.now()}`; useFriendStore.setState({ outgoingRequests: [...useFriendStore.getState().outgoingRequests.filter(r => String(r.toUserId?._id || r.toUserId || '') !== otherId), { _id: reqId, toUserId: { _id: otherId }, status: 'pending', createdAt: new Date().toISOString() }] }); setTimeout(() => fetchOutgoingRequests(), 500); } catch (e) { const code = e.response?.data?.error?.code; if (code === 'REVERSE_REQUEST_EXISTS') fetchIncomingRequests(); } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--z-primary)', background: 'transparent', color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                    <FaUserPlus size={11} />Gửi kết bạn
                  </button>
                </div>
              );
            })()}

            {/* Messages */}
            {messages.length === 0 && uploads.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img src={getConversationAvatar(activeConversation)} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', margin: '0 0 8px', textAlign: 'center' }}>{getConversationName(activeConversation)}</h3>
              </div>
            ) : (
              <>
                {(() => {
                  const reminderItems = reminders.map(r => ({ ...r, _isReminder: true }));
                  const combined = [...messages, ...reminderItems].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                  return combined.map((item, index) => {
                    const prev = combined[index - 1];
                    const showDate = shouldShowDateDivider(item, prev);
                    if (item._isReminder) {
                      const rem = item;
                      const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
                      const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
                      const remDate = new Date(rem.remindAt);
                      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                      return (
                        <React.Fragment key={`rem-${rem._id}`}>
                          {showDate && <div className="msg-date-divider"><span>{formatDateDivider(rem.createdAt)}</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 16px' }}>
                            <div style={{ background: 'var(--z-bg-sidebar)', border: '1px solid var(--z-border)', borderRadius: 12, padding: '12px 16px', maxWidth: 320, width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer' }} onClick={() => setReminderDetailId(rem._id)}>
                              <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginBottom: 8 }}><strong>{rem.createdBy?.username || 'Ai đó'}</strong> đã tạo nhắc hẹn mới</div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--z-primary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 56, flexShrink: 0 }}>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayNames[remDate.getDay()]}</div>
                                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{remDate.getDate()}</div>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Tháng {remDate.getMonth() + 1}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--z-text-primary)', marginBottom: 4 }}>{rem.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {remDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                                  <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 4 }}>{(rem.participants || []).length} người tham gia</div>
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
                      <React.Fragment key={String(item._id || item.id)}>
                        {showDate && <div className="msg-date-divider"><span>{formatDateDivider(item.createdAt)}</span></div>}
                        {item.type === 'system' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                            <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-main)', padding: '4px 14px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {item.content}
                              {item.content?.includes('ghim') && pinnedMessages.length > 0 && (
                                <span style={{ color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 700 }} onClick={() => jumpToMessage(pinnedMessages[pinnedMessages.length - 1]?.messageId?._id || pinnedMessages[pinnedMessages.length - 1]?.messageId)}>Xem</span>
                              )}
                            </span>
                          </div>
                        ) : item.type === 'system_reminder' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                            <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-main)', padding: '5px 14px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '85%', textAlign: 'center' }}>
                              🔔 {item.content}
                              {(item.reminderId || item.reminderId?._id) && <span style={{ color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setReminderDetailId(String(item.reminderId?._id || item.reminderId))}>Xem</span>}
                            </span>
                          </div>
                        ) : (
                          <MessageBubble
                            message={item} isMe={isMe}
                            onReaction={handleReaction} onRecall={handleRecall} onDelete={handleDelete}
                            // onEdit={handleEdit} // TODO: uncomment khi BE sẵn sàng
                            onForward={openShareModal} onReply={setReplyToMessage}
                            onPin={handlePinMessage} onUnpin={handleUnpinMessage}
                            isPinned={pinnedMsgIds.has(String(item._id || item.id))}
                            onPollVoted={updatedPoll => handlePollVoted(updatedPoll, { setMessages })}
                            userId={userId} isGroup={activeConversation.type === 'group'} activeConversation={activeConversation}
                          />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
                {uploads.map(u => <UploadBubble key={u.id} name={u.name} percent={u.percent} />)}
                {/* Typing indicator */}
                {(() => {
                  const convId = String(activeConversation._id || '');
                  const typers = typingUsers[convId] || [];
                  if (typers.length === 0) return null;
                  const participants = activeConversation.participants || [];
                  const resolvedNames = typers.map(t => {
                    const p = participants.find(p => String(p._id || p.id) === String(t.userId));
                    return p?.username || p?.fullName || t.username || 'Ai đó';
                  });
                  const label = resolvedNames.length === 1
                    ? `${resolvedNames[0]} đang nhập...`
                    : `${resolvedNames[0]} và ${resolvedNames.length - 1} người khác đang nhập...`;
                  return <TypingIndicator userName={label} />;
                })()}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          {(() => {
            const isGroupConv = activeConversation?.type === 'group' || activeConversation?.roomModel === 'Group';
            const isParticipant = activeConversation?.participants?.some(p => String(p._id || p) === String(userId));
            const isOwnerStr = activeConversation?.ownerId?._id || activeConversation?.ownerId;
            const isOwner = isOwnerStr && String(isOwnerStr) === String(userId);
            const isAdmin = activeConversation?.adminIds?.some(aid => String(aid._id || aid) === String(userId)) || isOwner;
            const cannotSend = isGroupConv && isParticipant && !(isOwner || isAdmin) && activeConversation?.settings?.canMembersSendMessages === false;

            if (isGroupConv && !isParticipant) {
              return (
                <div style={{ padding: '16px 20px', background: 'var(--z-bg-sidebar)', borderTop: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 2 }}>Bạn không còn là thành viên của nhóm này</div>
                    <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', lineHeight: 1.4 }}>Bạn chỉ có thể xem lịch sử trò chuyện.</div>
                  </div>
                </div>
              );
            }

            if (cannotSend) return (
              <div style={{ padding: '16px', background: 'var(--z-bg-main)', borderTop: '1px solid var(--z-border)', display: 'flex', alignItems: 'flex-start', color: 'var(--z-text-secondary)', fontSize: 13, gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--z-primary)' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span>Chỉ trưởng/phó cộng đồng được gửi tin nhắn.</span>
              </div>
            );

            // ── Block banner (thay input khi đã chặn người này) ─────────────
            if (!isGroupConv && isBlockedByMe) {
              const otherPBlocked = getOtherParticipant(activeConversation);
              const otherNameBlocked = otherPBlocked && typeof otherPBlocked === 'object'
                ? (otherPBlocked.username || otherPBlocked.fullName || 'người này')
                : 'người này';
              return (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--z-bg-sidebar)',
                  borderTop: '1px solid var(--z-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  {/* Shield icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-primary)', marginBottom: 2 }}>
                      Bạn đã chặn <span style={{ color: '#ef4444' }}>{otherNameBlocked}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', lineHeight: 1.4 }}>
                      Bỏ chặn để có thể gửi và nhận tin nhắn.
                    </div>
                  </div>
                  <button
                    disabled={unblockLoading}
                    onClick={async () => {
                      if (!otherPBlocked) return;
                      const tid = String(otherPBlocked._id || otherPBlocked.id || '');
                      if (!tid) return;
                      setUnblockLoading(true);
                      try {
                        const res = await unblockUserStore(tid);
                        if (res.success) {
                          toast.success(`Đã bỏ chặn ${otherNameBlocked}`);
                        } else {
                          toast.error(res.error || 'Bỏ chặn thất bại');
                        }
                      } catch {
                        toast.error('Không thể bỏ chặn. Thử lại sau.');
                      } finally {
                        setUnblockLoading(false);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 20,
                      border: '1.5px solid #ef4444',
                      background: unblockLoading ? 'rgba(239,68,68,0.07)' : 'transparent',
                      color: '#ef4444', cursor: unblockLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    {unblockLoading
                      ? <FaSpinner className="spin" size={13} />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
                    }
                    {unblockLoading ? 'Đang xử lý...' : 'Bỏ chặn'}
                  </button>
                </div>
              );
            }

            if (!isGroupConv && isBlockedByThem) {
              return (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--z-bg-sidebar)',
                  borderTop: '1px solid var(--z-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  {/* Shield icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-primary)', marginBottom: 2 }}>
                      Lỗi
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', lineHeight: 1.4 }}>
                      Bạn đã bị người này chặn. Không thể gửi tin nhắn.
                    </div>
                  </div>
                </div>
              );
            }

            const otherP = !isGroupConv ? getOtherParticipant(activeConversation) : null;
            const otherIdP = otherP ? typeof otherP === 'object' ? String(otherP._id || otherP.id || '') : String(otherP) : null;
            const isStrangerChat = !!otherIdP && !friendIds.has(otherIdP) && !blockedUsers.some(u => String(u._id || u.id) === otherIdP) && !previouslyBlockedIds?.has(otherIdP);
            const otherName = otherP && typeof otherP === 'object' ? (otherP.username || otherP.fullName || 'Người này') : 'Người này';
            const otherPrivacy = otherP && typeof otherP === 'object' ? otherP.messagePrivacy : undefined;
            if (isStrangerChat && otherPrivacy === 'friends') return (
              <div style={{ padding: '14px 20px', background: 'var(--z-bg-sidebar)', borderTop: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FaShieldAlt size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--z-text-secondary)', lineHeight: 1.5 }}>
                  Bạn và <strong style={{ color: 'var(--z-text-primary)' }}>{otherName}</strong> không phải bạn bè. <strong>{otherName}</strong> chỉ nhận tin từ bạn bè.
                </div>
              </div>
            );
            const convName = getConversationName(activeConversation) || 'cuộc trò chuyện';
            return (
              <MessageInput
                key={String(activeConversation._id)}
                theme={appliedTheme}
                placeholder={`Nhập @, tin nhắn tới ${convName}`}
                conversationId={activeConversation._id}
                userId={userId}
                onSend={handleSendText} onSendSticker={handleSendSticker} onSendLike={handleSendLike}
                onUploadFiles={handleUploadFilesFromInput} onShowPoll={() => setShowCreatePollModal(true)}
                members={activeConversation.participants || []}
                replyTo={replyToMessage} onCancelReply={() => setReplyToMessage(null)}
                isGroup={isGroupConv}
              />
            );
          })()}
        </main>
      ) : (
        <main className="chat-main" style={{ alignItems: 'center', justifyItems: 'center', display: 'flex' }}>
          <div style={{ color: 'var(--z-text-secondary)', fontSize: 16, margin: 'auto' }}>Chọn một cuộc trò chuyện để bắt đầu</div>
        </main>
      )}

      {/* ── RIGHT PANEL ── */}
      {showReminderListPage && activeConversation ? (
        <div style={{ width: 380, borderLeft: '1px solid var(--z-border)', flexShrink: 0 }}>
          <ReminderListPage conversationId={activeConversation._id} conversationName={getConversationName(activeConversation)} onBack={() => setShowReminderListPage(false)}
            onCreateNew={() => { setShowReminderListPage(false); setTimeout(() => { const btn = document.querySelector('[data-create-reminder]'); if (btn) btn.click(); }, 100); }}
            onEdit={reminder => { setShowReminderListPage(false); setPendingEditReminder(reminder); }} onDelete={handleDeleteReminder} userId={userId} />
        </div>
      ) : activeConversation && showRightPanel && !(activeConversation.type === 'direct' && activeConversation.participants?.length === 1) && (
        <ChatRightPanel
          activeConversation={activeConversation} setActiveConversation={setActiveConversation}
          getConversationAvatar={getConversationAvatar} getConversationName={getConversationName}
          fetchConversations={fetchConversationsData}
          imgFiles={imgFiles} docFiles={docFiles} linkItems={linkItems}
          handleDeleteConversation={handleDeleteConversation} handleLeaveGroup={handleLeaveGroup}
          handleDisbandGroup={handleDisbandGroup} setShowCreateGroupModal={setShowCreateGroupModal}
          handleUpdateGroupSettings={handleUpdateGroupSettings} handleMute={handleMute} handleGroupAction={handleGroupAction}
          reminders={reminders} polls={polls} loadingPolls={loadingPolls}
          handleCreateReminder={handleCreateReminder} handleUpdateReminder={handleUpdateReminder} handleDeleteReminder={handleDeleteReminder}
          joinRequests={joinRequests} handleProcessJoinRequest={(id, action) => handleProcessJoinRequest(id, action, { activeConversation, fetchConversationsData })}
          pendingEditReminder={pendingEditReminder} onPendingEditConsumed={() => setPendingEditReminder(null)}
          onShowReminderList={() => setShowReminderListPage(true)} onShowAddMember={() => setShowAddMemberModal(true)}
          onShowPoll={() => setShowCreatePollModal(true)}
          pinnedMessages={pinnedMessages} onUnpin={handleUnpinMessage} onJump={jumpToMessage}
        />
      )}

      {/* ── Stranger panel ── */}
      {showStrangerPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowStrangerPanel(false)} />
          <div style={{ position: 'relative', width: 360, height: '100%', background: 'var(--z-bg-sidebar)', display: 'flex', flexDirection: 'column', boxShadow: '6px 0 24px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowStrangerPanel(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--z-bg-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--z-text-primary)', flexShrink: 0 }}><FaArrowLeft size={14} /></button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--z-text-primary)', flex: 1 }}>Tin nhắn từ người lạ</span>
              <span style={{ fontSize: 12, color: 'var(--z-text-muted)', background: 'var(--z-bg-hover)', borderRadius: 10, padding: '2px 8px' }}>{strangerConvs.length}</span>
            </div>
            <div style={{ margin: '10px 14px', padding: '10px 14px', background: messagePrivacy === 'friends' ? 'rgba(239,68,68,0.07)' : 'rgba(0,104,255,0.06)', borderRadius: 10, border: `1px solid ${messagePrivacy === 'friends' ? 'rgba(239,68,68,0.2)' : 'rgba(0,104,255,0.15)'}` }}>
              <div style={{ fontSize: 12.5, color: 'var(--z-text-secondary)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                {messagePrivacy === 'friends' ? <><FaLock size={11} color="#ef4444" /><span>Chỉ bạn bè mới có thể nhắn tin cho bạn.</span></> : <><FaGlobe size={11} color="var(--z-primary)" /><span>Mọi người có thể nhắn tin cho bạn.</span></>}
              </div>
              <span onClick={() => setShowPrivacyModal(true)} style={{ fontSize: 12, color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>Cài đặt quyền riêng tư →</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {strangerConvs.map(conv => {
                const unread = conv.unreadCount || 0;
                const lastMsgTime = conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : '';
                const lastContent = conv.latestMessage?.isRecalled ? 'Tin nhắn đã thu hồi' : (conv.latestMessage?.content || (conv.latestMessage ? '[Hình ảnh/File]' : 'Chưa có tin nhắn'));
                return (
                  <div key={String(conv._id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid var(--z-border)' }}
                    onClick={() => { setActiveConversation(conv); navigate('/chat/' + conv._id); setShowStrangerPanel(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={getConversationAvatar(conv)} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.src = DEFAULT_AVATAR; }} />
                      {unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', borderRadius: 10, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid var(--z-bg-sidebar)' }}>{unread > 99 ? '99+' : unread}</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 13.5, color: 'var(--z-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{getConversationName(conv)}</span>
                        <span style={{ fontSize: 11, color: unread > 0 ? 'var(--z-primary)' : 'var(--z-text-muted)', flexShrink: 0, marginLeft: 6 }}>{lastMsgTime}</span>
                      </div>
                      <span style={{ fontSize: 12, color: unread > 0 ? 'var(--z-text-secondary)' : 'var(--z-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: unread > 0 ? 600 : 400 }}>{lastContent}</span>
                    </div>
                  </div>
                );
              })}
              {strangerConvs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--z-text-muted)' }}>
                  <FaInbox size={36} style={{ marginBottom: 12, color: 'var(--z-border)' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--z-text-secondary)' }}>Không có tin nhắn từ người lạ</div>
                  <div style={{ fontSize: 12 }}>Hộp thư của bạn đang sạch sẽ!</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy modal */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPrivacyModal(false)}>
          <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 14, width: 400, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--z-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--z-text-primary)', marginBottom: 4 }}>Ai được nhắn tin cho bạn?</div>
              <div style={{ fontSize: 12.5, color: 'var(--z-text-secondary)', lineHeight: 1.5 }}>Chọn ai có thể gửi tin nhắn đến bạn</div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[{ value: 'everyone', label: 'Mọi người', desc: 'Tất cả mọi người đều có thể nhắn tin cho bạn', Icon: FaGlobe, iconColor: 'var(--z-primary)' }, { value: 'friends', label: 'Bạn bè', desc: 'Chỉ bạn bè mới có thể nhắn tin cho bạn', Icon: FaUserFriends, iconColor: '#16a34a' }].map(opt => (
                <div key={opt.value} onClick={() => setMessagePrivacy(opt.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', cursor: 'pointer', background: messagePrivacy === opt.value ? 'rgba(0,104,255,0.06)' : 'transparent', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (messagePrivacy !== opt.value) e.currentTarget.style.background = 'var(--z-bg-hover)'; }} onMouseLeave={e => { if (messagePrivacy !== opt.value) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: messagePrivacy === opt.value ? opt.iconColor + '18' : 'var(--z-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <opt.Icon size={18} color={messagePrivacy === opt.value ? opt.iconColor : 'var(--z-text-secondary)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--z-text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${messagePrivacy === opt.value ? 'var(--z-primary)' : 'var(--z-border)'}`, background: messagePrivacy === opt.value ? 'var(--z-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {messagePrivacy === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--z-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPrivacyModal(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Hủy</button>
              <button onClick={saveMessagePrivacy} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Triggered reminder popup */}
      {triggeredReminder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setTriggeredReminder(null)}>
          <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 16, width: 460, maxWidth: '94vw', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 8 }}>{triggeredReminder.title}</div>
              <div style={{ fontSize: 14, color: 'var(--z-text-secondary)', marginBottom: 20 }}>{triggeredReminder.participants?.length || 0} người tham gia</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setTriggeredReminder(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Từ chối</button>
                <button onClick={() => { setTriggeredReminder(null); if (activeConversation?._id !== triggeredReminder.conversationId) navigate(`/chat/${triggeredReminder.conversationId}`); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Tham gia</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPinLimitModal && <PinLimitModal isOpen={showPinLimitModal} onClose={() => setShowPinLimitModal(false)} onReplace={() => handleForcePin(pendingPinId)} currentPins={pinnedMessages} />}
      {showCreatePollModal && <CreatePollModal isOpen={showCreatePollModal} onClose={() => setShowCreatePollModal(false)} conversationId={activeConversation?._id} onCreated={() => fetchPolls(activeConversation?._id)} />}
      {showAddMemberModal && <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} activeConversation={activeConversation} friends={friends} onAdded={fetchConversationsData} />}
      {showUnpinConfirmModal && <UnpinConfirmModal isOpen={showUnpinConfirmModal} onClose={() => setShowUnpinConfirmModal(false)} onConfirm={() => { if (unpinTargetId) handleUnpinMessage(unpinTargetId); }} />}

      {ctxMenu && <ConversationContextMenu conv={ctxMenu.conv} position={{ x: ctxMenu.x, y: ctxMenu.y }} onClose={() => setCtxMenu(null)} onPin={handlePinConversation} onClassify={handleClassifyConversation} onHide={handleHideConversation} onDelete={handleDeleteConversationCtx} onReport={conv => { const other = getOtherParticipant(conv); if (other) setReportTarget({ id: String(other._id || other.id), name: other.username || other.fullName || 'người dùng' }); setCtxMenu(null); }} myId={userId} />}
      {reportTarget && <ReportUserModal targetUserId={reportTarget.id} targetUserName={reportTarget.name} onClose={() => setReportTarget(null)} />}
    </div>
  );
}