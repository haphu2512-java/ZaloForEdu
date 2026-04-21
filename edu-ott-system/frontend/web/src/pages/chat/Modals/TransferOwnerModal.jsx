import { useState, useMemo } from "react";
import { FaTimes, FaSearch, FaSpinner } from "react-icons/fa";

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23bdbdbd'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23fff'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='9' fill='%23fff'/%3E%3C/svg%3E";

export default function TransferOwnerModal({ isOpen, onClose, members, adminIds = [], onConfirm, loading }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const adminSet = new Set((adminIds || []).map(a => String(a._id || a)));

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m => (m.username || "").toLowerCase().includes(q));
  }, [members, search]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Chọn trưởng nhóm mới trước khi rời</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
            <FaTimes size={15} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f4f6", borderRadius: 10, padding: "7px 12px" }}>
            <FaSearch size={12} color="#9ca3af" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm"
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13.5, color: "#111827" }}
            />
          </div>
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px", color: "#9ca3af", fontSize: 13 }}>Không tìm thấy thành viên</div>
          )}
          {filtered.map(m => {
            const mid = String(m._id || m.id);
            const isAdmin = adminSet.has(mid);
            return (
              <div
                key={mid}
                onClick={() => setSelected(mid)}
                style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12, cursor: "pointer", background: selected === mid ? "#eff6ff" : "transparent", transition: "background 0.12s" }}
              >
                {/* Radio */}
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected === mid ? "#0068FF" : "#d1d5db"}`, background: selected === mid ? "#0068FF" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {selected === mid && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>

                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#e5e7eb" }}>
                  <img src={m.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.src = DEFAULT_AVATAR; }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.username || "Người dùng"}
                  </div>
                  {isAdmin && (
                    <div style={{ fontSize: 11.5, color: "#0068FF", marginTop: 1 }}>Phó nhóm</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Hủy
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || loading}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: selected && !loading ? "#0068FF" : "#e5e7eb", color: selected && !loading ? "#fff" : "#9ca3af", cursor: selected && !loading ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading && <FaSpinner className="spin" size={13} />}
            Chọn và tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
