import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FaUserFriends, FaUsers, FaUserPlus, FaSearch, 
  FaEllipsisH, FaSpinner, FaUserCheck, FaChevronDown,
  FaFilter, FaInfoCircle, FaUserTag, FaEdit, FaBan, FaTrashAlt
} from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFriendStore } from "../../store/friendStore";
import { useChatStore } from "../../store/chatStore"; // To navigate to chat
import { useNavigate } from "react-router-dom";
import AddFriendModal from "../../components/Modals/AddFriendModal";
import "./ContactsPage.css";

// ── Dropdown Menu Component ──────────────────────────────────
function FriendActionsMenu({ friend, onAction }) {
  return (
    <div className="context-menu" onClick={e => e.stopPropagation()}>
      <div className="menu-item" onClick={() => onAction("info", friend)}>
        <FaInfoCircle size={14} /> Xem thông tin
      </div>
      <div className="menu-item" onClick={() => onAction("label", friend)}>
        <FaUserTag size={14} /> Phân loại
      </div>
      <div className="menu-item" onClick={() => onAction("nickname", friend)}>
        <FaEdit size={14} /> Đặt tên gợi nhớ
      </div>
      <div className="menu-divider" style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />
      <div className="menu-item" onClick={() => onAction("block", friend)}>
        <FaBan size={14} /> Chặn người này
      </div>
      <div className="menu-item danger" onClick={() => onAction("unfriend", friend)}>
        <FaTrashAlt size={14} /> Xóa bạn
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  
  const {
    friends, incomingRequests, outgoingRequests, isLoading,
    fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
    unfriend, blockFriend, acceptRequest, rejectRequest
  } = useFriendStore();

  const { setCurrentRoomId } = useChatStore();

  useEffect(() => {
    fetchFriends();
    fetchIncomingRequests();
    fetchOutgoingRequests();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Alphabetical Grouping Logic ────────────────────────────
  const groupedFriends = useMemo(() => {
    if (activeTab !== "friends") return {};
    
    const filtered = friends.filter(f => 
      (f.username || f.email || f.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const sorted = [...filtered].sort((a, b) => 
      (a.username || "").localeCompare(b.username || "", 'vi')
    );

    const groups = {};
    sorted.forEach(f => {
      const name = f.username || f.email || f.phone || "?";
      const firstLetter = name[0].toUpperCase();
      // Handle special characters or digits
      const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    
    // Sort keys alphabetically, but put # at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });

    const result = {};
    sortedKeys.forEach(k => result[k] = groups[k]);
    return result;
  }, [friends, searchQuery, activeTab]);

  const handleAction = async (action, friend) => {
    setOpenMenuId(null);
    const friendId = friend._id || friend.id;
    
    if (action === "unfriend") {
      if (window.confirm(`Bạn có chắc chắn muốn xóa ${friend.username} khỏi danh sách bạn bè?`)) {
        await unfriend(friendId);
      }
    } else if (action === "block") {
      if (window.confirm(`Bạn có chắc chắn muốn chặn ${friend.username}? Người này sẽ không thể liên lạc với bạn.`)) {
        await blockFriend(friendId);
      }
    } else if (action === "info") {
       alert(`Thông tin: ${friend.username}\nSĐT: ${friend.phone || "N/A"}`);
    } else {
       alert("Tính năng này đang được phát triển.");
    }
  };

  const handleOpenChat = (friend) => {
    // Navigate to chat and set active room if possible
    // For now, just navigate to /chat
    navigate("/chat");
    // In a real app: find current room with this friend and setActiveRoom
  };

  const renderContent = () => {
    if (isLoading && friends.length === 0) {
      return <div className="page-loading"><FaSpinner className="spin" size={32} /></div>;
    }

    if (activeTab === "friends") {
      return (
        <div className="contacts-content">
          <div className="friends-count">Bạn bè ({friends.length})</div>
          
          <div className="contacts-filter-bar">
            <div className="filter-input-wrap">
              <FaSearch size={14} color="var(--text-tertiary)" />
              <input 
                placeholder="Tìm bạn" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="filter-select">
              <option>Tên (A-Z)</option>
              <option>Mới nhất</option>
            </select>
            <select className="filter-select">
              <option>Tất cả</option>
              <option>Gia đình</option>
              <option>Công việc</option>
            </select>
          </div>

          {Object.keys(groupedFriends).length === 0 ? (
            <div className="contacts-placeholder" style={{ marginTop: "60px" }}>
              <img src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png" alt="" className="contacts-illustration" />
              <h3>Chưa tìm thấy bạn bè</h3>
              <p>Thử nhập tên khác hoặc kiểm tra lại danh sách bạn bè của bạn.</p>
            </div>
          ) : (
            Object.entries(groupedFriends).map(([letter, list]) => (
              <div key={letter} className="alphabet-group">
                <div className="group-letter">{letter}</div>
                {list.map(friend => (
                  <div key={friend._id || friend.id} className="friend-item" onClick={() => handleOpenChat(friend)}>
                    <img 
                      src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username || "U")}&background=0068FF&color=fff`} 
                      className="friend-avatar" 
                      alt="" 
                    />
                    <div className="friend-name">{friend.username}</div>
                    <div className="friend-actions" ref={openMenuId === (friend._id || friend.id) ? menuRef : null}>
                      <button 
                        className="action-dot-btn" 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (friend._id || friend.id) ? null : (friend._id || friend.id)); }}
                      >
                        <FaEllipsisH />
                      </button>
                      {openMenuId === (friend._id || friend.id) && (
                        <FriendActionsMenu friend={friend} onAction={handleAction} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === "requests") {
      return (
        <div className="contacts-content">
          <div className="friends-count">Lời mời kết bạn ({incomingRequests.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
            {incomingRequests.map(req => (
              <div key={req._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "var(--bg-secondary)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                   <img src={req.fromUserId?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.fromUserId?.username || "A")}&background=0068FF&color=fff`} style={{ width: "48px", height: "48px", borderRadius: "50%" }} alt="" />
                   <div>
                     <h4 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)" }}>{req.fromUserId?.username || "Người dùng"}</h4>
                     <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>{req.message || "Xin chào, kết bạn nhé!"}</p>
                   </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                   <button onClick={() => rejectRequest(req._id)} style={{ padding: "8px 16px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "8px", cursor: "pointer", color: "var(--text-primary)", fontWeight: "600" }}>Từ chối</button>
                   <button onClick={() => acceptRequest(req._id)} style={{ padding: "8px 16px", background: "var(--primary-color)", border: "none", borderRadius: "8px", cursor: "pointer", color: "white", fontWeight: "600" }}>Chấp nhận</button>
                </div>
              </div>
            ))}
            {incomingRequests.length === 0 && (
               <div className="contacts-placeholder" style={{ marginTop: "60px" }}>
                 <p style={{ color: "var(--text-secondary)" }}>Không có lời mời nào gần đây.</p>
               </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="contacts-placeholder">
        <img src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png" alt="" className="contacts-illustration" />
        <h3>Tính năng đang phát triển</h3>
        <p>Phần này chưa có dữ liệu thực tế. Vui lòng quay lại sau.</p>
      </div>
    );
  };

  return (
    <div className="contacts-page">
      {/* ── SIDEBAR (Left) ── */}
      <div className="contacts-sidebar">
        <div className="cs-header">
          <span className="cs-title">Danh bạ</span>
          <button className="cs-add-btn" title="Thêm bạn" onClick={() => setShowAddFriend(true)}>
            <FaUserPlus size={16} color="var(--primary-color)" />
          </button>
        </div>

        <div className="cs-search">
          <FaSearch size={14} color="var(--text-tertiary)" />
          <input 
            placeholder="Tìm kiếm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cs-menu">
          <div className={`cs-menu-item ${activeTab === "friends" ? "active" : ""}`} onClick={() => setActiveTab("friends")}>
            <div className="cs-icon"><FaUserFriends size={18} /></div>
            Danh sách bạn bè
          </div>
          <div className={`cs-menu-item ${activeTab === "groups" ? "active" : ""}`} onClick={() => setActiveTab("groups")}>
            <div className="cs-icon"><FaUsers size={18} /></div>
            Danh sách nhóm và cộng đồng
          </div>
          <div className={`cs-menu-item ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
            <div className="cs-icon"><FaUserCheck size={18} /></div>
            Lời mời kết bạn
          </div>
          <div className={`cs-menu-item ${activeTab === "group_requests" ? "active" : ""}`} onClick={() => setActiveTab("group_requests")}>
            <div className="cs-icon"><FaUsers size={18} /></div>
            Lời mời vào nhóm và cộng đồng
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (Right) ── */}
      <div className="contacts-main">
        <div className="contacts-header">
          <div className="ch-title">
            {activeTab === "friends" && <><FaUserFriends /> Danh sách bạn bè</>}
            {activeTab === "groups" && <><FaUsers /> Danh sách nhóm</>}
            {activeTab === "requests" && <><FaUserCheck /> Lời mời kết bạn</>}
            {activeTab === "group_requests" && <><FaUsers /> Lời mời vào nhóm</>}
          </div>
        </div>
        
        <div className="contacts-scroll-area">
           {renderContent()}
        </div>
      </div>
      
      {/* ── MODALS ── */}
      <AddFriendModal isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </div>
  );
}
