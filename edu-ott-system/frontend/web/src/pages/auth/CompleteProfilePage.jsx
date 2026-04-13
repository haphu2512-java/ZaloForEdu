import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  FaEnvelope, FaPhone, FaArrowRight, FaSpinner,
  FaComments, FaCheckCircle, FaTimes,
} from "react-icons/fa";
import api from "../../services/authService";
import "./CompleteProfilePage.css";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Biết user vừa đăng ký bằng gì
  const registeredWith = searchParams.get("with"); // "email" | "phone"
  const userId = searchParams.get("userId");

  // Nếu đăng ký bằng email → cần thêm SĐT, và ngược lại
  const needPhone = registeredWith === "email";
  const needEmail = registeredWith === "phone";

  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Nếu không có context → redirect login
  useEffect(() => {
    if (!registeredWith || !userId) navigate("/login", { replace: true });
  }, [registeredWith, userId, navigate]);

  const validate = () => {
    if (!value.trim()) {
      setError(needPhone ? "Vui lòng nhập số điện thoại" : "Vui lòng nhập email");
      return false;
    }
    if (needEmail && !/^[^\s@]+@gmail\.com$/.test(value.trim())) {
      setError("Chỉ hỗ trợ @gmail.com");
      return false;
    }
    if (needPhone && !/^\+?\d{9,15}$/.test(value.replace(/\s/g, ""))) {
      setError("Số điện thoại không hợp lệ (VD: 0912345678)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setError("");
    try {
      await api.put(`/users/${userId}`, needPhone
        ? { phone: value.replace(/\s/g, "") }
        : { email: value.trim().toLowerCase() }
      );
      navigate("/login?completed=1", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật thất bại, thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => navigate("/login?completed=1", { replace: true });

  return (
    <div className="auth-page">
      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-left-content">
          <div className="auth-left-badge">🎉 GẦN XONG RỒI!</div>
          <h1 className="auth-left-heading">
            Hoàn thiện<br />
            <span className="auth-gradient-text">hồ sơ của bạn</span>
          </h1>
          <p className="auth-left-desc">
            {needPhone
              ? "Thêm số điện thoại để bạn bè dễ tìm thấy bạn hơn và bảo mật tài khoản tốt hơn."
              : "Thêm email để khôi phục tài khoản và nhận thông báo quan trọng."}
          </p>
          <div className="cpl-benefits">
            <div className="cpl-benefit">
              <FaCheckCircle color="#22c55e" size={14} />
              <span>Bạn bè tìm thấy bạn dễ hơn</span>
            </div>
            <div className="cpl-benefit">
              <FaCheckCircle color="#22c55e" size={14} />
              <span>Bảo mật tài khoản 2 lớp</span>
            </div>
            <div className="cpl-benefit">
              <FaCheckCircle color="#22c55e" size={14} />
              <span>Khôi phục mật khẩu dễ dàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className={`auth-card ${mounted ? "visible" : ""}`}>
          <div className="auth-logo">
            <div className="auth-logo-icon"><FaComments size={22} color="white" /></div>
            <h1 className="auth-logo-title">ZaloApp</h1>
          </div>

          <p className="auth-step-title" style={{ marginTop: 12 }}>
            {needPhone ? "Thêm số điện thoại" : "Thêm địa chỉ email"}
          </p>
          <p className="auth-step-sub">
            {needPhone
              ? "Giúp bạn bè tìm thấy bạn qua số điện thoại. Bạn có thể bỏ qua bước này."
              : "Dùng để đăng nhập và khôi phục mật khẩu. Bạn có thể bỏ qua bước này."}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>{needPhone ? "Số điện thoại" : "Email"}</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  {needPhone ? <FaPhone size={14} /> : <FaEnvelope size={14} />}
                </span>
                <input
                  type={needPhone ? "tel" : "email"}
                  placeholder={needPhone ? "0912 345 678" : "you@gmail.com"}
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setError(""); }}
                  autoFocus
                />
                {value && (
                  <button type="button" className="auth-toggle-pass" onClick={() => setValue("")}>
                    <FaTimes size={14} />
                  </button>
                )}
              </div>
              {error && <p className="auth-field-error">{error}</p>}
            </div>

            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
              {isLoading
                ? <><FaSpinner className="spin" size={14} /> Đang lưu...</>
                : <>Lưu và tiếp tục <FaArrowRight size={13} /></>}
            </button>
          </form>

          <button className="cpl-skip-btn" onClick={handleSkip}>
            Bỏ qua, làm sau
          </button>

          <p className="auth-footer">© 2026 ZaloApp · Nhóm 3 · IUH</p>
        </div>
      </div>
    </div>
  );
}
