import { useState, useEffect, useRef, useMemo } from "react";
import {
  FaTimes, FaCommentDots, FaPhoneAlt, FaVideo,
  FaUserPlus, FaUserMinus, FaBan, FaFlag, FaShareAlt,
  FaCheck, FaSpinner, FaUsers, FaChevronRight,
} from "react-icons/fa";
import { friendService } from "../../services/friendService";
import { useFriendStore } from "../../store/friendStore";
import { blockService } from "../../services/blockService";
import api from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "./UserProfileModal.css";

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23bdbdbd'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23fff'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='9' fill='%23fff'/%3E%3C/svg%3E";

export default function UserProfileModal({ isOpen, onClose, user, status: initialStatus, onStatusChange, onChatOpened }) {
  const navigate = useNavigate();
  const { 
    unfriend, 
    blockedUsers, 
    blockFriend: blockFriendStore, 
    unblockUser: unblockUserStore, 
    fetchBlockedUsers,
    friends: storeFriends,
    outgoingRequests: storeOut,
    incomingRequests: storeIn,
  } = useFriendStore();

  const [status, setStatus] = useState(initialStatus || "none");
  const [actionLoading, setActionLoading] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [outgoingReqId, setOutgoingReqId] = useState(null);
  const [incomingReqId, setIncomingReqId] = useState(null);

  const isBlockedByMe = useMemo(() => {
    if (!user) return false;
    const uid = String(user._id || user.id);
    return blockedUsers.some(u => String(u._id || u.id || '') === uid);
  }, [user, blockedUsers]);

  // Ref để tránh checkRelationship ghi đè status sau khi user đã click
  const actionTakenRef = useRef(false);

  // FIX: Đồng bộ status từ Zustand store theo thời gian thực
  // Khi user mở lại modal, status luôn phản ánh đúng trạng thái trong store
  const targetUid = user ? String(user._id || user.id) : null;
  useEffect(() => {
    if (!targetUid || !isOpen) return;
    const isFriend = storeFriends.some(f => String(f._id || f.id) === targetUid);
    const outReq = storeOut.find(r => String(r.toUserId?._id || r.toUserId || '') === targetUid);
    const inReq  = storeIn.find(r => String(r.fromUserId?._id || r.fromUserId || '') === targetUid);
    if (isFriend)      { setStatus('friend');   return; }
    if (outReq)        { setStatus('outgoing');  setOutgoingReqId(outReq._id ? String(outReq._id) : null); return; }
    if (inReq)         { setStatus('incoming');  setIncomingReqId(inReq._id  ? String(inReq._id)  : null); return; }
  }, [targetUid, isOpen, storeFriends, storeOut, storeIn]);

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

        // Kiểm tra blocked
        if (blockedUsers.length === 0) {
          await fetchBlockedUsers();
        }

        // FIX: KHÔNG ghi đè Zustand store ở đây — tránh race condition
        // Store đã được cập nhật bởi handleSendRequest (optimistic) và fetchOutgoingRequests khác
        // Chỉ dùng kết quả API để set local status

        if (actionTakenRef.current) return;

        const isFriend = (friendData?.items || []).some(f => String(f._id || f.id) === uid);
        if (isFriend) { setStatus("friend"); return; }

        const serverOut = outData?.items || [];
        const outReq = serverOut.find(r => String(r.toUserId?._id || r.toUserId?.id || r.toUserId || r.to?._id || r.to?.id || r.to || "") === uid);
        if (outReq) { setStatus("outgoing"); setOutgoingReqId(String(outReq._id)); return; }

        const serverIn = inData?.items || [];
        const inReq = serverIn.find(r => String(r.fromUserId?._id || r.fromUserId?.id || r.fromUserId || r.from?._id || r.from?.id || r.from || "") === uid);
        if (inReq) { setStatus("incoming"); setIncomingReqId(String(inReq._id)); return; }

        // FIX: Trước khi đặt 'none', kiểm tra lại live store
        // (có thể handleSendRequest đã optimistic update nhưng API chưa phản ánh)
        const { outgoingRequests: liveOut, incomingRequests: liveIn, friends: liveFriends } = useFriendStore.getState();
        const liveIsFriend = liveFriends.some(f => String(f._id || f.id) === uid);
        const liveOutgoing = liveOut.some(r => String(r.toUserId?._id || r.toUserId?.id || r.toUserId || r.to?._id || r.to?.id || r.to || '') === uid);
        const liveIncoming = liveIn.some(r => String(r.fromUserId?._id || r.fromUserId?.id || r.fromUserId || r.from?._id || r.from?.id || r.from || '') === uid);
        if (liveIsFriend)  { setStatus("friend");   return; }
        if (liveOutgoing)  { setStatus("outgoing");  return; }
        if (liveIncoming)  { setStatus("incoming");  return; }
        // Chỉ set 'none' khi cả API lẫn store đều không có quan hệ
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
    actionTakenRef.current = true;
    try {
      const res = await friendService.sendFriendRequest(uid);
      setStatus("outgoing");
      const reqId = res?._id || String(Date.now());
      setOutgoingReqId(reqId);
      useFriendStore.setState(prev => ({
        outgoingRequests: [
          ...prev.outgoingRequests.filter(r => String(r.toUserId?._id || r.toUserId || "") !== uid),
          { _id: reqId, toUserId: { _id: uid } },
        ],
      }));
      onStatusChange?.("outgoing");
    } catch (e) {
      actionTakenRef.current = false;
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

  // ── Block / Unblock ──────────────────────────────────────────
  const handleBlock = async () => {
    if (!window.confirm(`Chặn ${user.username}? Người này sẽ không thể liên lạc với bạn.`)) return;
    setActionLoading("block");
    actionTakenRef.current = true;
    try {
      const res = await blockFriendStore(uid);
      if (res.success) {
        setStatus("none");
      } else {
        alert(res.error || "Chặn người dùng thất bại");
      }
    } catch {
      actionTakenRef.current = false;
    } finally { setActionLoading(null); }
  };

  const handleUnblock = async () => {
    setActionLoading("unblock");
    try {
      const res = await unblockUserStore(uid);
      if (!res.success) {
        alert(res.error || "Không thể bỏ chặn. Thử lại sau.");
      }
    } catch {
      alert("Không thể bỏ chặn. Thử lại sau.");
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

            {/* Chặn / Bỏ chặn — tự động phát hiện trạng thái */}
            {isBlockedByMe ? (
              <button
                className="upm-list-item"
                onClick={handleUnblock}
                disabled={actionLoading === "unblock"}
                style={{ color: "#ef4444" }}
              >
                <FaBan size={15} className="upm-list-icon" style={{ color: "#ef4444" }} />
                <span style={{ flex: 1, color: "#ef4444", fontWeight: 600 }}>
                  Bỏ chặn {user.username}
                </span>
                {actionLoading === "unblock"
                  ? <FaSpinner className="spin" size={12} />
                  : <FaChevronRight size={12} className="upm-list-chevron" />
                }
              </button>
            ) : (
              <button
                className="upm-list-item"
                onClick={handleBlock}
                disabled={actionLoading === "block"}
              >
                <FaBan size={15} className="upm-list-icon" />
                <span>Chặn tin nhắn và cuộc gọi</span>
                {actionLoading === "block"
                  ? <FaSpinner className="spin" size={12} />
                  : <FaChevronRight size={12} className="upm-list-chevron" />
                }
              </button>
            )}

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
