import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaUsers,
  FaBook,
  FaSignInAlt,
  FaTimes,
  FaChalkboardTeacher,
  FaSpinner,
  FaGraduationCap
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useClassStore } from "../../store/classStore";
import ClassDetail from "./ClassDetail";
import "./ClassesPage.css";

// Modal tạo lớp (Teacher)
function CreateClassModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "", code: "", subject: "", description: "", semester: "",
    schedule: { dayOfWeek: 1, startTime: "07:30", endTime: "09:30", room: "" },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập tên lớp";
    if (!form.code.trim()) errs.code = "Vui lòng nhập mã lớp";
    if (!form.subject.trim()) errs.subject = "Vui lòng nhập môn học";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const result = await onCreate(form);
    setIsLoading(false);
    if (result.success) onClose();
  };

  return (
    <div className="edu-modal-overlay fadeIn" onClick={onClose}>
      <div className="edu-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="edu-modal-header">
          <div>
            <h3>Khởi Tạo Lớp Học</h3>
            <p>Thiết lập thông tin không gian học tập mới</p>
          </div>
          <button className="edu-modal-close" onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div className="edu-modal-body">
          <form onSubmit={handleSubmit} className="edu-form-grid">
            <div className="form-group span-2">
              <label>Tên lớp học <span className="req">*</span></label>
              <input
                className={`modern-input ${errors.name ? "error" : ""}`}
                placeholder="VD: Lập trình Web Khóa 15"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="error-text">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label>Mã lớp <span className="req">*</span></label>
              <input
                className={`modern-input ${errors.code ? "error" : ""}`}
                placeholder="VD: IT301"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              {errors.code && <p className="error-text">{errors.code}</p>}
            </div>

            <div className="form-group">
              <label>Môn học <span className="req">*</span></label>
              <input
                className={`modern-input ${errors.subject ? "error" : ""}`}
                placeholder="VD: Công nghệ phần mềm"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              {errors.subject && <p className="error-text">{errors.subject}</p>}
            </div>

            <div className="form-group">
              <label>Học kỳ</label>
              <input
                className="modern-input"
                placeholder="VD: HK1 2024"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Phòng học</label>
              <input
                className="modern-input"
                placeholder="VD: A101"
                value={form.schedule.room}
                onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, room: e.target.value } })}
              />
            </div>

            <div className="form-group span-2">
              <label>Mô tả lớp học</label>
              <textarea
                className="modern-input"
                placeholder="Giới thiệu nhanh về mục tiêu của lớp..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="modern-modal-actions span-2">
              <button type="button" className="btn-cancel" onClick={onClose}>Hủy Bỏ</button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? <FaSpinner className="spin" /> : <FaPlus />} Tạo Lớp Mới
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal join lớp (Student)
function JoinClassModal({ onClose, onJoin }) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setError("Vui lòng nhập MÃ LỚP do Giảng viên cấp.");
    setIsLoading(true);
    const result = await onJoin(code.trim().toUpperCase());
    setIsLoading(false);
    if (result.success) onClose();
    else setError(result.error || "Mã lớp không chính xác hoặc không tồn tại.");
  };

  return (
    <div className="edu-modal-overlay fadeIn" onClick={onClose}>
      <div className="edu-modal-box sm" onClick={(e) => e.stopPropagation()}>
        <div className="edu-modal-header">
          <div>
            <h3>Tham Gia Lớp Học</h3>
            <p>Kết nối với thế giới tri thức</p>
          </div>
          <button className="edu-modal-close" onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div className="edu-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="join-hero-icon">
              <div className="icon-ring"><FaGraduationCap size={40} color="#1B6EF3" /></div>
            </div>

            <div className="form-group" style={{ marginTop: '24px' }}>
              <label style={{ textAlign: "center", display: "block" }}>Nhập Mã Lớp Học</label>
              <input
                className={`modern-input text-center uppercase tracking-wider ${error ? "error" : ""}`}
                placeholder="VD: CS301-ABC"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                autoFocus
              />
              {error && <p className="error-text text-center">{error}</p>}
            </div>

            <div className="modern-modal-actions mt-6">
              <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? <FaSpinner className="spin" /> : <FaSignInAlt />} Xin Tham Gia
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Class card trong sidebar
function ClassCard({ cls, isActive, onClick }) {
  // Vibrant gradients cho card
  const gradients = [
    "linear-gradient(135deg, #1B6EF3 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
  ];
  const bg = gradients[cls.name.charCodeAt(0) % gradients.length];

  return (
    <div className={`modern-class-card ${isActive ? "active" : ""}`} onClick={onClick}>
      <div className="card-avatar" style={{ background: bg }}>
        {cls.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="card-content">
        <h4>{cls.name}</h4>
        <p><span>{cls.code}</span> • {cls.students?.length || cls.studentCount || 0} học viên</p>
      </div>
      {cls.unread > 0 && <span className="card-badge">{cls.unread}</span>}
    </div>
  );
}

export default function ClassesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { classes, isLoading, fetchClasses, createClass, joinClass } = useClassStore();

  const isTeacher = user?.role === "teacher";
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeId, setActiveId] = useState(id || null);

  useEffect(() => {
    fetchClasses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectClass = (cls) => {
    setActiveId(cls._id);
    navigate(`/classes/${cls._id}`);
  };

  const handleJoin = async (code) => {
    return await joinClass(code);
  };

  return (
    <div className="modern-classes-layout">
      {/* SIDEBAR TRÁI */}
      <div className="modern-sidebar">
        <div className="sidebar-header">
          <h2>Kho Lớp Học</h2>
          <button
            className="btn-action-circle"
            onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}
            title={isTeacher ? "Tạo lớp học mới" : "Tham gia bằng mã"}
          >
            {isTeacher ? <FaPlus /> : <FaSignInAlt />}
          </button>
        </div>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            placeholder="Tìm kiếm danh sách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sidebar-scroll">
          {isLoading ? (
            <div className="loader-center"><FaSpinner className="spin text-blue" size={24} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-sidebar">
              <div className="empty-icon-wrap"><FaBook size={24} /></div>
              <p>Chưa có lớp học nào hiện hành.</p>
            </div>
          ) : (
            <div className="cards-wrapper">
              {filtered.map((cls) => (
                <ClassCard
                  key={cls._id}
                  cls={cls}
                  isActive={activeId === cls._id}
                  onClick={() => handleSelectClass(cls)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KHU VỰC HIỂN THỊ CHÍNH */}
      <div className="modern-main-content">
        {activeId ? (
          <ClassDetail classId={activeId} />
        ) : (
          <div className="empty-state-hero">
            <div className="hero-graphic">
              <FaChalkboardTeacher size={70} color="#94a3b8" />
              <div className="glow-orb"></div>
            </div>
            <h2>Không Gian Học Tập Kỹ Thuật Số</h2>
            <p>Hãy chọn một lớp bên Trái để xem tài liệu và tham gia thảo luận. Nếu bạn chưa có lớp nào, hãy bắt đầu ngay hôm nay nhé!</p>
            <button
              className="btn-hero-action"
              onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}
            >
              {isTeacher ? <><FaPlus /> Khởi Tạo Lớp Mới</> : <><FaSignInAlt /> Gia Nhập Bằng Mã</>}
            </button>
          </div>
        )}
      </div>

      {/* Modals Popup (Portaled virtually via React) */}
      {showCreateModal && <CreateClassModal onClose={() => setShowCreateModal(false)} onCreate={createClass} />}
      {showJoinModal && <JoinClassModal onClose={() => setShowJoinModal(false)} onJoin={handleJoin} />}
    </div>
  );
}
