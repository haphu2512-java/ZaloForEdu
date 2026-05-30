import { useState, useMemo } from "react";
import { FaTimes, FaSearch, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { DEFAULT_AVATAR } from '../../../utils/constants';



export default function TransferOwnerModal({ isOpen, onClose, members, adminIds = [], onConfirm, loading }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const adminSet = new Set((adminIds || []).map(a => String(a._id || a)));

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m => (m.username || "").toLowerCase().includes(q));
  }, [members, search]);

  const handleConfirmClick = () => {
    if (!selected) return;
    setShowConfirmation(true);
  };

  const handleFinalConfirm = () => {
    setShowConfirmation(false);
    onConfirm(selected);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={onClose}>
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Chọn trưởng nhóm mới</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <FaTimes size={15} />
            </button>
          </div>

          {/* Warning Banner */}
          <div style={{ 
            background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", 
            border: "1px solid #F59E0B",
            borderRadius: 8,
            padding: 12,
            margin: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start"
          }}>
            <FaExclamationTriangle color="#D97706" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              <strong style={{ display: "block", marginBottom: 4, fontSize: 13.5 }}>⚠️ Cảnh báo quan trọng</strong>
              <div>Hành động này <strong>không thể hoàn tác</strong>! Sau khi chuyển quyền, bạn sẽ trở thành phó nhóm và không thể tự lấy lại quyền trưởng nhóm.</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", borderRadius: 10, padding: "7px 12px" }}>
              <FaSearch size={12} color="var(--text-secondary)" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm thành viên"
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13.5, color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Member list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)", fontSize: 13 }}>Không tìm thấy thành viên</div>
            )}
            {filtered.map(m => {
              const mid = String(m._id || m.id);
              const isAdmin = adminSet.has(mid);
              const isSelected = selected === mid;
              return (
                <div
                  key={mid}
                  onClick={() => setSelected(mid)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    padding: "10px 16px", 
                    gap: 12, 
                    cursor: "pointer", 
                    background: isSelected ? "var(--primary-color-light, #eff6ff)" : "transparent", 
                    transition: "background 0.12s" 
                  }}
                >
                  {/* Radio */}
                  <div style={{ 
                    width: 18, 
                    height: 18, 
                    borderRadius: "50%", 
                    border: `2px solid ${isSelected ? "var(--primary-color)" : "var(--border-color)"}`, 
                    background: isSelected ? "var(--primary-color)" : "var(--bg-primary)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    flexShrink: 0 
                  }}>
                    {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "var(--bg-secondary)" }}>
                    <img src={m.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.src = DEFAULT_AVATAR; }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.username || "Người dùng"}
                    </div>
                    {isAdmin && (
                      <div style={{ fontSize: 11.5, color: "var(--primary-color)", marginTop: 1 }}>Phó nhóm</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ 
              padding: "8px 20px", 
              borderRadius: 8, 
              border: "1px solid var(--border-color)", 
              background: "var(--bg-secondary)", 
              color: "var(--text-primary)", 
              cursor: "pointer", 
              fontWeight: 600, 
              fontSize: 13.5 
            }}>
              Hủy
            </button>
            <button
              onClick={handleConfirmClick}
              disabled={!selected || loading}
              style={{ 
                padding: "8px 20px", 
                borderRadius: 8, 
                border: "none", 
                background: selected && !loading ? "var(--primary-color)" : "var(--bg-secondary)", 
                color: selected && !loading ? "#fff" : "var(--text-secondary)", 
                cursor: selected && !loading ? "pointer" : "not-allowed", 
                fontWeight: 600, 
                fontSize: 13.5, 
                display: "flex", 
                alignItems: "center", 
                gap: 6 
              }}
            >
              {loading && <FaSpinner className="spin" size={13} />}
              Tiếp tục
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div style={{ 
          position: "fixed", 
          inset: 0, 
          background: "rgba(0,0,0,0.6)", 
          zIndex: 10001, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          animation: "fadeIn 0.2s ease"
        }}
          onClick={handleCancel}>
          <div style={{ 
            background: "var(--bg-primary)", 
            borderRadius: 16, 
            width: 440, 
            maxWidth: "90vw", 
            boxShadow: "0 25px 70px rgba(0,0,0,0.3)", 
            overflow: "hidden",
            animation: "slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
            onClick={e => e.stopPropagation()}>
            
            {/* Icon */}
            <div style={{ 
              padding: "24px 24px 16px", 
              display: "flex", 
              justifyContent: "center" 
            }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)"
              }}>
                <FaExclamationTriangle size={32} color="#D97706" />
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "0 24px 24px" }}>
              <h3 style={{ 
                margin: "0 0 12px", 
                fontSize: 18, 
                fontWeight: 700, 
                color: "var(--text-primary)", 
                textAlign: "center" 
              }}>
                Xác nhận chuyển quyền trưởng nhóm
              </h3>
              
              <div style={{ 
                fontSize: 14, 
                color: "var(--text-secondary)", 
                lineHeight: 1.6, 
                marginBottom: 20,
                textAlign: "center"
              }}>
                Bạn có chắc chắn muốn chuyển quyền trưởng nhóm?
              </div>

              {/* Warning List */}
              <div style={{ 
                background: "var(--bg-secondary)", 
                borderRadius: 10, 
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ 
                  fontSize: 13, 
                  color: "var(--text-primary)", 
                  lineHeight: 1.7,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#EF4444", fontSize: 16, flexShrink: 0 }}>❌</span>
                    <span><strong>Không thể hoàn tác:</strong> Hành động này vĩnh viễn và không thể đảo ngược</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#EF4444", fontSize: 16, flexShrink: 0 }}>❌</span>
                    <span><strong>Mất quyền trưởng nhóm:</strong> Bạn sẽ trở thành phó nhóm sau khi chuyển</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#EF4444", fontSize: 16, flexShrink: 0 }}>❌</span>
                    <span><strong>Không thể tự lấy lại:</strong> Chỉ trưởng nhóm mới có thể chuyển quyền</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  onClick={handleCancel}
                  disabled={loading}
                  style={{ 
                    flex: 1, 
                    padding: "12px", 
                    borderRadius: 10, 
                    border: "1.5px solid var(--border-color)", 
                    background: "var(--bg-primary)", 
                    color: "var(--text-primary)", 
                    cursor: loading ? "not-allowed" : "pointer", 
                    fontWeight: 600, 
                    fontSize: 14,
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleFinalConfirm}
                  disabled={loading}
                  style={{ 
                    flex: 1, 
                    padding: "12px", 
                    borderRadius: 10, 
                    border: "none", 
                    background: loading ? "var(--bg-secondary)" : "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", 
                    color: "#fff", 
                    cursor: loading ? "not-allowed" : "pointer", 
                    fontWeight: 700, 
                    fontSize: 14,
                    boxShadow: loading ? "none" : "0 4px 12px rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  {loading && <FaSpinner className="spin" size={14} />}
                  {loading ? "Đang xử lý..." : "Xác nhận chuyển quyền"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
