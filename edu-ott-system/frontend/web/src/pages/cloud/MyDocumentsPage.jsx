import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  FaCloud, FaDownload, FaFilePdf, FaFileWord, FaFileExcel,
  FaFilePowerpoint, FaFileArchive, FaFileVideo, FaFileImage,
  FaFileAlt, FaPlus, FaSearch, FaTrash, FaSpinner,
  FaTimes, FaEye, FaFolder, FaImage, FaVideo,
  FaPaperclip, FaThumbsUp, FaPaperPlane, FaEllipsisV,
  FaCheckCircle, FaExclamationTriangle,
} from "react-icons/fa";
import { getMyMedia, uploadFile, deleteMedia } from "../../services/mediaService";
import toast from "react-hot-toast";
import "./MyDocumentsPage.css";

// ── Helpers ──────────────────────────────────────────────────
const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];
const DOC_EXTS   = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"];
const ARCHIVE_EXTS = ["zip","rar","7z","tar","gz"];

function getExt(fileName = "") { return fileName.split(".").pop().toLowerCase(); }

function getCategory(fileName = "") {
  const ext = getExt(fileName);
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (DOC_EXTS.includes(ext)) return "doc";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";
  return "other";
}

function getFileColor(fileName = "") {
  const ext = getExt(fileName);
  if (IMAGE_EXTS.includes(ext)) return "#10B981";
  if (VIDEO_EXTS.includes(ext)) return "#8B5CF6";
  if (ext === "pdf") return "#EF4444";
  if (["doc","docx"].includes(ext)) return "#2563EB";
  if (["xls","xlsx"].includes(ext)) return "#16A34A";
  if (["ppt","pptx"].includes(ext)) return "#EA580C";
  if (ARCHIVE_EXTS.includes(ext)) return "#D97706";
  return "#6B7280";
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return format(d, "HH:mm");
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) {
    const days = ["CN","T2","T3","T4","T5","T6","T7"];
    return days[d.getDay()];
  }
  return format(d, "dd/MM/yyyy");
}

function formatDateSep(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  const days = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
  if (diffDays < 7) return days[d.getDay()] + " " + format(d, "dd/MM");
  return format(d, "dd/MM/yyyy");
}

// ── Image Preview ────────────────────────────────────────────
function ImagePreview({ file, onClose }) {
  if (!file) return null;
  return (
    <div className="mdc-img-overlay" onClick={onClose}>
      <div className="mdc-img-box" onClick={e => e.stopPropagation()}>
        <button className="mdc-img-close" onClick={onClose}><FaTimes size={16}/></button>
        <img src={file.url} alt={file.fileName} className="mdc-img-full"/>
        <div className="mdc-img-name">{file.fileName}</div>
      </div>
    </div>
  );
}

// ── File Message Bubble ──────────────────────────────────────
function FileBubble({ file, onDelete, onPreview }) {
  const ext = getExt(file.fileName);
  const isImage = IMAGE_EXTS.includes(ext);
  const color = getFileColor(file.fileName);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="mdc-msg-wrap me">
      <div className="mdc-msg-body">
        {isImage ? (
          <div className="mdc-img-bubble" onClick={() => onPreview(file)}>
            <img src={file.url} alt={file.fileName} className="mdc-img-thumb"/>
            <div className="mdc-img-overlay-bar">
              <span>{file.fileName}</span>
              <a href={file.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                <FaDownload size={12}/>
              </a>
            </div>
          </div>
        ) : (
          <div className="mdc-file-bubble">
            <div className="mdc-fb-icon" style={{ background: color }}>
              <span>{ext.toUpperCase().slice(0,4)}</span>
            </div>
            <div className="mdc-fb-info">
              <span className="mdc-fb-name">{file.fileName}</span>
              <div className="mdc-fb-meta">
                <span>{formatBytes(file.size)}</span>
                <span className="mdc-fb-cloud"><FaCloud size={9}/> Đã có trên Cloud</span>
              </div>
            </div>
            <div className="mdc-fb-actions">
              <a className="mdc-fb-btn" href={file.url} target="_blank" rel="noreferrer" title="Tải xuống">
                <FaDownload size={13}/>
              </a>
            </div>
          </div>
        )}
        <div className="mdc-msg-time">
          {formatTime(file.createdAt)}
          <span className="mdc-msg-sent">✓ Đã gửi</span>
        </div>
      </div>
      <div className="mdc-msg-menu-wrap">
        <button className="mdc-msg-menu-btn" onClick={() => setShowMenu(!showMenu)}>
          <FaEllipsisV size={11}/>
        </button>
        {showMenu && (
          <div className="mdc-msg-menu">
            <div className="mdc-mm-item danger" onClick={() => { setShowMenu(false); onDelete(file._id); }}>
              <FaTrash size={12}/> Xóa
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Progress ──────────────────────────────────────────
function UploadingBubble({ upload }) {
  return (
    <div className="mdc-msg-wrap me">
      <div className="mdc-msg-body">
        <div className="mdc-uploading-bubble">
          <FaSpinner className="spin" size={14}/>
          <div className="mdc-upl-info">
            <span className="mdc-upl-name">{upload.name}</span>
            <div className="mdc-upl-bar">
              <div className="mdc-upl-fill" style={{ width: `${upload.percent}%` }}/>
            </div>
            <span className="mdc-upl-pct">{upload.percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "image", label: "Ảnh/Video" },
  { key: "doc", label: "File" },
];

export default function MyDocumentsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState("");

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pageRef = useRef(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyMedia(1, 200);
      setFiles(data?.media || []);
    } catch {
      toast.error("Không thể tải danh sách file");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [files, uploads]);

  // Drag & Drop
  useEffect(() => {
    const zone = pageRef.current;
    if (!zone) return;
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e) => { if (!zone.contains(e.relatedTarget)) setIsDragging(false); };
    const onDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      Array.from(e.dataTransfer.files).forEach(handleUploadFile);
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
    setUploads(prev => [...prev, { id: uploadId, name: file.name, percent: 0, done: false, error: null }]);
    try {
      const media = await uploadFile(file, {
        folder: "zaloapp/cloud",
        onProgress: (pct) => setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, percent: pct } : u)),
      });
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, percent: 100, done: true } : u));
      setFiles(prev => [...prev, { ...media }]);
      setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uploadId)), 2000);
    } catch (err) {
      const msg = err.message || "Tải lên thất bại";
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, error: msg } : u));
      toast.error(msg);
      setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uploadId)), 4000);
    }
  };

  const handleFileInput = (e) => {
    Array.from(e.target.files).forEach(handleUploadFile);
    e.target.value = "";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa file này?")) return;
    try {
      await deleteMedia(id);
      setFiles(prev => prev.filter(f => f._id !== id));
      toast.success("Đã xóa");
    } catch { toast.error("Xóa thất bại"); }
  };

  // Filter
  const filtered = files.filter(f => {
    const cat = getCategory(f.fileName);
    if (filterTab === "image" && !["image","video"].includes(cat)) return false;
    if (filterTab === "doc" && ["image","video"].includes(cat)) return false;
    if (searchQuery && !f.fileName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce((acc, f) => {
    const key = formatDateSep(f.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  // Stats
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const limitBytes = 1024 * 1024 * 1024;
  const pctUsed = Math.min(100, (totalBytes / limitBytes) * 100);
  const countImg = files.filter(f => getCategory(f.fileName) === "image").length;
  const countVid = files.filter(f => getCategory(f.fileName) === "video").length;
  const countDoc = files.filter(f => getCategory(f.fileName) === "doc").length;
  const countArc = files.filter(f => getCategory(f.fileName) === "archive").length;

  const isUploading = uploads.some(u => !u.done && !u.error);

  return (
    <div className="mdc-page" ref={pageRef}>
      {/* Drag overlay */}
      {isDragging && (
        <div className="mdc-drag-overlay">
          <div className="mdc-drag-inner">
            <FaCloud size={52}/>
            <p>Thả file vào đây để lưu trữ</p>
          </div>
        </div>
      )}

      {/* ── LEFT: Chat-style file list ── */}
      <div className="mdc-chat-area">
        {/* Header */}
        <div className="mdc-header">
          <div className="mdc-header-left">
            <div className="mdc-header-icon"><FaCloud size={20}/></div>
            <div>
              <div className="mdc-header-title">My Documents</div>
              <div className="mdc-header-sub">Lưu và đồng bộ dữ liệu giữa các thiết bị</div>
            </div>
          </div>
          <div className="mdc-header-actions">
            <button className="mdc-hdr-btn" title="Tìm kiếm">
              <FaSearch size={15}/>
            </button>
            <button className="mdc-hdr-btn" title="Thông tin">
              <FaEllipsisV size={15}/>
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mdc-filter-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={`mdc-ftab ${filterTab === tab.key ? "active" : ""}`}
              onClick={() => setFilterTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          {searchQuery && (
            <div className="mdc-search-inline">
              <FaSearch size={11}/>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm file..."
                autoFocus
              />
              <button onClick={() => setSearchQuery("")}><FaTimes size={10}/></button>
            </div>
          )}
          <button className="mdc-search-trigger" onClick={() => setSearchQuery(" ")}>
            <FaSearch size={13}/>
          </button>
        </div>

        {/* Messages area */}
        <div className="mdc-messages">
          {loading ? (
            <div className="mdc-loading"><FaSpinner className="spin" size={28}/></div>
          ) : filtered.length === 0 && uploads.length === 0 ? (
            <div className="mdc-empty">
              <div className="mdc-empty-icon"><FaCloud size={52}/></div>
              <h3>Chưa có file nào</h3>
              <p>Gửi ảnh, video, tài liệu để lưu trữ cá nhân</p>
              <button className="mdc-empty-btn" onClick={() => fileInputRef.current?.click()}>
                <FaPlus size={13}/> Tải lên ngay
              </button>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <div className="mdc-date-sep">{dateLabel}</div>
                  {items.map(f => (
                    <FileBubble
                      key={f._id}
                      file={f}
                      onDelete={handleDelete}
                      onPreview={setPreviewFile}
                    />
                  ))}
                </div>
              ))}
              {uploads.map(u => (
                <UploadingBubble key={u.id} upload={u}/>
              ))}
            </>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {/* ── Input bar (Zalo-style) ── */}
        <div className="mdc-input-area">
          {/* Hidden inputs */}
          <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFileInput}/>
          <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display:"none" }} onChange={handleFileInput}/>
          <input ref={fileInputRef} type="file" multiple style={{ display:"none" }} onChange={handleFileInput}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"/>

          {/* Toolbar */}
          <div className="mdc-toolbar">
            <button className="mdc-tool-btn" title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <button className="mdc-tool-btn" title="Đính kèm file" onClick={() => fileInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button className="mdc-tool-btn" title="Gửi video" onClick={() => videoInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </button>
            <button className="mdc-tool-btn" title="Gửi thư mục" onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("webkitdirectory", "");
                fileInputRef.current.click();
              }
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Text + send */}
          <div className="mdc-input-row">
            <div className="mdc-input-wrap">
              <input
                className="mdc-input"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Nhập @, tin nhắn tới My Documents"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && textInput.trim()) {
                    toast("Ghi chú đã lưu: " + textInput);
                    setTextInput("");
                  }
                }}
              />
            </div>
            {textInput.trim() ? (
              <button className="mdc-send-btn" onClick={() => { toast("Ghi chú đã lưu!"); setTextInput(""); }}>
                <FaPaperPlane size={15}/>
              </button>
            ) : (
              <button className="mdc-like-btn" onClick={() => fileInputRef.current?.click()}>
                <FaPlus size={16}/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Info panel ── */}
      <div className="mdc-info-panel">
        <div className="mdc-ip-header">
          <div className="mdc-ip-icon"><FaCloud size={28}/></div>
          <h3>My Documents</h3>
          <p>Lưu trữ và truy cập nhanh những nội dung quan trọng của bạn ngay trên ZaloApp</p>
        </div>

        {/* Storage */}
        <div className="mdc-ip-section">
          <div className="mdc-ip-storage-row">
            <span className="mdc-ip-label">Dung lượng</span>
            <span className="mdc-ip-value">{formatBytes(totalBytes)} / 1 GB</span>
          </div>
          <div className="mdc-ip-progress">
            <div className="mdc-ip-pg-img" style={{ width: `${(countImg * 3.5 / 1024)}%`, maxWidth: "40%" }}/>
            <div className="mdc-ip-pg-vid" style={{ width: `${(countVid * 8 / 1024)}%`, maxWidth: "30%" }}/>
            <div className="mdc-ip-pg-doc" style={{ width: `${(countDoc * 1.5 / 1024)}%`, maxWidth: "20%" }}/>
            <div className="mdc-ip-pg-other" style={{ width: `${pctUsed > 0 ? 2 : 0}%` }}/>
          </div>
          <div className="mdc-ip-legend">
            <span><div className="mdc-ip-dot" style={{ background: "#F59E0B" }}/>Ảnh</span>
            <span><div className="mdc-ip-dot" style={{ background: "#10B981" }}/>Video</span>
            <span><div className="mdc-ip-dot" style={{ background: "#3B82F6" }}/>File</span>
            <span><div className="mdc-ip-dot" style={{ background: "#94A3B8" }}/>Khác</span>
          </div>
          <button className="mdc-ip-clean-btn">Xem và dọn dẹp My Documents</button>
        </div>

        {/* Upgrade */}
        <div className="mdc-ip-upgrade">
          <div className="mdc-ip-upgrade-icon">ℹ️</div>
          <div>
            <div className="mdc-ip-upgrade-title">Nâng cấp dung lượng My Documents</div>
            <div className="mdc-ip-upgrade-desc">Mở rộng lên đến 100GB và tự động bảo toàn dữ liệu trò chuyện với zCloud.</div>
            <button className="mdc-ip-upgrade-btn">Thêm dung lượng</button>
          </div>
        </div>

        {/* Reminder */}
        <div className="mdc-ip-section">
          <div className="mdc-ip-section-title">
            <span>⏰</span> Danh sách nhắc hẹn
          </div>
          <div className="mdc-ip-empty-sub">Chưa có nhắc hẹn nào</div>
        </div>

        {/* Media grid */}
        <div className="mdc-ip-section">
          <div className="mdc-ip-section-title-row">
            <span>Ảnh/Video</span>
            <button className="mdc-ip-view-all">Xem tất cả</button>
          </div>
          <div className="mdc-ip-media-grid">
            {files.filter(f => ["image","video"].includes(getCategory(f.fileName))).slice(0, 6).map(f => (
              <div key={f._id} className="mdc-ip-media-item" onClick={() => setPreviewFile(f)}>
                {getCategory(f.fileName) === "image" ? (
                  <img src={f.url} alt="" />
                ) : (
                  <div className="mdc-ip-video-thumb">
                    <FaFileVideo size={20} color="white"/>
                  </div>
                )}
              </div>
            ))}
            {files.filter(f => ["image","video"].includes(getCategory(f.fileName))).length === 0 && (
              <div className="mdc-ip-empty-sub">Chưa có ảnh/video</div>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="mdc-ip-section">
          <div className="mdc-ip-section-title-row">
            <span>File</span>
            <button className="mdc-ip-view-all">Xem tất cả</button>
          </div>
          {files.filter(f => getCategory(f.fileName) === "doc").slice(0, 3).map(f => (
            <div key={f._id} className="mdc-ip-file-row">
              <div className="mdc-ip-file-icon" style={{ background: getFileColor(f.fileName) }}>
                <span>{getExt(f.fileName).toUpperCase().slice(0,3)}</span>
              </div>
              <div className="mdc-ip-file-info">
                <span className="mdc-ip-file-name">{f.fileName}</span>
                <span className="mdc-ip-file-size">{formatBytes(f.size)}</span>
              </div>
              <a href={f.url} target="_blank" rel="noreferrer" className="mdc-ip-file-dl">
                <FaDownload size={12}/>
              </a>
            </div>
          ))}
          {files.filter(f => getCategory(f.fileName) === "doc").length === 0 && (
            <div className="mdc-ip-empty-sub">Chưa có file tài liệu</div>
          )}
        </div>
      </div>

      {previewFile && <ImagePreview file={previewFile} onClose={() => setPreviewFile(null)}/>}
    </div>
  );
}
