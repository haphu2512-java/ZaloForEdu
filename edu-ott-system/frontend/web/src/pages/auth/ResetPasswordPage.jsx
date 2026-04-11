import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaSpinner,
  FaCheck,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSignInAlt,
} from "react-icons/fa";
import { authService } from "../../services/authService";
import "./ResetPasswordPage.css";

const getStrength = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
};

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto redirect after success
  useEffect(() => {
    if (!success) return;
    if (redirectCountdown <= 0) {
      navigate("/login");
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [success, redirectCountdown, navigate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setApiError("");
  };

  // Password requirement checks
  const requirements = [
    { label: "Tối thiểu 6 ký tự", pass: form.password.length >= 6 },
    { label: "Có chữ cái viết hoa (A-Z)", pass: /[A-Z]/.test(form.password) },
    { label: "Có chữ số (0-9)", pass: /[0-9]/.test(form.password) },
    {
      label: "Có ký tự đặc biệt (!@#$...)",
      pass: /[^A-Za-z0-9]/.test(form.password),
    },
  ];

  const validate = () => {
    const errs = {};
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu mới";
    else if (form.password.length < 6) errs.password = "Tối thiểu 6 ký tự";
    if (!form.confirmPassword)
      errs.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError("");

    try {
      await authService.resetPassword(token, form.password);
      setSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.";
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getStrength(form.password);

  return (
    <div className="reset-page">
      <div className="reset-bg-circle-1" />
      <div className="reset-bg-circle-2" />

      <div style={{ width: "100%", maxWidth: 480, padding: "0 16px" }}>
        <div className={`reset-card ${mounted ? "visible" : ""}`}>
          {/* ── SUCCESS STATE ── */}
          {success ? (
            <div className="reset-success">
              <div className="reset-success-icon-wrap">
                <div className="reset-success-circle">
                  <FaCheckCircle size={36} color="#10b981" />
                </div>
                <div className="reset-success-ring" />
              </div>

              <h2 className="reset-success-title">Đặt lại thành công! 🎉</h2>
              <p className="reset-success-desc">
                Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật
                khẩu mới ngay bây giờ.
              </p>

              <Link to="/login" style={{ textDecoration: "none" }}>
                <button className="btn-reset-login" type="button">
                  <FaSignInAlt size={15} />
                  Đăng nhập ngay
                </button>
              </Link>

              <p className="reset-redirect-timer">
                Tự động chuyển hướng sau <span>{redirectCountdown}s</span>
              </p>
            </div>
          ) : (
            <>
              {/* ── RESET FORM ── */}
              <div className="reset-logo">
                <div className="reset-logo-icon">
                  <FaLock size={24} color="white" />
                </div>
                <h2 className="reset-title">Tạo mật khẩu mới</h2>
                <p className="reset-sub">
                  Nhập mật khẩu mới cho tài khoản của bạn. Hãy chọn mật khẩu
                  mạnh để bảo vệ tài khoản.
                </p>
              </div>

              {/* Token security badge */}
              <div className="reset-token-badge">
                <FaShieldAlt size={13} />
                Token xác thực hợp lệ · Phiên bảo mật
              </div>

              {apiError && (
                <div className="reset-error-box">
                  <FaExclamationTriangle size={14} />
                  {apiError}
                </div>
              )}

              <form className="reset-form" onSubmit={handleSubmit}>
                {/* New Password */}
                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <div className="input-wrapper">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Nhập mật khẩu mới"
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className={`form-input form-input-pr ${fieldErrors.password ? "has-error" : ""}`}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="toggle-pass-btn"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? (
                        <FaEyeSlash size={15} />
                      ) : (
                        <FaEye size={15} />
                      )}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {form.password && (
                    <div className="reset-strength">
                      {["weak", "medium", "strong"].map((lvl, i) => (
                        <div
                          key={lvl}
                          className={`reset-strength-bar ${
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
                      <span className={`reset-strength-label ${strength}`}>
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

                {/* Requirements checklist */}
                {form.password && (
                  <div className="reset-requirements">
                    <div className="reset-requirements-title">
                      <FaShieldAlt size={11} color="#6b7280" />
                      Yêu cầu mật khẩu
                    </div>
                    {requirements.map((req) => (
                      <div
                        key={req.label}
                        className={`reset-req-item ${req.pass ? "pass" : ""}`}
                      >
                        <div className="reset-req-dot">
                          {req.pass && <FaCheck size={8} color="white" />}
                        </div>
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirm Password */}
                <div className="form-group">
                  <label>Xác nhận mật khẩu mới</label>
                  <div className="input-wrapper">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Nhập lại mật khẩu mới"
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
                      {showConfirm ? (
                        <FaEyeSlash size={15} />
                      ) : (
                        <FaEye size={15} />
                      )}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p style={{ color: "#10b981", fontSize: 12, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                      <FaCheck size={10} /> Mật khẩu khớp
                    </p>
                  )}
                  {fieldErrors.confirmPassword && (
                    <p className="input-error">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn-reset"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FaSpinner size={15} className="spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      Đặt lại mật khẩu
                      <FaArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  color: "#6b7280",
                  marginTop: 18,
                }}
              >
                <Link
                  to="/login"
                  style={{
                    color: "#1b6ef3",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  ← Quay lại đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="reset-footer">© 2024 Zalo Edu · IUH · Nhóm 3</p>
      </div>
    </div>
  );
}
