import { useState, useEffect } from "react";
import {
  FaBullhorn,
  FaComments,
  FaUsers,
  FaFolder,
  FaChartBar,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaPlus,
  FaTimes,
  FaDownload,
  FaFilePdf,
  FaFileExcel,
  FaFileWord,
  FaFileVideo,
  FaFile,
  FaUserPlus,
  FaTrash,
  FaPaperPlane,
  FaSmile,
  FaPaperclip,
  FaBell,
  FaThumbsUp,
  FaReply,
} from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";
import { useClassStore } from "../../store/classStore";
import "./ClassesPage.css";

// ── Helpers ──
function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function getAvatarColor(name = "") {
  const colors = [
    "#1B6EF3",
    "#9C27B0",
    "#E91E63",
    "#FF5722",
    "#4CAF50",
    "#FF9800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function getFileIcon(name = "") {
  if (name.endsWith(".pdf")) return <FaFilePdf size={16} color="#EF4444" />;
  if (name.endsWith(".xlsx") || name.endsWith(".xls"))
    return <FaFileExcel size={16} color="#16A34A" />;
  if (name.endsWith(".docx") || name.endsWith(".doc"))
    return <FaFileWord size={16} color="#1B6EF3" />;
  if (name.endsWith(".mp4") || name.endsWith(".mov"))
    return <FaFileVideo size={16} color="#9C27B0" />;
  return <FaFile size={16} color="#6B7280" />;
}

// ── Mock data ──
const MOCK_ANNOUNCEMENTS = [
  {
    id: 1,
    author: "GV. Nguyễn Văn A",
    avatar: "GV",
    color: "#1B6EF3",
    content:
      "Chào cả lớp! Tuần này chúng ta học về React Hooks. Các em đọc tài liệu trước nhé.",
    time: "9:00 - 05/04/2025",
    likes: 12,
    files: [{ name: "Bai5_ReactHooks.pdf", size: "2.4 MB" }],
    pinned: true,
  },
  {
    id: 2,
    author: "GV. Nguyễn Văn A",
    avatar: "GV",
    color: "#1B6EF3",
    content:
      "Nhắc nhở: Deadline nộp Lab 4 là thứ 6 tuần này lúc 23:59. Nộp muộn trừ 2 điểm.",
    time: "8:30 - 04/04/2025",
    likes: 8,
    files: [],
    pinned: false,
  },
];

const MOCK_MESSAGES = [
  {
    id: 1,
    sender: "GV. Nguyễn Văn A",
    senderId: "gv",
    content: "Bạn nào có câu hỏi về bài hôm nay không?",
    time: "9:05",
    color: "#1B6EF3",
    avatar: "GV",
  },
  {
    id: 2,
    sender: "Nguyễn Văn An",
    senderId: "sv1",
    content: "Em hỏi về useEffect ạ, khi nào thì dependency array để rỗng?",
    time: "9:10",
    color: "#4CAF50",
    avatar: "NA",
  },
  {
    id: 3,
    sender: "GV. Nguyễn Văn A",
    senderId: "gv",
    content:
      "Khi dependency [] rỗng thì effect chỉ chạy 1 lần sau mount — giống componentDidMount nhé!",
    time: "9:12",
    color: "#1B6EF3",
    avatar: "GV",
  },
  {
    id: 4,
    sender: "Trần Thị Bảo",
    senderId: "sv2",
    content:
      "Em cảm ơn thầy! Vậy nếu muốn chạy mỗi lần render thì không cần truyền gì vào đúng không ạ?",
    time: "9:15",
    color: "#E91E63",
    avatar: "TB",
  },
  {
    id: 5,
    sender: "GV. Nguyễn Văn A",
    senderId: "gv",
    content: "Đúng rồi em! Không truyền dependency thì chạy sau mỗi render. 👍",
    time: "9:16",
    color: "#1B6EF3",
    avatar: "GV",
  },
  {
    id: 6,
    sender: "me",
    senderId: "me",
    content: "Thầy ơi, slide bài 5 có thể gửi lại được không ạ?",
    time: "9:20",
    color: "#9C27B0",
    avatar: "T",
  },
];

const MOCK_GROUPS = [
  {
    id: 1,
    name: "Nhóm Đồ án 1",
    members: 5,
    lastMsg: "An: Mình đã push code lên rồi",
    color: "#1B6EF3",
  },
  {
    id: 2,
    name: "Nhóm Đồ án 2",
    members: 6,
    lastMsg: "Lan: Ai review PR cho mình với",
    color: "#9C27B0",
  },
  {
    id: 3,
    name: "Nhóm Đồ án 3",
    members: 5,
    lastMsg: "Nam: Meeting lúc 8h tối nha",
    color: "#E91E63",
  },
];

const MOCK_FILES = [
  {
    id: 1,
    name: "Bai5_ReactHooks.pdf",
    size: "2.4 MB",
    uploader: "GV. Nguyễn Văn A",
    date: "05/04/2025",
    downloads: 38,
  },
  {
    id: 2,
    name: "Lab4_Instructions.docx",
    size: "1.1 MB",
    uploader: "GV. Nguyễn Văn A",
    date: "03/04/2025",
    downloads: 42,
  },
  {
    id: 3,
    name: "Slides_Tuan5.pdf",
    size: "5.8 MB",
    uploader: "GV. Nguyễn Văn A",
    date: "01/04/2025",
    downloads: 56,
  },
  {
    id: 4,
    name: "Demo_useState.mp4",
    size: "48 MB",
    uploader: "GV. Nguyễn Văn A",
    date: "28/03/2025",
    downloads: 29,
  },
  {
    id: 5,
    name: "BaoCao_Nhom1.docx",
    size: "800 KB",
    uploader: "Nguyễn Văn An",
    date: "25/03/2025",
    downloads: 5,
  },
];

const MOCK_STATS = {
  totalMessages: 342,
  totalFiles: 18,
  activeStudents: 38,
  totalStudents: 42,
  engagement: 90,
  topStudents: [
    { name: "Nguyễn Văn An", messages: 45, color: "#1B6EF3" },
    { name: "Trần Thị Bảo", messages: 38, color: "#E91E63" },
    { name: "Lê Minh Khoa", messages: 32, color: "#16A34A" },
  ],
};

const TABS = [
  { id: "announce", icon: FaBullhorn, label: "Thông báo" },
  { id: "chat", icon: FaComments, label: "Chat lớp" },
  { id: "groups", icon: FaUsers, label: "Nhóm" },
  { id: "files", icon: FaFolder, label: "Tài liệu" },
  { id: "stats", icon: FaChartBar, label: "Thống kê" },
];

// ── Tab: Thông báo ──
function AnnounceTab({ isTeacher }) {
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState("");

  return (
    <div className="tab-content-inner">
      {/* Form đăng thông báo (GV only) */}
      {isTeacher && (
        <div className="announce-form">
          {!showForm ? (
            <div
              className="announce-placeholder"
              onClick={() => setShowForm(true)}
            >
              <FaBullhorn size={14} color="#9CA3AF" />
              <span>Thông báo gì đó cho lớp...</span>
            </div>
          ) : (
            <div className="announce-editor">
              <textarea
                placeholder="Nhập nội dung thông báo..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
              />
              <div className="announce-editor-actions">
                <button className="btn-attach">
                  <FaPaperclip size={13} /> Đính kèm file
                </button>
                <div style={{ flex: 1 }} />
                <button
                  className="btn-cancel-sm"
                  onClick={() => {
                    setShowForm(false);
                    setNewPost("");
                  }}
                >
                  Hủy
                </button>
                <button className="btn-post" disabled={!newPost.trim()}>
                  <FaBullhorn size={13} /> Đăng
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách thông báo */}
      {MOCK_ANNOUNCEMENTS.map((post) => (
        <div
          key={post.id}
          className={`announce-card ${post.pinned ? "pinned" : ""}`}
        >
          {post.pinned && (
            <div className="pinned-badge">
              <FaBell size={10} /> Ghim
            </div>
          )}
          <div className="announce-header">
            <div className="announce-avatar" style={{ background: post.color }}>
              {post.avatar}
            </div>
            <div>
              <div className="announce-author">{post.author}</div>
              <div className="announce-time">{post.time}</div>
            </div>
          </div>
          <p className="announce-content">{post.content}</p>

          {post.files.map((f) => (
            <div key={f.name} className="announce-file">
              {getFileIcon(f.name)}
              <div>
                <div className="af-name">{f.name}</div>
                <div className="af-size">{f.size}</div>
              </div>
              <button className="af-download">
                <FaDownload size={12} />
              </button>
            </div>
          ))}

          <div className="announce-actions">
            <button className="announce-btn">
              <FaThumbsUp size={12} /> {post.likes}
            </button>
            <button className="announce-btn">
              <FaReply size={12} /> Phản hồi
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Chat lớp ──
function ChatTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "me",
        senderId: "me",
        content: input,
        time: new Date().toLocaleTimeString("vi", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        color: "#9C27B0",
        avatar: "T",
      },
    ]);
    setInput("");
  };

  return (
    <div className="chat-tab-wrap">
      <div className="chat-tab-messages">
        <div className="msg-date-label">Hôm nay</div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ct-msg ${msg.senderId === "me" ? "me" : ""}`}
          >
            {msg.senderId !== "me" && (
              <div className="ct-avatar" style={{ background: msg.color }}>
                {msg.avatar}
              </div>
            )}
            <div className="ct-body">
              {msg.senderId !== "me" && (
                <div className="ct-sender">{msg.sender}</div>
              )}
              <div className={`ct-bubble ${msg.senderId === "me" ? "me" : ""}`}>
                {msg.content}
              </div>
              <div className="ct-time">{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-tab-input">
        <button className="ct-tool-btn">
          <FaPaperclip size={14} />
        </button>
        <div className="ct-input-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
          />
        </div>
        <button className="ct-tool-btn">
          <FaSmile size={14} />
        </button>
        <button className="ct-send-btn" onClick={handleSend}>
          <FaPaperPlane size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Tab: Nhóm ──
function GroupsTab({ isTeacher, cls }) {
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");

  return (
    <div className="tab-content-inner">
      {/* Header */}
      <div className="groups-header">
        <div>
          <h4 className="groups-title">Nhóm trong lớp</h4>
          <p className="groups-sub">
            Nhóm nhỏ để thảo luận đồ án, bài tập nhóm
          </p>
        </div>
        <button
          className="btn-create-group"
          onClick={() => setShowCreate(true)}
        >
          <FaPlus size={12} /> Tạo nhóm
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="create-group-form">
          <input
            placeholder="Tên nhóm VD: Nhóm Đồ án 4"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="form-input"
          />
          <div className="form-actions-row">
            <button className="btn-cancel" onClick={() => setShowCreate(false)}>
              Hủy
            </button>
            <button className="btn-submit" disabled={!groupName.trim()}>
              <FaPlus size={11} /> Tạo
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      <div className="groups-list">
        {MOCK_GROUPS.map((g) => (
          <div key={g.id} className="group-card">
            <div className="group-avatar" style={{ background: g.color }}>
              {g.name.split(" ").pop()}
            </div>
            <div className="group-info">
              <div className="group-name">{g.name}</div>
              <div className="group-members">
                <FaUsers size={10} /> {g.members} thành viên
              </div>
              <div className="group-last">{g.lastMsg}</div>
            </div>
            <button className="group-chat-btn">
              <FaComments size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Tài liệu ──
function FilesTab({ isTeacher }) {
  return (
    <div className="tab-content-inner">
      {isTeacher && (
        <div className="upload-zone">
          <FaFolder size={24} color="#9CA3AF" />
          <p>Kéo thả file vào đây hoặc</p>
          <button className="btn-upload">
            <FaPlus size={12} /> Chọn file
          </button>
          <span className="upload-hint">
            PDF, Word, Excel, Video · Tối đa 10MB
          </span>
        </div>
      )}

      <div className="files-list">
        {MOCK_FILES.map((f) => (
          <div key={f.id} className="file-row">
            <div className="file-icon-wrap">{getFileIcon(f.name)}</div>
            <div className="file-info">
              <div className="file-name">{f.name}</div>
              <div className="file-meta">
                {f.size} · {f.uploader} · {f.date} · {f.downloads} lượt tải
              </div>
            </div>
            <button className="file-download-btn">
              <FaDownload size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Thống kê ──
function StatsTab() {
  const s = MOCK_STATS;
  const pct = Math.round((s.activeStudents / s.totalStudents) * 100);

  return (
    <div className="tab-content-inner">
      {/* Stat cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-card-val">{s.totalMessages}</div>
          <div className="stat-card-label">Tin nhắn</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">{s.totalFiles}</div>
          <div className="stat-card-label">Tài liệu</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">
            {s.activeStudents}/{s.totalStudents}
          </div>
          <div className="stat-card-label">SV hoạt động</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val" style={{ color: "#10B981" }}>
            {pct}%
          </div>
          <div className="stat-card-label">Tham gia</div>
        </div>
      </div>

      {/* Engagement bar */}
      <div className="engagement-section">
        <div className="engagement-label">
          <span>Mức độ tương tác</span>
          <span style={{ fontWeight: 700, color: "#1B6EF3" }}>
            {s.engagement}%
          </span>
        </div>
        <div className="engagement-bar">
          <div
            className="engagement-fill"
            style={{ width: `${s.engagement}%` }}
          />
        </div>
      </div>

      {/* Top students */}
      <div className="top-students">
        <h4 className="top-students-title">Sinh viên tích cực nhất</h4>
        {s.topStudents.map((sv, i) => (
          <div key={sv.name} className="top-sv-row">
            <div className="top-sv-rank">#{i + 1}</div>
            <div className="top-sv-avatar" style={{ background: sv.color }}>
              {getInitials(sv.name)}
            </div>
            <div className="top-sv-name">{sv.name}</div>
            <div className="top-sv-bar-wrap">
              <div
                className="top-sv-bar"
                style={{
                  width: `${(sv.messages / 50) * 100}%`,
                  background: sv.color,
                }}
              />
            </div>
            <div className="top-sv-count">{sv.messages} tin</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Thành viên (trong header) ──
function MembersPanel({ cls, isTeacher, onClose }) {
  const [tab, setTab] = useState("list");
  const [email, setEmail] = useState("");

  return (
    <div className="members-panel">
      <div className="mp-header">
        <h4>Thành viên lớp</h4>
        <button className="mp-close" onClick={onClose}>
          <FaTimes size={14} />
        </button>
      </div>

      <div className="mp-tabs">
        <button
          className={`mp-tab ${tab === "list" ? "active" : ""}`}
          onClick={() => setTab("list")}
        >
          Danh sách ({cls?.students?.length || 42})
        </button>
        {isTeacher && (
          <button
            className={`mp-tab ${tab === "add" ? "active" : ""}`}
            onClick={() => setTab("add")}
          >
            Thêm SV
          </button>
        )}
      </div>

      {tab === "list" && (
        <div className="mp-list">
          {/* Teacher */}
          <div className="mp-section-title">Giảng viên</div>
          <div className="mp-member">
            <div className="mp-av" style={{ background: "#1B6EF3" }}>
              GV
            </div>
            <div className="mp-info">
              <div className="mp-name">
                {cls?.teacher?.fullName || "GV. Nguyễn Văn A"}
              </div>
              <div className="mp-email">
                {cls?.teacher?.email || "gv@iuh.edu.vn"}
              </div>
            </div>
            <span className="mp-role gv">GV</span>
          </div>

          {/* Students */}
          <div className="mp-section-title" style={{ marginTop: 12 }}>
            Sinh viên ({cls?.students?.length || 3})
          </div>
          {(
            cls?.students || [
              { _id: 1, fullName: "Nguyễn Văn An", email: "an@iuh.edu.vn" },
              { _id: 2, fullName: "Trần Thị Bảo", email: "bao@iuh.edu.vn" },
              { _id: 3, fullName: "Lê Minh Khoa", email: "khoa@iuh.edu.vn" },
            ]
          ).map((sv) => (
            <div key={sv._id} className="mp-member">
              <div
                className="mp-av"
                style={{ background: getAvatarColor(sv.fullName) }}
              >
                {getInitials(sv.fullName)}
              </div>
              <div className="mp-info">
                <div className="mp-name">{sv.fullName}</div>
                <div className="mp-email">{sv.email}</div>
              </div>
              <span className="mp-role sv">SV</span>
              {isTeacher && (
                <button className="mp-remove">
                  <FaTrash size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "add" && isTeacher && (
        <div className="mp-add">
          <p className="mp-add-desc">
            Thêm sinh viên bằng email hoặc mã sinh viên
          </p>
          <input
            className="form-input"
            placeholder="Email hoặc mã SV..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn-submit"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!email.trim()}
          >
            <FaUserPlus size={13} /> Thêm vào lớp
          </button>

          <div className="mp-divider">hoặc chia sẻ mã lớp</div>

          <div className="mp-code-box">
            <span className="mp-code">{cls?.code || "CS301-X7K2"}</span>
            <button className="mp-copy-btn">
              <FaCopy size={12} /> Copy
            </button>
          </div>
          <p className="mp-code-hint">SV nhập mã này để tự tham gia lớp</p>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function ClassDetail({ classId }) {
  const { user } = useAuthStore();
  const { activeClass, isLoading, fetchClassById } = useClassStore();
  const [activeTab, setActiveTab] = useState("announce");
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    if (classId) fetchClassById(classId);
  }, [classId]); // eslint-disable-line

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeClass?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="class-detail-loading">
        <FaSpinner className="spin" size={24} color="#1B6EF3" />
      </div>
    );
  }

  if (!activeClass) return null;

  const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

  return (
    <div className="class-detail">
      {/* ── HEADER ── */}
      <div className="class-detail-header">
        <div className="class-detail-header-info">
          <h2 className="class-detail-name">{activeClass.name}</h2>
          <div className="class-detail-meta">
            {activeClass.subject && <span>{activeClass.subject}</span>}
            {activeClass.semester && <span>· {activeClass.semester}</span>}
            {activeClass.schedule?.dayOfWeek !== undefined && (
              <span>
                · {days[activeClass.schedule.dayOfWeek]}{" "}
                {activeClass.schedule.startTime}
              </span>
            )}
            {activeClass.schedule?.room && (
              <span>· Phòng {activeClass.schedule.room}</span>
            )}
          </div>
        </div>

        <div className="class-header-actions">
          <button
            className="class-members-btn"
            onClick={() => setShowMembers(!showMembers)}
          >
            <FaUsers size={13} />
            <span>{activeClass.students?.length || 0} SV</span>
          </button>
          <button className="class-code-badge" onClick={handleCopyCode}>
            <span>{activeClass.code}</span>
            {copied ? (
              <FaCheck size={11} color="#10B981" />
            ) : (
              <FaCopy size={11} />
            )}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="class-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`class-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="class-tab-content">
        {activeTab === "announce" && <AnnounceTab isTeacher={isTeacher} />}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "groups" && (
          <GroupsTab isTeacher={isTeacher} cls={activeClass} />
        )}
        {activeTab === "files" && <FilesTab isTeacher={isTeacher} />}
        {activeTab === "stats" && <StatsTab />}
      </div>

      {/* ── MEMBERS PANEL ── */}
      {showMembers && (
        <MembersPanel
          cls={activeClass}
          isTeacher={isTeacher}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
