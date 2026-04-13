import React from 'react';

export const TypingIndicator = ({ userName }) => {
  return (
    <div className="flex items-center gap-2 px-6 py-2 animate-pulse">
      <div className="flex gap-1 bg-gray-100 rounded-2xl px-3 py-2">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
      </div>
      {userName && (
        <span className="text-xs text-gray-400 italic">{userName} đang nhập...</span>
      )}
    </div>
  );
};