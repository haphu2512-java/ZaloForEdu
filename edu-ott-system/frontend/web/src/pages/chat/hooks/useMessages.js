import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { uploadFile } from '../../../services/mediaService';
import { socketService } from '../../../services/socketService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function useMessages({ activeConversation, userId, token, getOtherParticipant, navigate, setConversations }) {
  const [messages, setMessages] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [uploads, setUploads] = useState([]);

  // ── Ensure real conversation (convert mock → real) ────────────────────────
  const ensureRealConversation = async () => {
    if (!activeConversation.isMock) return activeConversation._id;
    const otherParticipant = getOtherParticipant(activeConversation);
    const targetId = otherParticipant._id || otherParticipant.id;

    const createRes = await axios.post(
      `${API_BASE_URL}/conversations`,
      { type: 'direct', participantIds: [targetId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const realConv = createRes.data.data || createRes.data;
    realConv.participants = activeConversation.participants;
    const currentConvId = realConv._id || realConv.id;

    setConversations(prev => [realConv, ...prev.filter(c => c._id !== activeConversation._id)]);
    socketService.socket?.emit('join_conversation', { conversationId: currentConvId });
    navigate('/chat/' + currentConvId);
    return currentConvId;
  };

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSendText = async (content) => {
    if (!activeConversation || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      _id: tempId,
      content,
      senderId: { _id: userId },
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }]);

    try {
      const currentConvId = await ensureRealConversation();
      const res = await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content, conversationId: currentConvId, replyTo: replyToMessage?._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyToMessage(null);

      const realMsg = res.data.data || res.data;
      const realMsgId = String(realMsg._id || realMsg.id);
      setMessages(prev => {
        const normalizedMsg = {
          ...realMsg,
          mediaIds: (realMsg.mediaIds || []).map(media =>
            typeof media === 'object' && media.url && !/^https?:\/\//i.test(media.url)
              ? { ...media, url: `${API_ORIGIN}${media.url}` }
              : media
          ),
        };
        const filtered = prev.filter(
          m => String(m._id || m.id) !== tempId && String(m._id || m.id) !== realMsgId
        );
        return [...filtered, normalizedMsg];
      });
    } catch {
      toast.error('Lỗi gửi tin nhắn');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  // ── Send sticker/GIF ──────────────────────────────────────────────────────
  const handleSendSticker = async (sticker) => {
    if (!activeConversation) return;
    const stickerUrl = sticker.url || sticker.preview || '';
    if (!stickerUrl) { toast.error('Sticker URL không hợp lệ'); return; }

    const tempId = `temp-sticker-${Date.now()}`;
    setMessages(prev => [...prev, {
      _id: tempId,
      content: `[sticker]${stickerUrl}`,
      type: 'sticker',
      stickerUrl,
      senderId: { _id: userId },
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }]);

    try {
      const currentConvId = await ensureRealConversation();
      const res = await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content: `[sticker]${stickerUrl}`, conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const realMsg = res.data.data || res.data;
      const realMsgId = String(realMsg._id || realMsg.id);
      setMessages(prev => {
        const filtered = prev.filter(m => String(m._id) !== tempId && String(m._id) !== realMsgId);
        return [...filtered, { ...realMsg, type: 'sticker', stickerUrl }];
      });
    } catch (err) {
      console.error('[Sticker] send error:', err?.response?.data || err.message);
      toast.error('Lỗi gửi sticker');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  // ── Send like 👍 ─────────────────────────────────────────────────────────
  const handleSendLike = async () => {
    if (!activeConversation) return;
    const tempId = `temp-like-${Date.now()}`;
    setMessages(prev => [...prev, {
      _id: tempId,
      content: '👍',
      senderId: { _id: userId },
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }]);

    try {
      const currentConvId = await ensureRealConversation();
      const res = await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content: '👍', conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const realMsg = res.data.data || res.data;
      const realMsgId = String(realMsg._id || realMsg.id);
      setMessages(prev => {
        const filtered = prev.filter(m => String(m._id || m.id) !== tempId && String(m._id || m.id) !== realMsgId);
        return [...filtered, realMsg];
      });
    } catch (err) {
      console.error('Lỗi gửi Like', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  // ── Upload single file ────────────────────────────────────────────────────
  const handleUploadFile = async (file) => {
    if (!activeConversation) return;
    const uid = Date.now() + Math.random();
    setUploads(prev => [...prev, { id: uid, name: file.name, percent: 0 }]);

    try {
      const currentConvId = await ensureRealConversation();
      const media = await uploadFile(file, {
        folder: 'zaloapp/chat',
        onProgress: pct => setUploads(prev => prev.map(u => u.id === uid ? { ...u, percent: pct } : u)),
      });
      await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content: '', mediaIds: [media._id || media.id], conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      toast.error(`Lỗi tải lên: ${file.name}`);
    } finally {
      setUploads(prev => prev.filter(u => u.id !== uid));
    }
  };

  // ── Upload multiple files ─────────────────────────────────────────────────
  const handleUploadFilesFromInput = async (files) => {
    if (!files || files.length === 0 || !activeConversation) return;
    if (files.length === 1) { handleUploadFile(files[0]); return; }

    const uid = Date.now() + Math.random();
    setUploads(prev => [...prev, { id: uid, name: `${files.length} file`, percent: 0 }]);
    try {
      const currentConvId = await ensureRealConversation();
      let doneCount = 0;
      const mediaList = await Promise.all(
        Array.from(files).map(file =>
          uploadFile(file, {
            folder: 'zaloapp/chat',
            onProgress: () => {
              doneCount++;
              const pct = Math.round((doneCount / files.length) * 100);
              setUploads(prev => prev.map(u => u.id === uid ? { ...u, percent: pct } : u));
            },
          })
        )
      );
      const mediaIds = mediaList.map(m => m._id || m.id);
      await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content: '', mediaIds, conversationId: currentConvId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      toast.error('Lỗi tải lên file');
    } finally {
      setUploads(prev => prev.filter(u => u.id !== uid));
    }
  };

  // ── Reaction ──────────────────────────────────────────────────────────────
  const handleReaction = async (messageId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (String(m._id) === String(messageId)) {
        const filtered = (m.reactions || []).filter(r => String(r.userId) !== String(userId));
        return { ...m, reactions: [...filtered, { emoji, userId }] };
      }
      return m;
    }));
    try {
      await axios.put(
        `${API_BASE_URL}/messages/${messageId}/react`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch { toast.error('Lỗi thả cảm xúc'); }
  };

  // ── Recall ────────────────────────────────────────────────────────────────
  const handleRecall = async (msgId) => {
    setMessages(prev =>
      prev.map(m => String(m._id) === String(msgId)
        ? { ...m, isRecalled: true, content: '', attachments: [], mediaIds: [] }
        : m
      )
    );
    try {
      await axios.put(`${API_BASE_URL}/messages/${msgId}/recall`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Đã thu hồi tin nhắn');
    } catch {
      setMessages(prev => prev.map(m => String(m._id) === String(msgId) ? { ...m, isRecalled: false } : m));
      toast.error('Lỗi thu hồi tin nhắn');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    setMessages(prev => prev.filter(m => m._id !== msgId));
    try {
      await axios.delete(`${API_BASE_URL}/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch { toast.error('Lỗi xóa tin nhắn'); }
  };

  return {
    messages, setMessages,
    replyToMessage, setReplyToMessage,
    uploads, setUploads,
    ensureRealConversation,
    handleSendText,
    handleSendSticker,
    handleSendLike,
    handleUploadFile,
    handleUploadFilesFromInput,
    handleReaction,
    handleRecall,
    handleDelete,
  };
}
