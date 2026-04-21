import { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash, FaSpinner } from "react-icons/fa";
import { pollService } from "../../../services/pollService";
import toast from "react-hot-toast";

export default function CreatePollModal({ isOpen, onClose, conversationId, onCreated }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuestion("");
      setOptions(["", ""]);
      setIsMultipleChoice(false);
      setIsAnonymous(false);
    }
  }, [isOpen]);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      toast.error("Vui lòng nhập câu hỏi");
      return;
    }
    const validOptions = options.filter(opt => opt.trim() !== "");
    if (validOptions.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 phương án");
      return;
    }

    setLoading(true);
    try {
      const res = await pollService.createPoll({
        conversationId,
        question: question.trim(),
        options: validOptions,
        isMultipleChoice,
        isAnonymous
      });
      toast.success("Đã tạo bình chọn");
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo bình chọn");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Tạo bình chọn</span>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div style={styles.body}>
          <div style={styles.section}>
            <label style={styles.label}>Câu hỏi bình chọn</label>
            <textarea
              style={styles.textarea}
              placeholder="Nhập câu hỏi..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Các phương án</label>
            {options.map((opt, index) => (
              <div key={index} style={styles.optionRow}>
                <input
                  style={styles.input}
                  placeholder={`Phương án ${index + 1}`}
                  value={opt}
                  onChange={e => handleOptionChange(index, e.target.value)}
                />
                {options.length > 2 && (
                  <button style={styles.removeBtn} onClick={() => handleRemoveOption(index)}>
                    <FaTrash size={12} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button style={styles.addBtn} onClick={handleAddOption}>
                <FaPlus size={12} /> Thêm phương án
              </button>
            )}
          </div>

          <div style={styles.optionsSection}>
            <div style={styles.checkboxRow} onClick={() => setIsMultipleChoice(!isMultipleChoice)}>
              <div style={{ ...styles.checkbox, background: isMultipleChoice ? "#0068FF" : "transparent", borderColor: isMultipleChoice ? "#0068FF" : "#D1D5DB" }}>
                {isMultipleChoice && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={styles.optionText}>Chọn nhiều phương án</span>
            </div>

            <div style={styles.checkboxRow} onClick={() => setIsAnonymous(!isAnonymous)}>
              <div style={{ ...styles.checkbox, background: isAnonymous ? "#0068FF" : "transparent", borderColor: isAnonymous ? "#0068FF" : "#D1D5DB" }}>
                {isAnonymous && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={styles.optionText}>Bình chọn ẩn danh</span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Hủy</button>
          <button
            style={{ ...styles.createBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? <FaSpinner className="spin" size={14} /> : "Tạo bình chọn"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 14, width: 400, maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" },
  title: { fontWeight: 700, fontSize: 16 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" },
  body: { padding: "20px", overflowY: "auto", flex: 1 },
  section: { marginBottom: "20px" },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: "8px", color: "#4B5563" },
  textarea: { width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #E5E7EB", outline: "none", fontSize: 14, resize: "none" },
  input: { flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #E5E7EB", outline: "none", fontSize: 14 },
  optionRow: { display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" },
  removeBtn: { background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px" },
  addBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#0068FF", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0" },
  optionsSection: { borderTop: "1px solid #F3F4F6", paddingTop: "15px" },
  checkboxRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", cursor: "pointer" },
  checkbox: { width: 18, height: 18, borderRadius: 4, border: "2px solid #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 14, color: "#374151" },
  footer: { padding: "16px 20px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: { padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none", cursor: "pointer", fontWeight: 600, color: "#4B5563" },
  createBtn: { padding: "8px 20px", borderRadius: 8, border: "none", background: "#0068FF", color: "#fff", cursor: "pointer", fontWeight: 600 },
};
