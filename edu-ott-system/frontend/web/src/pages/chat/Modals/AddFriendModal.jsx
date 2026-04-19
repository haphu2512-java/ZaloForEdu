import { useState, useEffect, useRef } from "react";
import { FaTimes, FaSearch, FaUserPlus, FaCheck, FaSpinner } from "react-icons/fa";
import { friendService } from "../../../services/friendService";

export default function AddFriendModal({ isOpen, onClose, outgoingRequestIds = new Set(), friends = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());
  const timerRef = useRef(null);

  const friendIds = new Set(friends.map(f => String(f._id || f.id)));

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); setSentIds(new Set()); }
  }, [isOpen]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await friendService.searchUsers(query.trim());
        setResults(data?.users || data?.items || data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSend = async (userId) => {
    try {
      await friendService.sendFriendRequest(userId);
      setSentIds(prev => new Set([...prev, String(userId)]));
    } catch (e) {
      const code = e?.response?.data?.error?.code || e?.response?.data?.errorCode;
      if (code === "ALREADY_FRIENDS" || code === "REQUEST_EXISTS") {
        setSentIds(prev => new Set([...prev, String(userId)]));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Thêm bạn bè</span>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div style={styles.searchWrap}>
          <FaSearch color="#9CA3AF" size={14} />
          <input
            autoFocus
            style={styles.searchInput}
            placeholder="Tìm theo tên, email hoặc SĐT..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <FaSpinner className="spin" size={13} color="#9CA3AF" />}
        </div>

        <div style={styles.list}>
          {results.length === 0 && query.trim().length >= 2 && !loading && (
            <div style={styles.empty}>Không tìm thấy kết quả</div>
          )}
          {query.trim().length < 2 && (
            <div style={styles.empty}>Nhập ít nhất 2 ký tự để tìm kiếm</div>
          )}
          {results.map(user => {
            const uid = String(user._id || user.id);
            const isFriend = friendIds.has(uid);
            const isSent = sentIds.has(uid) || outgoingRequestIds.has(uid);
            const displayName = user.username || user.fullName || user.name || "Người dùng";
            const sub = user.phone || user.email || "";
            return (
              <div key={uid} style={styles.userRow}>
                <div style={{ ...styles.avatar, background: user.avatarUrl ? "transparent" : "#0068FF" }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="avt" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{displayName.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div style={styles.userInfo}>
                  <span style={styles.userName}>{displayName}</span>
                  {sub && <span style={styles.userSub}>{sub}</span>}
                </div>
                {isFriend ? (
                  <span style={styles.friendTag}><FaCheck size={11} /> Bạn bè</span>
                ) : isSent ? (
                  <span style={styles.pendingTag}>Đang chờ</span>
                ) : (
                  <button style={styles.addBtn} onClick={() => handleSend(uid)}>
                    <FaUserPlus size={13} /> Kết bạn
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 14, width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  header: { padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" },
  title: { fontWeight: 700, fontSize: 16, color: "#111827" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, borderRadius: 6, lineHeight: 0 },
  searchWrap: { margin: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10, background: "#F3F4F6", borderRadius: 10, padding: "9px 14px" },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: "#111827" },
  list: { maxHeight: 360, overflowY: "auto", padding: "4px 0 12px" },
  empty: { textAlign: "center", padding: "30px 0", color: "#9CA3AF", fontSize: 13 },
  userRow: { display: "flex", alignItems: "center", padding: "10px 16px", gap: 12, transition: "background 0.15s", cursor: "default" },
  avatar: { width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  userInfo: { flex: 1, overflow: "hidden" },
  userName: { display: "block", fontWeight: 600, fontSize: 13.5, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userSub: { display: "block", fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  addBtn: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #0068FF", background: "transparent", color: "#0068FF", cursor: "pointer", fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0 },
  pendingTag: { fontSize: 12, color: "#9CA3AF", fontWeight: 500, flexShrink: 0 },
  friendTag: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#16A34A", fontWeight: 600, flexShrink: 0 },
};
