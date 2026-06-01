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
import NotificationSettings from "../NotificationSettings";
import { socketService } from "../../services/socketService"; // Thêm import socketService
import IncomingCallModal from '../../pages/chat/Modals/IncomingCallModal';
import { toast, Toaster } from "react-hot-toast"; // Import toast for push notifications
import "./MainLayout.css";
import { DEFAULT_AVATAR } from '../../utils/constants';


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

  // messagePrivacy state — load từ localStorage trước, sync backend sau
  const [messagePrivacy, setMessagePrivacyState] = useState(
    () => localStorage.getItem("messagePrivacy") || "everyone"
  );
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    userService.updateProfile(userId, {}).then?.(() => { }).catch?.(() => { });
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
      .catch(() => { });
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
    { id: "general", label: t("tabGeneral"), icon: FaCog },
    { id: "messaging", label: "Tin nhắn", icon: FaCommentSlash },
    { id: "security", label: t("tabSecurity"), icon: FaShieldAlt },
    { id: "data", label: t("tabData"), icon: FaDatabase },
    { id: "language", label: t("tabLanguage"), icon: FaGlobe },
    { id: "support", label: t("tabSupport"), icon: FaQuestionCircle },
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

                {/* Notifications - Now using NotificationSettings component */}
                <div className="sm-section">
                  <NotificationSettings />
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

                <div className="sm-section">
                  <h3>Về hệ thống</h3>
                  <div className="sm-row">
                    <span>Tên ứng dụng</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Zalo Edu Web</span>
                  </div>
                  <div className="sm-row">
                    <span>Phiên bản</span>
                    <span style={{ fontWeight: 600 }}>1.0.0</span>
                  </div>
                  <div className="sm-row">
                    <span>Năm phát hành</span>
                    <span style={{ fontWeight: 600 }}>2026</span>
                  </div>
                </div>

                <div className="sm-section">
                  <h3>Quản lý phiên đăng nhập</h3>
                  <p className="sm-desc">Đăng xuất khỏi tất cả thiết bị đang đăng nhập</p>
                  <button
                    className="sm-action-btn danger"
                    onClick={async () => {
                      if (!window.confirm('Bạn có chắc chắn muốn đăng xuất trên tất cả thiết bị?')) return;
                      try {
                        const { authService } = await import('../../services/authService');
                        await authService.logoutAll();
                        alert('Đã đăng xuất trên tất cả thiết bị thành công!');
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        sessionStorage.clear();
                        window.dispatchEvent(new Event('user-logout'));
                        window.location.href = '/login';
                      } catch (error) {
                        console.error('Lỗi đăng xuất tất cả thiết bị:', error);
                        alert(error.response?.data?.message || 'Đăng xuất thất bại!');
                      }
                    }}
                  >
                    Đăng xuất tất cả thiết bị
                  </button>
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

  // Modal nhắc bổ sung thông tin — chỉ hiện 1 lần mỗi session đăng nhập
  const missingPhone = user && !user.phone;
  const missingEmail = user && !user.email;
  const DISMISSED_KEY = `profile_hint_dismissed_${user?._id || user?.id}`;
  const [showProfileHint, setShowProfileHint] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!(missingPhone || missingEmail)) return;
    const alreadyDismissed = localStorage.getItem(DISMISSED_KEY);
    if (!alreadyDismissed) {
      // trì hoãn 1.2s sau khi login để tránh hiện ngay lập tức
      const t = setTimeout(() => setShowProfileHint(true), 1200);
      return () => clearTimeout(t);
    }
  }, [user?._id]);

  const handleDismissHint = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowProfileHint(false);
  };

  const handleGoToProfile = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowProfileHint(false);
    navigate('/profile');
  };

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

      // 3. Lấy thông tin cuộc hội thoại để kiểm tra Mute và Group format
      const payloadConvId = message?.conversationId?._id || message?.conversationId;
      const convIdStr = String(payloadConvId);
      const conv = window.globalConversations?.find(c => String(c._id) === convIdStr);
      
      const isMuted = conv?.preference?.mutedUntil && new Date(conv.preference.mutedUntil) > new Date();
      if (isMuted) return; // Không hiển thị Toast nếu cuộc hội thoại đang bị tắt thông báo

      const senderName = senderIdObj?.username || senderIdObj?.fullName || "Ai đó";
      const rawContent = message?.content || '';
      const mediaPreview = message?.mediaIds?.length ? "Đã gửi tệp đính kèm" : "Có tin nhắn mới";

      let subTitle = '';
      let contentStr = rawContent || mediaPreview;

      if (conv?.type === 'group' || conv?.roomModel === 'Group') {
        const groupName = conv.name || 'nhóm';
        subTitle = `đã gửi tin nhắn đến nhóm ${groupName}`;
      }

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
            animation: t.visible ? 'animate-enter 0.3s ease' : 'animate-leave 0.3s ease forwards'
          }}
        >
          <img src={avatarSrc} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{senderName}</div>
            {subTitle && (
              <div style={{ fontSize: 11, color: 'var(--z-primary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subTitle}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{contentStr}</div>
          </div>
        </div>
      ), { position: 'bottom-right', duration: 4000, id: `msg_${message?._id}` });
    };

    socketService.on("new_message", handleNewMessage);

    // Listen for force logout event (when user logs out from another device)
    const handleForceLogout = () => {
      console.log('[MainLayout] Force logout received from server');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
      window.dispatchEvent(new Event('user-logout'));
      navigate('/login', { replace: true });
    };

    socketService.on("force_logout", handleForceLogout);

    return () => {
      clearInterval(interval);
      socketService.off("new_message", handleNewMessage);
      socketService.off("force_logout", handleForceLogout);
    };
  }, [user?._id, navigate]);

  // incoming_call được xử lý bởi <IncomingCallModal />

  // Nav items dùng t() để đa ngôn ngữ
  const NAV_ITEMS = [
    { to: "/chat", icon: FaComments, label: t("messages"), badge: 0 },
    { to: "/contacts", icon: FaAddressBook, label: t("contacts"), badge: 0 },
    { to: "/chatbot", icon: FaRobot, label: t("aiBot"), badge: 0 },
    { to: "/cloud", icon: FaCloud, label: t("myDocuments"), badge: 0 },
    { to: "/profile", icon: FaUser, label: t("profile"), badge: 0 },
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
      {/* ── PROFILE HINT MODAL (hiện 1 lần sau khi login) ── */}
      {showProfileHint && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.25s ease',
        }} onClick={handleDismissHint}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 20,
            padding: '32px 36px',
            maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            position: 'relative',
            animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }} onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={handleDismissHint} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'var(--bg-secondary)', border: 'none',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16,
            }}>✕</button>

            {/* Icon */}
            <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>
              {missingPhone && missingEmail ? '⚠️' : missingPhone ? '📱' : '📧'}
            </div>

            {/* Title */}
            <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
              Bổ sung thông tin tài khoản
            </h3>

            {/* Desc */}
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
              {missingPhone && missingEmail
                ? 'Tài khoản chưa có email lẫn số điện thoại. Bạn bè sẽ không tìm thấy bạn và bạn không thể khôi phục mật khẩu.'
                : missingPhone
                  ? 'Thêm số điện thoại để bạn bè có thể tìm thấy bạn và đăng nhập bằng SĐT.'
                  : 'Thêm email để bảo mật tài khoản và dễ dàng khôi phục mật khẩu.'}
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleDismissHint} style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: '1.5px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>Để sau</button>
              <button onClick={handleGoToProfile} style={{
                flex: 2, padding: '12px', borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,104,255,0.3)',
              }}>Cập nhật ngay →</button>
            </div>

            {/* Never show again */}
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)' }}>
              Thông báo này sẽ không hiện lại sau khi bạn tắt.
            </p>
          </div>
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