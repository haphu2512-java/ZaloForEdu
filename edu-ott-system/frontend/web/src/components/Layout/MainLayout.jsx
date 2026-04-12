import { useState, useEffect, useRef } from "react";
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
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
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
  const { theme, setTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("general");
  const [notifications, setNotifications] = useState(true);

  const SETTING_TABS = [
    { id: "general",  label: t("tabGeneral"),  icon: FaCog },
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
                      className={`theme-opt ${theme === "light" ? "active" : ""}`}
                      onClick={() => setTheme("light")}
                    >
                      <FaSun size={20} />
                      <span>{t("themeLight")}</span>
                      {theme === "light" && <FaCheck className="theme-check" size={12} />}
                    </button>
                    <button
                      className={`theme-opt ${theme === "dark" ? "active" : ""}`}
                      onClick={() => setTheme("dark")}
                    >
                      <FaMoon size={20} />
                      <span>{t("themeDark")}</span>
                      {theme === "dark" && <FaCheck className="theme-check" size={12} />}
                    </button>
                  </div>
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

            {activeTab === "security" && (
              <div className="sm-section-list">
                <div className="sm-section">
                  <h3>{t("securityTitle")}</h3>
                  <p className="sm-desc">{t("securityDesc")}</p>
                  <button className="sm-action-btn">{t("changePassword")}</button>
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
  const menuRef = useRef(null);

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
      {/* ── SIDEBAR ── */}
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
          <button className="sidebar-icon-btn" title={t("notifications")}>
            <FaBell size={17} />
          </button>

          {/* Avatar + user menu */}
          <div className="sidebar-avatar-wrap" ref={menuRef}>
            <button
              className="sidebar-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={displayName}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
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
    </div>
  );
}
