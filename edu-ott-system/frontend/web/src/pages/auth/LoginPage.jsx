import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope, FaLock, FaEye, FaEyeSlash, FaPhone, FaUser,
  FaArrowRight, FaSpinner, FaComments, FaHandPeace, FaHeart,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    clearError();
  };

  const validate = () => {
    const errs = {};
    const idVal = form.identifier.trim();
    if (!idVal) {
      errs.identifier = "Vui lòng nhập Email hoặc Số điện thoại";
    } else {
      const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
      if (isEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idVal)) {
          errs.identifier = "Email không hợp lệ";
        }
      } else {
        const phoneVal = idVal.replace(/\s/g, "");
        if (!/^\+?\d{9,15}$/.test(phoneVal)) {
          errs.identifier = "Số điện thoại không hợp lệ";
        }
      }
    }
    
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const idVal = form.identifier.trim();
    const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
    const payload = isEmail
        ? { email: idVal, password: form.password }
        : { phone: idVal.replace(/\s/g, ""), password: form.password };
        
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

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Identifier */}
          <div className="auth-field">
            <label>Email hoặc Số điện thoại</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <FaUser size={14} />
              </span>
              <input
                type="text"
                placeholder="you@gmail.com hoặc 0912 345 678"
                value={form.identifier}
                onChange={(e) => handleChange("identifier", e.target.value)}
                className={fieldErrors.identifier ? "has-error" : ""}
                autoComplete="username"
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
