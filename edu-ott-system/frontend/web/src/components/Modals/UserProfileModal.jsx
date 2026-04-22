import { useState, useEffect, useRef } from "react";
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
  const { unfriend, blockFriend } = useFriendStore();

  const [status, setStatus] = useState(initialStatus || "none");
  const [actionLoading, setActionLoading] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [outgoingReqId, setOutgoingReqId] = useState(null);
  const [incomingReqId, setIncomingReqId] = useState(null);

  // Ref theo dõi user đã thực hiện action chưa
  // → ngăn checkRelationship ghi đè status sau khi user đã click
  const actionTakenRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    // Reset khi mở modal mới
    actionTakenRef.current = false;
    setOutgoingReqId(null);
    setIncomingReqId(null);

    const uid = String(user._id || user.id);
    let cancelled = false;

    const checkRelationship = async () => {
      try {
        const [outData, inData, friendData] = await Promise.all([
          friendService.getOutgoingRequests(),
          friendService.getIncomingRequests(),
          friendService.getFriendList(),
        ]);
        if (cancelled) return;

        // Merge store additively (không replace toàn bộ để tránh overwrite optimistic)
        const { friends: curFriends, outgoingRequests: curOut, incomingRequests: curIn } = useFriendStore.getState();

        const serverFriendIds = new Set((friendData?.items || []).map(f => String(f._id || f.id)));
        const mergedFriends = [
          ...(friendData?.items || []),
          ...curFriends.filter(f => !serverFriendIds.has(String(f._id || f.id))),
        ];

        const serverOut = outData?.items || [];
        const serverOutIds = new Set(serverOut.map(r => String(r.toUserId?._id || r.toUserId || '')));
        const mergedOut = [
          ...serverOut,
          ...curOut.filter(r => !serverOutIds.has(String(r.toUserId?._id || r.toUserId || ''))),
        ];

        const serverIn = inData?.items || [];
        const serverInIds = new Set(serverIn.map(r => String(r.fromUserId?._id || r.fromUserId || '')));
        const mergedIn = [
          ...serverIn,
          ...curIn.filter(r => !serverInIds.has(String(r.fromUserId?._id || r.fromUserId || ''))),
        ];

        useFriendStore.setState({ friends: mergedFriends, outgoingRequests: mergedOut, incomingRequests: mergedIn });

        // ⚠️ Nếu user đã thực hiện action (gửi/hủy/chấp nhận) thì KHÔNG ghi đè status
        if (actionTakenRef.current) return;

        const isFriend = (friendData?.items || []).some(f => String(f._id || f.id) === uid);
        if (isFriend) { setStatus("friend"); return; }

        // Tìm trong kết quả từ server VÀ current store (đã merge)
        const outReq = mergedOut.find(r => String(r.toUserId?._id || r.toUserId || "") === uid);
        if (outReq) { setStatus("outgoing"); setOutgoingReqId(String(outReq._id)); return; }

        const inReq = mergedIn.find(r => String(r.fromUserId?._id || r.fromUserId || "") === uid);
        if (inReq) { setStatus("incoming"); setIncomingReqId(String(inReq._id)); return; }

        setStatus("none");
      } catch {
        if (!actionTakenRef.current) setStatus(initialStatus || "none");
      }
    };

    checkRelationship();
    return () => { cancelled = true; };
  }, [isOpen, user?._id, user?.id]);

  if (!isOpen || !user) return null;

  const uid = String(user._id || user.id);

  // ─── Handlers ───────────────────────────────────────────────
  const handleChat = async () => {
    setChatLoading(true);
    try {
      const res = await api.post("/conversations", { type: "direct", participantIds: [uid] });
      const conv = res.data.data;
      onClose();
      onChatOpened?.();
      navigate(`/chat/${conv._id}`, { state: { newConversation: conv } });
    } catch {
    } finally { setChatLoading(false); }
  };

  const handleSendRequest = async () => {
    setActionLoading("add");
    actionTakenRef.current = true; // mark TRƯỚC khi async để tránh race
    try {
      const res = await friendService.sendFriendRequest(uid);
      setStatus("outgoing");

      const reqId = res?._id || String(Date.now());
      setOutgoingReqId(reqId);

      // Optimistic update store → ChatHeader & ChatPage banner phản ánh ngay
      useFriendStore.setState(prev => ({
        outgoingRequests: [
          ...prev.outgoingRequests.filter(r => String(r.toUserId?._id || r.toUserId || "") !== uid),
          { _id: reqId, toUserId: { _id: uid } },
        ],
      }));

      onStatusChange?.("outgoing");
    } catch (e) {
      actionTakenRef.current = false; // thất bại → cho phép checkRelationship tiếp tục
      const code = e?.response?.data?.error?.code;
      if (code === "ALREADY_FRIENDS") { setStatus("friend"); onStatusChange?.("friend"); }
      else if (code === "REVERSE_REQUEST_EXISTS") { setStatus("incoming"); onStatusChange?.("incoming"); }
    } finally { setActionLoading(null); }
  };

  const handleCancelRequest = async () => {
    if (!outgoingReqId) return;
    setActionLoading("cancel");
    actionTakenRef.current = true;
    try {
      await friendService.cancelFriendRequest(outgoingReqId);
      setStatus("none");
      setOutgoingReqId(null);
      useFriendStore.setState(prev => ({
        outgoingRequests: prev.outgoingRequests.filter(
          r => String(r.toUserId?._id || r.toUserId || "") !== uid
        ),
      }));
      onStatusChange?.("none");
    } catch {
      actionTakenRef.current = false;
    } finally { setActionLoading(null); }
  };

  const handleAccept = async () => {
    if (!incomingReqId) return;
    setActionLoading("accept");
    actionTakenRef.current = true;
    try {
      const { acceptRequest } = useFriendStore.getState();
      await acceptRequest(incomingReqId);
      setStatus("friend");
      setIncomingReqId(null);
      onStatusChange?.("friend");
    } catch {
      actionTakenRef.current = false;
    } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!incomingReqId) return;
    setActionLoading("reject");
    actionTakenRef.current = true;
    try {
      const { rejectRequest } = useFriendStore.getState();
      await rejectRequest(incomingReqId);
      setStatus("none");
      setIncomingReqId(null);
      onStatusChange?.("none");
    } catch {
      actionTakenRef.current = false;
    } finally { setActionLoading(null); }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Xóa ${user.username} khỏi danh sách bạn bè?`)) return;
    setActionLoading("unfriend");
    actionTakenRef.current = true;
    try {
      await unfriend(uid);
      setStatus("none");
      onStatusChange?.("none");
      onClose();
    } catch {
      actionTakenRef.current = false;
    } finally { setActionLoading(null); }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Chặn ${user.username}? Người này sẽ không thể liên lạc với bạn.`)) return;
    setActionLoading("block");
    actionTakenRef.current = true;
    try {
      await blockFriend(uid);
      onClose();
    } catch {
      actionTakenRef.current = false;
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
          <div className="upm-name">{user.username || "Người dùng"}</div>
          {!isFriend && user.phone && <div className="upm-sub">{user.phone}</div>}
          {!isFriend && !user.phone && user.email && <div className="upm-sub">{user.email}</div>}

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

          <div className="upm-section">
            <div className="upm-section-title">Nhóm chung</div>
            <div className="upm-info-row">
              <FaUsers size={14} style={{ color: "var(--text-tertiary)", marginRight: 8 }} />
              <span className="upm-muted">Chưa có nhóm chung</span>
            </div>
          </div>

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
