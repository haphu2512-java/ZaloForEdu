import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaComments,
  FaAddressBook,
  FaUser,
  FaBell,
  FaCommentDots,
  FaSignOutAlt,
  FaCog,
  FaRobot,
  FaCloud,
  FaSun,
  FaMoon,
  FaTimes,
  FaCheck,
  FaShieldAlt,
  FaDatabase,
  FaGlobe,
  FaQuestionCircle,
  FaUserFriends,
  FaLock,
  FaCommentSlash,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNotificationStore } from "../../store/notificationStore";
import { userService } from "../../services/userService";
import NotificationsPanel from "../../pages/notifications/NotificationsPanel";
import { socketService } from "../../services/socketService"; // Thêm import socketService
import IncomingCallModal from '../../pages/chat/Modals/IncomingCallModal';
import { toast, Toaster } from "react-hot-toast"; // Import toast for push notifications
import "./MainLayout.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name = "") {
  const colors = [
    "#1B6EF3", "#E91E63", "#9C27B0",
    "#FF5722", "#4CAF50", "#FF9800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── SETTINGS MODAL ──────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const { themeMode, setThemeMode } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("general");
  const [notifications, setNotifications] = useState(true);

  // messagePrivacy state — load từ localStorage trước, sync backend sau
  const [messagePrivacy, setMessagePrivacyState] = useState(
    () => localStorage.getItem("messagePrivacy") || "everyone"
  );
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    userService.updateProfile(userId, {}).then?.(() => {}).catch?.(() => {});
    // Lấy giá trị thật từ backend
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        const p = res?.data?.messagePrivacy || res?.messagePrivacy;
        if (p) { setMessagePrivacyState(p); localStorage.setItem("messagePrivacy", p); }
      })
      .catch(() => {});
  }, [user?._id]);

  const handleSavePrivacy = useCallback(async (value) => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    setPrivacySaving(true);
    try {
      await userService.updateProfile(userId, { messagePrivacy: value });
      localStorage.setItem("messagePrivacy", value);
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2000);
    } catch (e) {
      console.error("Lỗi lưu privacy:", e);
    } finally {
      setPrivacySaving(false);
    }
  }, [user?._id]);

  const SETTING_TABS = [
    { id: "general",  label: t("tabGeneral"),  icon: FaCog },
    { id: "messaging", label: "Tin nhắn",      icon: FaCommentSlash },
    { id: "security", label: t("tabSecurity"), icon: FaShieldAlt },
    { id: "data",     label: t("tabData"),     icon: FaDatabase },
    { id: "language", label: t("tabLanguage"), icon: FaGlobe },
    { id: "support",  label: t("tabSupport"),  icon: FaQuestionCircle },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sm-header">
          <h2>{t("settingsTitle")}</h2>
          <button className="sm-close" onClick={onClose}>
            <FaTimes size={16} />
          </button>
        </div>

        <div className="sm-body">
          {/* Left tabs */}
          <div className="sm-tabs">
            {SETTING_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`sm-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={15} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="sm-content">
            {activeTab === "general" && (
              <div className="sm-section-list">
                {/* Theme */}
                <div className="sm-section">
                  <h3>{t("appearance")}</h3>
                  <div className="theme-picker">
                    <button
                      className={`theme-opt ${themeMode === "light" ? "active" : ""}`}
                      onClick={() => setThemeMode("light")}
                    >
                      <FaSun size={20} />
                      <span>{t("themeLight")}</span>
                      {themeMode === "light" && <FaCheck className="theme-check" size={12} />}
                    </button>
                    <button
                      className={`theme-opt ${themeMode === "dark" ? "active" : ""}`}
                      onClick={() => setThemeMode("dark")}
                    >
                      <FaMoon size={20} />
                      <span>{t("themeDark")}</span>
                      {themeMode === "dark" && <FaCheck className="theme-check" size={12} />}
                    </button>
                    <button
                      className={`theme-opt ${themeMode === "system" ? "active" : ""}`}
                      onClick={() => setThemeMode("system")}
                    >
                      <FaCog size={20} />
                      <span>{t("themeSystem")}</span>
                      {themeMode === "system" && <FaCheck className="theme-check" size={12} />}
                    </button>
                  </div>
                  {themeMode === "system" && (
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
                      * Tự động chuyển sang Tối sau 18:00 và Sáng sau 06:00.
                    </p>
                  )}
                </div>

                {/* Notifications */}
                <div className="sm-section">
                  <h3>{t("notifications")}</h3>
                  <div className="sm-row">
                    <span>{t("enableNotifs")}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications}
                        onChange={() => setNotifications(!notifications)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                {/* Language (shortcut) */}
                <div className="sm-section">
                  <h3>{t("languageLabel")}</h3>
                  <div className="sm-row">
                    <span>{t("changeLanguage")}</span>
                    <select
                      className="sm-select"
                      value={language}
                      onChange={(e) => changeLanguage(e.target.value)}
                    >
                      <option value="vi">🇻🇳 Tiếng Việt</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "messaging" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaUserFriends size={16} /> Ai được nhắn tin cho bạn?
                  </h3>
                  <p className="sm-desc" style={{ marginBottom: 16 }}>
                    Kiểm soát ai có thể gửi tin nhắn đến bạn. Người không được phép sẽ thấy thông báo khi cố nhắn tin.
                  </p>

                  {[
                    {
                      value: "everyone",
                      label: "Mọi người",
                      desc: "Tất cả mọi người đều có thể nhắn tin cho bạn",
                      icon: FaGlobe,
                      color: "#0068FF",
                    },
                    {
                      value: "friends",
                      label: "Chỉ bạn bè",
                      desc: "Chỉ những người trong danh sách bạn bè mới có thể nhắn tin",
                      icon: FaUserFriends,
                      color: "#16a34a",
                    },
                  ].map((opt) => {
                    const isSelected = messagePrivacy === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setMessagePrivacyState(opt.value);
                          handleSavePrivacy(opt.value);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? opt.color : "var(--border-color)"}`,
                          background: isSelected ? `${opt.color}0d` : "var(--bg-secondary)",
                          cursor: "pointer",
                          marginBottom: 10,
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: isSelected ? `${opt.color}22` : "var(--bg-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <opt.icon size={17} color={isSelected ? opt.color : "var(--text-secondary)"} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{opt.desc}</div>
                        </div>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `2px solid ${isSelected ? opt.color : "var(--border-color)"}`,
                            background: isSelected ? opt.color : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s",
                          }}
                        >
                          {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                      </div>
                    );
                  })}

                  {/* Status feedback */}
                  <div style={{ marginTop: 8, fontSize: 12, color: privacySaved ? "#16a34a" : "var(--text-secondary)", minHeight: 18, display: "flex", alignItems: "center", gap: 6 }}>
                    {privacySaving && <><FaCog size={11} style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</>}
                    {privacySaved && !privacySaving && <><FaCheck size={11} /> Đã lưu</>}
                    {!privacySaving && !privacySaved && messagePrivacy === "friends" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <FaLock size={11} color="#ef4444" />
                        <span style={{ color: "#ef4444" }}>Chỉ bạn bè mới nhắn được cho bạn</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3>{t("securityTitle")}</h3>
                  <p className="sm-desc">{t("securityDesc")}</p>
                  <button className="sm-action-btn" onClick={() => { onClose(); window.location.href = "/profile"; }}>{t("changePassword")}</button>
                </div>
                <div className="sm-section">
                  <h3>Quyền riêng tư</h3>
                  <div className="sm-row">
                    <span>Danh sách chặn</span>
                    <button className="sm-action-btn" onClick={() => { onClose(); window.location.href = "/blocked"; }}>Xem danh sách</button>
                  </div>
                  <div className="sm-row">
                    <span>Hội thoại đã lưu trữ</span>
                    <button className="sm-action-btn" onClick={() => { onClose(); window.location.href = "/archived"; }}>Xem lưu trữ</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3>{t("dataTitle")}</h3>
                  <p className="sm-desc">{t("dataDesc")}</p>
                  <button className="sm-action-btn danger">{t("clearHistory")}</button>
                </div>
              </div>
            )}

            {activeTab === "language" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3>{t("displayLanguage")}</h3>
                  <div className="sm-row">
                    <span>{t("selectLanguage")}</span>
                    <select
                      className="sm-select"
                      value={language}
                      onChange={(e) => changeLanguage(e.target.value)}
                    >
                      <option value="vi">🇻🇳 Tiếng Việt</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>

                  {/* Preview current language */}
                  <div className="lang-preview">
                    <div className="lang-preview-label">
                      {language === "vi" ? "Đang sử dụng: Tiếng Việt" : "Currently using: English"}
                    </div>
                    <div className="lang-badges">
                      <button
                        className={`lang-badge ${language === "vi" ? "active" : ""}`}
                        onClick={() => changeLanguage("vi")}
                      >
                        🇻🇳 Tiếng Việt
                        {language === "vi" && <FaCheck size={11} />}
                      </button>
                      <button
                        className={`lang-badge ${language === "en" ? "active" : ""}`}
                        onClick={() => changeLanguage("en")}
                      >
                        🇬🇧 English
                        {language === "en" && <FaCheck size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "support" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3>{t("supportTitle")}</h3>
                  <p className="sm-desc">{t("supportDesc")}</p>
                  <button className="sm-action-btn">{t("sendFeedback")}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN LAYOUT ──────────────────────────────────────────────────────────────
export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef(null);
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  // Banner: nhắc user bổ sung thông tin còn thiếu
  const missingPhone = user && !user.phone;
  const missingEmail = user && !user.email;
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    socketService.connect(); // Đảm bảo socket connected khi vào app
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    // Global listener cho push notification khi có tin nhắn mới
    const handleNewMessage = (message) => {
      // 1. Kiểm tra không phải tin nhắn của chính mình
      const myId = user?._id || user?.id || localStorage.getItem('userId');
      const senderIdObj = message?.senderId;
      const senderIdStr = typeof senderIdObj === 'string' ? senderIdObj : (senderIdObj?._id || senderIdObj?.id);
      if (String(senderIdStr) === String(myId)) return;

      // 2. ChatPage tự xử lý notification riêng → không hiện trùng ở đây
      if (window.location.pathname.startsWith('/chat')) return;

      const senderName = senderIdObj?.username || senderIdObj?.fullName || "Ai đó";
      const contentStr = message?.content || (message?.mediaIds?.length ? "Đã gửi tệp đính kèm" : "Có tin nhắn mới");
      const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23d8dadf'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23bcc0c4'/%3E%3Cpath d='M6 35 Q6 26 20 26 Q34 26 34 35' fill='%23bcc0c4'/%3E%3C/svg%3E";
      const avatarSrc = senderIdObj?.avatarUrl || senderIdObj?.avatar || DEFAULT_AVATAR;

      toast.custom((t) => (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            navigate('/chat');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--z-bg-sidebar)',
            color: 'var(--z-text-primary)',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid var(--z-border)',
            cursor: 'pointer',
            minWidth: '280px',
            maxWidth: '350px',
            animation: t.visible ? 'animate-enter 0.3s ease' : 'animate-leave 0.3s ease forwards' // using hot-toast internal anim state
          }}
        >
          <img src={avatarSrc} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{senderName}</div>
            <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{contentStr}</div>
          </div>
        </div>
      ), { position: 'bottom-right', duration: 4000, id: `msg_${message?._id}` });
    };

    socketService.on("new_message", handleNewMessage);

    return () => {
      clearInterval(interval);
      socketService.off("new_message", handleNewMessage);
    };
  }, [user?._id, navigate]);

  // incoming_call được xử lý bởi <IncomingCallModal />

  // Nav items dùng t() để đa ngôn ngữ
  const NAV_ITEMS = [
    { to: "/chat",     icon: FaComments,    label: t("messages"),    badge: 0 },
    { to: "/contacts", icon: FaAddressBook, label: t("contacts"),    badge: 0 },
    { to: "/chatbot",  icon: FaRobot,       label: t("aiBot"),       badge: 0 },
    { to: "/cloud",    icon: FaCloud,       label: t("myDocuments"), badge: 0 },
    { to: "/profile",  icon: FaUser,        label: t("profile"),     badge: 0 },
  ];

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate("/login", { replace: true });
  };

  const displayName = user?.fullName || user?.username || "Người dùng";
  const displayEmail = user?.email || user?.phone || "";

  return (
    <div className="main-layout">
      {/* ── MISSING INFO BANNER ── */}
      {showBanner && (missingPhone || missingEmail) && (
        <div className="missing-info-banner">
          <span>
            {missingPhone && missingEmail
              ? "⚠️ Tài khoản chưa có email và số điện thoại — bạn bè sẽ không tìm thấy bạn."
              : missingPhone
              ? "📱 Thêm số điện thoại để bạn bè dễ tìm thấy bạn hơn."
              : "📧 Thêm email để bảo mật tài khoản và khôi phục mật khẩu."}
          </span>
          <button className="mib-action" onClick={() => { navigate("/profile"); setShowBanner(false); }}>
            Cập nhật ngay
          </button>
          <button className="mib-close" onClick={() => setShowBanner(false)}>✕</button>
        </div>
      )}
      {/* ── SIDEBAR ── */}
      <div className="main-layout-body">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <FaCommentDots size={26} color="white" style={{ transform: "scaleX(-1)" }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? "active" : ""}`
              }
            >
              <div className="sidebar-nav-icon-wrap">
                <item.icon size={22} />
                {item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {/* Notification bell */}
          <div className="sidebar-notif-wrap">
            <button
              className={`sidebar-icon-btn ${showNotifications ? "active" : ""}`}
              title={t("notifications")}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell size={17} />
              {unreadCount > 0 && (
                <span className="sidebar-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Avatar + user menu */}
          <div className="sidebar-avatar-wrap" ref={menuRef}>
            <button
              className="sidebar-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={displayName}
            >
              {(user?.avatarUrl || user?.avatar) ? (
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={displayName}
                  className="sidebar-avatar-img"
                />
              ) : (
                <div
                  className="sidebar-avatar-placeholder"
                  style={{ background: getAvatarColor(displayName) }}
                >
                  {getInitials(displayName)}
                </div>
              )}
              <span className="sidebar-online-dot" />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="sidebar-user-menu">
                <div className="sidebar-user-info">
                  <p className="sidebar-user-email">{displayEmail}</p>
                  <span className="sidebar-user-status">{t("online")}</span>
                </div>
                <div className="sidebar-menu-divider" />

                <button
                  className="sidebar-menu-item"
                  onClick={() => { navigate("/profile"); setShowUserMenu(false); }}
                >
                  <FaUser size={14} /> {t("accountInfo")}
                </button>

                <button
                  className="sidebar-menu-item"
                  onClick={() => { setShowSettings(true); setShowUserMenu(false); }}
                >
                  <FaCog size={14} /> {t("settings")}
                </button>

                <div className="sidebar-menu-divider" />

                <button className="sidebar-menu-item danger" onClick={handleLogout}>
                  <FaSignOutAlt size={14} /> {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        <IncomingCallModal />
      </div>{/* end main-layout-body */}

      {/* Global push notification toasts - must be OUTSIDE main-layout-body to avoid clipping */}
      <Toaster
        position="bottom-right"
        gutter={10}
        containerStyle={{ bottom: 24, right: 24, zIndex: 9999 }}
        toastOptions={{
          custom: {
            style: { background: 'transparent', boxShadow: 'none', padding: 0 },
            duration: 4500,
          },
        }}
      />
    </div>
  );
}