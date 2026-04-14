import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope, FaLock, FaEye, FaEyeSlash,
  FaPhone, FaUser, FaArrowRight, FaSpinner, FaComments, FaStar, FaShieldAlt,
  FaCheckCircle, FaRegCircle
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./RegisterPage.css";

const getStrength = (pw) => {
  if (!pw) return null;
  const hasLen = pw.length >= 6;
  const hasNum = /[0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  
  if (!hasLen) return "weak";
  if (hasLen && hasNum && hasUpper) return "strong";
  return "medium";
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    username: "",
    identifier: "",  // holds email OR phone
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
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
    if (form.username.trim() && form.username.trim().length < 3)
      errs.username = "Tên người dùng tối thiểu 3 ký tự";

    const idVal = form.identifier.trim();
    if (!idVal) {
      errs.identifier = "Vui lòng nhập Email hoặc Số điện thoại";
    } else {
      const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
      if (isEmail) {
        if (!/^[^\s@]+@gmail\.com$/.test(idVal)) {
          errs.identifier = "Chỉ hỗ trợ tài khoản @gmail.com";
        }
      } else {
        const phoneVal = idVal.replace(/\s/g, "");
        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phoneVal)) {
          errs.identifier = "Số điện thoại không hợp lệ (VD: 0912345678)";
        }
      }
    }

    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) errs.password = "Tối thiểu 6 ký tự";

    if (!form.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Mật khẩu không khớp";

    if (!agreed) errs.agreed = "Vui lòng đồng ý với điều khoản";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const idVal = form.identifier.trim();
    const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);

    const payload = {
      password: form.password,
      ...(form.username.trim() ? { username: form.username.trim() } : {}),
      ...(isEmail
        ? { email: idVal.toLowerCase() }
        : { phone: idVal.replace(/\s/g, "") }),
    };

    const result = await register(payload);
    if (result.success) {
      const query =
        result.registrationMethod === "email"
          ? `email=${encodeURIComponent(result.email)}`
          : `phone=${encodeURIComponent(result.phone)}`;
      navigate(`/verify-otp?${query}`);
    } else {
      // Map global error to specific fields
      const errMsg = (result.error || "").toLowerCase();
      const newErrs = {};
      if (errMsg.includes("email") || errMsg.includes("điện thoại") || errMsg.includes("phone")) {
        newErrs.identifier = result.error;
      } else if (errMsg.includes("username") || errMsg.includes("người dùng") || errMsg.includes("tên")) {
        newErrs.username = result.error;
      } else if (errMsg.includes("password") || errMsg.includes("mật khẩu")) {
        newErrs.password = result.error;
      }
      
      if (Object.keys(newErrs).length > 0) {
        setFieldErrors(newErrs);
        clearError(); // Remove generic top-level error if it's placed in a field
      }
    }
  };

  const strength = getStrength(form.password);

  return (
    <div className="auth-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        
        {/* Decor Chat Bubbles */}
        <div className="decor-bubble decor-bubble-1" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Thêm bạn, thêm vui! <FaStar color="#f59e0b" />
        </div>
        <div className="decor-bubble decor-bubble-2" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Bảo mật vượt thời gian <FaShieldAlt color="#86efac" />
        </div>

        <div className="auth-left-content">
          <div className="auth-left-badge">✨ CHỈ MẤT 30 GIÂY</div>
          <h1 className="auth-left-heading">
            Gia nhập cộng đồng<br />
            <span className="auth-gradient-text">ZaloApp</span>
          </h1>
          <p className="auth-left-desc">
            Hàng triệu người đang chờ đón bạn. Tạo tài khoản ngay hôm nay và bước vào thế giới kết nối không giới hạn!
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
        <p className="auth-tagline">Tạo tài khoản mới ✨</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Username (optional) */}
          <div className="auth-field">
            <label>Tên người dùng <span style={{ color: "#475569" }}>(tuỳ chọn)</span></label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><FaUser size={13} /></span>
              <input
                type="text"
                placeholder="nguyenvana"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className={fieldErrors.username ? "has-error" : ""}
                autoComplete="username"
              />
            </div>
            {fieldErrors.username && <p className="auth-field-error">{fieldErrors.username}</p>}
          </div>

          {/* Email or Phone */}
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
                autoComplete="email"
              />
            </div>
            {fieldErrors.identifier && <p className="auth-field-error">{fieldErrors.identifier}</p>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label>Mật khẩu</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><FaLock size={14} /></span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={fieldErrors.password ? "has-error" : ""}
                autoComplete="new-password"
              />
              <button type="button" className="auth-toggle-pass" onClick={() => setShowPass(!showPass)}>
                {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
              </button>
            </div>
            {form.password && (
              <div className="auth-strength-container">
                <div className="auth-strength-bars">
                  {["weak", "medium", "strong"].map((lvl, i) => (
                    <div
                      key={lvl}
                      className={`auth-strength-bar ${
                        strength === "weak" && i === 0 ? "weak"
                        : strength === "medium" && i <= 1 ? "medium"
                        : strength === "strong" ? "strong"
                        : ""
                      }`}
                    />
                  ))}
                  <span className={`auth-strength-label ${strength}`}>
                    {strength === "weak" ? "Yếu" : strength === "medium" ? "Vừa" : "Mạnh"}
                  </span>
                </div>
                <ul className="auth-password-hints">
                  <li className={form.password.length >= 6 ? "valid" : ""}>
                    {form.password.length >= 6 ? <FaCheckCircle size={11} /> : <FaRegCircle size={11} />} Ít nhất 6 ký tự
                  </li>
                  <li className={/[0-9]/.test(form.password) ? "valid" : ""}>
                    {/[0-9]/.test(form.password) ? <FaCheckCircle size={11} /> : <FaRegCircle size={11} />} Chứa ít nhất một số
                  </li>
                  <li className={/[A-Z]/.test(form.password) ? "valid" : ""}>
                    {/[A-Z]/.test(form.password) ? <FaCheckCircle size={11} /> : <FaRegCircle size={11} />} Chứa chữ in hoa
                  </li>
                </ul>
              </div>
            )}
            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label>Xác nhận mật khẩu</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><FaLock size={14} /></span>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className={fieldErrors.confirmPassword ? "has-error" : ""}
                autoComplete="new-password"
              />
              <button type="button" className="auth-toggle-pass" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="auth-field-error">{fieldErrors.confirmPassword}</p>}
          </div>

          {/* Terms */}
          <div className="auth-field">
            <div className="auth-terms">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setFieldErrors((prev) => ({ ...prev, agreed: "" }));
                }}
              />
              <label htmlFor="agree">
                Tôi đồng ý với <a href="#">Điều khoản</a> và <a href="#">Chính sách bảo mật</a>
              </label>
            </div>
            {fieldErrors.agreed && <p className="auth-field-error">{fieldErrors.agreed}</p>}
          </div>

          <button type="submit" className="auth-btn-primary" disabled={isLoading}>
            {isLoading ? (
              <><FaSpinner className="spin" size={14} /> Đang tạo tài khoản...</>
            ) : (
              <>Đăng ký <FaArrowRight size={13} /></>
            )}
          </button>
        </form>

        <p className="auth-switch-text">
          Đã có tài khoản? <Link to="/login">Đăng nhập →</Link>
        </p>
        <p className="auth-footer">© 2026 ZaloApp · Nhóm 3 · IUH</p>
        </div>
      </div>
    </div>
  );
}
