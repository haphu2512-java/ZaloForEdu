import { useState, useEffect } from "react";
import { FaBan, FaSpinner, FaSearch, FaUnlock, FaUserSlash } from "react-icons/fa";
import { blockService } from "../../services/blockService";
import toast from "react-hot-toast";
import "./BlockedUsersPage.css";

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const res = await blockService.getBlockedUsers(1, 50);
      const data = res.data?.data;
      setBlockedUsers(data?.users || data?.blockedUsers || data?.items || []);
    } catch {
      toast.error("Không thể tải danh sách chặn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    if (!window.confirm(`Bỏ chặn ${username}? Người này có thể liên lạc lại với bạn.`)) return;
    setUnblockingId(userId);
    try {
      await blockService.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => (u._id || u.id) !== userId));
      toast.success(`Đã bỏ chặn ${username}`);
    } catch {
      toast.error("Bỏ chặn thất bại");
    } finally {
      setUnblockingId(null);
    }
  };

  const filtered = blockedUsers.filter((u) =>
    (u.username || u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="blocked-page">
      {/* Header */}
      <div className="blocked-header">
        <div className="bh-left">
          <FaBan size={18} color="#ef4444" />
          <div>
            <h2>Danh sách chặn</h2>
            <p>{blockedUsers.length} người dùng bị chặn</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="blocked-search">
        <FaSearch size={13} color="var(--text-tertiary)" />
        <input
          placeholder="Tìm trong danh sách chặn..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="blocked-content">
        {isLoading ? (
          <div className="blocked-loading">
            <FaSpinner className="spin" size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="blocked-empty">
            <FaUserSlash size={48} />
            <h3>{searchQuery ? "Không tìm thấy" : "Chưa chặn ai"}</h3>
            <p>
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác."
                : "Khi bạn chặn ai đó, họ sẽ xuất hiện ở đây."}
            </p>
          </div>
        ) : (
          <div className="blocked-list">
            {filtered.map((user) => {
              const uid = user._id || user.id;
              return (
                <div key={uid} className="blocked-item">
                  <div className="bi-avatar-wrap">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="bi-avatar" alt="" />
                    ) : (
                      <div className="bi-avatar-placeholder">
                        {user.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="bi-ban-badge"><FaBan size={9} /></div>
                  </div>

                  <div className="bi-info">
                    <span className="bi-name">{user.username || "Người dùng"}</span>
                    <span className="bi-sub">{user.email || user.phone || "Không có thông tin"}</span>
                  </div>

                  <button
                    className="bi-unblock-btn"
                    onClick={() => handleUnblock(uid, user.username)}
                    disabled={unblockingId === uid}
                  >
                    {unblockingId === uid ? (
                      <FaSpinner className="spin" size={12} />
                    ) : (
                      <><FaUnlock size={12} /> Bỏ chặn</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="blocked-note">
        <FaBan size={12} />
        <span>Người bị chặn không thể nhắn tin, gọi điện hoặc xem thông tin của bạn.</span>
      </div>
    </div>
  );
}
