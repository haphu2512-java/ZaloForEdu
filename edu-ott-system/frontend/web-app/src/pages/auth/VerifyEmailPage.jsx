import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaEnvelopeOpenText, FaSpinner, FaArrowRight, FaExclamationTriangle } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import "./VerifyEmailPage.css";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");
  
  const { verifyEmail, resendVerification, isLoading } = useAuthStore();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [mounted, setMounted] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError("");

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (!isNaN(char) && i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    if (pastedData.length >= 6) {
      inputRefs.current[5].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Vui lòng nhập đủ 6 số OTP");
      return;
    }

    const { success, error: apiError } = await verifyEmail(email, otpCode);
    if (success) {
      navigate("/login");
    } else {
      setError(apiError || "Mã xác thực không hợp lệ");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    const { success, error: resendError } = await resendVerification(email);
    if (success) {
      setResendCooldown(60);
    // Có thể kết hợp toast nếu bạn dùng thư viện toast
    } else {
      setError(resendError || "Không thể gửi lại mã");
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-bg-circle-1" />
      <div className="verify-bg-circle-2" />

      <div style={{ width: "100%", maxWidth: 480, padding: "0 16px" }}>
        <div className={`verify-card ${mounted ? "visible" : ""}`}>
          <div className="verify-header">
            <div className="verify-icon-wrap">
              <FaEnvelopeOpenText size={28} color="white" />
            </div>
            <h2 className="verify-title">Xác Thực Tài Khoản</h2>
            <p className="verify-sub">
              Chúng tôi đã gửi mã xác nhận đến email <br />
              <span className="verify-email-text">{email}</span>
            </p>
          </div>

          {error && (
            <div className="verify-error-box">
              <FaExclamationTriangle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="otp-container">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`otp-input ${error ? "has-error" : ""}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button type="submit" className="btn-verify" disabled={isLoading || otp.join("").length < 6}>
              {isLoading ? (
                <>
                  <FaSpinner size={16} className="spin" /> Đang kiểm tra...
                </>
              ) : (
                <>
                  Xác nhận <FaArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="verify-footer">
            Bạn không nhận được mã?{" "}
            <button
              type="button"
              className="resend-link"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
            >
              {resendCooldown > 0 ? (
                <span>Gửi lại sau <span className="resend-timer">{resendCooldown}s</span></span>
              ) : (
                "Gửi lại mã OTP"
              )}
            </button>
          </div>
        </div>

        <p className="verify-copyright">© 2026 Zalo Edu · IUH · Nhóm 3</p>
      </div>
    </div>
  );
}
