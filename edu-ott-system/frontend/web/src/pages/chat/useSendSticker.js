import { useCallback } from 'react';
import axios from "../../../services/authService";
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Hook gửi sticker/GIF (Tenor) — tách riêng để không đụng ChatPage.
 *
 * Cách dùng trong ChatPage (chỉ cần thêm 2 dòng):
 *
 *   import { useSendSticker } from './useSendSticker';          // ← dòng 1
 *   const handleSendSticker = useSendSticker({ activeConversation, setMessages, ensureRealConversation });  // ← dòng 2
 *
 * Sau đó truyền vào MessageInput:
 *   <MessageInput ... onSendSticker={handleSendSticker} />
 */
export function useSendSticker({ activeConversation, setMessages, ensureRealConversation }) {
  const token = localStorage.getItem('token');
  const userId = (() => {
    let id = localStorage.getItem('userId');
    if (id) return String(id).trim();
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return String(u._id || u.id || '').trim() || null;
    } catch { return null; }
  })();

  const handleSendSticker = useCallback(async (sticker) => {
    if (!activeConversation) return;

    const tempId = `temp-sticker-${Date.now()}`;

    // Optimistic: hiển thị GIF ngay lập tức
    setMessages(prev => [...prev, {
      _id: tempId,
      content: `[sticker]${sticker.url}`,
      type: 'sticker',
      stickerUrl: sticker.url,
      senderId: { _id: userId },
      conversationId: activeConversation._id,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }]);

    try {
      const convId = await ensureRealConversation();
      const res = await axios.post(
        `${API_BASE_URL}/messages/send`,
        { content: `[sticker]${sticker.url}`, conversationId: convId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const realMsg = res.data.data || res.data;
      const realId = String(realMsg._id || realMsg.id);

      setMessages(prev => {
        const filtered = prev.filter(
          m => String(m._id) !== tempId && String(m._id) !== realId
        );
        return [...filtered, { ...realMsg, type: 'sticker', stickerUrl: sticker.url }];
      });
    } catch {
      toast.error('Lỗi gửi sticker');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  }, [activeConversation, setMessages, ensureRealConversation, token, userId]);

  return handleSendSticker;
}
