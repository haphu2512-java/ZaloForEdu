import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaArrowRight,
  FaSpinner,
  FaComments,
  FaBookOpen,
  FaRobot,
  FaChartBar,
  FaHandPeace,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./LoginPage.css";

const FEATURES = [
  {
    icon: <FaComments size={17} color="white" />,
    text: "Chat real-time với lớp học & nhóm",
  },
  {
    icon: <FaBookOpen size={17} color="white" />,
    text: "Quản lý lớp học & tài liệu thông minh",
  },
  {
    icon: <FaRobot size={17} color="white" />,
    text: "AI Chatbot hỗ trợ học tập 24/7",
  },
  {
    icon: <FaChartBar size={17} color="white" />,
    text: "Thống kê hoạt động học tập chi tiết",
  },
];

const STATS = [
  { num: "10K+", label: "Sinh viên" },
  { num: "500+", label: "Lớp học" },
  { num: "98%", label: "Hài lòng" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState([]);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [authErrorCode, setAuthErrorCode] = useState("");

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Feature stagger animation
  useEffect(() => {
    if (!mounted) return;
    FEATURES.forEach((_, i) => {
      setTimeout(
        () => {
          setVisibleFeatures((prev) => [...prev, i]);
        },
        400 + i * 130,
      );
    });
  }, [mounted]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    clearError();
  };

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6)
      errs.password = "Mật khẩu tối thiểu 6 ký tự";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setUnverifiedEmail("");
    setAuthErrorCode("");
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.role === 'admin') {
        navigate("/admin");
      } else if (result.role === 'teacher') {
        navigate("/classes");
      } else {
        navigate("/chat");
      }
    } else {
      setAuthErrorCode(result.errorCode);
      if (result.errorCode === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(result.email);
      }
    }
  };

  return (
    <div className="login-page">
      {/* ═══ LEFT ═══ */}
      <div className="login-left">
        <div className="login-left-dots" />
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className={`login-left-content ${mounted ? "visible" : ""}`}>
          <div className="login-badge">✦ EDUCATION OTT PLATFORM</div>

          <h1 className="login-heading">
            Học tập không
            <br />
            <span className="login-heading-gradient">giới hạn</span>
          </h1>

          <p className="login-desc">
            Nền tảng giao tiếp giáo dục thế hệ mới — kết nối sinh viên và giảng
            viên trong không gian học tập số.
          </p>

          <div className="login-features">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`login-feature-item ${visibleFeatures.includes(i) ? "visible" : ""}`}
              >
                <div className="login-feature-icon">{f.icon}</div>{" "}
                {/* ← chỗ này, không cần sửa */}
                <span className="login-feature-text">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="login-stats">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="login-stat-num">{s.num}</div>
                <div className="login-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating card */}
        <div className="login-float-card">
          <div className="login-float-card-icon">
            <FaGraduationCap size={18} color="white" />
          </div>
          <div>
            <div className="login-float-card-title">IUH · Nhóm 3</div>
            <div className="login-float-card-sub">Zalo Education</div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT ═══ */}
      <div className="login-right">
        <div className="login-right-topbar" />

        <div className={`login-form-wrap ${mounted ? "visible" : ""}`}>
          {/* Logo */}
          <div className="login-logo-wrap">
            <div className="login-logo-box">
              <FaGraduationCap size={26} color="white" />
            </div>
            <h2 className="login-form-title">Đăng nhập</h2>
            <p className="login-form-sub">
              Chào mừng bạn quay trở lại{" "}
              <FaHandPeace
                size={14}
                color="#1B6EF3"
                style={{ display: "inline", marginLeft: 4 }}
              />
            </p>
          </div>

          {/* API error */}
          {error && (
            <div 
              className="login-error-box" 
              style={
                authErrorCode && authErrorCode.startsWith("ACCOUNT_LOCKED") 
                  ? { backgroundColor: "#fee2e2", borderLeft: "4px solid #ef4444", color: "#991b1b" } 
                  : {}
              }
            >
              {authErrorCode && authErrorCode.startsWith("ACCOUNT_LOCKED") ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FaLock size={14} color="#ef4444" />
                  <strong>Tạm thời khóa: </strong> {error}
                </div>
              ) : (
                error
              )}

              {unverifiedEmail && (
                <div style={{ marginTop: 10 }}>
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                    style={{
                      color: "#b91c1c",
                      fontWeight: 700,
                      textDecoration: "underline",
                      fontSize: 13,
                    }}
                  >
                    Bấm vào đây để xác thực ngay →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="name@university.edu"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`form-input ${fieldErrors.email ? "has-error" : ""}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="input-error">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={`form-input form-input-pr ${fieldErrors.password ? "has-error" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="input-error">{fieldErrors.password}</p>
              )}
            </div>

            {/* Forgot */}
            <div className="forgot-link">
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            {/* Submit */}
            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FaSpinner size={15} className="spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập
                  <FaArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">HOẶC</span>
            <div className="divider-line" />
          </div>

          <p className="login-register-text">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay →</Link>
          </p>
        </div>

        <p className="login-footer">© 2026 Zalo Edu · IUH · Nhóm 3</p>
      </div>
    </div>
  );
}
