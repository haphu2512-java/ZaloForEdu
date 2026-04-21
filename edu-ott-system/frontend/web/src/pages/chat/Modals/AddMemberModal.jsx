import { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaSpinner, FaUserPlus } from "react-icons/fa";
import { conversationService } from "../../../services/conversationService";
import toast from "react-hot-toast";

export default function AddMemberModal({ isOpen, onClose, activeConversation, friends = [], onAdded }) {
  const conversationId = activeConversation?._id;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelected(new Set());
    }
  }, [isOpen]);

  const filtered = friends.filter(f => {
    const fid = String(f._id || f.id);
    // Exclude if already in group
    const isAlreadyMember = (activeConversation?.participants || []).some(p => {
      const pid = typeof p === 'string' ? p : (p._id || p.id);
      return String(pid) === fid;
    });
    if (isAlreadyMember) return false;

    const name = f.username || f.fullName || f.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 thành viên");
      return;
    }

    setLoading(true);
    try {
      await conversationService.addGroupMembers(conversationId, [...selected]);
      toast.success("Đã thêm thành viên vào nhóm");
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi thêm thành viên");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Thêm thành viên</span>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div style={styles.searchWrap}>
          <FaSearch color="#9CA3AF" size={13} />
          <input
            style={styles.searchInput}
            placeholder="Tìm bạn bè..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.list}>
          {filtered.length === 0 && (
            <div style={styles.empty}>Không có bạn bè phù hợp</div>
          )}
          {filtered.map(f => {
            const fid = String(f._id || f.id);
            const name = f.username || f.fullName || f.name || "Người dùng";
            const isSelected = selected.has(fid);
            return (
              <div key={fid} style={{ ...styles.friendRow, background: isSelected ? "#EFF6FF" : "transparent" }} onClick={() => toggleSelect(fid)}>
                <div style={{ ...styles.avatar, background: f.avatarUrl ? "transparent" : "#0068FF" }}>
                  {f.avatarUrl
                    ? <img src={f.avatarUrl} alt="avt" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <span style={styles.friendName}>{name}</span>
                <div style={{ ...styles.checkbox, background: isSelected ? "#0068FF" : "transparent", borderColor: isSelected ? "#0068FF" : "#D1D5DB" }}>
                  {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Hủy</button>
          <button
            style={{ ...styles.addBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleAdd}
            disabled={loading}
          >
            {loading ? <FaSpinner className="spin" size={14} /> : <FaUserPlus size={14} />}
            {loading ? "Đang xử lý..." : `Thêm vào nhóm${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 14, width: 400, maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" },
  title: { fontWeight: 700, fontSize: 16 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" },
  searchWrap: { margin: "12px 16px 8px", display: "flex", alignItems: "center", gap: 10, background: "#F3F4F6", borderRadius: 10, padding: "8px 14px" },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13 },
  list: { flex: 1, overflowY: "auto", minHeight: 200, maxHeight: 400 },
  empty: { textAlign: "center", padding: "30px 0", color: "#9CA3AF", fontSize: 13 },
  friendRow: { display: "flex", alignItems: "center", padding: "10px 16px", gap: 12, cursor: "pointer" },
  avatar: { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  friendName: { flex: 1, fontSize: 14, color: "#111827" },
  checkbox: { width: 18, height: 18, borderRadius: "50%", border: "2px solid #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center" },
  footer: { padding: "12px 20px 16px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: 10 },
  cancelBtn: { padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none", cursor: "pointer", fontWeight: 600, color: "#4B5563" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, padding: "8px 20px", borderRadius: 8, border: "none", background: "#0068FF", color: "#fff", cursor: "pointer", fontWeight: 600 },
};
