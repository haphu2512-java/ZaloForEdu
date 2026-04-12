import { FaCloud, FaDownload, FaFile, FaImage, FaVideo, FaPlus, FaSearch, FaFolder } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";

// Mock files data
const MOCK_FILES = [
  { id: 1, name: "chapter7.pptx.pdf", size: "2.1 MB", type: "pdf", date: "10/04/2026 10:20", onCloud: true },
  { id: 2, name: "Nhom20_PM.mpp",     size: "999.5 KB", type: "mpp", date: "10/04/2026 09:06", onCloud: true },
  { id: 3, name: "BaocaoNhom.docx",   size: "1.4 MB",  type: "doc", date: "08/04/2026 14:30", onCloud: false },
];

const FILE_COLORS = { pdf: "#EF4444", doc: "#3B82F6", mpp: "#8B5CF6", img: "#F59E0B", default: "#10B981" };

function FileCard({ file }) {
  const color = FILE_COLORS[file.type] || FILE_COLORS.default;
  const ext = file.name.split(".").pop().toUpperCase();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
      background: "var(--bg-primary)", borderRadius: 12,
      border: "1px solid var(--border-color)", transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{
        width: 44, height: 52, borderRadius: 8, background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0,
        boxShadow: `0 2px 8px ${color}55`,
      }}>{ext}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{file.size}</span>
          {file.onCloud && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#0068FF" }}>
              <FaCloud size={10} /> Đã có trên Cloud
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 12, whiteSpace: "nowrap" }}>{file.date}</div>
      <button style={{
        width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border-color)",
        background: "var(--bg-secondary)", color: "var(--text-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#0068FF"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <FaDownload size={13} />
      </button>
    </div>
  );
}

export default function MyDocumentsPage() {
  const { t } = useLanguage();

  // Storage mock
  const usedMB = 522;
  const totalMB = 1024;
  const imageMB = 120;
  const videoMB = 0;
  const fileMB = 250;
  const otherMB = usedMB - imageMB - videoMB - fileMB;
  const pct = (v) => `${((v / totalMB) * 100).toFixed(1)}%`;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "var(--bg-secondary)", height: "100%", fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    }}>
      {/* HEADER */}
      <div style={{
        padding: "16px 28px", background: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, #0068FF 0%, #00C6FF 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "white",
          boxShadow: "0 4px 12px rgba(0,104,255,0.2)", flexShrink: 0,
        }}>
          <FaCloud size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
            My Documents
          </h2>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {t("upgradeDesc")}
          </span>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: "#0068FF", color: "white", fontWeight: 600, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          <FaPlus size={12} /> Tải lên
        </button>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT - File list */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {/* Search bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--input-bg)", border: "1.5px solid var(--border-color)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          }}>
            <FaSearch size={14} color="var(--text-tertiary)" />
            <input placeholder="Tìm kiếm tài liệu..." style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit",
            }} />
          </div>

          {/* Section: Recent */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Gần đây
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MOCK_FILES.map(f => <FileCard key={f.id} file={f} />)}
            </div>
          </div>
        </div>

        {/* RIGHT - Storage Panel */}
        <div style={{
          width: 260, flexShrink: 0, borderLeft: "1px solid var(--border-color)",
          background: "var(--bg-primary)", padding: "24px 20px",
          display: "flex", flexDirection: "column", gap: 24, overflowY: "auto",
        }}>
          {/* Cloud icon */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            paddingBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg, #0068FF, #00C6FF)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "white",
              boxShadow: "0 6px 16px rgba(0,104,255,0.2)",
            }}>
              <FaCloud size={22} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>My Documents</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                Lưu trữ và truy cập nhanh nội dung quan trọng
              </div>
            </div>
          </div>

          {/* Storage */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13,
              fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
              <span>{t("cloudStorage")}</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{usedMB} MB / {totalMB / 1024} GB</span>
            </div>
            {/* Progress Bar */}
            <div style={{ height: 12, background: "var(--bg-secondary)", borderRadius: 6,
              overflow: "hidden", display: "flex", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ width: pct(imageMB), background: "#F59E0B", transition: "width 0.5s" }} />
              <div style={{ width: pct(videoMB), background: "#10B981" }} />
              <div style={{ width: pct(fileMB), background: "#3B82F6" }} />
              <div style={{ width: pct(otherMB), background: "#94A3B8" }} />
            </div>
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11,
              color: "var(--text-secondary)" }}>
              {[["#F59E0B","Ảnh"],["#10B981","Video"],["#3B82F6","File"],["#94A3B8","Khác"]].map(([c,l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Clean button */}
          <button style={{
            padding: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            borderRadius: 8, fontWeight: 600, fontSize: 13, color: "var(--text-primary)",
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
          >
            {t("cleanupBtn")}
          </button>

          {/* Upgrade card */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #e0eeff)",
            border: "1px solid #bfdbfe", borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🚀</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
              {t("upgradeTitle")}
            </div>
            <div style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.5, marginBottom: 12 }}>
              {t("upgradeDesc")}
            </div>
            <button style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              background: "white", border: "1px solid #bfdbfe",
              color: "#2563eb", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {t("upgradeBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
