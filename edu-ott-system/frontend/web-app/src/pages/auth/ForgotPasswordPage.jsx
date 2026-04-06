import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaShieldAlt,
  FaEnvelope,
  FaArrowRight,
  FaSpinner,
  FaArrowLeft,
  FaCheckCircle,
  FaCheck,
  FaExclamationTriangle,
  FaLock,
  FaClock,
  FaFingerprint,
  FaUserShield,
} from "react-icons/fa";
import { authService } from "../../services/authService";
import "./ForgotPasswordPage.css";

const SECURITY_FEATURES = [
  {
    icon: <FaLock size={15} color="white" />,
    text: "Mã đặt lại được mã hóa AES-256",
  },
  {
    icon: <FaClock size={15} color="white" />,
    text: "Token hết hạn sau 60 phút để bảo mật",
  },
  {
    icon: <FaFingerprint size={15} color="white" />,
    text: "Xác thực đa lớp trước khi đặt lại",
  },
  {
    icon: <FaUserShield size={15} color="white" />,
    text: "Thông báo tức thì khi mật khẩu thay đổi",
  },
];

export default function ForgotPasswordPage() {
  // Step 1: enter email, Step 2: email sent confirmation
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState([]);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Feature stagger animation
  useEffect(() => {
    if (!mounted) return;
    SECURITY_FEATURES.forEach((_, i) => {
      setTimeout(() => {
        setVisibleFeatures((prev) => [...prev, i]);
      }, 400 + i * 130);
    });
  }, [mounted]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const validate = () => {
    if (!email.trim()) {
      setEmailError("Vui lòng nhập địa chỉ email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Địa chỉ email không hợp lệ");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError("");

    try {
      await authService.forgotPassword(email);
      setStep(2);
      setCooldown(60); // 60 second cooldown before can resend
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Không thể gửi email đặt lại. Vui lòng thử lại.";
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await authService.forgotPassword(email);
      setCooldown(60);
    } catch (err) {
      setApiError(
        err.response?.data?.message || "Không thể gửi lại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const maskEmail = (e) => {
    const [name, domain] = e.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.slice(0, 2)}${"*".repeat(Math.min(name.length - 2, 6))}@${domain}`;
  };

  return (
    <div className="forgot-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="forgot-left">
        <div className="forgot-left-dots" />
        <div className="forgot-orb forgot-orb-1" />
        <div className="forgot-orb forgot-orb-2" />
        <div className="forgot-orb forgot-orb-3" />

        <div className={`forgot-left-content ${mounted ? "visible" : ""}`}>
          {/* Shield animation */}
          <div className="forgot-shield-wrap">
            <div className="forgot-shield-ring" />
            <div className="forgot-shield-ring" />
            <div className="forgot-shield-ring" />
            <div className="forgot-shield-icon">
              <FaShieldAlt size={42} color="#60a5fa" />
            </div>
          </div>

          <h1 className="forgot-left-title">
            Bảo mật
            <br />
            <span>tài khoản</span>
          </h1>

          <p className="forgot-left-desc">
            Hệ thống xác minh danh tính đa lớp giúp bảo vệ tài khoản của bạn
            an toàn tuyệt đối trong mọi tình huống.
          </p>

          <div className="forgot-security-features">
            {SECURITY_FEATURES.map((f, i) => (
              <div
                key={i}
                className={`forgot-sec-item ${visibleFeatures.includes(i) ? "visible" : ""}`}
              >
                <div className="forgot-sec-icon">{f.icon}</div>
                <span className="forgot-sec-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="forgot-right">
        <div className="forgot-right-topbar" />

        <div className={`forgot-form-wrap ${mounted ? "visible" : ""}`}>
          {/* Steps indicator */}
          <div className="forgot-steps">
            <div className={`forgot-step-dot ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
              {step > 1 ? <FaCheck size={12} /> : "1"}
            </div>
            <div className={`forgot-step-line ${step > 1 ? "active" : ""}`} />
            <div className={`forgot-step-dot ${step >= 2 ? "active" : ""}`}>
              2
            </div>
          </div>

          {/* ── STEP 1: Enter Email ── */}
          {step === 1 && (
            <div className="forgot-step-content" key="step1">
              <div className="forgot-logo-wrap">
                <div className="forgot-logo-box">
                  <FaLock size={24} color="white" />
                </div>
                <h2 className="forgot-form-title">Quên mật khẩu?</h2>
                <p className="forgot-form-sub">
                  Đừng lo, nhập email đã đăng ký và chúng tôi sẽ gửi
                  hướng dẫn đặt lại mật khẩu cho bạn.
                </p>
              </div>

              {apiError && (
                <div className="forgot-error-box">
                  <FaExclamationTriangle size={14} />
                  {apiError}
                </div>
              )}

              <form className="forgot-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email đã đăng ký</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      placeholder="name@university.edu.vn"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                        setApiError("");
                      }}
                      className={`form-input ${emailError ? "has-error" : ""}`}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && <p className="input-error">{emailError}</p>}
                </div>

                {/* Security notice */}
                <div className="forgot-security-notice">
                  <FaShieldAlt
                    size={14}
                    color="#d97706"
                    className="forgot-security-notice-icon"
                  />
                  <span className="forgot-security-notice-text">
                    Link đặt lại mật khẩu sẽ có hiệu lực trong <strong>60 phút</strong>.
                    Vui lòng kiểm tra cả hộp thư spam nếu chưa nhận được email.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-forgot"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FaSpinner size={15} className="spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      Gửi hướng dẫn đặt lại
                      <FaArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="forgot-divider">
                <div className="forgot-divider-line" />
                <span className="forgot-divider-text">HOẶC</span>
                <div className="forgot-divider-line" />
              </div>

              <p className="forgot-back-text">
                Đã nhớ mật khẩu?{" "}
                <Link to="/login">
                  <FaArrowLeft size={11} /> Quay lại đăng nhập
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Email Sent ── */}
          {step === 2 && (
            <div className="forgot-step-content" key="step2">
              <div className="forgot-email-sent">
                {/* Animated check icon */}
                <div className="forgot-email-visual">
                  <div className="forgot-email-circle">
                    <FaEnvelope size={34} color="#10b981" />
                  </div>
                  <div className="forgot-email-circle-ring" />
                  <div className="forgot-check-badge">
                    <FaCheck size={12} color="white" />
                  </div>
                </div>

                <h3 className="forgot-email-title">Kiểm tra email của bạn!</h3>
                <p className="forgot-email-desc">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến:
                </p>
                <div className="forgot-email-highlight">
                  {maskEmail(email)}
                </div>
                <p className="forgot-email-desc">
                  Vui lòng mở email và nhấn vào link để tạo mật khẩu mới. Link
                  sẽ hết hạn sau <strong>60 phút</strong>.
                </p>

                {/* Resend section */}
                <div className="forgot-resend-wrap">
                  {cooldown > 0 ? (
                    <p className="forgot-timer">
                      Gửi lại sau <span>{cooldown}s</span>
                    </p>
                  ) : (
                    <button
                      className="forgot-resend-btn"
                      onClick={handleResend}
                      disabled={isLoading}
                    >
                      {isLoading ? "Đang gửi..." : "Gửi lại email"}
                    </button>
                  )}
                </div>
              </div>

              {apiError && (
                <div className="forgot-error-box" style={{ marginTop: 16 }}>
                  <FaExclamationTriangle size={14} />
                  {apiError}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <button className="btn-forgot-outline" type="button">
                    <FaArrowLeft size={13} />
                    Quay lại đăng nhập
                  </button>
                </Link>
              </div>

              {/* Security tip */}
              <div className="forgot-security-notice" style={{ marginTop: 18 }}>
                <FaShieldAlt
                  size={14}
                  color="#d97706"
                  className="forgot-security-notice-icon"
                />
                <span className="forgot-security-notice-text">
                  Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua
                  email này. Tài khoản của bạn vẫn an toàn.
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="forgot-footer">© 2024 Zalo Edu · IUH · Nhóm 3</p>
      </div>
    </div>
  );
}
