import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaUser,
  FaArrowRight, FaSpinner, FaCheckCircle, FaComments, FaQuestionCircle, FaRocket,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./ForgotPasswordPage.css";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, verifyForgotOtp, resetPassword, isLoading, clearError } = useAuthStore();

  // step: 1 = nhập email/phone, 2 = nhập OTP, 3 = mật khẩu mới
  const [step, setStep] = useState(1);

  // Step 1
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState("");

  // Step 2
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const inputRefs = useRef([]);

  // Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passError, setPassError] = useState("");
  const [done, setDone] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Countdown for resend
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [step, countdown]);

  // ── Step 1: Gửi OTP ─────────────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault();
    setApiError("");
    setIdentifierError("");

    const idVal = identifier.trim();
    if (!idVal) {
      setIdentifierError("Vui lòng nhập Email hoặc Số điện thoại");
      return;
    }
    
    const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idVal)) {
        setIdentifierError("Email không hợp lệ");
        return;
      }
    } else {
      const phoneVal = idVal.replace(/\s/g, "");
      if (!/^\+?\d{9,15}$/.test(phoneVal)) {
        setIdentifierError("Số điện thoại không hợp lệ");
        return;
      }
    }

    const payload = isEmail
      ? { email: idVal.toLowerCase() }
      : { phone: idVal.replace(/\s/g, "") };

    const result = await forgotPassword(payload);
    if (result.success) {
      setStep(2);
      setCountdown(RESEND_COUNTDOWN);
    } else {
      setApiError(result.error || "Gửi OTP thất bại");
    }
  };

  // ── Step 2: Xác thực OTP ────────────────────────────────────
  const handleDigitChange = (i, value) => {
    if (!/^\d*$/.test(value)) return;
    const v = value.slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setOtpError("");
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

  const handleStep2 = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setOtpError("Vui lòng nhập đủ 6 chữ số");
      return;
    }
    
    const idVal = identifier.trim();
    const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
    
    const payload = {
      otp,
      ...(isEmail ? { email: idVal.toLowerCase() } : { phone: idVal.replace(/\s/g, "") }),
    };
    const result = await verifyForgotOtp(payload);
    if (result.success) {
      setResetToken(result.resetToken);
      setStep(3);
    } else {
      setOtpError(result.error || "Mã OTP không hợp lệ");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    clearError();
    
    const idVal = identifier.trim();
    const isEmail = idVal.includes("@") || /[a-zA-Z]/.test(idVal);
    
    const payload = isEmail
      ? { email: idVal.toLowerCase() }
      : { phone: idVal.replace(/\s/g, "") };
      
    const result = await forgotPassword(payload);
    if (result.success) {
      setCountdown(RESEND_COUNTDOWN);
      setOtpError("");
    } else {
      setOtpError(result.error || "Gửi lại thất bại");
    }
  };

  // ── Step 3: Đặt mật khẩu mới ────────────────────────────────
  const handleStep3 = async (e) => {
    e.preventDefault();
    setPassError("");
    if (!newPassword || newPassword.length < 6) {
      setPassError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Mật khẩu không khớp");
      return;
    }
    const result = await resetPassword(resetToken, newPassword);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } else {
      setPassError(result.error || "Đặt lại mật khẩu thất bại");
    }
  };

  // ── Step indicator ────────────────────────────────────────────
  const renderSteps = () => (
    <div className="auth-steps">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`auth-step-dot ${s === step ? "active" : s < step ? "done" : ""}`}
        />
      ))}
    </div>
  );

  return (
    <div className="auth-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        
        {/* Decor Chat Bubbles */}
        <div className="decor-bubble decor-bubble-1" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Hội não cá vàng? <FaQuestionCircle color="#f59e0b" />
        </div>
        <div className="decor-bubble decor-bubble-2" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          Lấy lại mật khẩu <FaRocket color="#cbd5e1" />
        </div>

        <div className="auth-left-content">
          <div className="auth-left-badge">🆘 TRUNG TÂM HỖ TRỢ</div>
          <h1 className="auth-left-heading">
            Giải cứu tài khoản<br />
            <span className="auth-gradient-text">trong nháy mắt</span>
          </h1>
          <p className="auth-left-desc">
            Đừng lo lắng! Cứ để ZaloApp lo. Chúng tôi sẽ giúp bạn lấy lại quyền truy cập an toàn chỉ sau vài cú click chuột.
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

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            {renderSteps()}
            <p className="auth-step-title">Quên mật khẩu?</p>
            <p className="auth-step-sub">
              Nhập email hoặc số điện thoại để nhận mã OTP xác thực.
            </p>

            {apiError && <div className="auth-error">{apiError}</div>}
            
            <form onSubmit={handleStep1} className="auth-form">
              <div className="auth-field">
                <label>Email hoặc Số điện thoại</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <FaUser size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="you@gmail.com hoặc 0912 345 678"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setIdentifierError(""); }}
                    className={identifierError ? "has-error" : ""}
                    autoFocus
                  />
                </div>
                {identifierError && <p className="auth-field-error">{identifierError}</p>}
              </div>

              <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <><FaSpinner className="spin" size={14} /> Đang gửi...</>
                ) : (
                  <>Gửi mã OTP <FaArrowRight size={13} /></>
                )}
              </button>
            </form>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            {renderSteps()}
            <p className="auth-step-title">Nhập mã xác thực</p>
            <p className="auth-step-sub">
              Mã OTP đã gửi tới <strong>{identifier.includes("@") || /[a-zA-Z]/.test(identifier) ? identifier : `SĐT ${identifier}`}</strong>.
              {!(identifier.includes("@") || /[a-zA-Z]/.test(identifier)) && (
                <><br /><span style={{ color: "#3b82f6", fontSize: 12 }}>💡 Xem mã trong Terminal Backend</span></>
              )}
            </p>

            {otpError && <div className="auth-error">{otpError}</div>}

            <form onSubmit={handleStep2} className="auth-form">
              <div className="otp-inputs" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    className={`otp-input ${otpError ? "has-error" : ""}`}
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

            <div style={{ textAlign: "center", marginTop: 14 }}>
              {countdown > 0 ? (
                <p style={{ color: "#475569", fontSize: 13 }}>
                  Gửi lại sau <strong style={{ color: "#60a5fa" }}>{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button" onClick={handleResend}
                  style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Gửi lại mã OTP
                </button>
              )}
              <button
                type="button" onClick={() => { setStep(1); setDigits(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
                style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                ← Nhập lại thông tin
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && !done && (
          <>
            {renderSteps()}
            <p className="auth-step-title">Đặt mật khẩu mới</p>
            <p className="auth-step-sub">Mật khẩu mới phải có ít nhất 6 ký tự.</p>

            {passError && <div className="auth-error">{passError}</div>}

            <form onSubmit={handleStep3} className="auth-form">
              <div className="auth-field">
                <label>Mật khẩu mới</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FaLock size={14} /></span>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPassError(""); }}
                    className={passError ? "has-error" : ""}
                    autoFocus
                  />
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Xác nhận mật khẩu</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FaLock size={14} /></span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPassError(""); }}
                    className={passError ? "has-error" : ""}
                  />
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <><FaSpinner className="spin" size={14} /> Đang lưu...</>
                ) : (
                  <>Đặt lại mật khẩu <FaArrowRight size={13} /></>
                )}
              </button>
            </form>
          </>
        )}

        {/* ── DONE ── */}
        {done && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <FaCheckCircle size={52} color="#22c55e" style={{ marginBottom: 14 }} />
            <p className="auth-step-title">Đặt lại thành công!</p>
            <p className="auth-step-sub">Đang chuyển hướng đến đăng nhập...</p>
          </div>
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
