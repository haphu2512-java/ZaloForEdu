import React, { useState, useRef, useEffect } from 'react';
import { FaSpinner, FaPaperPlane, FaThumbsUp, FaSmile, FaMicrophone } from 'react-icons/fa';
import { VoiceRecorder } from '../../components/shared/VoiceRecorder';

export const MessageInput = ({ theme, placeholder, onSend, onSendLike, onUploadFiles }) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  // Refs quản lý input ẩn cho file/hình ảnh
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const emojiRef = useRef(null);

  // Click ra ngoài để đóng emoji
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSending) return;
    
    setIsSending(true);
    await onSend(text.trim());
    setIsSending(false);
    
    setText('');
    setShowEmoji(false);
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUploadFiles(files);
    }
    e.target.value = ""; // Reset input để có thể chọn lại file cũ
  };

  return (
    <div className="mdc-input-area">
      {/* Input ẩn */}
      <input ref={imageRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>
      <input ref={videoRef} type="file" accept="video/*" multiple style={{display:"none"}} onChange={handleFiles}/>
      <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={handleFiles} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"/>
      <input ref={folderRef} type="file" webkitdirectory="true" multiple style={{display:"none"}} onChange={handleFiles} />

      {/* Thanh Toolbar dùng SVG giống hệt My Documents */}
      <div className="mdc-toolbar" style={{ position: 'relative' }}>
        <button type="button" className="mdc-tool-btn" title="Sticker/Emoji" onClick={() => setShowEmoji(!showEmoji)}>
          <FaSmile size={18} />
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi ảnh" onClick={() => imageRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Đính kèm file" onClick={() => fileRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi video" onClick={() => videoRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi thư mục" onClick={() => { if(folderRef.current){ folderRef.current.setAttribute("webkitdirectory",""); folderRef.current.click(); } }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi ghi âm" onClick={() => setShowRecorder(true)}>
          <FaMicrophone size={16} />
        </button>

        {/* Bảng chọn Emoji */}
        {showEmoji && (
          <div ref={emojiRef} style={{ position: 'absolute', bottom: '100%', left: '10px', marginBottom: '10px', zIndex: 50, background: theme === 'dark' ? '#242526' : '#fff', border: '1px solid var(--border-color, #E5E7EB)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '12px' }}>
            {['😀', '😂', '❤️', '👍', '😢', '🙏'].map(e => (
              <span 
                key={e} 
                style={{ fontSize: '18px', cursor: 'pointer', transition: 'transform 0.1s' }} 
                onMouseEnter={(ev) => ev.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
                onClick={() => { setText(prev => prev + e); setShowEmoji(false); }}
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Khung nhập text / Voice Recorder */}
      {showRecorder ? (
        <div style={{ padding: '8px 14px 12px' }}>
          <VoiceRecorder 
            onCancel={() => setShowRecorder(false)} 
            onSend={(blob) => {
              // Universal extension mapping dựa trên mimeType
              let extension = '.webm'; // fallback
              if (blob.type.includes('mpeg') || blob.type.includes('mp3')) {
                extension = '.mp3';
              } else if (blob.type.includes('wav')) {
                extension = '.wav';
              } else if (blob.type.includes('mp4') || blob.type.includes('m4a')) {
                extension = '.m4a'; // Use .m4a for better mobile compatibility
              } else if (blob.type.includes('webm')) {
                extension = '.webm';
              }
              
              console.log('📤 Sending universal audio:', { 
                type: blob.type, 
                extension, 
                size: `${Math.round(blob.size/1024)}KB`,
                universalCompatible: extension === '.mp3' || extension === '.wav' || extension === '.m4a'
              });
              onUploadFiles([new File([blob], `voice_${Date.now()}${extension}`, { type: blob.type })]);
              setShowRecorder(false);
            }}} 
          />
        </div>
      ) : (
        <div className="mdc-input-row">
          <div className="mdc-input-wrap">
            <input 
              className="mdc-input"
              placeholder={placeholder} 
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          
          {/* Nút gửi hoặc Like */}
          {text.trim() ? (
            <button className="mdc-send-btn" onClick={handleSend}>
              <FaPaperPlane size={15} />
            </button>
          ) : (
            <button className="mdc-like-btn" onClick={onSendLike}>
              <FaThumbsUp size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};