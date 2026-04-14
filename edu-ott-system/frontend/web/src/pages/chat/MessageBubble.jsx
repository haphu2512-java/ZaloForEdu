import React, { useState, useRef, useEffect } from 'react';
import { 
  FaDownload, FaCheckDouble, FaCheck, FaClock, FaSmile, 
  FaShare, FaReply, FaEllipsisH, FaUndo, FaTrash, FaCopy, FaThumbtack 
} from 'react-icons/fa';
import { getExt, getCategory, getFileColor, formatBytes } from './ChatPage';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const MessageBubble = ({ 
  message, 
  isMe, 
  onReaction, 
  onRecall, 
  onDelete, 
  onForward, 
  onReply 
}) => {
const sender = message.senderId || message.sender || message.actualSender;

  const { _id, content, type, status, isEdited, isRecalled, replyTo, createdAt, reactions } = message;
  
  const [isHovered, setIsHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef(null);

  // FIX: Nếu tin nhắn đã thu hồi thì không lấy danh sách media nữa
  const mediaList = isRecalled ? [] : (message.attachments || message.mediaIds || message.media || []);
  if (mediaList.length > 0) console.log('[DEBUG] mediaList:', JSON.stringify(mediaList));
  
  const timeString = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const avatar = sender?.avatarUrl || sender?.avatar || 'https://i.pravatar.cc/150';
  const name = sender?.fullName || sender?.username || 'Người dùng';

  // Click ra ngoài để đóng menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (type === 'system') {
    return <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '12px', color: '#8A8D91' }}><span>{content}</span></div>;
  }
  const bubbleStyle = isMe 
    ? { backgroundColor: '#0084FF', color: '#FFFFFF', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', position: 'relative' } 
    : { backgroundColor: '#FFFFFF', color: '#050505', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', position: 'relative', border: '1px solid #E5E7EB' };

  return (
    <div 
      style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', marginBottom: '24px', position: 'relative', width: '100%' }} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); if (!showMoreMenu && !showEmojiPicker) setShowMoreMenu(false); }}
    >
      {!isMe && <img src={avatar} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
      
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        
        {!isMe && sender && (
          <div style={{ fontSize: '12px', color: '#65676B', marginBottom: '4px', marginLeft: '4px', fontWeight: '500' }}>
            {name}
          </div>
        )}
        
        {/* VÙNG CHỨA BONG BÓNG VÀ MENU */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }} ref={menuRef}>
          
          <div style={bubbleStyle}>
            {/* THU HỒI TIN NHẮN */}
            {isRecalled ? (
              <span style={{ fontStyle: 'italic', color: isMe ? '#E4E6EB' : '#8A8D91', fontSize: '14px' }}>Tin nhắn đã thu hồi</span>
            ) : (
              <>
                {replyTo && (
                  <div style={{ borderLeft: `3px solid ${isMe ? '#FFFFFF' : '#0084FF'}`, paddingLeft: '8px', marginBottom: '8px', opacity: 0.85, background: isMe ? 'rgba(0,0,0,0.1)' : '#F0F2F5', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: isMe ? '#fff' : '#050505' }}>{replyTo.sender?.fullName || 'Người dùng'}</div>
                    <div style={{ fontSize: '13px', color: isMe ? '#fff' : '#050505' }}>{replyTo.content || '[Hình ảnh/File]'}</div>
                  </div>
                )}

                {content && <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.4', color: isMe ? '#FFFFFF' : '#050505', wordBreak: 'break-word' }}>{content}</p>}

                {mediaList.length > 0 && (
                  <div style={{ marginTop: content ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mediaList.map((att, i) => {
                      if (typeof att === 'string') return null; 
                      const fileName = att.name || att.fileName || `Tệp ${i+1}`;
                      const isImg = ["image", "video"].includes(getCategory(fileName));
                      return isImg ? (
                        <img key={i} src={att.url} alt="attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                      ) : (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isMe ? 'rgba(255,255,255,0.2)' : '#F0F2F5', padding: '8px', borderRadius: '8px' }}>
                          <div style={{ background: getFileColor(fileName), color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '4px 6px', borderRadius: '4px' }}>
                            {getExt(fileName).toUpperCase().slice(0,4)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: isMe ? '#FFFFFF' : '#050505', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
                            <div style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#65676B', fontSize: '12px' }}>{formatBytes(att.size)}</div>
                          </div>
                          <a href={att.url} target="_blank" rel="noreferrer" style={{ color: isMe ? '#FFFFFF' : '#0084FF' }}><FaDownload size={16}/></a>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.7)' : '#8A8D91' }}>
                  {isEdited && <span>(đã sửa)</span>}
                  <span>{timeString}</span>
                  {isMe && (status === 'sending' ? <FaClock size={10} /> : <FaCheckDouble size={10} color={status === 'read' ? '#4ADE80' : '#E4E6EB'} />)}
                </div>
              </>
            )}

            {/* HIỂN THỊ REACTIONS */}
            {!isRecalled && reactions?.length > 0 && (
              <div style={{ position: 'absolute', bottom: '-14px', right: isMe ? '12px' : 'auto', left: isMe ? 'auto' : '12px', display: 'flex', background: '#FFFFFF', padding: '2px 6px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', gap: '2px', zIndex: 2, border: '1px solid #E5E7EB' }}>
                {reactions.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                    {r.emoji} {reactions.length > 1 && <span style={{ color: '#65676B', fontSize: '10px', marginLeft: '3px', fontWeight: 'bold' }}>{reactions.length}</span>}
                  </div>
                ))}
              </div>
            )}
            
          </div>

          {/* DẢI MENU NÚT TRÒN (REPLY, SHARE, MORE) */}
          {!isRecalled && (isHovered || showMoreMenu || showEmojiPicker) && (
            <div style={{ display: 'flex', gap: '6px', color: '#65676B', position: 'relative', paddingBottom: '4px' }}>
              
              {/* Nút Emoji */}
              <button title="Thả cảm xúc" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowMoreMenu(false); }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#F0F2F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaSmile size={12} color="#65676B"/></button>
              
              <button title="Trả lời" onClick={() => onReply?.(message)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#F0F2F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaReply size={12} color="#65676B"/></button>
              <button title="Thêm" onClick={() => { setShowMoreMenu(!showMoreMenu); setShowEmojiPicker(false); }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#F0F2F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaEllipsisH size={12} color="#65676B"/></button>
              
              {/* Menu con: Sao chép / Ghim / Thu hồi / Xóa */}
              {showMoreMenu && (
                <div style={{ position: 'absolute', bottom: '100%', right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, marginBottom: '8px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', width: '170px', zIndex: 10, padding: '8px 0', border: '1px solid #E5E7EB' }}>
                  {content && (
                    <div onClick={() => { navigator.clipboard.writeText(content); setShowMoreMenu(false); }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#050505', fontSize: '14px' }}>
                      <FaCopy size={13} color="#65676B" /> Sao chép
                    </div>
                  )}
                  <div onClick={() => { onForward?.(message); setShowMoreMenu(false); }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#050505', fontSize: '14px' }}>
                    <FaShare size={13} color="#65676B" /> Chuyển tiếp
                  </div>
                  <div onClick={() => { setShowMoreMenu(false); }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#050505', fontSize: '14px' }}>
                    <FaThumbtack size={13} color="#F59E0B" /> Ghim tin nhắn
                  </div>
                  {isMe && (
                    <div onClick={() => { onRecall?.(_id); setShowMoreMenu(false); }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#050505', fontSize: '14px' }}>
                      <FaUndo size={13} color="#65676B" /> Thu hồi
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #F0F2F5', margin: '4px 0' }} />
                  <div onClick={() => { onDelete?.(_id); setShowMoreMenu(false); }} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#E11D48', fontSize: '14px' }}>
                    <FaTrash size={13} /> Xóa {isMe && 'ở phía tôi'}
                  </div>
                </div>
              )}

              {/* BẢNG CHỌN EMOJI  */}
              {showEmojiPicker && (
                <div style={{ position: 'absolute', bottom: '100%', right: isMe ? '0' : 'auto', left: isMe ? 'auto' : '0', marginBottom: '8px', background: '#fff', padding: '4px 8px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '6px', zIndex: 10, border: '1px solid #E5E7EB' }}>
                  {EMOJIS.map(e => (
                    <span 
                      key={e} 
                      onClick={() => { onReaction(_id, e); setShowEmojiPicker(false); }}
                      style={{ fontSize: '18px', cursor: 'pointer', transition: 'transform 0.1s' }}
                      onMouseEnter={(ev) => ev.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};