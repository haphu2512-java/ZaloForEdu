import { useState, useEffect } from "react";
import {
  FaTimes, FaCommentDots, FaPhoneAlt, FaVideo,
  FaUserPlus, FaUserMinus, FaBan, FaFlag, FaShareAlt,
  FaCheck, FaSpinner, FaUsers, FaChevronRight,
} from "react-icons/fa";
import { friendService } from "../../services/friendService";
import { useFriendStore } from "../../store/friendStore";
import api from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "./UserProfileModal.css";

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23bdbdbd'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23fff'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='9' fill='%23fff'/%3E%3C/svg%3E";

export default function UserProfileModal({ isOpen, onClose, user, status: initialStatus, onStatusChange, onChatOpened }) {
  const navigate = useNavigate();
  const { fetchFriends, fetchOutgoingRequests, fetchIncomingRequests, unfriend, blockFriend, outgoingRequests, incomingRequests, friends } = useFriendStore();

  const [status, setStatus] = useState(initialStatus || "none");
  const [actionLoading, setActionLoading] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Sync status từ store mỗi khi modal mở — tránh state bị reset về "none"
  useEffect(() => {
    if (!isOpen || !user) return;
    const uid = String(user._id || user.id);

    // Kiểm tra đã là bạn bè chưa
    const isFriend = friends?.some(f => String(f._id || f.id || f) === uid);
    if (isFriend) { setStatus("friend"); return; }

    // Kiểm tra đã gửi lời mời chưa
    const hasOutgoing = outgoingRequests?.some(
      r => String(r.toUserId?._id || r.toUserId || "") === uid
    );
    if (hasOutgoing) { setStatus("outgoing"); return; }

    // Kiểm tra có lời mời đến không
    const hasIncoming = incomingRequests?.some(
      r => String(r.fromUserId?._id || r.fromUserId || "") === uid
    );
    if (hasIncoming) { setStatus("incoming"); return; }

    // Không có quan hệ
    setStatus(initialStatus || "none");
  }, [isOpen, user?._id, user?.id, outgoingRequests, incomingRequests, friends]);


  if (!isOpen || !user) return null;

  const uid = String(user._id || user.id);

  const getOutgoingRequestId = () => {
    const req = outgoingRequests.find(r => String(r.toUserId?._id || r.toUserId || "") === uid);
    return req?._id;
  };

  const getIncomingRequestId = () => {
    const req = incomingRequests.find(r => String(r.fromUserId?._id || r.fromUserId || "") === uid);
    return req?._id;
  };

  const handleChat = async () => {
    setChatLoading(true);
    try {
      // Kiểm tra conversation đã tồn tại chưa
      const res = await api.post("/conversations", {
        type: "direct",
        participantIds: [uid],
      });
      const conv = res.data.data;
      onClose();
      onChatOpened?.();
      navigate(`/chat/${conv._id}`, { state: { newConversation: conv } });
    } catch {
    } finally { setChatLoading(false); }
  };

  const handleSendRequest = async () => {
    setActionLoading("add");
    try {
      const res = await friendService.sendFriendRequest(uid);
      setStatus("outgoing");

      // Optimistic update: thêm vào store ngay lập tức (không chờ fetch)
      const newReq = res?.data?.data || res?.data || { _id: Date.now(), toUserId: { _id: uid } };
      useFriendStore.setState(prev => ({
        outgoingRequests: [
          ...prev.outgoingRequests.filter(
            r => String(r.toUserId?._id || r.toUserId || "") !== uid
          ),
          newReq,
        ],
      }));
      fetchOutgoingRequests(); // background refresh để lấy real data
      onStatusChange?.("outgoing");
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      if (code === "ALREADY_FRIENDS") { setStatus("friend"); onStatusChange?.("friend"); }
      else if (code === "REVERSE_REQUEST_EXISTS") { setStatus("incoming"); onStatusChange?.("incoming"); }
    } finally { setActionLoading(null); }
  };

  const handleCancelRequest = async () => {
    const requestId = getOutgoingRequestId();
    if (!requestId) return;
    setActionLoading("cancel");
    try {
      await friendService.cancelFriendRequest(requestId);
      setStatus("none");
      fetchOutgoingRequests();
      onStatusChange?.("none");
    } finally { setActionLoading(null); }
  };

  const handleAccept = async () => {
    const requestId = getIncomingRequestId();
    if (!requestId) return;
    setActionLoading("accept");
    try {
      const { acceptRequest } = useFriendStore.getState();
      await acceptRequest(requestId);
      setStatus("friend");
      fetchFriends();
      onStatusChange?.("friend");
    } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    const requestId = getIncomingRequestId();
    if (!requestId) return;
    setActionLoading("reject");
    try {
      const { rejectRequest } = useFriendStore.getState();
      await rejectRequest(requestId);
      setStatus("none");
      fetchIncomingRequests();
      onStatusChange?.("none");
    } finally { setActionLoading(null); }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Xóa ${user.username} khỏi danh sách bạn bè?`)) return;
    setActionLoading("unfriend");
    try {
      await unfriend(uid);
      setStatus("none");
      fetchFriends();
      onStatusChange?.("none");
      onClose();
    } finally { setActionLoading(null); }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Chặn ${user.username}? Người này sẽ không thể liên lạc với bạn.`)) return;
    setActionLoading("block");
    try {
      await blockFriend(uid);
      onClose();
    } finally { setActionLoading(null); }
  };

  const isFriend = status === "friend";

  return (
    <div className="upm-overlay" onClick={onClose}>
      <div className="upm-modal" onClick={e => e.stopPropagation()}>
        {/* Cover + Avatar */}
        <div className="upm-cover">
          <button className="upm-close-btn" onClick={onClose}>
            <FaTimes size={15} />
          </button>
        </div>
        <div className="upm-avatar-wrap">
          <img
            src={user.avatarUrl || DEFAULT_AVATAR}
            alt=""
            className="upm-avatar"
            onError={e => { e.target.src = DEFAULT_AVATAR; }}
          />
        </div>

        <div className="upm-body">
          {/* Name */}
          <div className="upm-name">{user.username || "Người dùng"}</div>
          {!isFriend && user.phone && (
            <div className="upm-sub">{user.phone}</div>
          )}
          {!isFriend && !user.phone && user.email && (
            <div className="upm-sub">{user.email}</div>
          )}

          {/* Action buttons */}
          <div className="upm-actions">
            {isFriend ? (
              <>
                <button className="upm-action-btn primary" onClick={handleChat} disabled={chatLoading}>
                  <div className="upm-action-icon">
                    {chatLoading ? <FaSpinner className="spin" size={18} /> : <FaCommentDots size={18} />}
                  </div>
                  <span>Nhắn tin</span>
                </button>
                <button className="upm-action-btn secondary" onClick={() => {}}>
                  <div className="upm-action-icon"><FaPhoneAlt size={18} /></div>
                  <span>Gọi thoại</span>
                </button>
                <button className="upm-action-btn secondary" onClick={() => {}}>
                  <div className="upm-action-icon"><FaVideo size={18} /></div>
                  <span>Video</span>
                </button>
              </>
            ) : status === "outgoing" ? (
              <>
                <button className="upm-action-btn cancel" onClick={handleCancelRequest} disabled={actionLoading === "cancel"}>
                  <div className="upm-action-icon">
                    {actionLoading === "cancel" ? <FaSpinner className="spin" size={18} /> : <FaTimes size={18} />}
                  </div>
                  <span>Hủy lời mời</span>
                </button>
                <button className="upm-action-btn secondary" onClick={handleChat} disabled={chatLoading}>
                  <div className="upm-action-icon">
                    {chatLoading ? <FaSpinner className="spin" size={18} /> : <FaCommentDots size={18} />}
                  </div>
                  <span>Nhắn tin</span>
                </button>
              </>
            ) : status === "incoming" ? (
              <>
                <button className="upm-action-btn primary" onClick={handleAccept} disabled={actionLoading === "accept"}>
                  <div className="upm-action-icon">
                    {actionLoading === "accept" ? <FaSpinner className="spin" size={18} /> : <FaCheck size={18} />}
                  </div>
                  <span>Chấp nhận</span>
                </button>
                <button className="upm-action-btn secondary" onClick={handleReject} disabled={actionLoading === "reject"}>
                  <div className="upm-action-icon">
                    {actionLoading === "reject" ? <FaSpinner className="spin" size={18} /> : <FaTimes size={18} />}
                  </div>
                  <span>Từ chối</span>
                </button>
                <button className="upm-action-btn secondary" onClick={handleChat} disabled={chatLoading}>
                  <div className="upm-action-icon">
                    {chatLoading ? <FaSpinner className="spin" size={18} /> : <FaCommentDots size={18} />}
                  </div>
                  <span>Nhắn tin</span>
                </button>
              </>
            ) : (
              <>
                <button className="upm-action-btn primary" onClick={handleSendRequest} disabled={actionLoading === "add"}>
                  <div className="upm-action-icon">
                    {actionLoading === "add" ? <FaSpinner className="spin" size={18} /> : <FaUserPlus size={18} />}
                  </div>
                  <span>Kết bạn</span>
                </button>
                <button className="upm-action-btn secondary" onClick={handleChat} disabled={chatLoading}>
                  <div className="upm-action-icon">
                    {chatLoading ? <FaSpinner className="spin" size={18} /> : <FaCommentDots size={18} />}
                  </div>
                  <span>Nhắn tin</span>
                </button>
              </>
            )}
          </div>

          {/* Personal info — friend only */}
          {isFriend && (
            <div className="upm-section">
              <div className="upm-section-title">Thông tin cá nhân</div>
              {user.phone && (
                <div className="upm-info-row">
                  <span className="upm-info-label">Điện thoại</span>
                  <span className="upm-info-value">{user.phone}</span>
                </div>
              )}
              {user.email && (
                <div className="upm-info-row">
                  <span className="upm-info-label">Email</span>
                  <span className="upm-info-value">{user.email}</span>
                </div>
              )}
              {!user.phone && !user.email && (
                <div className="upm-info-row">
                  <span className="upm-info-value upm-muted">Chưa cập nhật</span>
                </div>
              )}
            </div>
          )}

          {/* Nhóm chung */}
          <div className="upm-section">
            <div className="upm-section-title">Nhóm chung</div>
            <div className="upm-info-row">
              <FaUsers size={14} style={{ color: "var(--text-tertiary)", marginRight: 8 }} />
              <span className="upm-muted">Chưa có nhóm chung</span>
            </div>
          </div>

          {/* Action list */}
          <div className="upm-action-list">
            {isFriend && (
              <button className="upm-list-item">
                <FaShareAlt size={15} className="upm-list-icon" />
                <span>Chia sẻ danh thiếp</span>
                <FaChevronRight size={12} className="upm-list-chevron" />
              </button>
            )}
            <button className="upm-list-item" onClick={handleBlock} disabled={actionLoading === "block"}>
              <FaBan size={15} className="upm-list-icon" />
              <span>Chặn tin nhắn và cuộc gọi</span>
              <FaChevronRight size={12} className="upm-list-chevron" />
            </button>
            <button className="upm-list-item">
              <FaFlag size={15} className="upm-list-icon" />
              <span>Báo xấu</span>
              <FaChevronRight size={12} className="upm-list-chevron" />
            </button>
            {isFriend && (
              <button className="upm-list-item danger" onClick={handleUnfriend} disabled={actionLoading === "unfriend"}>
                <FaUserMinus size={15} className="upm-list-icon" />
                <span>Xóa khỏi danh sách bạn bè</span>
                {actionLoading === "unfriend" && <FaSpinner className="spin" size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
