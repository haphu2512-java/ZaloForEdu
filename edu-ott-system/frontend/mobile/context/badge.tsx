import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchAPI } from '@/utils/api';
import { connectSocket } from '@/utils/socketService';
import { useAuth } from './auth';

// ============================================================
// BadgeContext - Quản lý unread badge counts toàn cục
// Cung cấp: unreadMessages, unreadNotifications
// ============================================================

interface BadgeContextValue {
  unreadMessages: number;
  unreadNotifications: number;
  refreshCounts: () => Promise<void>;
  markMessagesRead: () => void;
  markNotificationsRead: () => void;
}

const BadgeContext = createContext<BadgeContextValue>({
  unreadMessages: 0,
  unreadNotifications: 0,
  refreshCounts: async () => {},
  markMessagesRead: () => {},
  markNotificationsRead: () => {},
});

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isMounted = useRef(true);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [msgRes, notifRes] = await Promise.allSettled([
        fetchAPI('/conversations?limit=50'),
        fetchAPI('/notifications/unread-count'),
      ]);

      if (isMounted.current) {
        // Đếm conversations có tin nhắn chưa đọc
        if (msgRes.status === 'fulfilled') {
          const conversations = msgRes.value?.data?.items || [];
          const unread = conversations.filter((conv: any) => {
            const latest = conv.latestMessage;
            if (!latest) return false;
            const senderId =
              typeof latest.senderId === 'string'
                ? latest.senderId
                : latest.senderId?._id || latest.senderId?.id;
            if (senderId === user.id) return false;
            const seenBy = (latest.seenBy || []).map((u: any) =>
              typeof u === 'string' ? u : u._id || u.id
            );
            return !seenBy.includes(user.id);
          }).length;
          setUnreadMessages(unread);
        }

        // Lấy notification unread count
        if (notifRes.status === 'fulfilled') {
          const count = notifRes.value?.data?.unreadCount ?? 0;
          setUnreadNotifications(count);
        }
      }
    } catch (error) {
      // Silent fail - không cần alert
    }
  }, [user?.id]);

  // Fetch khi login / mount
  useEffect(() => {
    isMounted.current = true;
    if (user?.id) {
      void fetchCounts();
    } else {
      setUnreadMessages(0);
      setUnreadNotifications(0);
    }
    return () => {
      isMounted.current = false;
    };
  }, [user?.id, fetchCounts]);

  // Refresh khi app trở lại foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && user?.id) {
        void fetchCounts();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user?.id, fetchCounts]);

  // Socket real-time: lắng nghe new_message + new_notification
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const setupSocket = async () => {
      const socket = await connectSocket();
      if (!socket || !mounted) return;

      const onNewMessage = (message: any) => {
        if (!isMounted.current) return;
        const senderId =
          typeof message.senderId === 'string'
            ? message.senderId
            : message.senderId?._id || message.senderId?.id;
        // Tăng badge nếu tin nhắn không phải của mình
        if (senderId && senderId !== user.id) {
          setUnreadMessages((prev) => prev + 1);
        }
      };

      const onNewNotification = () => {
        if (!isMounted.current) return;
        setUnreadNotifications((prev) => prev + 1);
      };

      socket.on('new_message', onNewMessage);
      socket.on('new_notification', onNewNotification);

      return () => {
        socket.off('new_message', onNewMessage);
        socket.off('new_notification', onNewNotification);
      };
    };

    const cleanupPromise = setupSocket();
    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [user?.id]);

  const markMessagesRead = useCallback(() => setUnreadMessages(0), []);
  const markNotificationsRead = useCallback(
    () => setUnreadNotifications(0),
    []
  );

  return (
    <BadgeContext.Provider
      value={{
        unreadMessages,
        unreadNotifications,
        refreshCounts: fetchCounts,
        markMessagesRead,
        markNotificationsRead,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadge() {
  return useContext(BadgeContext);
}
