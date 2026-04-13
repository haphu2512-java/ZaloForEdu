import { useState, useEffect, useCallback, useRef } from "react";
import {
  FaCloud, FaDownload, FaFilePdf, FaFileWord, FaFileExcel,
  FaFilePowerpoint, FaFileArchive, FaFileVideo, FaFileImage,
  FaFileAlt, FaPlus, FaSearch, FaTrash, FaSpinner,
  FaFilter, FaSort, FaExclamationTriangle, FaCheckCircle,
  FaTimes, FaEye,
} from "react-icons/fa";
import { getMyMedia, uploadFile, deleteMedia } from "../../services/mediaService";
import toast from "react-hot-toast";
import "./MyDocumentsPage.css";

// ── File icon helper ─────────────────────────────────────────
function getFileIcon(fileName = "") {
  const ext = fileName.split(".").pop().toLowerCase();
  const s = { size: 20 };
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <FaFileImage {...s} color="#10B981" />;
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return <FaFileVideo {...s} color="#8B5CF6" />;
  if (ext === "pdf") return <FaFilePdf {...s} color="#EF4444" />;
  if (["doc","docx"].includes(ext)) return <FaFileWord {...s} color="#2563EB" />;
  if (["xls","xlsx"].includes(ext)) return <FaFileExcel {...s} color="#16A34A" />;
  if (["ppt","pptx"].includes(ext)) return <FaFilePowerpoint {...s} color="#EA580C" />;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return <FaFileArchive {...s} color="#D97706" />;
  return <FaFileAlt {...s} color="#6B7280" />;
}

function getFileColor(fileName = "") {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "#10B981";
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return "#8B5CF6";
  if (ext === "pdf") return "#EF4444";
  if (["doc","docx"].includes(ext)) return "#2563EB";
  if (["xls","xlsx"].includes(ext)) return "#16A34A";
  if (["ppt","pptx"].includes(ext)) return "#EA580C";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "#D97706";
  return "#6B7280";
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── File Card ────────────────────────────────────────────────
function FileCard({ file, onDelete, onPreview }) {
  const ext = (file.fileName || "").split(".").pop().toLowerCase();
  const color = getFileColor(file.fileName);
  const isImage = ["jpg","jpeg","png","gif","webp"].includes(ext);

  return (
    <div className="doc-file-card">
      <div className="dfc-icon" style={{ background: color }}>
        {isImage && file.url ? (
          <img src={file.url} alt="" className="dfc-thumb" />
        ) : (
          <span className="dfc-ext">{ext.toUpperCase().slice(0, 4)}</span>
        )}
      </div>

      <div className="dfc-info">
        <span className="dfc-name" title={file.fileName}>{file.fileName}</span>
        <div className="dfc-meta">
          <span>{formatBytes(file.size)}</span>
          <span className="dfc-dot">·</span>
          <span>{formatDate(file.createdAt)}</span>
          <span className="dfc-dot">·</span>
          <span className="dfc-cloud-tag"><FaCloud size={9} /> Cloud</span>
        </div>
      </div>

      <div className="dfc-actions">
        {isImage && (
          <button className="dfc-btn" onClick={() => onPreview(file)} title="Xem trước">
            <FaEye size={13} />
          </button>
        )}
        <a className="dfc-btn" href={file.url} target="_blank" rel="noreferrer" title="Tải xuống">
          <FaDownload size={13} />
        </a>
        <button className="dfc-btn danger" onClick={() => onDelete(file._id)} title="Xóa">
          <FaTrash size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Upload Progress Bar ──────────────────────────────────────
function UploadProgress({ uploads }) {
  if (uploads.length === 0) return null;
  return (
    <div className="upload-progress-list">
      {uploads.map((u) => (
        <div key={u.id} className="upl-item">
          <div className="upl-info">
            <span className="upl-name">{u.name}</span>
            <span className="upl-pct">{u.percent}%</span>
          </div>
          <div className="upl-bar">
            <div className="upl-fill" style={{ width: `${u.percent}%` }} />
          </div>
          {u.error && <span className="upl-error"><FaExclamationTriangle size={11} /> {u.error}</span>}
          {u.done && <span className="upl-done"><FaCheckCircle size={11} /> Hoàn thành</span>}
        </div>
      ))}
    </div>
  );
}

// ── Image Preview Modal ──────────────────────────────────────
function ImagePreview({ file, onClose }) {
  if (!file) return null;
  return (
    <div className="img-preview-overlay" onClick={onClose}>
      <div className="img-preview-box" onClick={(e) => e.stopPropagation()}>
        <button className="img-preview-close" onClick={onClose}><FaTimes size={16} /></button>
        <img src={file.url} alt={file.fileName} className="img-preview-img" />
        <div className="img-preview-name">{file.fileName}</div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "image", label: "Ảnh" },
  { key: "video", label: "Video" },
  { key: "doc", label: "Tài liệu" },
  { key: "archive", label: "Nén" },
];

const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];
const DOC_EXTS = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"];
const ARCHIVE_EXTS = ["zip","rar","7z","tar","gz"];

function getCategory(fileName = "") {
  const ext = fileName.split(".").pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (DOC_EXTS.includes(ext)) return "doc";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";
  return "other";
}

export default function MyDocumentsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [previewFile, setPreviewFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyMedia(1, 100);
      setFiles(data?.media || []);
    } catch (err) {
      toast.error("Không thể tải danh sách file");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Drag & Drop
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(handleUploadFile);
    };
    zone.addEventListener("dragover", onDragOver);
    zone.addEventListener("dragleave", onDragLeave);
    zone.addEventListener("drop", onDrop);
    return () => {
      zone.removeEventListener("dragover", onDragOver);
      zone.removeEventListener("dragleave", onDragLeave);
      zone.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleUploadFile = async (file) => {
    const uploadId = Date.now() + Math.random();
    setUploads((prev) => [...prev, { id: uploadId, name: file.name, percent: 0, done: false, error: null }]);

    try {
      const media = await uploadFile(file, {
        folder: `zaloapp/cloud`,
        onProgress: (pct) => {
          setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, percent: pct } : u));
        },
      });
      setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, percent: 100, done: true } : u));
      setFiles((prev) => [{ ...media, uploadedAt: new Date().toISOString() }, ...prev]);
      toast.success(`Đã tải lên: ${file.name}`);
      // Xóa khỏi progress list sau 3s
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uploadId)), 3000);
    } catch (err) {
      const msg = err.message || "Tải lên thất bại";
      setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, error: msg } : u));
      toast.error(msg);
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uploadId)), 5000);
    }
  };

  const handleFileInput = (e) => {
    Array.from(e.target.files).forEach(handleUploadFile);
    e.target.value = "";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa file này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteMedia(id);
      setFiles((prev) => prev.filter((f) => f._id !== id));
      toast.success("Đã xóa file");
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  // Filter + Search + Sort
  const filtered = files
    .filter((f) => {
      if (filterTab !== "all" && getCategory(f.fileName) !== filterTab) return false;
      if (searchQuery && !f.fileName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date_asc") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name") return (a.fileName || "").localeCompare(b.fileName || "");
      if (sortBy === "size_desc") return (b.size || 0) - (a.size || 0);
      return 0;
    });

  // Stats
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const limitBytes = 1024 * 1024 * 1024;
  const pctUsed = Math.min(100, (totalBytes / limitBytes) * 100);
  const countByType = {
    image: files.filter((f) => getCategory(f.fileName) === "image").length,
    video: files.filter((f) => getCategory(f.fileName) === "video").length,
    doc: files.filter((f) => getCategory(f.fileName) === "doc").length,
    archive: files.filter((f) => getCategory(f.fileName) === "archive").length,
  };

  const isUploading = uploads.some((u) => !u.done && !u.error);

  return (
    <div className="mydocs-page" ref={dropZoneRef}>
      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <FaCloud size={48} />
            <p>Thả file vào đây để tải lên</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mydocs-header">
        <div className="mdh-left">
          <div className="mdh-icon"><FaCloud size={22} /></div>
          <div>
            <h2>Cloud của tôi</h2>
            <p>{files.length} file · {formatBytes(totalBytes)} đã dùng</p>
          </div>
        </div>
        <div className="mdh-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInput}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
          />
          <button
            className="mdh-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <FaSpinner className="spin" size={13} /> : <FaPlus size={13} />}
            Tải lên
          </button>
        </div>
      </div>

      {/* Upload progress */}
      <UploadProgress uploads={uploads} />

      {/* Body */}
      <div className="mydocs-body">
        {/* Left: file list */}
        <div className="mydocs-main">
          {/* Filter tabs */}
          <div className="mydocs-filter-bar">
            <div className="mdf-tabs">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`mdf-tab ${filterTab === tab.key ? "active" : ""}`}
                  onClick={() => setFilterTab(tab.key)}
                >
                  {tab.label}
                  {tab.key !== "all" && countByType[tab.key] > 0 && (
                    <span className="mdf-count">{countByType[tab.key]}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mdf-controls">
              <div className="mdf-search">
                <FaSearch size={12} color="var(--text-tertiary)" />
                <input
                  placeholder="Tìm file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="mdf-clear" onClick={() => setSearchQuery("")}><FaTimes size={11} /></button>
                )}
              </div>
              <select className="mdf-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date_desc">Mới nhất</option>
                <option value="date_asc">Cũ nhất</option>
                <option value="name">Tên A-Z</option>
                <option value="size_desc">Dung lượng lớn nhất</option>
              </select>
            </div>
          </div>

          {/* File list */}
          <div className="mydocs-list">
            {loading ? (
              <div className="mydocs-loading"><FaSpinner className="spin" size={28} /></div>
            ) : filtered.length === 0 ? (
              <div className="mydocs-empty">
                <FaCloud size={52} />
                <h3>{searchQuery || filterTab !== "all" ? "Không tìm thấy file" : "Chưa có file nào"}</h3>
                <p>
                  {searchQuery || filterTab !== "all"
                    ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                    : "Kéo thả file vào đây hoặc nhấn \"Tải lên\" để bắt đầu."}
                </p>
                {!searchQuery && filterTab === "all" && (
                  <button className="mydocs-upload-cta" onClick={() => fileInputRef.current?.click()}>
                    <FaPlus size={13} /> Tải lên file đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="mydocs-file-list">
                {filtered.map((f) => (
                  <FileCard
                    key={f._id}
                    file={f}
                    onDelete={handleDelete}
                    onPreview={setPreviewFile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: stats panel */}
        <div className="mydocs-sidebar">
          <div className="mds-section">
            <div className="mds-cloud-icon"><FaCloud size={24} /></div>
            <h3>Cloud của tôi</h3>
            <p>Lưu trữ tài liệu cá nhân an toàn trên đám mây</p>
          </div>

          <div className="mds-section">
            <div className="mds-storage-label">
              <span>Dung lượng</span>
              <span className="mds-storage-value">{formatBytes(totalBytes)} / 1 GB</span>
            </div>
            <div className="mds-progress">
              <div
                className="mds-progress-fill"
                style={{
                  width: `${pctUsed}%`,
                  background: pctUsed > 80 ? "#ef4444" : pctUsed > 60 ? "#f59e0b" : "#0068FF",
                }}
              />
            </div>
            <div className="mds-legend">
              <span><div className="mds-dot" style={{ background: "#10B981" }} />Ảnh ({countByType.image})</span>
              <span><div className="mds-dot" style={{ background: "#8B5CF6" }} />Video ({countByType.video})</span>
              <span><div className="mds-dot" style={{ background: "#3B82F6" }} />Tài liệu ({countByType.doc})</span>
              <span><div className="mds-dot" style={{ background: "#D97706" }} />Nén ({countByType.archive})</span>
            </div>
          </div>

          <div className="mds-section">
            <h4>Hướng dẫn</h4>
            <ul className="mds-tips">
              <li>Kéo thả file vào trang để tải lên nhanh</li>
              <li>Hỗ trợ: Ảnh, Video, PDF, Word, Excel, ZIP...</li>
              <li>Tối đa 10MB mỗi file</li>
              <li>File được lưu trữ an toàn trên Cloudinary</li>
            </ul>
          </div>

          <div className="mds-upgrade">
            <div className="mds-upgrade-icon">🚀</div>
            <h4>Nâng cấp dung lượng</h4>
            <p>Nhận ngay 100GB và nhiều tính năng ưu việt.</p>
            <button className="mds-upgrade-btn">Xem các gói cước</button>
          </div>
        </div>
      </div>

      {/* Image preview */}
      {previewFile && <ImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}
