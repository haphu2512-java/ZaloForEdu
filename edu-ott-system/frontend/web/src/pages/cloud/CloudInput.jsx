import React, { useState, useRef, useEffect } from 'react';
import { FaSpinner, FaPaperPlane, FaThumbsUp, FaSmile, FaTimes, FaMicrophone } from 'react-icons/fa';
import { VoiceRecorder } from '../../components/shared/VoiceRecorder';

/* Zalo reply icon */
const ReplyIconSmall = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7"/>
    <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);

export const CloudInput = ({ onSendText, isSending, onUploadFiles, replyTo, onClearReply }) => {
  const [textInput, setTextInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const emojiRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    if (!textInput.trim() || isSending) return;
    onSendText(textInput, replyTo?._id || null);
    setTextInput("");
    setShowEmoji(false);
    setShowRecorder(false);
    onClearReply?.();
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUploadFiles(files, replyTo?._id || null);
      onClearReply?.();
    }
    e.target.value = "";
  };

  /* Preview text for the reply bar */
  const getReplyPreview = (msg) => {
    if (!msg) return "";
    if (msg.content) return msg.content;
    const m = (msg.mediaIds || msg.media || msg.attachments || [])[0];
    if (!m) return "Tin nhắn";
    
    if ((m.mimeType && m.mimeType.startsWith('audio/')) || (m.fileName && ["mp3","wav","ogg","webm"].includes(m.fileName.split('.').pop().toLowerCase()))) {
      return "[Tin nhắn thoại]";
    }

    const cat = m.fileName ? m.fileName.split('.').pop().toLowerCase() : "";
    if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(cat) || (m.mimeType && m.mimeType.startsWith('image/'))) return "[Hình ảnh]";
    if (["mp4","mov","avi","mkv","webm"].includes(cat) || (m.mimeType && m.mimeType.startsWith('video/'))) return "[Video]";
    return `[${m.fileName || "Tệp đính kèm"}]`;
  };

  return (
    <div className="mdc-input-area">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
      <input ref={videoInputRef} type="file" accept="video/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
      <input ref={fileInputRef} type="file" multiple style={{display:"none"}} onChange={handleFileInput} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"/>
      <input ref={folderInputRef} type="file" webkitdirectory="true" multiple style={{display:"none"}} onChange={handleFileInput}/>

      {/* Reply preview bar — shows above toolbar when replying */}
      {replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderTop: '1px solid var(--border-color, #E5E7EB)',
          background: 'var(--bg-secondary, #F0F2F5)',
          fontSize: 13,
        }}>
          <ReplyIconSmall />
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:600, fontSize:12, color:'#0068FF', marginBottom:2}}>Đang trả lời</div>
            <div style={{color:'#65676B', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
              {getReplyPreview(replyTo)}
            </div>
          </div>
          <button
            onClick={onClearReply}
            style={{background:'none',border:'none',cursor:'pointer',color:'#8A8D91',padding:4,display:'flex',alignItems:'center'}}
          >
            <FaTimes size={13}/>
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mdc-toolbar" style={{ position: 'relative' }}>
        <button type="button" className="mdc-tool-btn" title="Sticker/Emoji" onClick={() => setShowEmoji(!showEmoji)}>
          <FaSmile size={18} />
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Đính kèm file" onClick={() => fileInputRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi video" onClick={() => videoInputRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi thư mục" onClick={() => { if(folderInputRef.current){ folderInputRef.current.setAttribute("webkitdirectory",""); folderInputRef.current.click(); } }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi ghi âm" onClick={() => setShowRecorder(true)}>
          <FaMicrophone size={16} />
        </button>

        {/* Emoji picker */}
        {showEmoji && (
          <div ref={emojiRef} style={{ position: 'absolute', bottom: '100%', left: '10px', marginBottom: '10px', zIndex: 50, background: '#fff', border: '1px solid var(--border-color, #E5E7EB)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '12px' }}>
            {['😀', '😂', '❤️', '👍', '😢', '🙏'].map(e => (
              <span key={e} style={{ fontSize: '18px', cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseEnter={(ev) => ev.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
                onClick={() => { setTextInput(prev => prev + e); setShowEmoji(false); }}
              >{e}</span>
            ))}
          </div>
        )}
      </div>

      {/* Text input row / Voice Recorder */}
      {showRecorder ? (
        <div className="mdc-input-row" style={{ height: 60 }}>
          <VoiceRecorder 
            onCancel={() => setShowRecorder(false)} 
            onSend={(blob, duration) => {
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
                duration: `${duration}s`,
                size: `${Math.round(blob.size/1024)}KB`,
                universalCompatible: extension === '.mp3' || extension === '.wav' || extension === '.m4a'
              });
              const file = new File([blob], `voice_message_${Date.now()}${extension}`, { type: blob.type });
              onUploadFiles([file], replyTo?._id || null);
              setShowRecorder(false);
              onClearReply?.();
            }}
          />
        </div>
      ) : (
        <div className="mdc-input-row">
          <div className="mdc-input-wrap">
            <input
              ref={inputRef}
              className="mdc-input"
              value={textInput}
              onChange={e=>setTextInput(e.target.value)}
              placeholder="Nhập @, tin nhắn tới My Documents..."
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
            />
          </div>
          {textInput.trim() ? (
            <button className="mdc-send-btn" onClick={handleSend}>
              <FaPaperPlane size={15}/>
            </button>
          ) : (
            <button className="mdc-like-btn" onClick={() => onSendText("👍", null)}>
              <FaThumbsUp size={16}/>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
