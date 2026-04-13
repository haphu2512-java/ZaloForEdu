import { useRef, useState } from "react";
import { FaRobot, FaPaperPlane } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ChatbotPage() {
  const { t } = useLanguage();
  const inputRef = useRef(null);

  return (
    <div
      className="chatbot-page"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-tertiary)",
        fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
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

        {/* Bot message */}
        <div style={{ display: "flex", gap: 12, maxWidth: "70%" }}>
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
            className="chatbot-bubble"
            style={{
              background: "var(--bg-primary)",
              padding: "14px 18px",
              borderRadius: "20px", borderTopLeftRadius: 4,
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
              {t("chatbotWelcome")}
            </p>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
              {t("chatbotDesc")}
            </p>
          </div>
        </div>
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
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder={t("chatbotPlaceholder")}
            style={{
              flex: 1, border: "none", background: "transparent",
              outline: "none", fontSize: 15, padding: "8px 0", color: "var(--text-primary)",
            }}
            disabled
          />
          <button
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "var(--primary-color)", color: "white",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "not-allowed", opacity: 0.6,
            }}
          >
            <FaPaperPlane size={15} style={{ marginLeft: -2 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
