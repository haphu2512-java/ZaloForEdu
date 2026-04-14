import React, { useState } from 'react';
import { FaTimes, FaCheckSquare, FaSquare, FaTrash } from 'react-icons/fa';
import { formatBytes, getCategory, getExt, getFileColor } from './CloudUtils';

export function CleanupModal({ messages, onDelete, onClose }) {
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState("largest");
  const [selected, setSelected] = useState(new Set());

  const allMedia = messages.flatMap(m => {
    const media = m.mediaIds || m.media || [];
    return media.filter(f => typeof f !== 'string').map(f => ({ ...f, msgId: m._id }));
  });

  const filtered = allMedia.filter(m => {
    if (tab === "all") return true;
    if (tab === "image") return ["image","video"].includes(getCategory(m.fileName||""));
    if (tab === "video") return getCategory(m.fileName||"") === "video";
    return !["image","video"].includes(getCategory(m.fileName||""));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "largest") return (b.size||0) - (a.size||0);
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  });

  const totalBytes = allMedia.reduce((s,m)=>s+(m.size||0),0);
  const selectedBytes = [...selected].reduce((s, id) => {
    const f = allMedia.find(m=>m._id===id||m.id===id);
    return s + (f?.size||0);
  }, 0);

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(f=>f._id||f.id)));
  };
  
  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleDelete = () => {
    if (!selected.size) return;
    const msgIds = [...selected].map(fid => {
      const f = allMedia.find(m => (m._id||m.id) === fid);
      return f?.msgId;
    }).filter(Boolean);
    const uniqueMsgIds = [...new Set(msgIds)];
    onDelete(uniqueMsgIds);
    onClose();
  };

  return (
    <div className="mdc-img-overlay" onClick={onClose}>
      <div className="mdc-cleanup-modal" onClick={e=>e.stopPropagation()}>
        <div className="mdc-cm-header">
          <button className="mdc-img-close" onClick={onClose}><FaTimes size={16}/></button>
          <div>
            <div className="mdc-cm-title">Dọn dẹp My Documents</div>
            <div className="mdc-cm-sub">Đã chọn: {selected.size} mục {selected.size > 0 && `(${formatBytes(selectedBytes)})`}</div>
          </div>
        </div>

        <div className="mdc-filter-tabs" style={{padding:'0 16px'}}>
          {[{k:"all",l:`Tất cả (${formatBytes(totalBytes)})`},{k:"image",l:"Ảnh"},{k:"video",l:"Video"},{k:"file",l:"File"}].map(t=>(
            <button key={t.k} className={`mdc-ftab ${tab===t.k?"active":""}`} onClick={()=>setTab(t.k)}>{t.l}</button>
          ))}
        </div>

        <div className="mdc-cm-sort-row">
          <span>Sắp xếp theo:</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="mdc-cm-select">
            <option value="largest">Lớn nhất</option>
            <option value="newest">Mới nhất</option>
          </select>
        </div>

        <div className="mdc-cm-grid">
          {sorted.map(f => {
            const id = f._id||f.id;
            const isImg = ["image","video"].includes(getCategory(f.fileName||""));
            const isSel = selected.has(id);
            return (
              <div key={id} className={`mdc-cm-item ${isSel?"selected":""}`} onClick={()=>toggle(id)}>
                <div className="mdc-cm-check">{isSel ? <FaCheckSquare color="#0084FF" size={16}/> : <FaSquare color="#ccc" size={16}/>}</div>
                {isImg
                  ? <img src={f.url} alt={f.fileName} className="mdc-cm-thumb"/>
                  : <div className="mdc-cm-file-icon" style={{background:getFileColor(f.fileName||"")}}><span>{getExt(f.fileName||"").toUpperCase().slice(0,4)}</span></div>
                }
                <div className="mdc-cm-name">{f.fileName}</div>
                <div className="mdc-cm-size">{formatBytes(f.size)}</div>
              </div>
            );
          })}
          {sorted.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'32px',color:'#8A8D91'}}>Không có file nào</div>}
        </div>

        <div className="mdc-cm-footer">
          <button className="mdc-cm-btn-selectall" onClick={toggleAll}>
            {selected.size === sorted.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          <button className="mdc-cm-btn-delete" disabled={!selected.size} onClick={handleDelete}>
            <FaTrash size={13}/> Xóa ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
