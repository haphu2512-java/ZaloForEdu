import React from 'react';
import { FaCloud, FaDownload, FaFileVideo } from 'react-icons/fa';
import { formatBytes, getCategory, getExt, getFileColor } from './CloudUtils';

export const CloudRightPanel = ({
  totalBytes,
  pctUsed,
  setShowCleanup,
  imgFiles,
  docFiles,
  setFilterTab,
  setPreview
}) => {
  return (
    <div className="mdc-info-panel">
      <div className="mdc-ip-header">
        <div className="mdc-ip-icon"><FaCloud size={28}/></div>
        <h3>My Documents</h3>
        <p>Lưu trữ và truy cập nhanh những nội dung quan trọng của bạn ngay trên ZaloApp</p>
      </div>
      
      <div className="mdc-ip-section">
        <div className="mdc-ip-storage-row">
          <span className="mdc-ip-label">Dung lượng</span>
          <span className="mdc-ip-value">{formatBytes(totalBytes)} / 1 GB</span>
        </div>
        <div className="mdc-ip-progress">
          <div className="mdc-ip-pg-img" style={{width:`${Math.min(pctUsed*0.6,60)}%`}}/>
          <div className="mdc-ip-pg-vid" style={{width:`${Math.min(pctUsed*0.2,20)}%`}}/>
          <div className="mdc-ip-pg-doc" style={{width:`${Math.min(pctUsed*0.15,15)}%`}}/>
          <div className="mdc-ip-pg-other" style={{width:`${Math.min(pctUsed*0.05,5)}%`}}/>
        </div>
        <div className="mdc-ip-legend">
          <span><div className="mdc-ip-dot" style={{background:"#F59E0B"}}/> Ảnh</span>
          <span><div className="mdc-ip-dot" style={{background:"#10B981"}}/> Video</span>
          <span><div className="mdc-ip-dot" style={{background:"#3B82F6"}}/> File</span>
          <span><div className="mdc-ip-dot" style={{background:"#94A3B8"}}/> Khác</span>
        </div>
        <button className="mdc-ip-clean-btn" onClick={()=>setShowCleanup(true)}>🗑️ Xem và dọn dẹp My Documents</button>
      </div>

      <div className="mdc-ip-upgrade">
        <div className="mdc-ip-upgrade-icon">ℹ️</div>
        <div>
          <div className="mdc-ip-upgrade-title">Nâng cấp dung lượng My Documents</div>
          <div className="mdc-ip-upgrade-desc">Mở rộng lên đến 100GB và tự động bảo toàn dữ liệu trò chuyện với zCloud.</div>
          <button className="mdc-ip-upgrade-btn">Thêm dung lượng</button>
        </div>
      </div>

      <div className="mdc-ip-section">
        <div className="mdc-ip-section-title">⏰ Danh sách nhắc hẹn</div>
        <div className="mdc-ip-empty-sub">Chưa có nhắc hẹn nào</div>
      </div>

      <div className="mdc-ip-section">
        <div className="mdc-ip-section-title-row">
          <span>Ảnh/Video</span>
          <button className="mdc-ip-view-all" onClick={()=>setFilterTab("image")}>Xem tất cả</button>
        </div>
        <div className="mdc-ip-media-grid">
          {imgFiles.slice(0,6).map((m,i)=>(
            <div key={i} className="mdc-ip-media-item" onClick={()=>setPreview({url:m.url,name:m.fileName})}>
              {getCategory(m.fileName||"")==="image" ? <img src={m.url} alt=""/> : <div className="mdc-ip-video-thumb"><FaFileVideo size={20} color="white"/></div>}
            </div>
          ))}
          {imgFiles.length===0 && <div className="mdc-ip-empty-sub">Chưa có ảnh/video</div>}
        </div>
      </div>

      <div className="mdc-ip-section">
        <div className="mdc-ip-section-title-row">
          <span>File</span>
          <button className="mdc-ip-view-all" onClick={()=>setFilterTab("file")}>Xem tất cả</button>
        </div>
        {docFiles.slice(0,3).map((m,i)=>(
          <div key={i} className="mdc-ip-file-row">
            <div className="mdc-ip-file-icon" style={{background:getFileColor(m.fileName||"")}}>
              <span>{getExt(m.fileName||"").toUpperCase().slice(0,3)}</span>
            </div>
            <div className="mdc-ip-file-info">
              <span className="mdc-ip-file-name">{m.fileName}</span>
              <span className="mdc-ip-file-size">{formatBytes(m.size)}</span>
            </div>
            <a href={m.url} target="_blank" rel="noreferrer" className="mdc-ip-file-dl"><FaDownload size={12}/></a>
          </div>
        ))}
        {docFiles.length===0 && <div className="mdc-ip-empty-sub">Chưa có file tài liệu</div>}
      </div>
    </div>
  );
};
