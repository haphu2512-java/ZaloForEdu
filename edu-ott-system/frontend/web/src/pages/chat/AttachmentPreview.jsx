import React from 'react';
import { FaTimes, FaMusic, FaVideo, FaFileAlt, FaFile, FaThLarge } from 'react-icons/fa';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType) => {
  if (mimeType?.startsWith('audio/')) return <FaMusic />;
  if (mimeType?.startsWith('video/')) return <FaVideo />;
  if (mimeType?.includes('pdf')) return <FaFileAlt />;
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FaThLarge />;
  return <FaFile />;
};

export const AttachmentPreview = ({ attachments, onRemove, readonly = false }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex gap-3 px-4 py-2 overflow-x-auto border-t border-gray-100 bg-gray-50/50">
      {attachments.map((att, index) => {
        const isImage = att.type?.startsWith('image/');
        return (
          <div key={index} className="relative flex-shrink-0 group">
            {isImage ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <img src={att.url} alt="preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-40 flex items-center bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded flex items-center justify-center mr-2">
                  {getFileIcon(att.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-800 truncate">{att.name}</p>
                  <p className="text-[10px] text-gray-400">{formatFileSize(att.size)}</p>
                </div>
              </div>
            )}
            {!readonly && onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
              >
                <FaTimes size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};