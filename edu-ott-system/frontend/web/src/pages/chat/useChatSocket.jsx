import { useEffect } from 'react';
import { socketService } from '../../services/socketService';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/**
 * Custom hook quản lý tất cả socket events cho ChatPage
 */
export const useChatSocket = ({
  token,
  userId,
  activeConvIdRef,
  activeConversationRef,
  setMessages,
  setConversations,
  setActiveConversation,
  setSelfConversation,
  setPinnedMessages,
  setReminders,
  setJoinRequests,
  setPolls,
  setTriggeredReminder,
  fetchConversationsData,
  fetchIncomingRequests,
  fetchFriends,
  fetchOutgoingRequests,
  toast,
}) => {
  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
    fetchConversationsData();

    // ── conversation_updated ──
    const handleConversationUpdated = (payload) => {
      const { conversationId, latestMessage } = payload;
      const convIdStr = String(conversationId);
      let activeIdStr = String(activeConvIdRef.current);
      const isMyMessage = String(latestMessage?.senderId?._id || latestMessage?.senderId) === String(userId);

      // Mock conversation detection
      const activeCon = activeConversationRef.current;
      if (activeCon?.isMock && convIdStr !== activeIdStr) {
        const mockFriendId = String(activeCon._id).replace('mock_', '');
        const senderId = String(latestMessage?.senderId?._id || latestMessage?.senderId || '');
        if (senderId === mockFriendId || isMyMessage) {
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

        setMessages(prev => {
          const resolvedMsg = resolveReply(normalizedMsg, prev);
          if (prev.some(m => !String(m._id || m.id).startsWith('temp-') && String(m._id || m.id) === msgIdStr)) return prev;
          const tempIdx = prev.findIndex(m =>
            String(m._id || m.id).startsWith('temp-') &&
            (m.content || '').trim() === (resolvedMsg.content || '').trim()
          );
          if (tempIdx !== -1) { const arr = [...prev]; arr[tempIdx] = resolvedMsg; return arr; }
          return [...prev, resolvedMsg];
        });

        socketService.socket?.emit("message_delivered", { messageId: latestMessage._id });
        socketService.socket?.emit("message_seen", { messageId: latestMessage._id });
      } else if (!isMyMessage && latestMessage?.type !== 'system' && latestMessage?.type !== 'system_reminder') {
        const isMentioned = latestMessage?.mentionAll ||
          (latestMessage?.mentions || []).some(m => String(m._id || m) === String(userId));

        const senderObj = latestMessage?.senderId;
        const senderName = senderObj?.username || senderObj?.fullName || 'Ai đó';
        const shortContent = latestMessage?.content || '[Hình ảnh/File đính kèm]';
        const avatarSrc = senderObj?.avatarUrl || senderObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=0068FF&color=fff`;

        toast.custom((t) => (
          <div className={`push-notif-card ${t.visible ? 'entering' : 'leaving'} ${isMentioned ? 'mentioned' : ''}`} onClick={() => toast.dismiss(t.id)}>
            <img src={avatarSrc} alt="" className="push-notif-avatar" />
            <div className="push-notif-body">
              <div className="push-notif-sender">
                {senderName}
                {isMentioned && <span className="mention-badge">@ Nhắc đến bạn</span>}
              </div>
              <div className="push-notif-content">{shortContent}</div>
            </div>
            <span className="push-notif-close">✕</span>
          </div>
        ), { position: 'bottom-right', duration: 4500, id: `notif_${latestMessage?._id}` });
      }

      setSelfConversation(prev => {
        if (prev && String(prev._id) === convIdStr) return { ...prev, latestMessage };
        return prev;
      });

      setConversations(prevConvs => {
        const index = prevConvs.findIndex(c => String(c._id) === convIdStr);
        if (index === -1) {
          fetchConversationsData();
          const mockId = `mock_${String(latestMessage?.senderId?._id || latestMessage?.senderId || '')}`;
          return prevConvs.filter(c => c._id !== mockId);
        }
        const newConvs = [...prevConvs];
        const target = { ...newConvs[index], latestMessage };
        if (convIdStr !== activeIdStr && !isMyMessage) target.unreadCount = (target.unreadCount || 0) + 1;
        else if (convIdStr === activeIdStr) target.unreadCount = 0;
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

    // ── Reminder events ──
    const handleReminderCreated = (reminder) => {
      setReminders(prev => {
        if (prev.some(r => r._id === reminder._id)) return prev;
        return [...prev, reminder].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
      });
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

    const handleReminderTriggered = ({ _id, title, participants, conversationId }) => {
      setReminders(prev => prev.map(r => r._id === _id ? { ...r, status: 'done' } : r));
      const currentUserObj = JSON.parse(localStorage.getItem('user') || '{}');
      const myId = String(currentUserObj._id || currentUserObj.id || '');
      const isParticipant = (participants || []).some(p => String(p._id || p) === myId);
      if (!isParticipant) return;
      const msg = `🔔 Nhắc hẹn: ${title}`;
      if (Notification.permission === 'granted') {
        new Notification('Nhắc hẹn', { body: title, icon: '/favicon.ico' });
      } else {
        toast(msg, { duration: 8000, icon: '🔔', style: { fontWeight: 600 } });
      }
    };

    // ── Poll updated (MỚI) ──
    const handlePollUpdated = (updatedPoll) => {
      if (!updatedPoll) return;
      setMessages(prev => prev.map(m => {
        const mPollId = String(m.pollId?._id || m.pollId || '');
        if (m.type === 'poll' && mPollId === String(updatedPoll._id)) {
          return { ...m, pollId: updatedPoll };
        }
        return m;
      }));
      if (setPolls) {
        setPolls(prev => prev.map(p => String(p._id) === String(updatedPoll._id) ? updatedPoll : p));
      }
      // Hiển thị thông báo khi có người bình chọn (tránh hiện nếu chính mình vừa vote - giả định backend gộp nốt)
      toast.success(`Có người vừa bình chọn: ${updatedPoll.question}`, {
        icon: '📊',
        id: `poll_${updatedPoll._id}`,
        duration: 3000
      });
    };

    // ── Pinned items updated (MỚI) ──
    const handlePinnedItemsUpdated = (payload) => {
      if (!payload || !setPinnedMessages) return;
      // payload = { conversationId, pinnedMessages: [...] } or just array
      const activeId = activeConvIdRef.current;
      if (payload.conversationId && String(payload.conversationId) !== String(activeId)) return;
      if (Array.isArray(payload.pinnedMessages)) {
        setPinnedMessages(payload.pinnedMessages);
      } else if (Array.isArray(payload)) {
        setPinnedMessages(payload);
      }
    };

    // ── Register all listeners ──
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
    socketService.on("reminder_triggered", handleReminderTriggered);
    socketService.on("poll_updated", handlePollUpdated);
    socketService.on("pinned_items_updated", handlePinnedItemsUpdated);

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
      socketService.off("poll_updated", handlePollUpdated);
      socketService.off("pinned_items_updated", handlePinnedItemsUpdated);
    };
  }, [token, userId, fetchConversationsData]);
};
