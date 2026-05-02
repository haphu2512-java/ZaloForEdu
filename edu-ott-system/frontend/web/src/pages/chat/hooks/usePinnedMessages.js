import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { conversationService } from '../../../services/conversationService';

export function usePinnedMessages({ activeConversation }) {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinLimitModal, setShowPinLimitModal] = useState(false);
  const [pendingPinId, setPendingPinId] = useState(null);
  const [showUnpinConfirmModal, setShowUnpinConfirmModal] = useState(false);
  const [unpinTargetId, setUnpinTargetId] = useState(null);

  const pinnedMsgIds = useMemo(
    () => new Set(pinnedMessages.map(p => String(p.messageId?._id || p.messageId))),
    [pinnedMessages]
  );

  const handlePinMessage = async (messageId) => {
    if (!activeConversation) return;
    if (pinnedMessages.length >= 3) {
      setPendingPinId(messageId);
      setShowPinLimitModal(true);
      return;
    }
    const tempPin = { _id: `temp-pin-${Date.now()}`, messageId, pinnedAt: new Date().toISOString() };
    setPinnedMessages(prev => [...prev, tempPin]);
    try {
      await conversationService.pinMessage(activeConversation._id, messageId);
      const res = await conversationService.getPinnedMessages(activeConversation._id);
      setPinnedMessages(res.data?.items || res.data || []);
      toast.success('📌 Đã ghim tin nhắn');
    } catch (err) {
      setPinnedMessages(prev => prev.filter(p => p._id !== tempPin._id));
      toast.error(err.response?.data?.message || 'Lỗi ghim tin nhắn');
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!activeConversation) return;
    try {
      await conversationService.unpinMessage(activeConversation._id, messageId);
      setPinnedMessages(prev =>
        prev.filter(p => String(p.messageId?._id || p.messageId) !== String(messageId))
      );
      toast.success('Đã bỏ ghim tin nhắn');
    } catch {
      toast.error('Lỗi bỏ ghim tin nhắn');
    }
  };

  const handleForcePin = async (messageId) => {
    if (!messageId || !activeConversation) return;
    const oldest = pinnedMessages[0];
    if (oldest) {
      await conversationService.unpinMessage(activeConversation._id, oldest.messageId?._id || oldest.messageId);
    }
    try {
      await conversationService.pinMessage(activeConversation._id, messageId);
      const res = await conversationService.getPinnedMessages(activeConversation._id);
      setPinnedMessages(res.data?.items || res.data || []);
      toast.success('📌 Đã ghim tin nhắn');
    } catch {
      toast.error('Lỗi ghim tin nhắn');
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

  return {
    pinnedMessages, setPinnedMessages,
    pinnedMsgIds,
    showPinLimitModal, setShowPinLimitModal,
    pendingPinId, setPendingPinId,
    showUnpinConfirmModal, setShowUnpinConfirmModal,
    unpinTargetId, setUnpinTargetId,
    handlePinMessage,
    handleUnpinMessage,
    handleForcePin,
    jumpToMessage,
  };
}
