import { useState, useEffect } from "react";
import {
  FaSearch, FaUserPlus, FaTimes, FaSpinner, FaCheck,
  FaCommentDots, FaClock, FaUserFriends
} from "react-icons/fa";
import { friendService } from "../../services/friendService";
import { useFriendStore } from "../../store/friendStore";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../../services/authService";

export default function AddFriendModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { friends, incomingRequests, outgoingRequests, fetchFriends, fetchIncomingRequests, fetchOutgoingRequests } = useFriendStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      // Fetch đồng thời, sau đó reset state
      Promise.all([fetchFriends(), fetchIncomingRequests(), fetchOutgoingRequests()]).then(() => {
        setQuery(""); setResult(null); setError(""); setRequestSent(false);
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const getStatus = () => {
    if (!result || !currentUser) return null;
    const id = String(result._id || result.id);
    const myId = String(currentUser._id || currentUser.id);
    if (id === myId) return "self";
    if (friends.some(f => String(f._id || f.id) === id)) return "friend";
    if (outgoingRequests.some(r => String(r.toUserId?._id || r.toUserId || '') === id)) return "outgoing";
    if (incomingRequests.some(r => String(r.fromUserId?._id || r.fromUserId || '') === id)) return "incoming";
    return "none";
  };

  const status = getStatus();

  // Lấy requestId của lời mời đã gửi (để hủy)
  const getOutgoingRequestId = () => {
    if (!result) return null;
    const id = String(result._id || result.id);
    const req = outgoingRequests.find(r => {
      const toId = String(r.toUserId?._id || r.toUserId || '');
      return toId === id;
    });
    return req?._id;
  };

  const handleCancelRequest = async () => {
    const requestId = getOutgoingRequestId();
    if (!requestId) {
      setError("Không tìm thấy lời mời để hủy.");
      return;
    }
    setCancelLoading(true);
    try {
      await friendService.cancelFriendRequest(requestId);
      setRequestSent(false);
      await fetchOutgoingRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể hủy lời mời.");
    } finally { setCancelLoading(false); }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(""); setResult(null); setRequestSent(false);
    try {
      const data = await friendService.searchUsers(query.trim());
      const found = data.items?.find(u => u.phone === query.trim()) || data.items?.[0];
      if (found) setResult(found);
      else setError("Không tìm thấy người dùng nào.");
    } catch { setError("Lỗi kết nối máy chủ."); }
    finally { setLoading(false); }
  };

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      await friendService.sendFriendRequest(result._id || result.id);
      setRequestSent(true);
      fetchOutgoingRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi lời mời.");
    } finally { setLoading(false); }
  };

  const handleChat = async () => {
    setChatLoading(true);
    try {
      const res = await api.post("/conversations", {
        type: "direct",
        participantIds: [result._id || result.id],
      });
      onClose();
      navigate("/chat", { state: { activeConversationId: res.data.data._id } });
    } catch { setError("Không thể mở cuộc trò chuyện."); }
    finally { setChatLoading(false); }
  };

  const avatarBg = ['#0068FF','#10B981','#F59E0B','#EF4444','#8B5CF6'];
  const getColor = (name) => avatarBg[(name?.charCodeAt(0) || 0) % avatarBg.length];

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--bg-primary)', borderRadius:12, width:420, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)' }}>Thêm bạn mới</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>Tìm qua số điện thoại, email hoặc tên người dùng</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:4, borderRadius:6 }}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding:'16px 20px' }}>
          <form onSubmit={handleSearch} style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'var(--input-bg)', border:'1px solid var(--border-color)', borderRadius:8, padding:'8px 12px' }}>
              <FaSearch size={13} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Nhập SĐT, email hoặc tên..."
                style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:14, color:'var(--text-primary)' }}
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResult(null); setError(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:0 }}>
                  <FaTimes size={12} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{ padding:'8px 18px', background:'var(--primary-color)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', opacity: (!query.trim() || loading) ? 0.6 : 1 }}
            >
              {loading ? <FaSpinner className="spin" size={14} /> : 'Tìm kiếm'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop:10, fontSize:13, color:'#ef4444', display:'flex', alignItems:'center', gap:6 }}>
              <FaTimes size={12} /> {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div style={{ padding:'0 20px 20px' }}>
            <div style={{ border:'1px solid var(--border-color)', borderRadius:10, padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              {/* Avatar */}
              <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', background: getColor(result.username), display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {result.avatarUrl
                  ? <img src={result.avatarUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : (result.username?.[0]?.toUpperCase() || 'U')
                }
              </div>

              {/* Name & info */}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)' }}>{result.username}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{result.phone || result.email || ''}</div>
              </div>

              {/* Status badge */}
              <div style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:'var(--bg-secondary)', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5 }}>
                {status === 'friend' && <><FaUserFriends size={11} /> Đã là bạn bè</>}
                {(status === 'outgoing' || requestSent) && <><FaClock size={11} /> Đã gửi lời mời, chờ xác nhận</>}
                {status === 'incoming' && <><FaClock size={11} /> Đang chờ bạn xác nhận</>}
                {status === 'self' && <>Đây là tài khoản của bạn</>}
                {status === 'none' && !requestSent && <>Chưa có kết nối</>}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {/* Nhắn tin — luôn hiện trừ self */}
                {status !== 'self' && (
                  <button
                    onClick={handleChat}
                    disabled={chatLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-primary)', cursor:'pointer', fontWeight:600, fontSize:13 }}
                  >
                    {chatLoading ? <FaSpinner size={13} className="spin" /> : <FaCommentDots size={13} />}
                    Nhắn tin
                  </button>
                )}

                {/* Kết bạn — chỉ khi chưa kết bạn */}
                {status === 'none' && !requestSent && (
                  <button
                    onClick={handleSendRequest}
                    disabled={loading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'var(--primary-color)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
                  >
                    {loading ? <FaSpinner size={13} className="spin" /> : <FaUserPlus size={13} />}
                    Kết bạn
                  </button>
                )}

                {/* Đã gửi lời mời — có nút hủy */}
                {(status === 'outgoing' || requestSent) && (
                  <button
                    onClick={handleCancelRequest}
                    disabled={cancelLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:600, fontSize:13 }}
                  >
                    {cancelLoading ? <FaSpinner size={13} className="spin" /> : <FaTimes size={13} />}
                    Hủy lời mời
                  </button>
                )}

                {/* Xem lời mời đến */}
                {status === 'incoming' && (
                  <button
                    onClick={() => { onClose(); navigate('/contacts'); }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'var(--primary-color)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
                  >
                    <FaCheck size={13} /> Xem lời mời
                  </button>
                )}

                {/* Nhắn tin ngay nếu đã là bạn */}
                {status === 'friend' && (
                  <button
                    onClick={handleChat}
                    disabled={chatLoading}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'var(--primary-color)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
                  >
                    {chatLoading ? <FaSpinner size={13} className="spin" /> : <FaCommentDots size={13} />}
                    Nhắn tin ngay
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-color)', fontSize:12, color:'var(--text-tertiary)', display:'flex', alignItems:'center', gap:6 }}>
          <FaSearch size={11} /> Tìm kiếm bằng số điện thoại, email hoặc tên người dùng.
        </div>
      </div>
    </div>
  );
}
