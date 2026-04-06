import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaComments,
  FaBook,
  FaChartBar,
  FaUser,
  FaBell,
  FaGraduationCap,
  FaSignOutAlt,
  FaCog,
  FaRobot,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./MainLayout.css";

const NAV_ITEMS = [
  { to: "/home", icon: FaGraduationCap, label: "Trang chủ", badge: 0 },
  { to: "/chat", icon: FaComments, label: "Tin nhắn", badge: 3 },
  { to: "/classes", icon: FaBook, label: "Lớp học", badge: 0 },
  { to: "/chatbot", icon: FaRobot, label: "AI Bot", badge: 0 },
  { to: "/analytics", icon: FaChartBar, label: "Thống kê", badge: 0 },
  { to: "/profile", icon: FaUser, label: "Hồ sơ", badge: 0 },
];

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
    "#1B6EF3",
    "#E91E63",
    "#9C27B0",
    "#FF5722",
    "#4CAF50",
    "#FF9800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Click outside để đóng menu
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

  return (
    <div className="main-layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <FaGraduationCap size={20} color="white" />
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
                <item.icon size={19} />
                {item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </div>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {/* Notification bell */}
          <button className="sidebar-icon-btn" title="Thông báo">
            <FaBell size={17} />
          </button>

          {/* Avatar + user menu */}
          <div className="sidebar-avatar-wrap" ref={menuRef}>
            <button
              className="sidebar-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user?.fullName}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="sidebar-avatar-img"
                />
              ) : (
                <div
                  className="sidebar-avatar-placeholder"
                  style={{ background: getAvatarColor(user?.fullName || "") }}
                >
                  {getInitials(user?.fullName || "")}
                </div>
              )}
              <span className="sidebar-online-dot" />
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="sidebar-user-menu">
                <div className="sidebar-user-info">
                  <p className="sidebar-user-name">{user?.fullName}</p>
                  <p className="sidebar-user-email">{user?.email}</p>
                  <span className="sidebar-user-role">
                    {user?.role === "teacher"
                      ? "👨‍🏫 Giảng viên"
                      : "🎓 Sinh viên"}
                  </span>
                </div>
                <div className="sidebar-menu-divider" />
                <button
                  className="sidebar-menu-item"
                  onClick={() => {
                    navigate("/profile");
                    setShowUserMenu(false);
                  }}
                >
                  <FaCog size={13} /> Cài đặt
                </button>
                <button
                  className="sidebar-menu-item danger"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt size={13} /> Đăng xuất
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
    </div>
  );
}
