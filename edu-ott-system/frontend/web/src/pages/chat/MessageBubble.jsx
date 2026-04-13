import React, { useState } from 'react';
import { FaDownload, FaCheckDouble, FaCheck, FaClock, FaSmile } from 'react-icons/fa';

export const MessageBubble = ({ message, isMe, onReaction }) => {
  const { _id, content, type, status, sender, attachments, reactions, replyTo, createdAt, isEdited, isDeleted } = message;
  const [showPicker, setShowPicker] = useState(false);
  const emojis = ['👍', '❤️', '😂', '😮', '😢'];

  const timeString = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const avatar = sender?.avatarUrl || sender?.avatar || 'https://i.pravatar.cc/150';
  const name = sender?.fullName || sender?.username || 'Người dùng';

  // 1. Render Tin nhắn Hệ thống
  if (type === 'system') {
    return <div className="msg-system"><span>{content}</span></div>;
  }

  // Render Icon Trạng thái
  const renderStatus = () => {
    if (!isMe) return null;
    if (status === 'sending') return <FaClock size={10} />;
    if (status === 'sent') return <FaCheck size={10} />;
    if (status === 'delivered') return <FaCheckDouble size={10} color="var(--z-text-muted)" />;
    return <FaCheckDouble size={10} />; 
  };

  return (
    <div className={`msg-wrap ${isMe ? 'me' : 'them'}`} onMouseLeave={() => setShowPicker(false)}>
      {/* Avatar Đối phương */}
      {!isMe && (
        <img src={avatar} className="msg-avatar" alt="avatar" style={sender?.isActive === false ? { filter: 'grayscale(1)', opacity: 0.5 } : {}} />
      )}
      
      <div className="msg-body">
        {/* Tên Đối phương */}
        {!isMe && sender && (
          <div className="msg-sender-name">
            {name} {sender.isActive === false && <span style={{color: '#EF4444', fontSize: '10px'}}>(Vô hiệu hóa)</span>}
          </div>
        )}
        
        <div className={`msg-bubble ${isDeleted ? 'msg-deleted' : ''}`}>
          {/* Tin nhắn bị xóa */}
          {isDeleted ? (
            <span>Tin nhắn đã bị thu hồi</span>
          ) : (
            <>
              {/* Reply Preview */}
              {replyTo && (
                <div className="msg-reply">
                  <div className="msg-reply-name">{replyTo.sender?.fullName || replyTo.sender?.username || 'Unknown'}</div>
                  <div className="msg-reply-content">{replyTo.content || '[File đính kèm]'}</div>
                </div>
              )}

              {/* Text Content */}
              {content && <p style={{ margin: 0 }}>{content}</p>}

              {/* Attachments */}
              {attachments?.length > 0 && (
                <div style={{ marginTop: content ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachments.map((att, i) => (
                    att.type?.startsWith('image/') ? (
                      <img key={i} src={att.url} alt="attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'inherit', textDecoration: 'none' }}>
                        <FaDownload size={14} />
                        <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                      </a>
                    )
                  ))}
                </div>
              )}

              {/* Meta Data (Thời gian & Trạng thái) */}
              <div className="msg-meta">
                {isEdited && <span style={{ fontStyle: 'italic' }}>(đã sửa)</span>}
                <span>{timeString}</span>
                {renderStatus()}
              </div>
            </>
          )}

          {/* Dải Reaction Đã Thả */}
          {!isDeleted && reactions?.length > 0 && (
            <div className="msg-reactions">
              {reactions.slice(0, 3).map((r, i) => (
                <div key={i} className="msg-react-badge">
                  {r.emoji} {reactions.length > 1 && <span style={{color: 'var(--z-text-muted)'}}>{reactions.length}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút bật Bảng Emoji */}
        {!isDeleted && (
          <div className="msg-smile-btn" onClick={() => setShowPicker(!showPicker)}>
            <FaSmile size={14} />
          </div>
        )}

        {/* Bảng Emoji Picker */}
        {showPicker && !isDeleted && (
          <div className="msg-emoji-picker">
            {emojis.map(e => (
              <span key={e} className="msg-emoji-item" onClick={() => { onReaction(_id, e); setShowPicker(false); }}>
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};