import React, { useState } from 'react';
import { FaPaperPlane, FaPlus, FaSmile, FaTimes } from 'react-icons/fa';

export const MessageInput = ({ onSend, replyingTo, onCancelReply, onUploadFile }) => {
  const [text, setText] = useState('');

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
    if (onCancelReply) onCancelReply();
  };

  return (
    <div className="border-t-2 border-gray-100 bg-white shadow-2xl">
      {/* Banner đang trả lời */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-blue-50 px-6 py-2 border-b border-blue-100 transition-all">
          <div className="truncate flex-1">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Đang trả lời:</span> 
            <p className="text-sm text-gray-600 truncate">{replyingTo.content}</p>
          </div>
          <FaTimes className="text-gray-400 cursor-pointer hover:text-red-500 ml-4" onClick={onCancelReply} />
        </div>
      )}

      <form className="flex items-center gap-4 p-4" onSubmit={handleSend}>
        {/* Nút Cộng để thêm file */}
        <button 
          type="button" 
          onClick={onUploadFile}
          className="text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all flex-shrink-0"
        >
          <FaPlus size={20} />
        </button>
        
        <div className="flex-1 bg-gray-100 rounded-3xl border-2 border-transparent px-5 py-2 flex items-center focus-within:border-blue-400 focus-within:bg-white transition-all shadow-inner">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhập tin nhắn để thảo luận..."
            className="w-full bg-transparent border-none focus:ring-0 text-[15px] resize-none max-h-32 py-2 outline-none"
          />
          <button type="button" className="text-gray-400 hover:text-yellow-500 p-2 transition-colors">
            <FaSmile size={22} />
          </button>
        </div>

        {/* Nút Máy bay gửi tin */}
        <button 
          type="submit"
          disabled={!text.trim()}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            text.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' : 'bg-gray-200 text-gray-400'
          }`}
        >
          <FaPaperPlane size={18} />
        </button>
      </form>
    </div>
  );
};