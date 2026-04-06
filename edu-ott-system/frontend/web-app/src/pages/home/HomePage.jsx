import { useNavigate } from "react-router-dom";
import {
  FaBook,
  FaComments,
  FaArrowRight,
  FaPlus,
  FaSignInAlt,
  FaChalkboardTeacher,
  FaRocket,
  FaGraduationCap,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useClassStore } from "../../store/classStore";
import { useEffect } from "react";
import "./HomePage.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

// ── STUDENT HOME ───────
function StudentHome({ user, navigate }) {
  return (
    <div className="home-page student-home">
      <div className="student-hero">
        <div className="student-hero-text">
          <p className="home-greeting">{getGreeting()}, 👋</p>
          <h1 className="home-username">{user?.fullName || "Bạn"}</h1>
          <p className="student-tagline">
            Chào mừng đến với nền tảng học tập Zalo Education. Hãy bắt đầu hành
            trình tri thức của bạn ngay hôm nay!
          </p>
        </div>
        <div className="student-hero-badge">
          <FaGraduationCap size={48} color="#1B6EF3" />
        </div>
      </div>

      <div className="student-actions-grid">
        <div
          className="student-action-card primary"
          onClick={() => navigate("/chat")}
        >
          <div className="sa-icon">
            <FaComments size={26} />
          </div>
          <div className="sa-content">
            <h3>Tin nhắn</h3>
            <p>Kết nối với thầy cô và bạn bè của bạn</p>
          </div>
          <FaArrowRight className="sa-arrow" />
        </div>

        <div
          className="student-action-card"
          onClick={() => navigate("/classes")}
        >
          <div className="sa-icon blue">
            <FaBook size={26} />
          </div>
          <div className="sa-content">
            <h3>Lớp học của tôi</h3>
            <p>Xem tài liệu, bài tập và thông báo từ giảng viên</p>
          </div>
          <FaArrowRight className="sa-arrow" />
        </div>

        <div
          className="student-action-card accent"
          onClick={() => navigate("/classes")}
        >
          <div className="sa-icon purple">
            <FaSignInAlt size={26} />
          </div>
          <div className="sa-content">
            <h3>Tham gia lớp học mới</h3>
            <p>Nhập mã lớp từ giảng viên để gia nhập</p>
          </div>
          <FaArrowRight className="sa-arrow" />
        </div>
      </div>

      <div className="student-tip-box">
        <FaRocket size={18} color="#f59e0b" />
        <p>
          Tip: Bấm vào tab <strong>Lớp học</strong> ở thanh bên trái để xem tất
          cả các lớp bạn đã tham gia và nhận thông báo mới nhất từ giảng viên.
        </p>
      </div>
    </div>
  );
}

// ── TEACHER HOME ───────
function TeacherHome({ user, navigate, classes }) {
  const recentClasses = classes.slice(0, 3);

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <div>
          <p className="home-greeting">{getGreeting()}, 👋</p>
          <h1 className="home-username">{user?.fullName || "Giảng viên"}</h1>
          <span className="home-role-badge">👨‍🏫 Giảng viên</span>
        </div>
        <button
          className="home-create-btn"
          onClick={() => navigate("/classes")}
        >
          <FaPlus size={12} /> Tạo lớp mới
        </button>
      </div>

      {/* Quick Stats */}
      <div className="home-stats">
        <div className="home-stat-card">
          <div
            className="home-stat-icon"
            style={{ background: "#eff6ff", color: "#1B6EF3" }}
          >
            <FaBook size={18} />
          </div>
          <div className="home-stat-value">{classes.length}</div>
          <div className="home-stat-label">Lớp đang dạy</div>
        </div>
        <div className="home-stat-card">
          <div
            className="home-stat-icon"
            style={{ background: "#fdf4ff", color: "#9C27B0" }}
          >
            <FaChalkboardTeacher size={18} />
          </div>
          <div className="home-stat-value">
            {classes.reduce(
              (acc, c) => acc + (c.students?.length || c.studentCount || 0),
              0,
            )}
          </div>
          <div className="home-stat-label">Tổng sinh viên</div>
        </div>
        <div className="home-stat-card">
          <div
            className="home-stat-icon"
            style={{ background: "#fff7ed", color: "#f59e0b" }}
          >
            <FaComments size={18} />
          </div>
          <div className="home-stat-value">
            {classes.reduce((acc, c) => acc + (c.unread || 0), 0) || "—"}
          </div>
          <div className="home-stat-label">Tin chưa đọc</div>
        </div>
      </div>

      {/* Recent Classes */}
      <div className="home-body">
        <div className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">
              <FaBook size={13} color="#1B6EF3" /> Lớp học gần đây
            </h2>
            <button
              className="home-see-all"
              onClick={() => navigate("/classes")}
            >
              Xem tất cả <FaArrowRight size={11} />
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="teacher-empty-classes">
              <FaChalkboardTeacher size={40} color="#d1d5db" />
              <p>Bạn chưa tạo lớp học nào. Hãy bắt đầu ngay!</p>
              <button
                className="home-create-btn"
                onClick={() => navigate("/classes")}
              >
                <FaPlus size={12} /> Tạo lớp đầu tiên
              </button>
            </div>
          ) : (
            <div className="home-class-list">
              {recentClasses.map((cls) => {
                const gradients = [
                  "#1B6EF3",
                  "#9C27B0",
                  "#E91E63",
                  "#10b981",
                  "#f59e0b",
                ];
                const color =
                  gradients[cls.name.charCodeAt(0) % gradients.length];
                return (
                  <div
                    key={cls._id}
                    className="home-class-card"
                    onClick={() => navigate(`/classes/${cls._id}`)}
                  >
                    <div
                      className="home-class-bar"
                      style={{ background: color }}
                    />
                    <div className="home-class-body">
                      <div className="home-class-top">
                        <div>
                          <h3 className="home-class-name">{cls.name}</h3>
                          <p className="home-class-code">{cls.code}</p>
                        </div>
                        {cls.unread > 0 && (
                          <span className="home-class-unread">
                            {cls.unread}
                          </span>
                        )}
                      </div>
                      <div className="home-class-footer">
                        <span className="home-class-info">
                          👥 {cls.students?.length || cls.studentCount || 0}{" "}
                          sinh viên
                        </span>
                        {cls.subject && (
                          <span className="home-class-info">
                            📚 {cls.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuthStore();
  const { classes, fetchClasses } = useClassStore();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    if (isTeacher) fetchClasses();
  }, [isTeacher]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isTeacher)
    return <TeacherHome user={user} navigate={navigate} classes={classes} />;
  return <StudentHome user={user} navigate={navigate} />;
}
