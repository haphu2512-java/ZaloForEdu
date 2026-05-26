import { useState, useEffect } from "react";
import { FaArchive, FaSpinner, FaSearch, FaInbox, FaTrash, FaUsers, FaUser } from "react-icons/fa";
import { conversationService } from "../../services/conversationService";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../../store/chatStore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import "./ArchivedConversationsPage.css";
import { DEFAULT_AVATAR } from '../../utils/constants';


function getConvName(conv, myUserId) {
  if (conv.type === "group") return conv.name || "Nhóm";
  const other = conv.participants?.find((p) => (p._id || p.id) !== myUserId);
  return other?.username || "Người dùng";
}


function getConvAvatar(conv, myUserId) {
  if (conv.type === "group") return conv.avatarUrl || DEFAULT_AVATAR;
  const other = conv.participants?.find((p) => (p._id || p.id) !== myUserId);
  return other?.avatarUrl || DEFAULT_AVATAR;
}

export default function ArchivedConversationsPage({ myUserId }) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();
  const { setActiveRoom } = useChatStore();

  useEffect(() => {
    loadArchived();
  }, []);

  const loadArchived = async () => {
    setIsLoading(true);
    try {
      const res = await conversationService.getArchivedConversations(null, 50);
      const data = res.data?.data;
      setConversations(data?.items || data?.conversations || []);
    } catch {
      toast.error("Không thể tải hội thoại đã lưu trữ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async (e, conv) => {
    e.stopPropagation();
    const id = conv._id || conv.id;
    setProcessingId(id);
    try {
      await conversationService.unarchiveConversation(id);
      setConversations((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success("Đã khôi phục hội thoại");
    } catch {
      toast.error("Khôi phục thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (e, conv) => {
    e.stopPropagation();
    if (!window.confirm("Xóa hội thoại này? Hành động không thể hoàn tác.")) return;
    const id = conv._id || conv.id;
    setProcessingId(id);
    try {
      await conversationService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success("Đã xóa hội thoại");
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpen = (conv) => {
    setActiveRoom(conv);
    navigate("/chat");
  };

  const filtered = conversations.filter((c) => {
    const name = getConvName(c, myUserId);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="archived-page">
      <div className="archived-header">
        <div className="ah-left">
          <FaArchive size={18} color="#f59e0b" />
          <div>
            <h2>Hội thoại đã lưu trữ</h2>
            <p>{conversations.length} hội thoại</p>
          </div>
        </div>
      </div>

      <div className="archived-search">
        <FaSearch size={13} color="var(--text-tertiary)" />
        <input
          placeholder="Tìm hội thoại..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="archived-content">
        {isLoading ? (
          <div className="archived-loading"><FaSpinner className="spin" size={24} /></div>
        ) : filtered.length === 0 ? (
          <div className="archived-empty">
            <FaArchive size={48} />
            <h3>{searchQuery ? "Không tìm thấy" : "Chưa có hội thoại nào"}</h3>
            <p>
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác."
                : "Các hội thoại bạn lưu trữ sẽ xuất hiện ở đây."}
            </p>
          </div>
        ) : (
          <div className="archived-list">
            {filtered.map((conv) => {
              const id = conv._id || conv.id;
              const name = getConvName(conv, myUserId);
              const avatar = getConvAvatar(conv, myUserId);
              const isGroup = conv.type === "group";
              const lastMsg = conv.latestMessage?.content || "Chưa có tin nhắn";
              const lastTime = conv.lastMessageAt
                ? format(new Date(conv.lastMessageAt), "dd/MM/yyyy")
                : "";

              return (
                <div key={id} className="archived-item" onClick={() => handleOpen(conv)}>
                  <div className="ai-avatar-wrap">
                    <img src={avatar} className="ai-avatar" alt="" onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                    <div className={`ai-type-badge ${isGroup ? "group" : "dm"}`}>
                      {isGroup ? <FaUsers size={8} /> : <FaUser size={8} />}
                    </div>
                  </div>

                  <div className="ai-info">
                    <span className="ai-name">{name}</span>
                    <span className="ai-last">{lastMsg}</span>
                  </div>

                  <div className="ai-meta">
                    <span className="ai-time">{lastTime}</span>
                    <div className="ai-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="ai-btn restore"
                        onClick={(e) => handleUnarchive(e, conv)}
                        disabled={processingId === id}
                        title="Khôi phục"
                      >
                        {processingId === id ? <FaSpinner className="spin" size={11} /> : <FaInbox size={11} />}
                      </button>
                      <button
                        className="ai-btn delete"
                        onClick={(e) => handleDelete(e, conv)}
                        disabled={processingId === id}
                        title="Xóa"
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="archived-note">
        <FaArchive size={12} />
        <span>Hội thoại lưu trữ không hiển thị trong danh sách tin nhắn chính.</span>
      </div>
    </div>
  );
}
