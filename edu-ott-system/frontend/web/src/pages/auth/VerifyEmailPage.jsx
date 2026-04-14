import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FaArrowRight, FaSpinner, FaCheckCircle, FaComments, FaMobileAlt, FaShieldAlt } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./VerifyEmailPage.css";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const contact = email || phone;
  const isPhone = !!phone;

  const { verifyOtp, resendOtp, isLoading, clearError } = useAuthStore();

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [mounted, setMounted] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleDigitChange = (i, value) => {
    if (!/^\d*$/.test(value)) return;
    const v = value.slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(""));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Vui lòng nhập đủ 6 chữ số");
      return;
    }
    const payload = { token: otp, ...(email ? { email } : { phone }) };
    const result = await verifyOtp(payload);
    if (result.success) {
      setSuccess(true);
      // Redirect to complete profile page to add missing contact info
      setTimeout(() => {
        const registeredWith = email ? "email" : "phone";
        // userId not available here, just go to login - profile can be completed later in settings
        navigate(`/login?verified=1`);
      }, 2000);
    } else {
      setError(result.error || "Mã OTP không hợp lệ");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    clearError();
    const payload = email ? { email } : { phone };
    const result = await resendOtp(payload);
    if (result.success) {
      setCountdown(RESEND_COUNTDOWN);
      setError("");
    } else {
      setError(result.error || "Gửi lại OTP thất bại");
    }
  };

  if (!contact) {
    return (
      <div className="auth-page">
        <div className="auth-card visible">
          <p style={{ color: "#f87171", textAlign: "center" }}>
            Thiếu thông tin xác thực. <Link to="/register" style={{ color: "#60a5fa" }}>Đăng ký lại</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        
        {/* Decor Chat Bubbles */}
        <div className="decor-bubble decor-bubble-1" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Mã xác thực là 123456 <FaMobileAlt color="#3b82f6" />
        </div>
        <div className="decor-bubble decor-bubble-2" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Chặn đứng mọi Hacker <FaShieldAlt color="#86efac" />
        </div>

        <div className="auth-left-content">
          <div className="auth-left-badge">🔒 LỚP KHIÊN BẢO VỆ</div>
          <h1 className="auth-left-heading">
            Tài khoản an toàn<br />
            <span className="auth-gradient-text">tuyệt đối</span>
          </h1>
          <p className="auth-left-desc">
            ZaloApp sử dụng hệ thống mã hoá cao cấp nhất. Mọi cuộc trò chuyện và thông tin cá nhân của bạn là bất khả xâm phạm.
          </p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="auth-right">
        <div className={`auth-card ${mounted ? "visible" : ""}`}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <FaComments size={22} color="white" />
          </div>
          <h1 className="auth-logo-title">ZaloApp</h1>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <FaCheckCircle size={48} color="#22c55e" style={{ marginBottom: 12 }} />
            <p className="auth-step-title">Xác thực thành công!</p>
            <p className="auth-step-sub">Đang chuyển hướng đến đăng nhập...</p>
          </div>
        ) : (
          <>
            <p className="auth-step-title" style={{ marginTop: 12 }}>Nhập mã xác thực</p>
            <p className="auth-step-sub">
              Mã OTP đã được gửi tới{" "}
              <strong>{isPhone ? `SĐT ${contact}` : `email ${contact}`}</strong>.<br />
              {isPhone && (
                <span style={{ color: "#3b82f6", fontSize: 12 }}>
                  💡 Xem mã OTP ở Terminal Backend (màn hình đang chạy server)
                </span>
              )}
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="otp-inputs" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    className={`otp-input ${error ? "has-error" : ""}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <><FaSpinner className="spin" size={14} /> Đang xác thực...</>
                ) : (
                  <>Xác nhận <FaArrowRight size={13} /></>
                )}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              {countdown > 0 ? (
                <p style={{ color: "#475569", fontSize: 13 }}>
                  Gửi lại sau <strong style={{ color: "#60a5fa" }}>{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: "none", border: "none", color: "#60a5fa",
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>
          </>
        )}

        <p className="auth-switch-text">
          <Link to="/login">← Quay lại đăng nhập</Link>
        </p>
        <p className="auth-footer">© 2026 ZaloApp · Nhóm 3 · IUH</p>
        </div>
      </div>
    </div>
  );
}
