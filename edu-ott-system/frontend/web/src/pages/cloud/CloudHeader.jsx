import React from 'react';
import { FaCloud, FaSearch, FaEllipsisV } from 'react-icons/fa';

export const CloudHeader = ({ searchQuery, setSearchQuery, onInfo, currentFilter, onFilterChange }) => {
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white" style={{ flexShrink: 0, height: 72 }}>
      {/* LEFT: Avatar + Title/Filters */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-sm" style={{ background: '#0084FF' }}>
            <FaCloud size={24} />
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full max-w-sm">
          <div className="text-lg font-bold text-gray-900">
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
                  background: currentFilter === tab ? '#0084FF' : '#F0F2F5',
                  color: currentFilter === tab ? 'white' : '#65676B'
                }}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'image' ? 'Ảnh/Video' : tab === 'file' ? 'File' : 'Ghi chú'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Search + More Menu */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center bg-gray-100 rounded-full px-3 py-1.5 w-64 max-w-[200px]" style={{ background: '#F0F2F5', borderRadius: 20 }}>
          <FaSearch className="text-gray-400" size={14} />
          <input
            type="text"
            className="bg-transparent border-none outline-none ml-2 text-sm w-full"
            placeholder="Tìm kiếm trong My Documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          className="text-gray-500 hover:text-blue-500 hover:bg-gray-100 p-2.5 rounded-full transition ml-2"
          onClick={onInfo}
          title="Tùy chọn"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <FaEllipsisV size={20} />
        </button>
      </div>
    </div>
  );
};
