import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope, FaLock, FaEye, FaEyeSlash, FaPhone,
  FaArrowRight, FaSpinner, FaComments, FaHandPeace, FaHeart,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [tab, setTab] = useState("email"); // "email" | "phone"
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleTabChange = (t) => {
    setTab(t);
    setForm({ identifier: "", password: "" });
    setFieldErrors({});
    clearError();
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    clearError();
  };

  const validate = () => {
    const errs = {};
    if (!form.identifier.trim()) {
      errs.identifier = tab === "email" ? "Vui lòng nhập email" : "Vui lòng nhập số điện thoại";
    } else if (tab === "email" && !/^[^\s@]+@gmail\.com$/.test(form.identifier)) {
      errs.identifier = "Chỉ hỗ trợ đăng nhập bằng tài khoản @gmail.com";
    } else if (tab === "phone" && !/^\+?\d{9,15}$/.test(form.identifier.replace(/\s/g, ""))) {
      errs.identifier = "Số điện thoại không hợp lệ";
    }
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload =
      tab === "email"
        ? { email: form.identifier, password: form.password }
        : { phone: form.identifier.replace(/\s/g, ""), password: form.password };
    const result = await login(payload);
    if (result.success) {
      navigate(result.role === "admin" ? "/admin" : "/chat");
    }
  };

  return (
    <div className="auth-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        
        {/* Decor Chat Bubbles */}
        <div className="decor-bubble decor-bubble-1" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Chào bạn! Mới tới à <FaHandPeace color="#f59e0b" />
        </div>
        <div className="decor-bubble decor-bubble-2" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          ZaloApp gửi ngàn lời yêu thương <FaHeart color="#fda4af" />
        </div>

        <div className="auth-left-content">
          <div className="auth-left-badge">🚀 TRẢI NGHIỆM ĐỈNH CAO</div>
          <h1 className="auth-left-heading">
            Trò chuyện<br />
            <span className="auth-gradient-text">đầy màu sắc</span>
          </h1>
          <p className="auth-left-desc">
            Không khoảng cách — Không giới hạn. Cùng ZaloApp xoá nhoà ranh giới, kết nối bạn bè khắp bốn phương trong nháy mắt!
          </p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="auth-right">
        <div className={`auth-card ${mounted ? "visible" : ""}`}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <FaComments size={22} color="white" />
          </div>
          <h1 className="auth-logo-title">ZaloApp</h1>
        </div>
        <p className="auth-tagline">Chào mừng bạn quay trở lại 👋</p>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "email" ? "active" : ""}`}
            onClick={() => handleTabChange("email")}
            type="button"
          >
            <FaEnvelope size={13} /> Email
          </button>
          <button
            className={`auth-tab ${tab === "phone" ? "active" : ""}`}
            onClick={() => handleTabChange("phone")}
            type="button"
          >
            <FaPhone size={13} /> Số điện thoại
          </button>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Identifier */}
          <div className="auth-field">
            <label>{tab === "email" ? "Email" : "Số điện thoại"}</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                {tab === "email" ? <FaEnvelope size={14} /> : <FaPhone size={14} />}
              </span>
              <input
                type={tab === "email" ? "email" : "tel"}
                placeholder={tab === "email" ? "you@example.com" : "0912 345 678"}
                value={form.identifier}
                onChange={(e) => handleChange("identifier", e.target.value)}
                className={fieldErrors.identifier ? "has-error" : ""}
                autoComplete={tab === "email" ? "email" : "tel"}
              />
            </div>
            {fieldErrors.identifier && <p className="auth-field-error">{fieldErrors.identifier}</p>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <div className="auth-field-header">
              <label>Mật khẩu</label>
              <Link to="/forgot-password" className="auth-forgot-link">Quên mật khẩu?</Link>
            </div>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><FaLock size={14} /></span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Mật khẩu của bạn"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={fieldErrors.password ? "has-error" : ""}
                autoComplete="current-password"
              />
              <button type="button" className="auth-toggle-pass" onClick={() => setShowPass(!showPass)}>
                {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
              </button>
            </div>
            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
          </div>

          <button type="submit" className="auth-btn-primary" disabled={isLoading}>
            {isLoading ? (
              <><FaSpinner className="spin" size={15} /> Đang đăng nhập...</>
            ) : (
              <>Đăng nhập <FaArrowRight size={13} /></>
            )}
          </button>
        </form>

        <p className="auth-switch-text">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay →</Link>
        </p>

        <p className="auth-footer">© 2026 ZaloApp · Nhóm 3 · IUH</p>
        </div>
      </div>
    </div>
  );
}
