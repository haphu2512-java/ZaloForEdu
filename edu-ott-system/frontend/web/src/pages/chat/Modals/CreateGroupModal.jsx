import { useState, useEffect, useRef } from "react";
import { FaTimes, FaCamera, FaSearch, FaSpinner, FaUsers } from "react-icons/fa";
import { conversationService } from "../../../services/conversationService";
import { userService } from "../../../services/userService";

export default function CreateGroupModal({ isOpen, onClose, friends = [], onCreated, initialSelected = [] }) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSearch("");
      setSelected(new Set());
      setError("");
      setAvatarFile(null);
      setAvatarPreview(null);
    } else {
      // Khi modal mở, sync initialSelected vào selected (dạng Set<string ID>)
      if (initialSelected && initialSelected.length > 0) {
        const ids = initialSelected.map(f => {
          if (typeof f === 'string') return f;
          return String(f._id || f.id || '');
        }).filter(Boolean);
        setSelected(new Set(ids));
      } else {
        setSelected(new Set());
      }
    }
  }, [isOpen]);

  const filtered = friends.filter(f => {
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh tối đa 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { setError("Vui lòng nhập tên nhóm"); return; }
    if (selected.size < 2) { setError("Chọn ít nhất 2 người để tạo nhóm (tổng 3 thành viên)"); return; }
    setLoading(true);
    setError("");
    try {
      let finalAvatarUrl = null;
      if (avatarFile) {
        try {
          const res = await userService.uploadAvatar(avatarFile);
          finalAvatarUrl = res.url;
        } catch (err) {
          setError("Tải ảnh lên thất bại, thử lại sau!");
          setLoading(false);
          return;
        }
      }

      const data = await conversationService.createGroupConversation(groupName.trim(), [...selected]);
      const newConv = data?.data || data;

      if (finalAvatarUrl) {
        await conversationService.updateGroupAvatar(newConv._id, finalAvatarUrl);
        newConv.avatarUrl = finalAvatarUrl;
      }

      const completeConv = {
        ...newConv,
        participants: newConv.participants || [...selected, newConv.ownerId]
      };

      onCreated?.(completeConv);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Tạo nhóm thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>Tạo nhóm mới</span>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes size={16} /></button>
        </div>

        {/* Group name + avatar placeholder */}
        <div style={styles.nameRow}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={styles.groupAvatarLocator} onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Group Avatar" style={styles.previewImage} />
            ) : (
              <div style={styles.groupAvatarPlaceholder}>
                <FaCamera size={18} color="#9CA3AF" />
              </div>
            )}
          </div>
          <input
            autoFocus
            style={styles.nameInput}
            placeholder="Đặt tên nhóm..."
            value={groupName}
            onChange={e => { setGroupName(e.target.value); setError(""); }}
            maxLength={60}
          />
        </div>

        {/* Friend search */}
        <div style={styles.searchWrap}>
          <FaSearch color="#9CA3AF" size={13} />
          <input
            style={styles.searchInput}
            placeholder="Tìm bạn bè..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Selected badges */}
        {selected.size > 0 && (
          <div style={styles.selectedBar}>
            {[...selected].map(id => {
              const f = friends.find(fr => String(fr._id || fr.id) === id);
              if (!f) return null;
              const name = f.username || f.fullName || "?";
              return (
                <div key={id} style={styles.badge}>
                  <div style={styles.badgeAvatar}>
                    {f.avatarUrl
                      ? <img src={f.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      : <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <span style={styles.badgeName}>{name.split(" ").pop()}</span>
                  <button style={styles.badgeRemove} onClick={() => toggleSelect(id)}><FaTimes size={9} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Friend list */}
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

        {/* Footer */}
        <div style={styles.footer}>
          {error && <p style={styles.errorText}>{error}</p>}
          <div style={styles.footerBtns}>
            <button style={styles.cancelBtn} onClick={onClose}>Hủy</button>
            <button
              style={{ ...styles.createBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? <FaSpinner className="spin" size={14} /> : <FaUsers size={14} />}
              {loading ? "Đang tạo..." : `Tạo nhóm${selected.size > 0 ? ` (${selected.size + 1})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 14, width: 440, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  header: { padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", flexShrink: 0 },
  title: { fontWeight: 700, fontSize: 16, color: "#111827" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, borderRadius: 6, lineHeight: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 4px", flexShrink: 0 },
  groupAvatarLocator: { width: 44, height: 44, borderRadius: "50%", flexShrink: 0, cursor: "pointer", position: 'relative', overflow: 'hidden' },
  groupAvatarPlaceholder: { width: '100%', height: '100%', borderRadius: "50%", background: "#F3F4F6", border: "2px dashed #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  nameInput: { flex: 1, border: "none", borderBottom: "2px solid #E5E7EB", outline: "none", fontSize: 15, fontWeight: 600, color: "#111827", padding: "6px 0", background: "transparent", transition: "border-color 0.2s" },
  searchWrap: { margin: "12px 16px 8px", display: "flex", alignItems: "center", gap: 10, background: "#F3F4F6", borderRadius: 10, padding: "8px 14px", flexShrink: 0 },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#111827" },
  selectedBar: { display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 16px 10px", flexShrink: 0, maxHeight: 80, overflowY: "auto" },
  badge: { display: "flex", alignItems: "center", gap: 5, background: "#EFF6FF", borderRadius: 20, padding: "4px 8px 4px 4px", border: "1px solid #BFDBFE" },
  badgeAvatar: { width: 24, height: 24, borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  badgeName: { fontSize: 12, fontWeight: 600, color: "#1D4ED8", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badgeRemove: { background: "none", border: "none", cursor: "pointer", color: "#93C5FD", padding: 0, lineHeight: 0 },
  list: { flex: 1, overflowY: "auto", paddingBottom: 8, minHeight: 200 },
  empty: { textAlign: "center", padding: "30px 0", color: "#9CA3AF", fontSize: 13 },
  friendRow: { display: "flex", alignItems: "center", padding: "9px 16px", gap: 12, cursor: "pointer", transition: "background 0.15s" },
  avatar: { width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  friendName: { flex: 1, fontWeight: 500, fontSize: 13.5, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  checkbox: { width: 20, height: 20, borderRadius: "50%", border: "2px solid #D1D5DB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  footer: { padding: "12px 20px 16px", borderTop: "1px solid #F3F4F6", flexShrink: 0 },
  errorText: { fontSize: 12.5, color: "#EF4444", marginBottom: 8 },
  footerBtns: { display: "flex", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { padding: "9px 20px", borderRadius: 9, border: "1px solid #E5E7EB", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 13.5, color: "#4B5563" },
  createBtn: { display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 9, border: "none", background: "#0068FF", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13.5, transition: "opacity 0.2s" },
};