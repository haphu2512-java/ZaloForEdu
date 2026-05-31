import { useEffect, useRef } from "react";
import {
  FaBell, FaUserPlus, FaCommentDots, FaUsers, FaCheck,
  FaCheckDouble, FaTimes, FaSpinner, FaCircle,
} from "react-icons/fa";
import { useNotificationStore } from "../../store/notificationStore";
import { useFriendStore } from "../../store/friendStore";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import "./NotificationsPanel.css";

function getNotifIcon(type) {
  if (type === "friend_request") return <FaUserPlus size={14} color="#0068FF" />;
  if (type === "friend_accepted") return <FaCheck size={14} color="#16a34a" />;
  if (type === "new_message") return <FaCommentDots size={14} color="#9333ea" />;
  if (type === "group_invite") return <FaUsers size={14} color="#f59e0b" />;
  if (type === "admin_warning") return <span style={{ fontSize: 14 }}>⚠️</span>;
  return <FaBell size={14} color="#6b7280" />;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return "";
  }
}

export default function NotificationsPanel({ onClose }) {
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications, isLoading, unreadCount,
    fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
  } = useNotificationStore();
  const { acceptRequest, rejectRequest } = useFriendStore();

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleClick = async (notif) => {
    if (!notif.isRead) await markAsRead(notif._id);
    if (notif.type === "new_message" && notif.data?.conversationId) {
      navigate("/chat");
      onClose();
    } else if (notif.type === "friend_request") {
      navigate("/contacts");
      onClose();
    }
  };

  const handleAcceptFriend = async (e, notif) => {
    e.stopPropagation();
    const requestId = notif.data?.requestId || notif.data?._id;
    if (!requestId) return;
    await acceptRequest(requestId);
    await markAsRead(notif._id);
    fetchNotifications(true);
  };

  const handleRejectFriend = async (e, notif) => {
    e.stopPropagation();
    const requestId = notif.data?.requestId || notif.data?._id;
    if (!requestId) return;
    await rejectRequest(requestId);
    await deleteNotification(notif._id);
  };

  return (
    <div className="notif-panel" ref={panelRef}>
      {/* Header */}
      <div className="np-header">
        <div className="np-title">
          <FaBell size={16} />
          <span>Thông báo</span>
          {unreadCount > 0 && <span className="np-badge">{unreadCount}</span>}
        </div>
        <div className="np-header-actions">
          {unreadCount > 0 && (
            <button className="np-read-all" onClick={markAllAsRead} title="Đánh dấu tất cả đã đọc">
              <FaCheckDouble size={13} /> Đọc tất cả
            </button>
          )}
          <button className="np-close" onClick={onClose}><FaTimes size={14} /></button>
        </div>
      </div>

      {/* Body */}
      <div className="np-body">
        {isLoading && notifications.length === 0 ? (
          <div className="np-loading"><FaSpinner className="spin" size={20} /></div>
        ) : notifications.length === 0 ? (
          <div className="np-empty">
            <FaBell size={36} />
            <p>Không có thông báo nào</p>
          </div>
        ) : (
          <div className="np-list">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`np-item ${!notif.isRead ? "unread" : ""}`}
                onClick={() => handleClick(notif)}
                style={notif.type === 'admin_warning' && !notif.isRead ? { borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.05)' } : {}}
              >
                <div className="np-icon-wrap">
                  {notif.type === 'admin_warning' ? (
                    <div className="np-avatar-placeholder" style={{ background: notif.data?.isBanned ? '#fef2f2' : '#fffbeb', fontSize: 20 }}>
                      {notif.data?.isBanned ? '🔒' : '⚠️'}
                    </div>
                  ) : notif.actor?.avatarUrl ? (
                    <img src={notif.actor.avatarUrl} className="np-avatar" alt="" />
                  ) : (
                    <div className="np-avatar-placeholder">
                      {notif.actor?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="np-type-icon">{getNotifIcon(notif.type)}</div>
                </div>

                <div className="np-content">
                  {notif.type === 'admin_warning' ? (
                    <>
                      <p className="np-text" style={{ fontWeight: 700, color: notif.data?.isBanned ? '#dc2626' : '#d97706' }}>
                        {notif.title}
                      </p>
                      <p className="np-text" style={{ fontWeight: 400, color: '#475569', marginTop: 2 }}>
                        {notif.body}
                      </p>
                    </>
                  ) : (
                    <p className="np-text">
                      <strong>{notif.actor?.username || "Ai đó"}</strong>{" "}
                      {notif.message || notif.body || "đã gửi thông báo"}
                    </p>
                  )}
                  <span className="np-time">{timeAgo(notif.createdAt)}</span>

                  {/* Friend request actions */}
                  {notif.type === "friend_request" && !notif.isRead && (
                    <div className="np-actions">
                      <button
                        className="np-btn accept"
                        onClick={(e) => handleAcceptFriend(e, notif)}
                      >
                        <FaCheck size={11} /> Chấp nhận
                      </button>
                      <button
                        className="np-btn reject"
                        onClick={(e) => handleRejectFriend(e, notif)}
                      >
                        <FaTimes size={11} /> Từ chối
                      </button>
                    </div>
                  )}
                </div>

                <div className="np-right">
                  {!notif.isRead && <FaCircle size={8} color="#0068FF" />}
                  <button
                    className="np-delete"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                    title="Xóa"
                  >
                    <FaTimes size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
