import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FaUserFriends, FaUsers, FaUserCheck, FaUserPlus, FaSearch,
  FaEllipsisH, FaSpinner, FaInfoCircle, FaBan, FaTrashAlt,
  FaCommentDots, FaUserClock, FaChevronRight, FaCheck, FaTimes,
  FaUserTag, FaEdit, FaPhoneAlt, FaVideo,
} from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFriendStore } from "../../store/friendStore";
import { useChatStore } from "../../store/chatStore";
import { useNavigate } from "react-router-dom";
import AddFriendModal from "../../components/Modals/AddFriendModal";
import { socketService } from "../../services/socketService";
import { useAuthStore } from "../../store/authStore";
import "./ContactsPage.css";

// ── Avatar helper ────────────────────────────────────────────
function Avatar({ user, size = 48 }) {
  const name = user?.username || user?.email || "?";
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} className="cp-avatar" style={{ width: size, height: size }} alt="" />;
  }
  const colors = ["#0068FF","#9333ea","#16a34a","#f59e0b","#ef4444","#06b6d4"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div className="cp-avatar cp-avatar-placeholder" style={{ width: size, height: size, background: bg }}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Friend context menu ──────────────────────────────────────
function FriendMenu({ friend, onAction, onClose }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="cp-context-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <div className="cm-item" onClick={() => onAction("chat", friend)}>
        <FaCommentDots size={13} /> Nhắn tin
      </div>
      <div className="cm-item" onClick={() => onAction("audio", friend)}>
        <FaPhoneAlt size={13} /> Gọi thoại
      </div>
      <div className="cm-item" onClick={() => onAction("video", friend)}>
        <FaVideo size={13} /> Gọi video
      </div>
      <div className="cm-item" onClick={() => onAction("info", friend)}>
        <FaInfoCircle size={13} /> Xem thông tin
      </div>
      <div className="cm-item" onClick={() => onAction("nickname", friend)}>
        <FaEdit size={13} /> Đặt tên gợi nhớ
      </div>
      <div className="cm-item" onClick={() => onAction("label", friend)}>
        <FaUserTag size={13} /> Phân loại bạn bè
      </div>
      <div className="cm-divider" />
      <div className="cm-item danger" onClick={() => onAction("block", friend)}>
        <FaBan size={13} /> Chặn người này
      </div>
      <div className="cm-item danger" onClick={() => onAction("unfriend", friend)}>
        <FaTrashAlt size={13} /> Xóa bạn bè
      </div>
    </div>
  );
}

// ── Friend detail panel ──────────────────────────────────────
// Đã thêm sự kiện onAudioCall vào props
function FriendDetailPanel({ friend, onClose, onChat, onBlock, onUnfriend, onVideoCall, onAudioCall }) {
  if (!friend) return null;
  return (
    <div className="friend-detail-panel">
      <div className="fdp-header">
        <button className="fdp-close" onClick={onClose}><FaTimes size={14} /></button>
      </div>
      <div className="fdp-body">
        <div className="fdp-cover" />
        <div className="fdp-avatar-wrap">
          <Avatar user={friend} size={80} />
          <div className="fdp-online-dot" />
        </div>
        <h3 className="fdp-name">{friend.username}</h3>
        <p className="fdp-sub">{friend.email || friend.phone || "Không có thông tin"}</p>

        <div className="fdp-actions">
          <button className="fdp-btn primary" onClick={() => onChat(friend)}>
            <FaCommentDots size={14} /> Nhắn tin
          </button>
          {/* Đã thêm sự kiện onClick cho gọi thoại */}
          <button className="fdp-btn secondary" onClick={() => onAudioCall(friend)}>
            <FaPhoneAlt size={14} /> Gọi thoại
          </button>
          {/* Sự kiện onClick cho gọi video */}
          <button className="fdp-btn secondary" onClick={() => onVideoCall(friend)}>
            <FaVideo size={14} /> Video
          </button>
        </div>

        <div className="fdp-info-section">
          <div className="fdp-info-row">
            <span className="fdp-label">Tên người dùng</span>
            <span className="fdp-value">{friend.username}</span>
          </div>
          {friend.email && (
            <div className="fdp-info-row">
              <span className="fdp-label">Email</span>
              <span className="fdp-value">{friend.email}</span>
            </div>
          )}
          {friend.phone && (
            <div className="fdp-info-row">
              <span className="fdp-label">Số điện thoại</span>
              <span className="fdp-value">{friend.phone}</span>
            </div>
          )}
        </div>

        <div className="fdp-danger-zone">
          <button className="fdp-danger-btn" onClick={() => onBlock(friend)}>
            <FaBan size={13} /> Chặn người này
          </button>
          <button className="fdp-danger-btn" onClick={() => onUnfriend(friend)}>
            <FaTrashAlt size={13} /> Xóa bạn bè
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function ContactsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [sortBy, setSortBy] = useState("name");

  const {
    friends, incomingRequests, outgoingRequests, isLoading,
    fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
    unfriend, blockFriend, acceptRequest, rejectRequest,
  } = useFriendStore();

  const { setActiveRoom } = useChatStore();

  useEffect(() => {
    fetchFriends();
    fetchIncomingRequests();
    fetchOutgoingRequests();
  }, []);

  // Alphabetical grouping
  const groupedFriends = useMemo(() => {
    if (activeTab !== "friends") return {};
    const filtered = friends.filter((f) =>
      (f.username || f.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") return (a.username || "").localeCompare(b.username || "", "vi");
      return 0;
    });
    const groups = {};
    sorted.forEach((f) => {
      const name = f.username || f.email || "?";
      const key = /^[A-Z]$/i.test(name[0]) ? name[0].toUpperCase() : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
    const result = {};
    sortedKeys.forEach((k) => (result[k] = groups[k]));
    return result;
  }, [friends, searchQuery, activeTab, sortBy]);

  const handleAction = useCallback(async (action, friend) => {
    setOpenMenuId(null);
    const id = friend._id || friend.id;
    if (action === "chat") {
      navigate("/chat");
    } else if (action === "info") {
      setSelectedFriend(friend);
    } else if (action === "video" || action === "audio") {
      // Lấy user mới nhất từ store tại thời điểm gọi
      const currentUser = useAuthStore.getState().user;
      const myId = currentUser?._id || currentUser?.id;
      if (!myId) {
        alert("Không tìm thấy thông tin người dùng, vui lòng đăng nhập lại.");
        return;
      }

      const roomId = [myId, id].sort().join('_');
      const callType = action === "video" ? "video" : "audio";

      // Emit signal đến B qua socket
      const sent = socketService.callUser({
        targetUserId: id,
        roomId,
        callerName: currentUser?.username || "Bạn",
        type: callType,
      });

      if (!sent) {
        alert("Mất kết nối socket, vui lòng thử lại.");
        return;
      }

      // A vào room sau khi đã emit signal
      const url = callType === "audio" ? `/call/${roomId}?type=voice` : `/call/${roomId}`;
      navigate(url);
    } else if (action === "unfriend") {
      if (window.confirm(`Xóa ${friend.username} khỏi danh sách bạn bè?`)) {
        await unfriend(id);
        if (selectedFriend?._id === id) setSelectedFriend(null);
      }
    } else if (action === "block") {
      if (window.confirm(`Chặn ${friend.username}? Người này sẽ không thể liên lạc với bạn.`)) {
        await blockFriend(id);
        if (selectedFriend?._id === id) setSelectedFriend(null);
      }
    }
  }, [navigate, unfriend, blockFriend, selectedFriend, user]);

  const TABS = [
    { key: "friends", label: "Bạn bè", icon: FaUserFriends, count: friends.length },
    { key: "groups", label: "Nhóm", icon: FaUsers, count: 0 },
    { key: "requests", label: "Lời mời", icon: FaUserCheck, count: incomingRequests.length },
    { key: "sent", label: "Đã gửi", icon: FaUserClock, count: outgoingRequests.length },
  ];

  return (
    <div className="contacts-page">
      {/* ── LEFT SIDEBAR ── */}
      <div className="contacts-sidebar">
        <div className="cs-header">
          <span className="cs-title">Danh bạ</span>
          <button className="cs-add-btn" onClick={() => setShowAddFriend(true)} title="Thêm bạn">
            <FaUserPlus size={16} />
          </button>
        </div>

        <div className="cs-search">
          <FaSearch size={13} color="var(--text-tertiary)" />
          <input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="cs-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`cs-nav-item ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => { setActiveTab(tab.key); setSelectedFriend(null); }}
            >
              <div className="cs-nav-icon"><tab.icon size={17} /></div>
              <span className="cs-nav-label">{tab.label}</span>
              {tab.count > 0 && <span className="cs-nav-badge">{tab.count}</span>}
              <FaChevronRight size={10} className="cs-nav-arrow" />
            </button>
          ))}
        </nav>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="contacts-main">
        {/* Header */}
        <div className="contacts-header">
          <div className="ch-info">
            <h2 className="ch-title">
              {activeTab === "friends" && `Bạn bè (${friends.length})`}
              {activeTab === "groups" && "Nhóm và cộng đồng"}
              {activeTab === "requests" && `Lời mời kết bạn (${incomingRequests.length})`}
              {activeTab === "sent" && `Lời mời đã gửi (${outgoingRequests.length})`}
            </h2>
          </div>
          {activeTab === "friends" && (
            <div className="ch-controls">
              <div className="ch-search">
                <FaSearch size={12} color="var(--text-tertiary)" />
                <input
                  placeholder="Tìm bạn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="ch-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Tên (A-Z)</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="contacts-scroll">
          {isLoading && friends.length === 0 ? (
            <div className="cp-loading"><FaSpinner className="spin" size={28} /></div>
          ) : activeTab === "friends" ? (
            <FriendsTab
              groupedFriends={groupedFriends}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onAction={handleAction}
              onSelect={setSelectedFriend}
              selectedId={selectedFriend?._id}
            />
          ) : activeTab === "requests" ? (
            <RequestsTab
              requests={incomingRequests}
              onAccept={acceptRequest}
              onReject={rejectRequest}
              onRefresh={() => { fetchIncomingRequests(); fetchFriends(); }}
            />
          ) : activeTab === "sent" ? (
            <SentRequestsTab requests={outgoingRequests} onRefresh={fetchOutgoingRequests} />
          ) : (
            <div className="cp-empty">
              <FaUsers size={48} />
              <h3>Tính năng đang phát triển</h3>
              <p>Nhóm và cộng đồng sẽ sớm ra mắt.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selectedFriend && (
        <FriendDetailPanel
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onChat={(f) => { navigate("/chat"); setSelectedFriend(null); }}
          onBlock={(f) => handleAction("block", f)}
          onUnfriend={(f) => handleAction("unfriend", f)}
          onVideoCall={(f) => handleAction("video", f)}
          onAudioCall={(f) => handleAction("audio", f)} /* Truyền sự kiện từ main component xuống panel */
        />
      )}

      <AddFriendModal isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </div>
  );
}

// ── Friends Tab ──────────────────────────────────────────────
function FriendsTab({ groupedFriends, openMenuId, setOpenMenuId, onAction, onSelect, selectedId }) {
  if (Object.keys(groupedFriends).length === 0) {
    return (
      <div className="cp-empty">
        <img src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png" alt="" className="cp-illustration" />
        <h3>Chưa có bạn bè</h3>
        <p>Tìm kiếm và kết bạn để bắt đầu trò chuyện.</p>
      </div>
    );
  }

  return (
    <div className="friends-list">
      {Object.entries(groupedFriends).map(([letter, list]) => (
        <div key={letter} className="alpha-group">
          <div className="alpha-letter">{letter}</div>
          {list.map((friend) => {
            const fid = friend._id || friend.id;
            return (
              <div
                key={fid}
                className={`friend-row ${selectedId === fid ? "selected" : ""}`}
                onClick={() => onSelect(friend)}
              >
                <div className="fr-avatar-wrap">
                  <Avatar user={friend} size={44} />
                  <div className="fr-online" />
                </div>
                <div className="fr-info">
                  <span className="fr-name">{friend.username}</span>
                  <span className="fr-sub">{friend.email || friend.phone || ""}</span>
                </div>
                <div className="fr-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="fr-chat-btn"
                    onClick={() => onAction("chat", friend)}
                    title="Nhắn tin"
                  >
                    <FaCommentDots size={14} />
                  </button>
                  <button
                    className="fr-chat-btn"
                    style={{ marginLeft: '6px' }}
                    onClick={() => onAction("video", friend)}
                    title="Gọi video"
                  >
                    <FaVideo size={14} />
                  </button>
                  <div className="fr-menu-wrap">
                    <button
                      className="fr-more-btn"
                      onClick={() => setOpenMenuId(openMenuId === fid ? null : fid)}
                    >
                      <FaEllipsisH size={13} />
                    </button>
                    {openMenuId === fid && (
                      <FriendMenu
                        friend={friend}
                        onAction={onAction}
                        onClose={() => setOpenMenuId(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Requests Tab ─────────────────────────────────────────────
function RequestsTab({ requests, onAccept, onReject, onRefresh }) {
  const [processingId, setProcessingId] = useState(null);

  const handle = async (action, req) => {
    const id = req._id || req.id;
    setProcessingId(id);
    try {
      if (action === "accept") await onAccept(id);
      else await onReject(id);
      onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="cp-empty">
        <FaUserCheck size={48} />
        <h3>Không có lời mời nào</h3>
        <p>Khi có người gửi lời mời kết bạn, sẽ hiển thị ở đây.</p>
      </div>
    );
  }

  return (
    <div className="requests-list">
      {requests.map((req) => {
        const id = req._id || req.id;
        const sender = req.fromUserId || req.from || {};
        return (
          <div key={id} className="request-card">
            <Avatar user={sender} size={52} />
            <div className="rc-info">
              <span className="rc-name">{sender.username || "Người dùng"}</span>
              <span className="rc-msg">{req.message || "Xin chào, kết bạn nhé!"}</span>
              <span className="rc-time">{req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi") : ""}</span>
            </div>
            <div className="rc-actions">
              <button
                className="rc-btn accept"
                onClick={() => handle("accept", req)}
                disabled={processingId === id}
              >
                {processingId === id ? <FaSpinner className="spin" size={12} /> : <><FaCheck size={12} /> Chấp nhận</>}
              </button>
              <button
                className="rc-btn reject"
                onClick={() => handle("reject", req)}
                disabled={processingId === id}
              >
                <FaTimes size={12} /> Từ chối
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sent Requests Tab ────────────────────────────────────────
function SentRequestsTab({ requests, onRefresh }) {
  if (requests.length === 0) {
    return (
      <div className="cp-empty">
        <FaUserClock size={48} />
        <h3>Chưa gửi lời mời nào</h3>
        <p>Các lời mời kết bạn bạn đã gửi sẽ hiển thị ở đây.</p>
      </div>
    );
  }

  return (
    <div className="requests-list">
      {requests.map((req) => {
        const id = req._id || req.id;
        const receiver = req.toUserId || req.to || {};
        return (
          <div key={id} className="request-card">
            <Avatar user={receiver} size={52} />
            <div className="rc-info">
              <span className="rc-name">{receiver.username || "Người dùng"}</span>
              <span className="rc-msg">Đang chờ xác nhận...</span>
              <span className="rc-time">{req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi") : ""}</span>
            </div>
            <div className="rc-status pending">
              <FaUserClock size={13} /> Đang chờ
            </div>
          </div>
        );
      })}
    </div>
  );
}