import { useCallback, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { conversationService } from '../../../services/conversationService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

import { useConfirm } from '../../../contexts/ConfirmContext';
import { useLanguage } from '../../../contexts/LanguageContext';

export function useConversationActions({
  token, userId, navigate,
  activeConversation, setActiveConversation,
  setConversations,
  getConversationName,
  fetchConversationsData,
}) {
  const confirm = useConfirm();
  const { t } = useLanguage();
  const [showTransferOwnerModal, setShowTransferOwnerModal] = useState(false);
  const [transferOwnerLoading, setTransferOwnerLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [messagePrivacy, setMessagePrivacy] = useState(
    () => localStorage.getItem('messagePrivacy') || 'everyone'
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [msgToShare, setMsgToShare] = useState(null);
  const [justSentRequestTo, setJustSentRequestTo] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  // Track friendId đã xóa conversation để block mock xuất hiện lại
  const [deletedFriendIds, setDeletedFriendIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('deletedFriendIds') || '[]')); } catch { return new Set(); }
  });

  // ── Pin conversation ───────────────────────────────────────────────────────
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

  // ── Classify conversation ─────────────────────────────────────────────────
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

  // ── Mute conversation (from sidebar ctx menu) ─────────────────────────────
  const handleMuteConversation = useCallback(async (conv, durationMinutes) => {
    try {
      const mutedUntil = durationMinutes === 0
        ? null
        : durationMinutes === -1
          ? new Date(2099, 0, 1).toISOString()
          : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

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

  // ── Mute from right panel ─────────────────────────────────────────────────
  const handleMute = async (durationMinutes) => {
    if (!activeConversation) return;
    try {
      const mutedUntil = durationMinutes === 0
        ? null
        : durationMinutes === -1
          ? new Date(2099, 0, 1).toISOString()
          : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      await conversationService.muteConversation(activeConversation._id, mutedUntil);
      const convId = String(activeConversation._id);
      setConversations(prev =>
        prev.map(c => String(c._id) === convId ? { ...c, preference: { ...(c.preference || {}), mutedUntil } } : c)
      );
      setActiveConversation(prev =>
        prev ? { ...prev, preference: { ...(prev.preference || {}), mutedUntil } } : prev
      );
      toast.success(durationMinutes === 0 ? 'Đã bật lại thông báo' : 'Đã tắt thông báo');
    } catch {
      toast.error('Lỗi cập nhật trạng thái thông báo');
    }
  };

  // ── Hide conversation ─────────────────────────────────────────────────────
  const handleHideConversation = useCallback(async (conv) => {
    if (!await confirm(`Ẩn hội thoại với "${getConversationName(conv)}"? Bạn có thể xem lại trong mục Hội thoại ẩn.`)) return;
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

  // ── Delete conversation (from ctx menu) — chỉ mở modal xác nhận ────────
  const handleDeleteConversationCtx = useCallback((conv) => {
    setDeleteConfirmTarget(conv);
  }, []);

  // ── Leave group (from ctx menu) ───────────────────────────────────────────
  const handleLeaveGroupCtx = useCallback(async (conv) => {
    if (!await confirm(`Rời nhóm "${getConversationName(conv)}"?`)) return;
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

  // ── Delete active conversation (từ right panel) — mở modal xác nhận ────
  const handleDeleteConversation = () => {
    if (!activeConversation) return;
    if (activeConversation.isMock) { setActiveConversation(null); navigate('/chat'); return; }
    setDeleteConfirmTarget(activeConversation);
  };

  // ── Thực sự xóa sau khi user bấm Xác nhận trong modal ─────────────────
  const confirmDeleteConversation = useCallback(async () => {
    const conv = deleteConfirmTarget;
    setDeleteConfirmTarget(null);
    if (!conv) return;
    try {
      await conversationService.updateConversationPreference(conv._id, {
        isDeleted: true,
        isHidden: false,
        deletedHistoryAt: new Date().toISOString(),
      });
      setConversations(prev => prev.filter(c => String(c._id) !== String(conv._id)));

      // Lưu friendId để block mock xuất hiện lại (vì backend exclude conv khỏi list)
      const otherParticipant = (conv.participants || []).find(
        p => String(p._id || p.id || p) !== String(userId)
      );
      if (otherParticipant) {
        const friendId = String(otherParticipant._id || otherParticipant.id || otherParticipant);
        setDeletedFriendIds(prev => {
          const next = new Set(prev);
          next.add(friendId);
          try { sessionStorage.setItem('deletedFriendIds', JSON.stringify([...next])); } catch {}
          return next;
        });
      }

      if (String(activeConversation?._id) === String(conv._id)) {
        setActiveConversation(null);
        navigate('/chat');
      }
      toast.success('Đã xóa cuộc trò chuyện');
    } catch {
      toast.error('Có lỗi xảy ra khi xóa');
    }
  }, [deleteConfirmTarget, activeConversation, userId, navigate]);

  // ── Update group settings ─────────────────────────────────────────────────
  const handleUpdateGroupSettings = async (settings) => {
    if (!activeConversation) return;
    setActiveConversation(prev => prev ? {
      ...prev,
      settings: { ...prev.settings, ...settings }
    } : prev);
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${activeConversation._id}/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã cập nhật cài đặt nhóm');
      fetchConversationsData();
    } catch {
      setActiveConversation(prev => prev ? {
        ...prev,
        settings: activeConversation.settings
      } : prev);
      toast.error('Lỗi cập nhật cài đặt');
    }
  };

  // ── Group member actions ──────────────────────────────────────────────────
  const handleGroupAction = async (action, memberId) => {
    if (!activeConversation) return;
    try {
      if (action === 'promote') await conversationService.promoteGroupAdmin(activeConversation._id, memberId);
      else if (action === 'demote') await conversationService.demoteGroupAdmin(activeConversation._id, memberId);
      else if (action === 'remove') await conversationService.removeGroupMember(activeConversation._id, memberId);
      else if (action === 'transfer') await conversationService.transferGroupOwner(activeConversation._id, memberId);
      toast.success('Thao tác thành công');
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // ── Disband group ─────────────────────────────────────────────────────────
  const handleDisbandGroup = async () => {
    if (!activeConversation) return;
    if (!await confirm('Giải tán nhóm sẽ xóa toàn bộ nội dung trò chuyện và các thành viên khỏi nhóm.\n\nBạn có chắc chắn muốn giải tán nhóm không?', { isDanger: true })) return;
    try {
      await conversationService.disbandGroup(activeConversation._id);
      toast.success('Đã giải tán nhóm thành công!');
      setActiveConversation(null);
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi giải tán nhóm');
    }
  };

  // ── Leave group (from right panel) ───────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!activeConversation) return;
    const isOwner = String(activeConversation.ownerId?._id || activeConversation.ownerId) === String(userId);
    if (isOwner) { setShowTransferOwnerModal(true); return; }
    if (!await confirm(`Bạn có chắc chắn muốn rời khỏi nhóm ${getConversationName(activeConversation)} không?`, { isDanger: true })) return;
    try {
      await conversationService.leaveGroup(activeConversation._id);
      toast.success('Đã rời nhóm thành công');
      setActiveConversation(null);
      navigate('/chat');
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi rời nhóm');
    }
  };

  // ── Transfer owner and leave ──────────────────────────────────────────────
  const handleTransferOwnerAndLeave = async (newOwnerId) => {
    if (!activeConversation) return;
    setTransferOwnerLoading(true);
    try {
      await conversationService.transferGroupOwner(activeConversation._id, newOwnerId);
      await conversationService.leaveGroup(activeConversation._id);
      toast.success('Đã nhường quyền và rời nhóm thành công');
      setShowTransferOwnerModal(false);
      setActiveConversation(null);
      navigate('/chat');
      fetchConversationsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi nhường quyền trưởng nhóm');
    } finally {
      setTransferOwnerLoading(false);
    }
  };

  // ── Forward message ───────────────────────────────────────────────────────
  const openShareModal = (msg) => { setMsgToShare(msg); setShareModalOpen(true); };

  const executeForward = async (conversation) => {
    if (!msgToShare) { toast.error('Không có tin nhắn để chuyển tiếp'); return; }
    try {
      const targetConvId = conversation._id || conversation.id;
      const content = msgToShare.content || '';
      const mediaIds = (msgToShare.attachments || msgToShare.mediaIds || []).map(m => m._id || m.id || m);
      await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content, mediaIds, conversationId: targetConvId, forwardFrom: msgToShare._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Đã chuyển tiếp tin nhắn`);
      setShareModalOpen(false);
    } catch {
      toast.error('Lỗi chuyển tiếp tin nhắn');
    }
  };

  // ── Save message privacy ──────────────────────────────────────────────────
  const saveMessagePrivacy = async () => {
    localStorage.setItem('messagePrivacy', messagePrivacy);
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}`,
        { messagePrivacy },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch { /* best-effort */ }
    setShowPrivacyModal(false);
  };

  return {
    showTransferOwnerModal, setShowTransferOwnerModal,
    transferOwnerLoading,
    showPrivacyModal, setShowPrivacyModal,
    messagePrivacy, setMessagePrivacy,
    shareModalOpen, setShareModalOpen,
    msgToShare,
    justSentRequestTo, setJustSentRequestTo,
    handlePinConversation,
    handleClassifyConversation,
    handleMuteConversation,
    handleMute,
    handleHideConversation,
    handleDeleteConversationCtx,
    handleLeaveGroupCtx,
    handleDeleteConversation,
    confirmDeleteConversation,
    deleteConfirmTarget, setDeleteConfirmTarget,
    deletedFriendIds, setDeletedFriendIds,
    handleUpdateGroupSettings,
    handleGroupAction,
    handleDisbandGroup,
    handleLeaveGroup,
    handleTransferOwnerAndLeave,
    openShareModal,
    executeForward,
    saveMessagePrivacy,
  };
}
