import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaUsers, FaPlus, FaCommentDots, FaSpinner, FaUserFriends } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CreateGroupPage from "./CreateGroupPage";
import toast from "react-hot-toast";
import "./GroupsTab.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// Avatar nhóm: ảnh nhóm hoặc ghép avatar thành viên
function GroupAvatar({ group }) {
  if (group.avatarUrl) {
    return (
      <div className="group-row-avatar">
        <img src={group.avatarUrl} alt={group.name} />
      </div>
    );
  }
  // Lấy avatar thành viên để ghép lưới
  const members = (group.participants || []).filter(p => typeof p === "object" && p.avatarUrl);
  if (members.length >= 2) {
    return (
      <div className="group-row-avatar" style={{ borderRadius: 14 }}>
        <div className="group-row-avatar-grid">
          {members.slice(0, 4).map((m, i) => (
            <img key={i} src={m.avatarUrl} alt="" />
          ))}
          {members.length < 4 && Array.from({ length: 4 - members.length }).map((_, i) => (
            <div key={`ph-${i}`} className="grid-placeholder" />
          ))}
        </div>
      </div>
    );
  }
  // Fallback: chữ cái đầu tên nhóm
  const name = group.name || "G";
  const colors = ["#0068FF", "#9333ea", "#16a34a", "#f59e0b", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div className="group-row-avatar" style={{ background: bg, fontSize: 20 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

export default function GroupsTab({ onOpenChat }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const token = localStorage.getItem("token");

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = res.data.data?.items || res.data.items || [];
      // Chỉ lấy type === 'group'
      setGroups(all.filter(c => c.type === "group"));
    } catch (err) {
      console.error("Lỗi lấy danh sách nhóm:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    // Sau khi tạo, tự động mở chat nhóm mới
    if (onOpenChat) {
      onOpenChat(newGroup);
    } else {
      navigate("/chat");
    }
  };

  const handleOpenChat = (group) => {
    if (onOpenChat) {
      onOpenChat(group);
    } else {
      navigate("/chat");
    }
  };

  if (isLoading) {
    return (
      <div className="groups-loading">
        <FaSpinner className="spin" size={28} color="var(--z-primary, #0068FF)" />
      </div>
    );
  }

  return (
    <div className="groups-tab">
      {/* Header with create button */}
      {groups.length > 0 && (
        <div className="groups-tab-header">
          <span style={{ fontSize: 13, color: "var(--z-text-muted)", fontWeight: 500 }}>
            {groups.length} nhóm
          </span>
          <button className="groups-create-btn" onClick={() => setShowCreate(true)}>
            <FaPlus size={11} /> Tạo nhóm mới
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="groups-empty">
          <div className="groups-empty-icon">
            <FaUsers size={36} />
          </div>
          <h3>Chưa có nhóm nào</h3>
          <p>Tạo nhóm chat để liên lạc với nhiều bạn bè cùng lúc.</p>
          <button className="groups-empty-create-btn" onClick={() => setShowCreate(true)}>
            <FaPlus size={12} /> Tạo nhóm đầu tiên
          </button>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map(group => {
            const gid = group._id || group.id;
            const memberCount = group.participants?.length || 0;
            return (
              <div
                key={gid}
                className={`group-row ${selectedId === gid ? "selected" : ""}`}
                onClick={() => { setSelectedId(gid); handleOpenChat(group); }}
              >
                <GroupAvatar group={group} />
                <div className="group-row-info">
                  <span className="group-row-name">{group.name || "Nhóm chat"}</span>
                  <div className="group-row-meta">
                    <FaUserFriends size={10} />
                    <span>{memberCount} thành viên</span>
                    {group.latestMessage && (
                      <>
                        <span>·</span>
                        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.latestMessage.isRecalled
                            ? "Tin nhắn đã thu hồi"
                            : group.latestMessage.content || "[File/Ảnh]"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="group-row-actions">
                  <button
                    className="group-action-btn"
                    title="Nhắn tin nhóm"
                    onClick={e => { e.stopPropagation(); handleOpenChat(group); }}
                  >
                    <FaCommentDots size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateGroupPage
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}
