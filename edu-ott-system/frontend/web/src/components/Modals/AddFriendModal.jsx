import { useState, useEffect } from "react";
import { 
  FaSearch, FaUserPlus, FaTimes, FaSpinner, FaCheck, 
  FaInfoCircle, FaCommentDots, FaClock, FaHistory 
} from "react-icons/fa";
import { friendService } from "../../services/friendService";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFriendStore } from "../../store/friendStore";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";
import "./AddFriendModal.css";
import axios from 'axios';
export default function AddFriendModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { 
    friends, 
    incomingRequests, 
    outgoingRequests, 
    fetchFriends, 
    fetchIncomingRequests, 
    fetchOutgoingRequests 
  } = useFriendStore();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Load friends and requests once to ensure status checks are accurate
  useEffect(() => {
    if (isOpen && currentUser) {
      if (friends.length === 0) fetchFriends();
      if (incomingRequests.length === 0) fetchIncomingRequests();
      if (outgoingRequests.length === 0) fetchOutgoingRequests();
      
      const storageKey = `recentSearches_${currentUser._id}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setRecentSearches(saved);
      setPhone("");
      setResult(null);
      setError("");
      setSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const saveRecentSearch = (phoneNum) => {
    if (!currentUser) return;
    const storageKey = `recentSearches_${currentUser._id}`;
    let updated = [phoneNum, ...recentSearches.filter(p => p !== phoneNum)];
    updated = updated.slice(0, 5); // Keep last 5
    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setSuccess(false);

    try {
      const data = await friendService.searchUsers(phone.trim());
      if (data.items && data.items.length > 0) {
        // Zalo priorities exact phone match
        const found = data.items.find(u => u.phone === phone.trim()) || data.items[0];
        setResult(found);
        saveRecentSearch(phone.trim());
      } else {
        setError("Không tìm thấy kết quả. Vui lòng thử tìm bằng SĐT, email hoặc tên người dùng khác.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await friendService.sendFriendRequest(result._id || result.id);
      setSuccess(true);
      fetchOutgoingRequests(); // Refresh status
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi lời mời kết bạn.");
    } finally {
      setLoading(false);
    }
  };

  const removeRecent = (e, p) => {
    e.stopPropagation();
    if (!currentUser) return;
    const storageKey = `recentSearches_${currentUser._id}`;
    const updated = recentSearches.filter(item => item !== p);
    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Determine relationship status for UI
  const getFriendStatus = () => {
    if (!result || !currentUser) return null;
    const targetId = result._id || result.id;
    
    if (targetId === currentUser._id) return "self";
    if (friends.some(f => (f._id || f.id) === targetId)) return "friend";
    if (outgoingRequests.some(r => r.toUserId?._id === targetId || r.toUserId === targetId)) return "outgoing";
    if (incomingRequests.some(r => r.fromUserId?._id === targetId || r.fromUserId === targetId)) return "incoming";
    
    return "none";
  };

  const status = getFriendStatus();

 const handleAction = async (forceChat = false) => {
    if (status === "friend" || forceChat) {
      try {
        setLoading(true);
        const targetId = result._id || result.id;
        const token = localStorage.getItem("token");
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
        const res = await axios.post(
          `${apiBase}/conversations`,
          { type: "direct", participantIds: [targetId] },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onClose();
        const conversationId = res.data.data._id;
        navigate("/chat", { state: { activeConversationId: conversationId } });
      } catch (err) {
        setError("Không thể mở cuộc trò chuyện lúc này.");
      } finally {
        setLoading(false);
      }
    } else if (status === "none") {
      handleAddFriend();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-friend-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-text">
            <h3>Thêm bạn mới</h3>
            <p>Tìm kiếm qua số điện thoại, email hoặc tên người dùng</p>
          </div>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-container">
              <div className="premium-input-group">
                <FaSearch className="input-icon" />
                <input
                  type="text"
                  placeholder="Nhập SĐT, email hoặc tên người dùng..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
                {phone && (
                  <button type="button" className="clear-search-btn" onClick={() => setPhone("")}>
                    <FaTimes />
                  </button>
                )}
              </div>
              <button 
                type="submit" 
                className="search-btn-premium" 
                disabled={loading || !phone.trim()}
              >
                {loading ? <FaSpinner className="spin" /> : "Tìm kiếm"}
              </button>
            </form>
            {error && <div className="search-error"><FaInfoCircle /> {error}</div>}
          </div>

          {!result && recentSearches.length > 0 && (
            <div className="recent-searches">
              <span className="section-label"><FaHistory /> Tìm kiếm gần đây</span>
              <div className="recent-list">
                {recentSearches.map((p, idx) => (
                  <div key={idx} className="recent-chip" onClick={() => { setPhone(p); }}>
                    {p}
                    <button className="remove-recent" onClick={(e) => removeRecent(e, p)}>
                      <FaTimes fontSize={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="profile-card-premium">
              <div className="profile-avatar-wrap">
                <div className="status-ring"></div>
                <div className="premium-avatar">
                  {result.avatarUrl ? (
                    <img src={result.avatarUrl} alt="" />
                  ) : (
                    result.username?.[0]?.toUpperCase() || "U"
                  )}
                </div>
              </div>
              
              <div className="profile-info">
                <h4>{result.username}</h4>
                <p className="phone-sub">{result.phone || result.email || ""}</p>
              </div>

              <div className={`relationship-badge ${status}`}>
                {status === "friend" && <><FaCheck /> Đã là bạn bè</>}
                {status === "outgoing" && <><FaClock /> Đã gửi lời mời</>}
                {status === "incoming" && <><FaClock /> Đang chờ bạn xác nhận</>}
                {status === "self" && <>Đây là bạn</>}
                {status === "none" && success && <><FaCheck /> Gửi yêu cầu thành công</>}
                {status === "none" && !success && <>Chưa có kết nối</>}
              </div>

              <div className="profile-actions">
                {status === "friend" && (
                  <button className="action-btn-premium btn-primary-premium" onClick={handleAction}>
                    <FaCommentDots /> Nhắn tin ngay
                  </button>
                )}
                
                {status === "none" && !success && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button 
                      className="action-btn-premium btn-primary-premium" 
                      onClick={handleAction}
                      disabled={loading}
                    >
                      {loading ? <FaSpinner className="spin" /> : <><FaUserPlus /> Kết bạn</>}
                    </button>
                    <button
                      className="action-btn-premium"
                      style={{ background:'#f0f2f5', color:'#050505', border:'none' }}
                      onClick={() => handleAction(true)}
                      disabled={loading}
                    >
                      <FaCommentDots /> Nhắn tin
                    </button>
                  </div>
                )}

                {status === "outgoing" && (
                  <button className="action-btn-premium btn-disabled-premium" disabled>
                    Đã gửi yêu cầu
                  </button>
                )}

                {status === "incoming" && (
                  <button className="action-btn-premium btn-primary-premium" onClick={() => navigate("/contacts")}>
                    Xem lời mời kết bạn
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <div className="footer-tip">
            <FaInfoCircle /> Tìm kiếm bằng số điện thoại, email hoặc tên người dùng.
          </div>
        </div>
      </div>
    </div>
  );
}
