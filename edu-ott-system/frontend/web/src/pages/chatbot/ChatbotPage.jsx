import { useRef, useState, useEffect } from "react";
import { FaRobot, FaPaperPlane } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";

import { askChatbot } from "../../services/chatbotService"; 

export default function ChatbotPage() {
  const { t } = useLanguage();
  
  // States quản lý chat
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: t("chatbotWelcome"),
      desc: t("chatbotDesc") // Giữ lại desc cho lời chào đầu tiên nếu cần
    },
  ]);

  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống cuối mỗi khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    // Chuẩn bị lịch sử tin nhắn (Lấy 12 tin nhắn gần nhất, bỏ qua tin nhắn welcome)
    const history = messages
      .filter((msg) => msg.id !== "welcome")
      .slice(-12)
      .map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));

    // Thêm tin nhắn của User vào UI
    const userMessage = { id: `${Date.now()}-u`, role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Gọi API backend
      const res = await askChatbot(text, history);
      
      const botMessage = {
        id: `${Date.now()}-b`,
        role: "assistant",
        text: res.reply || t("chatbotNoReply", "Mình chưa có câu trả lời phù hợp."),
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          text: t("chatbotError", "Không thể kết nối ChatBot lúc này. Bạn thử lại sau nhé."),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="chatbot-page"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-tertiary)",
        fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
        height: "100%", // Đảm bảo chiếm trọn chiều cao container
      }}
    >
      {/* HEADER */}
      <div
        className="chatbot-header"
        style={{
          padding: "16px 24px",
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #0068FF, #00C6FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", boxShadow: "0 4px 10px rgba(0,104,255,0.2)",
            flexShrink: 0,
          }}
        >
          <FaRobot size={24} />
        </div>
        <div>
          <h2 style={{ margin: "0 0 2px 0", fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
            {t("chatbotName")}
          </h2>
          <span style={{ fontSize: 13, color: "#10b981", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, background: "#10b981", borderRadius: "50%", display: "inline-block" }} />
            {t("chatbotStatus")}
          </span>
        </div>
      </div>

      {/* CHAT AREA */}
      <div
        className="chatbot-area"
        style={{
          flex: 1, padding: "24px 32px", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 24,
        }}
      >
        {/* Date separator */}
        <div
          className="chatbot-date-sep"
          style={{
            alignSelf: "center",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            padding: "5px 16px", borderRadius: 20,
            fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600,
          }}
        >
          {t("chatbotToday")}
        </div>

        {/* Render danh sách tin nhắn */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div 
              key={msg.id} 
              style={{ 
                display: "flex", 
                gap: 12, 
                maxWidth: "75%", 
                alignSelf: isUser ? "flex-end" : "flex-start",
                flexDirection: isUser ? "row-reverse" : "row"
              }}
            >
              {/* Avatar Bot (Chỉ hiện nếu là Bot) */}
              {!isUser && (
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #0068FF, #00C6FF)",
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", boxShadow: "0 2px 6px rgba(0,104,255,0.2)",
                  }}
                >
                  <FaRobot size={18} />
                </div>
              )}

              {/* Bubble Message */}
              <div
                className="chatbot-bubble"
                style={{
                  background: isUser ? "var(--primary-color, #0068FF)" : "var(--bg-primary)",
                  color: isUser ? "#fff" : "var(--text-primary)",
                  padding: "14px 18px",
                  borderRadius: "20px",
                  borderTopLeftRadius: !isUser ? 4 : 20,
                  borderTopRightRadius: isUser ? 4 : 20,
                  border: isUser ? "none" : "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-sm)",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap"
                }}
              >
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: isUser ? 400 : 500, 
                  color: isUser ? "#fff" : "var(--text-primary)" }}>
                  {msg.text}
                </p>
                {/* Chỉ dùng cho tin nhắn welcome có chứa description */}
                {msg.desc && (
                  <p style={{ margin: "8px 0 0 0", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
                    {msg.desc}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Trạng thái đang gõ (Loading) */}
        {isLoading && (
          <div style={{ display: "flex", gap: 12, maxWidth: "70%", alignSelf: "flex-start" }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #0068FF, #00C6FF)",
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", boxShadow: "0 2px 6px rgba(0,104,255,0.2)",
              }}
            >
              <FaRobot size={18} />
            </div>
            <div
              style={{
                background: "var(--bg-primary)",
                padding: "14px 18px",
                borderRadius: "20px", borderTopLeftRadius: 4,
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
                display: "flex", alignItems: "center", gap: 4
              }}
            >
              <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-tertiary)", borderRadius: "50%", animation: "blink 1.4s infinite both" }} />
              <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-tertiary)", borderRadius: "50%", animation: "blink 1.4s infinite both 0.2s" }} />
              <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-tertiary)", borderRadius: "50%", animation: "blink 1.4s infinite both 0.4s" }} />
            </div>
          </div>
        )}
        
        {/* Điểm neo để tự động scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div
        className="chatbot-input-bar"
        style={{
          padding: "16px 32px",
          background: "var(--bg-primary)",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div
          className="chatbot-input-wrap"
          style={{
            display: "flex", alignItems: "center",
            background: "var(--input-bg)",
            borderRadius: 24, padding: "8px 8px 8px 16px",
            border: "1px solid var(--border-color)", transition: "all 0.2s",
          }}
        >
          <input
            type="text"
            className="chatbot-input"
            placeholder={t("chatbotPlaceholder", "Nhập câu hỏi cho AI ChatBot...")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{
              flex: 1, border: "none", background: "transparent",
              outline: "none", fontSize: 15, padding: "8px 0", color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: inputValue.trim() && !isLoading ? "var(--primary-color, #0068FF)" : "var(--border-color, #ccc)", 
              color: "white",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: inputValue.trim() && !isLoading ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            <FaPaperPlane size={15} style={{ marginLeft: -2 }} />
          </button>
        </div>
      </div>

      {/* Tùy chọn: Thêm CSS cho hiệu ứng typing (Bạn có thể bỏ vào file CSS chung của dự án) */}
      <style>{`
        @keyframes blink {
          0% { opacity: 0.2; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}