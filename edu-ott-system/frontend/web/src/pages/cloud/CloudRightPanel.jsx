import React from 'react';
import { FaCloud, FaImage, FaFileAlt, FaLink, FaFolderOpen } from 'react-icons/fa';
import { formatBytes } from './CloudUtils';

export const CloudRightPanel = ({
  storageData,
  pctUsed,
  setShowCleanup,
  setFilterTab
}) => {
  const { totalBytes = 0, imageCount = 0, docCount = 0, linkCount = 0 } = storageData || {};

  return (
    <div className="mdc-info-panel">
      <div className="mdc-ip-header" style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 12px', background: 'linear-gradient(135deg, #0068FF, #00C6FF)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,104,255,0.2)' }}>
          <FaCloud size={32} color="white" />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Cloud của tôi</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Lưu trữ dữ liệu an toàn và truy cập nhanh trên mọi thiết bị.</p>
      </div>
      
      <div className="mdc-ip-section" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Đã sử dụng</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0068FF' }}>{formatBytes(totalBytes)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>/ 1 GB</span></span>
        </div>
        
        {/* Modern Progress Bar */}
        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
          {pctUsed > 0 ? (
             <div style={{ width: `${pctUsed}%`, background: 'linear-gradient(90deg, #0068FF, #00C6FF)', borderRadius: 4 }} />
          ) : (
             <div style={{ width: '0%' }} />
          )}
        </div>
        
        <button 
          onClick={() => setShowCleanup(true)}
          style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: 'none', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >
          <FaFolderOpen size={14} color="#8A8D91" /> Quản lý dữ liệu
        </button>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Phân loại dữ liệu</div>
        
        {/* Modern Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          
          <div 
            onClick={() => setFilterTab("image")}
            style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0068FF'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E8F5E9', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <FaImage size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Ảnh & Video</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{imageCount} mục</div>
          </div>
          
          <div 
            onClick={() => setFilterTab("file")}
            style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0068FF'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E3F2FD', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <FaFileAlt size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Tài liệu</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{docCount} mục</div>
          </div>

          <div 
            onClick={() => setFilterTab("link")}
            style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0068FF'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF3E0', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <FaLink size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Link</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{linkCount} mục</div>
          </div>

        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ padding: '16px', background: 'linear-gradient(to right, rgba(0, 104, 255, 0.05), rgba(0, 198, 255, 0.05))', border: '1px solid rgba(0, 104, 255, 0.15)', borderRadius: 12, display: 'flex', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🚀</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0068FF', marginBottom: 4 }}>Gói Cloud Premium</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>Nâng cấp lên 100GB lưu trữ vĩnh viễn với tính năng bảo mật nâng cao.</div>
            <button style={{ padding: '6px 12px', background: '#0068FF', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Nâng cấp ngay</button>
          </div>
        </div>
      </div>
    </div>
  );
};

