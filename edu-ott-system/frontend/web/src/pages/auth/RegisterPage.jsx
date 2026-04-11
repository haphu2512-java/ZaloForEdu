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
  FaUser,
  FaUserGraduate,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./RegisterPage.css";

const getStrength = (pw) => {
  if (!pw) return null;
  if (pw.length < 6) return "weak";
  if (pw.length < 10 || !/[0-9]/.test(pw)) return "medium";
  return "strong";
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    clearError();
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Vui lòng nhập họ tên";
    if (!form.email) errs.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) errs.password = "Tối thiểu 6 ký tự";
    if (!form.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận";
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Mật khẩu không khớp";
    if (!agreed) errs.agreed = "Vui lòng đồng ý điều khoản";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    // eslint-disable-next-line no-unused-vars
    const { confirmPassword, ...payload } = form;
    const result = await register({ ...payload, role: "student" });
    if (result.success) {
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`);
    }
  };

  const strength = getStrength(form.password);

  return (
    <div className="register-page">
      <div className="register-bg-circle-1" />
      <div className="register-bg-circle-2" />

      <div style={{ width: "100%", maxWidth: 460, padding: "0 16px" }}>
        <div className={`register-card ${mounted ? "visible" : ""}`}>
          {/* Logo */}
          <div className="register-logo">
            <div className="register-logo-icon">
              <FaGraduationCap size={24} color="white" />
            </div>
            <h1 className="register-logo-title">
              Zalo <span>Edu</span>
            </h1>
            <p className="register-logo-sub">Tạo tài khoản sinh viên</p>
          </div>

          {/* Badge */}
          <div className="register-student-badge">
            <FaUserGraduate size={13} />
            Đăng ký dành cho Sinh viên
          </div>

          {error && <div className="register-error-box">{error}</div>}

          <form className="register-form" onSubmit={handleSubmit}>
            {/* Họ tên */}
            <div className="form-group">
              <label>Họ và tên</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className={`form-input ${fieldErrors.fullName ? "has-error" : ""}`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="input-error">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email sinh viên</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="sinhvien@iuh.edu.vn"
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

            {/* Mật khẩu */}
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={`form-input form-input-pr ${fieldErrors.password ? "has-error" : ""}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-pass-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="password-strength">
                  {["weak", "medium", "strong"].map((lvl, i) => (
                    <div
                      key={lvl}
                      className={`strength-bar ${
                        strength === "weak" && i === 0
                          ? "active-weak"
                          : strength === "medium" && i <= 1
                            ? "active-medium"
                            : strength === "strong"
                              ? "active-strong"
                              : ""
                      }`}
                    />
                  ))}
                  <span className={`strength-label ${strength}`}>
                    {strength === "weak"
                      ? "Yếu"
                      : strength === "medium"
                        ? "Trung bình"
                        : "Mạnh"}
                  </span>
                </div>
              )}
              {fieldErrors.password && (
                <p className="input-error">{fieldErrors.password}</p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <div className="input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  className={`form-input form-input-pr ${fieldErrors.confirmPassword ? "has-error" : ""}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-pass-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="input-error">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms - fix layout */}
            <div className="form-group">
              <div className="register-terms">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setFieldErrors((prev) => ({ ...prev, agreed: "" }));
                  }}
                />
                <label htmlFor="agree" className="register-terms-label">
                  Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và{" "}
                  <a href="#">Chính sách bảo mật</a>
                </label>
              </div>
              {fieldErrors.agreed && (
                <p className="input-error">{fieldErrors.agreed}</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="btn-register" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FaSpinner size={14} className="spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>
                  Tạo tài khoản
                  <FaArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          <div className="register-divider">
            <div className="register-divider-line" />
            <span className="register-divider-text">HOẶC</span>
            <div className="register-divider-line" />
          </div>

          <p className="register-login-text">
            Đã có tài khoản? <Link to="/login">Đăng nhập →</Link>
          </p>
        </div>

        <p className="register-footer">© 2026 Zalo Edu · IUH · Nhóm 3</p>
      </div>
    </div>
  );
}
