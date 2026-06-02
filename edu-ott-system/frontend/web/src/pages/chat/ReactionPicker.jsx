import React from 'react';

const EMOJIS = ['😀', '😂', '😍', '🥰', '👍', '❤️', '🔥', '😭', '🙏', '🎉'];

export const ReactionPicker = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-full mb-2 bg-white shadow-xl border border-gray-100 rounded-full px-2 py-1 flex gap-1 animate-bounceIn z-50">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-2xl hover:scale-125 transition-transform p-1"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};