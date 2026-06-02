import { useState, useEffect } from "react";
import { pollService } from "../../services/pollService";
import toast from "react-hot-toast";

export default function PollMessage({ poll, userId, onPollVoted }) {
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ lựa chọn khi dữ liệu poll thay đổi (từ socket hoặc sau khi vote)
  useEffect(() => {
    if (poll?.options) {
      const myVotes = poll.options
        .map((opt, index) => {
          const voteIds = (opt.votes || []).filter(v => v !== null).map(v => String(v._id || v));
          return voteIds.includes(String(userId)) ? index : -1;
        })
        .filter(index => index !== -1);
      setSelectedIndexes(myVotes);
    }
  }, [poll, userId]);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  const toggleOption = (index) => {
    if (poll.isClosed) return;
    if (poll.isMultipleChoice) {
      setSelectedIndexes(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setSelectedIndexes([index]);
    }
  };

  const handleVote = async () => {
    if (isSubmitting || poll.isClosed) return;
    if (selectedIndexes.length === 0) {
      toast.error("Vui lòng chọn phương án");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await pollService.votePoll(poll._id, selectedIndexes);
      toast.success("Đã bình chọn thành công!");
      if (res.data || res) {
        onPollVoted?.(res.data || res);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi bình chọn");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.pollBadge}>📊 BIỂU QUYẾT</div>
        <h4 style={styles.question}>{poll.question}</h4>
        <div style={styles.stats}>{totalVotes} lượt bình chọn</div>
      </div>

      <div style={styles.optionsList}>
        {poll.options.map((option, index) => {
          const isSelected = selectedIndexes.includes(index);
          const voteCount = option.votes.length;
          const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

          // voters là array object (sau populate) hoặc array ID
          const voterObjects = option.votes.filter(v => typeof v === 'object' && v !== null && v.username);

          return (
            <div key={index} style={styles.optionRow}>
              {/* Dòng option chính */}
              <div
                style={{ ...styles.optionContent, cursor: poll.isClosed ? "default" : "pointer" }}
                onClick={() => toggleOption(index)}
              >
                <div style={{
                  ...styles.radio,
                  borderRadius: poll.isMultipleChoice ? "4px" : "50%",
                  borderColor: isSelected ? "#0068FF" : "#D1D5DB",
                  background: isSelected ? "#0068FF" : "transparent"
                }}>
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={styles.optionText}>{option.text}</span>
                <span style={styles.voteCount}>{voteCount}</span>
              </div>

              {/* Thanh tiến trình */}
              <div style={styles.progressBg}>
                <div style={{ ...styles.progressFill, width: `${percent}%` }} />
              </div>

              {/* Hiển thị tên người đã bình chọn — ẩn nếu bình chọn ẩn danh */}
              {!poll.isAnonymous && voterObjects.length > 0 && (
                <div style={styles.voterNameList}>
                  {voterObjects.map((voter, vi) => (
                    <span key={vi} style={styles.voterName}>
                      {voter.username || voter.fullName}
                    </span>
                  ))}
                </div>
              )}
              {poll.isAnonymous && voteCount > 0 && (
                <div style={styles.voterNameList}>
                  <span style={{ ...styles.voterName, color: '#9CA3AF', fontStyle: 'italic' }}>
                    🔒 {voteCount} phiếu ẩn danh
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!poll.isClosed && (
        <button
          style={{ ...styles.voteBtn, opacity: isSubmitting ? 0.7 : 1 }}
          onClick={handleVote}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang gửi..." : "Bình chọn"}
        </button>
      )}

      {poll.isClosed && (
        <div style={styles.closedText}>Bình chọn đã đóng</div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", width: "100%", maxWidth: 320, overflow: "hidden", display: "flex", flexDirection: "column" },
  header: { padding: "12px 16px", borderBottom: "1px solid #F3F4F6" },
  pollBadge: { fontSize: 10, fontWeight: 700, color: "#0068FF", marginBottom: 4, letterSpacing: 0.5 },
  question: { fontSize: 15, fontWeight: 700, margin: "0 0 4px 0", color: "#1F2937" },
  stats: { fontSize: 12, color: "#6B7280" },
  optionsList: { padding: "12px 16px" },
  optionRow: { marginBottom: "14px", position: "relative" },
  optionContent: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", position: "relative", zIndex: 2 },
  radio: { width: 18, height: 18, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  optionText: { flex: 1, fontSize: 14, color: "#374151" },
  voteCount: { fontSize: 12, fontWeight: 600, color: "#6B7280" },
  progressBg: { height: 5, background: "#F3F4F6", borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #60A5FA, #3B82F6)", borderRadius: 3, transition: "width 0.4s ease" },
  voterNameList: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 },
  voterName: { fontSize: 11, color: "#374151", background: "#F3F4F6", borderRadius: 10, padding: "2px 8px" },
  voteBtn: { margin: "0 16px 16px", padding: "9px", background: "#EBF5FF", color: "#0068FF", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "background 0.2s" },
  closedText: { textAlign: "center", padding: "10px", fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
};
