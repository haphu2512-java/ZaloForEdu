import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  FaTimes, FaSearch, FaCheck, FaCamera, FaUsers, FaSpinner, FaArrowLeft,
} from "react-icons/fa";
import { useFriendStore } from "../../store/friendStore";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom"; // Thêm dòng này
import "./CreateGroupPage.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

function Avatar({ user, size = 40 }) {
  const name = user?.username || "?";
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="cgm-avatar" style={{ width: size, height: size, objectFit: 'cover' }} />;
  }
  const colors = ["#0068FF", "#9333ea", "#16a34a", "#f59e0b", "#ef4444", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div className="cgm-avatar cgm-avatar-placeholder" style={{ width: size, height: size, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ĐÃ SỬA: Gán isOpen = true làm mặc định
export default function CreateGroupPage({ isOpen = true, onClose, onGroupCreated }) {
  const navigate = useNavigate(); // Khai báo navigate
  const { friends, fetchFriends } = useFriendStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef(null);
  const token = localStorage.getItem("token");

  // ĐÃ SỬA: Hàm đóng thông minh (đóng Modal hoặc lùi trang)
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (isOpen && friends.length === 0) fetchFriends();
  }, [isOpen, friends.length, fetchFriends]);

  useEffect(() => {
    if (!isOpen) {
      setGroupName(""); setSearch(""); setSelectedIds([]);
      setStep(1); setAvatarPreview(null); setAvatarFile(null);
    }
  }, [isOpen]);

  const filtered = friends.filter(f =>
    (f.username || f.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const selectedFriends = friends.filter(f => selectedIds.includes(f._id || f.id));

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error("Vui lòng nhập tên nhóm"); return; }
    if (selectedIds.length < 2) { toast.error("Cần chọn ít nhất 2 thành viên"); return; }
    setIsCreating(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        try {
          const { uploadFile } = await import("../../services/mediaService");
          const media = await uploadFile(avatarFile, { folder: "zaloapp/groups" });
          avatarUrl = media.url || media.secureUrl;
        } catch (e) { console.warn("Avatar upload failed"); }
      }
      const res = await axios.post(`${API_BASE_URL}/conversations`, {
        type: "group",
        name: groupName.trim(),
        participantIds: selectedIds,
        ...(avatarUrl && { avatarUrl }),
      }, { headers: { Authorization: `Bearer ${token}` } });

      const newGroup = res.data.data || res.data;
      toast.success(`Đã tạo nhóm "${groupName.trim()}"!`);
      onGroupCreated?.(newGroup);
      
      // ĐÃ SỬA: Chuyển thẳng vào nhóm sau khi tạo (Nâng cao trải nghiệm)
      if (!onClose) {
         navigate(`/chat/${newGroup._id || newGroup.id}`);
      } else {
         handleClose();
      }

    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tạo nhóm");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cgm-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="cgm-modal">
        {/* Header */}
        <div className="cgm-header">
          {step === 2 && (
            <button className="cgm-close" style={{ marginRight: 8 }} onClick={() => setStep(1)}>
              <FaArrowLeft size={14} />
            </button>
          )}
          <span className="cgm-title">Tạo nhóm mới</span>
          <button className="cgm-close" onClick={handleClose}><FaTimes size={15} /></button>
        </div>

        {/* Steps */}
        <div className="cgm-steps">
          <div className={`cgm-step ${step >= 1 ? "active" : ""}`}>
            <div className="cgm-step-dot">1</div>
            <span>Chọn thành viên</span>
          </div>
          <div className="cgm-step-line" />
          <div className={`cgm-step ${step >= 2 ? "active" : ""}`}>
            <div className="cgm-step-dot">2</div>
            <span>Đặt tên nhóm</span>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="cgm-search">
              <FaSearch size={13} color="#888" />
              <input placeholder="Tìm bạn bè..." value={search}
                onChange={e => setSearch(e.target.value)} autoFocus />
            </div>

            {selectedFriends.length > 0 && (
              <div className="cgm-selected-chips">
                {selectedFriends.map(f => {
                  const fid = f._id || f.id;
                  return (
                    <div key={fid} className="cgm-chip">
                      <Avatar user={f} size={20} />
                      <span>{f.username}</span>
                      <button onClick={() => toggleSelect(fid)}><FaTimes size={9} /></button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cgm-list">
              {filtered.length === 0 ? (
                <div className="cgm-empty"><FaUsers size={32} /><p>Không tìm thấy bạn bè</p></div>
              ) : filtered.map(f => {
                const fid = f._id || f.id;
                const isSel = selectedIds.includes(fid);
                return (
                  <div key={fid} className={`cgm-friend-row ${isSel ? "selected" : ""}`}
                    onClick={() => toggleSelect(fid)}>
                    <div className="cgm-friend-avatar-wrap">
                      <Avatar user={f} size={42} />
                      {isSel && <div className="cgm-check-badge"><FaCheck size={9} /></div>}
                    </div>
                    <div className="cgm-friend-info">
                      <span className="cgm-friend-name">{f.username}</span>
                      <span className="cgm-friend-sub">{f.email || f.phone || ""}</span>
                    </div>
                    <div className={`cgm-checkbox ${isSel ? "checked" : ""}`}>
                      {isSel && <FaCheck size={10} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cgm-footer">
              <span className="cgm-count">Đã chọn: <strong>{selectedIds.length}</strong>/{friends.length}</span>
              <div className="cgm-footer-btns">
                <button className="cgm-btn-cancel" onClick={handleClose}>Hủy</button>
                <button className="cgm-btn-next" disabled={selectedIds.length < 2} onClick={() => setStep(2)}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="cgm-group-info">
              <div className="cgm-avatar-upload">
                <div className="cgm-avatar-circle" onClick={() => fileRef.current?.click()}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                    : <div className="cgm-avatar-camera"><FaCamera size={22} /><span>Thêm ảnh</span></div>
                  }
                </div>
                <span className="cgm-avatar-label">Nhấn để thêm ảnh nhóm</span>
                <input ref={fileRef} type="file" accept="image/*"
                  style={{ display: "none" }} onChange={handleAvatarChange} />
              </div>

              <div className="cgm-name-input-wrap">
                <label>Tên nhóm *</label>
                <input placeholder="Nhập tên nhóm..." value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  autoFocus maxLength={100} />
              </div>

              <div className="cgm-members-preview">
                <span className="cgm-members-preview-label">
                  Thành viên ({selectedFriends.length + 1})
                </span>
                <div className="cgm-members-scroll">
                  <div className="cgm-member-chip">
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#0068FF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 12
                    }}>Tôi</div>
                    <span>Tôi</span>
                  </div>
                  {selectedFriends.map(f => (
                    <div key={f._id || f.id} className="cgm-member-chip">
                      <Avatar user={f} size={44} />
                      <span>{f.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cgm-footer">
              <span className="cgm-count">
                <FaUsers size={12} style={{ marginRight: 4 }} />
                {selectedFriends.length + 1} thành viên
              </span>
              <div className="cgm-footer-btns">
                <button className="cgm-btn-cancel" onClick={() => setStep(1)}>Quay lại</button>
                <button className="cgm-btn-create"
                  disabled={!groupName.trim() || isCreating}
                  onClick={handleCreate}>
                  {isCreating ? <><FaSpinner className="spin" size={13} /> Đang tạo...</> : "✓ Tạo nhóm"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
