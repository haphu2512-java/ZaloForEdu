import React from 'react';
import { FaCloud, FaSearch, FaEllipsisV } from 'react-icons/fa';

export const CloudHeader = ({ searchQuery, setSearchQuery, onInfo, currentFilter, onFilterChange }) => {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 24px', flexShrink:0, height:72, borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--bg-primary)' }}>
      {/* LEFT: Avatar + Title/Filters */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flex:1 }}>
        <div style={{ width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--primary-color)', color:'white', flexShrink:0 }}>
          <FaCloud size={22} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%', maxWidth:360 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>
            My Documents
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'image', 'file', 'other'].map(tab => (
              <button
                key={tab}
                onClick={() => onFilterChange(tab)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: currentFilter === tab ? 'var(--primary-color)' : 'var(--bg-secondary)',
                  color: currentFilter === tab ? 'white' : 'var(--text-secondary)'
                }}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'image' ? 'Ảnh/Video' : tab === 'file' ? 'File' : 'Ghi chú'}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, backgroundColor:'var(--input-bg)', borderRadius:20, padding:'6px 12px', width:220 }}>
          <FaSearch style={{ color:'var(--text-tertiary)' }} size={14} />
          <input
            type="text"
            style={{ background:'transparent', border:'none', outline:'none', fontSize:13, width:'100%', color:'var(--text-primary)' }}
            placeholder="Tìm kiếm trong My Documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          style={{ color:'var(--text-secondary)', background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:'50%' }}
          onClick={onInfo}
          title="Tùy chọn"
        >
          <FaEllipsisV size={18} />
        </button>
      </div>
    </div>
  );
};
