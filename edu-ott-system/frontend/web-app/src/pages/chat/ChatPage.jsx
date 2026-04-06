import { useState } from "react";

import {
  FaSearch,
  FaPlus,
  FaEllipsisV,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaImage,
  FaFile,
  FaVideo,
  FaBook,
  FaUsers,
  FaUser,
  FaChevronDown,
  FaPhone,
  FaVideo as FaVideoCall,
} from "react-icons/fa";
// import { useAuthStore } from "../../store/authStore";
import "./ChatPage.css";

// Mock data
const MOCK_ROOMS = [
  {
    id: "1",
    type: "class",
    name: "Lập trình Web - CS301",
    lastMsg: "GV: Xem slide bài 5 trước nhé",
    time: "9:30",
    unread: 3,
    color: "#1B6EF3",
    initials: "LT",
    subtitle: "GV. Nguyễn Văn A · 42 SV",
  },
  {
    id: "2",
    type: "class",
    name: "Cơ sở dữ liệu - CS201",
    lastMsg: "GV đã gửi: Lab3.pdf",
    time: "8:15",
    unread: 0,
    color: "#9C27B0",
    initials: "DB",
    subtitle: "GV. Trần Thị B · 38 SV",
  },
  {
    id: "3",
    type: "group",
    name: "Nhóm Đồ án - Nhóm 3",
    lastMsg: "Trang: Mình push code lên rồi",
    time: "Hôm qua",
    unread: 2,
    color: "#16A34A",
    initials: "ĐA",
    subtitle: "5 thành viên",
  },
  {
    id: "4",
    type: "dm",
    name: "Nguyễn Văn Minh",
    lastMsg: "Bạn: Nhớ nộp bài trước 10h!",
    time: "Hôm qua",
    unread: 0,
    color: "#9333EA",
    initials: "NV",
    subtitle: "Sinh viên",
  },
  {
    id: "5",
    type: "class",
    name: "Mạng máy tính - CS401",
    lastMsg: "Thông báo lịch thi cuối kỳ",
    time: "T2",
    unread: 1,
    color: "#E91E63",
    initials: "MT",
    subtitle: "GV. Lê Văn C · 35 SV",
  },
];

const MOCK_MESSAGES = [
  {
    id: 1,
    sender: "GV. Nguyễn Văn A",
    senderId: "teacher1",
    content: "Chào cả lớp! Hôm nay học React Hooks. Xem slide trước nhé.",
    time: "9:05",
    type: "text",
    avatar: "GV",
    color: "#1B6EF3",
  },
  {
    id: 2,
    sender: "GV. Nguyễn Văn A",
    senderId: "teacher1",
    content: null,
    time: "9:06",
    type: "file",
    file: { name: "Bai5_ReactHooks.pdf", size: "2.4 MB", icon: "pdf" },
    avatar: "GV",
    color: "#1B6EF3",
  },
  {
    id: 3,
    sender: "Nguyễn Văn An",
    senderId: "sv1",
    content:
      "Em xem rồi ạ! Câu hỏi về useEffect — khi nào dùng dependency array rỗng?",
    time: "9:12",
    type: "text",
    avatar: "NA",
    color: "#4CAF50",
  },
  {
    id: 4,
    sender: "GV. Nguyễn Văn A",
    senderId: "teacher1",
    content:
      "Câu hỏi hay! Dependency [] thì effect chỉ chạy 1 lần sau mount — giống componentDidMount nhé.",
    time: "9:15",
    type: "text",
    avatar: "GV",
    color: "#1B6EF3",
  },
  {
    id: 5,
    sender: "me",
    senderId: "me",
    content: "Em hiểu rồi ạ! Cảm ơn thầy 🙏",
    time: "9:18",
    type: "text",
    avatar: "T",
    color: "#E91E63",
  },
];

const TYPE_BADGE = {
  class: { label: "Lớp học", bg: "#EFF6FF", color: "#1B6EF3" },
  group: { label: "Nhóm", bg: "#F0FDF4", color: "#16A34A" },
  dm: { label: "1-1", bg: "#FDF4FF", color: "#9333EA" },
};

const TABS = ["Tất cả", "Lớp học", "Nhóm", "1-1"];

function RoomItem({ room, active, onClick }) {
  const badge = TYPE_BADGE[room.type];
  return (
    <div className={`room-item ${active ? "active" : ""}`} onClick={onClick}>
      <div className="room-avatar" style={{ background: room.color }}>
        {room.initials}
      </div>
      <div className="room-info">
        <div className="room-name">{room.name}</div>
        <div
          className="room-badge"
          style={{ background: badge.bg, color: badge.color }}
        >
          {room.type === "class" && <FaBook size={8} />}
          {room.type === "group" && <FaUsers size={8} />}
          {room.type === "dm" && <FaUser size={8} />}
          {badge.label}
        </div>
        <div className="room-last">{room.lastMsg}</div>
      </div>
      <div className="room-meta">
        <span className="room-time">{room.time}</span>
        {room.unread > 0 && <span className="room-unread">{room.unread}</span>}
      </div>
    </div>
  );
}

function Message({ msg, isMe }) {
  return (
    <div className={`msg-wrap ${isMe ? "me" : ""}`}>
      {!isMe && (
        <div className="msg-avatar" style={{ background: msg.color }}>
          {msg.avatar}
        </div>
      )}
      <div className="msg-body">
        {!isMe && <div className="msg-sender">{msg.sender}</div>}
        {msg.type === "text" && (
          <div className={`msg-bubble ${isMe ? "me" : ""}`}>{msg.content}</div>
        )}
        {msg.type === "file" && (
          <div className="msg-file">
            <div className="msg-file-icon">
              <FaFile size={14} color="#1B6EF3" />
            </div>
            <div>
              <div className="msg-file-name">{msg.file.name}</div>
              <div className="msg-file-size">{msg.file.size}</div>
            </div>
          </div>
        )}
        <div className="msg-time">{msg.time}</div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  // const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [activeRoom, setActiveRoom] = useState(MOCK_ROOMS[0]);
  const [input, setInput] = useState("");
  // const [rightTab, setRightTab] = useState("info");

  const filtered = MOCK_ROOMS.filter((r) => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return r.type === "class";
    if (activeTab === 2) return r.type === "group";
    if (activeTab === 3) return r.type === "dm";
    return true;
  });

  return (
    <div className="chat-page">
      {/* ── DANH SÁCH ROOM ── */}
      <div className="room-sidebar">
        <div className="rs-header">
          <span className="rs-title">Tin nhắn</span>
          <button className="rs-add-btn">
            <FaPlus size={12} />
          </button>
        </div>
        <div className="rs-search">
          <FaSearch size={12} color="#9CA3AF" />
          <input placeholder="Tìm kiếm..." />
        </div>
        <div className="rs-tabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`rs-tab ${activeTab === i ? "active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="rs-list">
          {filtered.map((r) => (
            <RoomItem
              key={r.id}
              room={r}
              active={activeRoom?.id === r.id}
              onClick={() => setActiveRoom(r)}
            />
          ))}
        </div>
      </div>

      {/* ── VÙNG CHAT ── */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="ch-left">
            <div className="ch-avatar" style={{ background: activeRoom.color }}>
              {activeRoom.initials}
            </div>
            <div>
              <div className="ch-name">{activeRoom.name}</div>
              <div className="ch-sub">{activeRoom.subtitle}</div>
            </div>
          </div>
          <div className="ch-actions">
            {activeRoom.type === "class" && (
              <>
                <button className="ch-btn">
                  <FaFile size={13} /> Tài liệu
                </button>
                <button className="ch-btn">
                  <FaUsers size={13} /> Thành viên
                </button>
              </>
            )}
            <button className="ch-btn-icon">
              <FaPhone size={14} />
            </button>
            <button className="ch-btn-icon">
              <FaVideoCall size={14} />
            </button>
            <button className="ch-btn-icon">
              <FaEllipsisV size={14} />
            </button>
          </div>
        </div>

        {/* Class tabs nếu là lớp học */}
        {activeRoom.type === "class" && (
          <div className="class-tabs">
            {["Stream", "Thành viên", "Tài liệu", "Phân tích"].map((t, i) => (
              <button
                key={t}
                className={`class-tab ${i === 0 ? "active" : ""}`}
              >
                {i === 0 && <FaUsers size={11} />}
                {i === 1 && <FaUsers size={11} />}
                {i === 2 && <FaFile size={11} />}
                {i === 3 && <FaVideo size={11} />}
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          <div className="msg-date-sep">Hôm nay, 9:00</div>
          {MOCK_MESSAGES.map((msg) => (
            <Message key={msg.id} msg={msg} isMe={msg.senderId === "me"} />
          ))}
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <button className="cib-btn">
            <FaPaperclip size={15} />
          </button>
          <button className="cib-btn">
            <FaImage size={15} />
          </button>
          <button className="cib-btn">
            <FaVideo size={15} />
          </button>
          <div className="cib-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              onKeyDown={(e) => e.key === "Enter" && setInput("")}
            />
          </div>
          <button className="cib-btn">
            <FaSmile size={15} />
          </button>
          <button className="cib-send" onClick={() => setInput("")}>
            <FaPaperPlane size={14} />
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="chat-right-panel">
        <div className="crp-header">
          <div className="crp-avatar" style={{ background: activeRoom.color }}>
            {activeRoom.initials}
          </div>
          <div className="crp-name">{activeRoom.name}</div>
          {activeRoom.type === "class" && (
            <div className="crp-code">Mã: CS301</div>
          )}
        </div>

        {/* Info sections */}
        <div className="crp-section">
          <div className="crp-section-title">Thông tin</div>
          {activeRoom.type === "class" && (
            <>
              <div className="crp-row">
                <FaUsers size={12} color="#9CA3AF" />
                <span>42 sinh viên</span>
              </div>
              <div className="crp-row">
                <FaFile size={12} color="#9CA3AF" />
                <span>18 tài liệu</span>
              </div>
              <div className="crp-row">
                <FaBook size={12} color="#9CA3AF" />
                <span>Thứ 2, 7:30 · A101</span>
              </div>
            </>
          )}
        </div>

        <div className="crp-section">
          <div className="crp-section-title">Tài liệu mới nhất</div>
          {[
            "Bai5_ReactHooks.pdf",
            "Lab4_Instructions.xlsx",
            "Demo_useState.mp4",
          ].map((f) => (
            <div key={f} className="crp-file">
              <div className="crp-file-icon">
                <FaFile size={12} color="#1B6EF3" />
              </div>
              <span className="crp-file-name">{f}</span>
            </div>
          ))}
        </div>

        <div className="crp-section">
          <div className="crp-section-title">Thành viên</div>
          {[
            { name: "GV. Nguyễn Văn A", role: "GV", color: "#1B6EF3" },
            { name: "Trần Thị B", role: "TG", color: "#9C27B0" },
            { name: "Nguyễn Văn An", role: "SV", color: "#4CAF50" },
          ].map((m) => (
            <div key={m.name} className="crp-member">
              <div className="crp-m-av" style={{ background: m.color }}>
                {m.name.split(" ").pop()[0]}
              </div>
              <span className="crp-m-name">{m.name}</span>
              <span
                className="crp-m-role"
                style={{
                  background:
                    m.role === "GV"
                      ? "#EFF6FF"
                      : m.role === "TG"
                        ? "#F3E8FF"
                        : "#F0FDF4",
                  color:
                    m.role === "GV"
                      ? "#1B6EF3"
                      : m.role === "TG"
                        ? "#9333EA"
                        : "#16A34A",
                }}
              >
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
