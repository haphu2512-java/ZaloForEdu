import { useState, useEffect, useCallback } from "react";
import { FaCloud, FaDownload, FaFile, FaImage, FaVideo, FaPlus, FaSearch, FaTrash, FaSpinner } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import { getMyMedia, uploadFile, deleteMedia, FILE_COLORS } from "../../services/mediaService";

function FileCard({ file, onDelete }) {
  const extension = file.fileName.split(".").pop().toLowerCase();
  const color = FILE_COLORS[extension] || "#10B981";
  const extLabel = extension.toUpperCase();

  const handleDownload = () => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  };

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
      }}>{extLabel}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.fileName}</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{formatSize(file.size)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#0068FF" }}>
            <FaCloud size={10} /> Cloud
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 12, whiteSpace: "nowrap" }}>{formatDate(file.createdAt)}</div>
      
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          onClick={handleDownload}
          style={{
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
        <button 
          onClick={() => onDelete(file._id)}
          style={{
            width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border-color)",
            background: "var(--bg-secondary)", color: "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <FaTrash size={12} />
        </button>
      </div>
    </div>
  );
}

export default function MyDocumentsPage() {
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyMedia(1, 50);
      setFiles(data.media || []);
    } catch (error) {
      console.error("Failed to load files", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadFile(file);
      await loadFiles();
    } catch (error) {
      alert(error.message || "Tải lên thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa tệp này?")) return;
    try {
      await deleteMedia(id);
      setFiles(prev => prev.filter(f => f._id !== id));
    } catch (error) {
      alert("Xóa thất bại");
    }
  };

  const filteredFiles = files.filter(f => 
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const limitBytes = 1024 * 1024 * 1024; // 1 GB
  const pctUsed = (totalBytes / limitBytes) * 100;

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
            Cloud của tôi
          </h2>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Lưu trữ tài liệu cá nhân an toàn
          </span>
        </div>
        
        <label style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: isUploading ? "#94A3B8" : "#0068FF", color: "white", fontWeight: 600, fontSize: 13,
          cursor: isUploading ? "default" : "pointer", fontFamily: "inherit",
        }}>
          {isUploading ? <FaSpinner className="spin" /> : <FaPlus size={12} />}
          {isUploading ? "Đang tải..." : "Tải lên"}
          <input type="file" onChange={handleUpload} style={{ display: "none" }} disabled={isUploading} />
        </label>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {/* Search bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--input-bg)", border: "1.5px solid var(--border-color)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          }}>
            <FaSearch size={14} color="var(--text-tertiary)" />
            <input 
              placeholder="Tìm kiếm tài liệu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: "none", background: "transparent", outline: "none",
                fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit",
              }} 
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Tất cả tài liệu ({filteredFiles.length})
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}><FaSpinner className="spin" size={24} color="#0068FF" /></div>
            ) : filteredFiles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>Chưa có tài liệu nào</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredFiles.map(f => <FileCard key={f._id} file={f} onDelete={handleDelete} />)}
              </div>
            )}
          </div>
        </div>

        <div style={{
          width: 260, flexShrink: 0, borderLeft: "1px solid var(--border-color)",
          background: "var(--bg-primary)", padding: "24px 20px",
          display: "flex", flexDirection: "column", gap: 24, overflowY: "auto",
        }}>
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
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>Cloud của tôi</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                Dung lượng miễn phí: 1 GB
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13,
              fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
              <span>Dung lượng đã dùng</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{pctUsed.toFixed(1)}%</span>
            </div>
            <div style={{ height: 12, background: "var(--bg-secondary)", borderRadius: 6,
              overflow: "hidden", display: "flex", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ width: `${pctUsed}%`, background: "#0068FF", transition: "width 0.5s" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-secondary)", textAlign: "center" }}>
              Đã dùng {(totalBytes / (1024 * 1024)).toFixed(1)} MB trên 1024 MB
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #e0eeff)",
            border: "1px solid #bfdbfe", borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🚀</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
              Nâng cấp dung lượng
            </div>
            <div style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.5, marginBottom: 12 }}>
              Nhận ngay 100GB lưu trữ và nhiều tính năng ưu việt khác.
            </div>
            <button style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              background: "white", border: "1px solid #bfdbfe",
              color: "#2563eb", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Xem các gói cước
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
