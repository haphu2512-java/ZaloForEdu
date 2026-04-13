import React, { useState, useEffect } from 'react';
import { FaBell, FaThumbtack, FaUsers, FaImage, FaFileAlt, FaChevronDown } from 'react-icons/fa';
import axios from 'axios';

export const ChatRightPanel = ({ room, messages }) => {
  const [showMedia, setShowMedia] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  // Lọc lấy danh sách ảnh và file từ mảng messages hiện có
  const mediaList = messages
    .flatMap(m => m.attachments || [])
    .filter(att => att.type?.startsWith('image/'))
    .slice(0, 8); // Chỉ hiện 8 ảnh mới nhất

  const fileList = messages
    .flatMap(m => m.attachments || [])
    .filter(att => !att.type?.startsWith('image/'))
    .slice(0, 5);

  return (
    <aside className="chat-right-panel">
      {/* 1. Header: Avatar & Tên (Tự cập nhật theo room prop) */}
      <div className="crp-header">
        <div className="crp-avatar-large" style={{ background: room.color }}>
          {room.avatar ? <img src={room.avatar} alt="avt" /> : room.initials}
        </div>
        <h3 className="crp-name">{room.name}</h3>
        <p className="crp-status">Class • {room.students?.length || room.studentCount || 0} thành viên</p>
      </div>

      {/* 2. Quick Actions */}
      <div className="crp-actions">
        <div className="action-item"><button><FaBell /></button><span>Tắt thông báo</span></div>
        <div className="action-item"><button><FaThumbtack /></button><span>Ghim hội thoại</span></div>
        <div className="action-item"><button><FaUsers /></button><span>Tạo nhóm</span></div>
      </div>

      <div className="crp-divider" />

      {/* 3. Nhóm chung (Danh sách thành viên) */}
      <div className="crp-section">
        <div className="section-header">
          <span><FaUsers /> {room.students?.length || 0} thành viên lớp</span>
        </div>
        {/* Có thể map danh sách avatar thành viên ở đây */}
      </div>

      {/* 4. Ảnh/Video (Giống Zalo) */}
      <div className="crp-section">
        <div className="section-header" onClick={() => setShowMedia(!showMedia)}>
          <span>Ảnh/Video</span>
          <FaChevronDown className={showMedia ? '' : 'rotate-180'} />
        </div>
        {showMedia && (
          <div className="media-grid">
            {mediaList.map((img, i) => (
              <img key={i} src={img.url} alt="media" className="media-thumb" />
            ))}
            {mediaList.length === 0 && <p className="empty-text">Chưa có ảnh nào</p>}
          </div>
        )}
        {mediaList.length > 0 && <button className="view-all-btn">Xem tất cả</button>}
      </div>

      {/* 5. File (Giống Zalo) */}
      <div className="crp-section">
        <div className="section-header" onClick={() => setShowFiles(!showFiles)}>
          <span>File đã gửi</span>
          <FaChevronDown className={showFiles ? '' : 'rotate-180'} />
        </div>
        {showFiles && (
          <div className="file-list">
            {fileList.map((file, i) => (
              <div key={i} className="file-item">
                <div className="file-icon"><FaFileAlt /></div>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-meta">30.66 KB • 31/10/2025</p>
                </div>
              </div>
            ))}
            {fileList.length === 0 && <p className="empty-text">Chưa có file nào</p>}
          </div>
        )}
      </div>
    </aside>
  );
};