import { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes, FaSpinner } from "react-icons/fa";
import { friendService } from "../../../services/friendService";
import { useFriendStore } from "../../../store/friendStore";
import { useAuthStore } from "../../../store/authStore";
import UserProfileModal from "../../../components/Modals/UserProfileModal";

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23bdbdbd'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23fff'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='9' fill='%23fff'/%3E%3C/svg%3E";

export default function AddFriendModal({ isOpen, onClose }) {
  const { user: currentUser } = useAuthStore();
  const { friends, incomingRequests, outgoingRequests, fetchFriends, fetchIncomingRequests, fetchOutgoingRequests } = useFriendStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      // FIX: Không gọi fetchOutgoingRequests đừn đây — nó REPLACE toàn bộ store bằng API data
      // Làm mất optimistic update từ handleSendRequest khi đóng mở lại modal
      // Store đã được persist (localStorage) nên outgoingRequests vẫn giữ nguyên
      Promise.all([fetchFriends(), fetchIncomingRequests()]);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); setSelectedUser(null); }
  }, [isOpen]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await friendService.searchUsers(query.trim());
        setResults(data?.items || data?.users || data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  if (!isOpen) return null;

  const getStatus = (userId) => {
    const id = String(userId);
    const myId = String(currentUser?._id || currentUser?.id);
    if (id === myId) return "self";
    if (friends.some(f => String(f._id || f.id) === id)) return "friend";
    if (outgoingRequests.some(r => String(r.toUserId?._id || r.toUserId?.id || r.toUserId || r.to?._id || r.to?.id || r.to || "") === id)) return "outgoing";
    if (incomingRequests.some(r => String(r.fromUserId?._id || r.fromUserId?.id || r.fromUserId || r.from?._id || r.from?.id || r.from || "") === id)) return "incoming";
    return "none";
  };

  return (
    <>
      {!selectedUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={onClose}
        >
        <div
          style={{ background: "var(--bg-primary)", borderRadius: 14, width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Thêm bạn</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Tìm qua số điện thoại, email hoặc tên</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
              <FaTimes size={15} />
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "12px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", borderRadius: 10, padding: "8px 12px" }}>
              <FaSearch size={13} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Nhập SĐT, email hoặc tên..."
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13.5, color: "var(--text-primary)" }}
              />
              {loading && <FaSpinner className="spin" size={13} color="var(--text-tertiary)" />}
              {query && !loading && (
                <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}>
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
            {query.trim().length < 2 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
                Nhập ít nhất 2 ký tự để tìm kiếm
              </div>
            )}
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
                Không tìm thấy kết quả
              </div>
            )}
            {results.map(u => {
              const uid = String(u._id || u.id);
              const status = getStatus(uid);
              if (status === "self") return null;
              const displayName = u.username || u.fullName || "Người dùng";
              const sub = u.phone || u.email || "";
              return (
                <div
                  key={uid}
                  onClick={() => setSelectedUser({ user: u, status })}
                  style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12, cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "#e5e7eb" }}>
                    <img
                      src={u.avatarUrl || DEFAULT_AVATAR}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.target.src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </div>
                    {sub && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>}
                  </div>
                  {status === "friend" && (
                    <span style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 600, flexShrink: 0 }}>Bạn bè</span>
                  )}
                  {status === "outgoing" && (
                    <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", flexShrink: 0 }}>Đã gửi</span>
                  )}
                  {status === "incoming" && (
                    <span style={{ fontSize: 11.5, color: "#d97706", fontWeight: 600, flexShrink: 0 }}>Chờ xác nhận</span>
                  )}
                </div>
              );
            })}
            })}
          </div>
        </div>
      </div>
      )}

      {selectedUser && (
        <UserProfileModal
          isOpen={true}
          onClose={() => { setSelectedUser(null); onClose(); }}
          user={selectedUser.user}
          status={selectedUser.status}
          onChatOpened={onClose}
          onStatusChange={(newStatus) => {
            setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
            // FIX: Không gọi fetchOutgoingRequests ở đây — tránh race condition
            // overwrite optimistic store update từ handleSendRequest trước khi server index xong
            Promise.all([fetchFriends(), fetchIncomingRequests()]);
          }}
        />
      )}
    </>
  );
}
