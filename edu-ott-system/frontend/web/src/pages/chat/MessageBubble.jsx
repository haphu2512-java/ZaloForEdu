import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaDownload, FaCheckDouble, FaCheck, FaClock, FaSmile,
  FaShare, FaReply, FaEllipsisH, FaUndo, FaTrash, FaCopy, FaThumbtack, FaCrown, FaStar, FaPlayCircle, FaInfoCircle, FaEdit, FaHistory
} from 'react-icons/fa';
import { getExt, getCategory, getFileColor, formatBytes, toAbsoluteUrl, forceDownload, openDocument } from './chatUtils';
import { AudioBubble } from '../../components/shared/AudioBubble';
import PollMessage from './PollMessage';
import { conversationService } from '../../services/conversationService';
import toast from 'react-hot-toast';
import { DEFAULT_AVATAR } from '../../utils/constants';


const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');

const EMOJIS = ['😀', '😂', '😍', '🥰', '👍', '❤️', '🔥', '😭', '🙏', '🎉'];

// Fallback SVG avatar (không random, không dùng pravatar.cc)
const DEFAULT_AVATAR_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23d8dadf'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23bcc0c4'/%3E%3Cpath d='M6 35 Q6 26 20 26 Q34 26 34 35' fill='%23bcc0c4'/%3E%3C/svg%3E";

// Render URLs as clickable links
const renderContent = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#0084FF', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
};

// TODO: uncomment khi BE + Mobile sẵn sàng
// Modal xem lịch sử chỉnh sửa
// function EditHistoryModal({ history, onClose }) {
//   if (!history || history.length === 0) return null;
//   return (
//     <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
//       <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 12, width: 380, maxWidth: '90vw', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--z-border)' }}>
//           <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--z-text-primary)' }}>Lịch sử chỉnh sửa</span>
//           <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', fontSize: 20, lineHeight: 1 }}>×</button>
//         </div>
//         <div style={{ overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
//           {history.map((h, i) => (
//             <div key={i} style={{ background: 'var(--z-bg-main)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--z-primary)' }}>
//               <div style={{ fontSize: 11, color: 'var(--z-text-secondary)', marginBottom: 4 }}>
//                 {i === history.length - 1 ? 'Bản gốc' : `Phiên bản ${history.length - i - 1}`}
//                 {' · '}{new Date(h.editedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
//               </div>
//               <div style={{ fontSize: 13, color: 'var(--z-text-primary)', lineHeight: 1.5 }}>{h.content}</div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// TODO: uncomment khi BE + Mobile sẵn sàng
// Inline edit component
// function InlineEdit({ initialText, onSave, onCancel }) {
//   const [val, setVal] = useState(initialText);
//   const ref = useRef(null);
//   useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
//   const handleKey = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (val.trim()) onSave(val.trim()); }
//     if (e.key === 'Escape') onCancel();
//   };
//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200, maxWidth: 360 }}>
//       <textarea
//         ref={ref}
//         value={val}
//         onChange={e => setVal(e.target.value)}
//         onKeyDown={handleKey}
//         style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--z-primary)', borderRadius: 8, fontSize: 13, resize: 'none', background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', minHeight: 60, fontFamily: 'inherit', outline: 'none' }}
//         rows={3}
//       />
//       <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
//         <button onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid var(--z-border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--z-text-secondary)' }}>Hủy</button>
//         <button onClick={() => val.trim() && onSave(val.trim())} style={{ fontSize: 12, padding: '4px 12px', border: 'none', borderRadius: 6, background: 'var(--z-primary)', color: '#fff', cursor: 'pointer' }}>Lưu</button>
//       </div>
//       <div style={{ fontSize: 11, color: 'var(--z-text-secondary)' }}>Enter để lưu · Esc để hủy</div>
//     </div>
//   );
// }

export const MessageBubble = ({
  message,
  isMe,
  onReaction,
  onRecall,
  onDelete,
  // onEdit, // TODO: uncomment khi BE + Mobile sẵn sàng
  onForward,
  onReply,
  onPin,
  isPinned,
  onUnpin,
  onPollVoted,
  userId,
  isGroup = false,
  activeConversation,
}) => {
  const sender = message.senderId || message.sender || message.actualSender;

  const { _id, content, type, status, isEdited, isRecalled, replyTo, createdAt, reactions, mentions, mentionAll } = message;
  const editHistory = message.editHistory || [];

  // Check if message is soft-deleted for this user (deletedBy contains userId)
  const deletedByMe = Array.isArray(message.deletedBy)
    ? message.deletedBy.some(id => String(id?._id || id) === String(userId))
    : false;

  // Check if sender is owner or admin
  const senderId = sender?._id || sender?.id || sender;
  const ownerId = activeConversation?.ownerId?._id || activeConversation?.ownerId;
  const adminIds = activeConversation?.adminIds || [];
  const isOwner = String(senderId) === String(ownerId);
  const isAdmin = adminIds.some(aid => String(aid._id || aid) === String(senderId));
  const isPrivilegedSender = isOwner || isAdmin;
  const shouldShowAdminBadge = isPrivilegedSender && activeConversation?.settings?.markAdminMessages !== false;

  const renderContentWithMentions = (text) => {
    if (!text) return '';
    // Tách văn bản dựa trên URL hoặc @username
    const parts = text.split(/(https?:\/\/[^\s]+|@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('http')) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? '#E0F2FE' : '#0084FF', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>{part}</a>;
      }
      if (part.startsWith('@')) {
        return <span key={i} style={{ color: isMe ? '#E0F2FE' : '#0084FF', fontWeight: 600 }}>{part}</span>;
      }
      return part;
    });
  };

  const [isHovered, setIsHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuDirection, setMenuDirection] = useState('bottom');
  const [pinLoading, setPinLoading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [showMediaInfo, setShowMediaInfo] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // const [isEditing, setIsEditing] = useState(false);       // TODO: uncomment khi BE + Mobile sẵn sàng
  // const [showEditHistory, setShowEditHistory] = useState(false); // TODO: uncomment khi BE + Mobile sẵn sàng
  const menuRef = useRef(null);

  const rawMediaList = isRecalled ? [] : (message.attachments || message.mediaIds || message.media || []);
  const mediaList = rawMediaList
    .map(att => {
      if (typeof att === 'string') return { _id: att, url: '', fileName: 'Loading...', mimeType: 'image/jpeg' };
      return { ...att, url: toAbsoluteUrl(att.url) };
    })
    .filter(att => att && (att._id || att.id));

  const timeString = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const avatar = toAbsoluteUrl(sender?.avatarUrl || sender?.avatar) || DEFAULT_AVATAR;
  const senderIdStr = String(sender?._id || sender?.id || sender || '');
  const nickname = activeConversation?.nicknames?.[senderIdStr];
  const name = nickname || sender?.fullName || sender?.username || null; // null thay vì 'Người dùng'

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

  // Nếu tin bị xóa mềm phía người dùng này — không render gì
  if (deletedByMe) return null;

  // ── Render sticker/GIF message ──
  const stickerUrl = message.stickerUrl ||
    (typeof content === 'string' && content.startsWith('[sticker]') ? content.slice(9) : null);
  if (stickerUrl) {
    return (
      <div id={`msg-${_id}`} className={`mdc-msg-wrap ${isMe ? 'me' : 'them'}`}>
        {!isMe && (
          <img
            src={avatar}
            alt="avatar"
            className="mdc-msg-avatar"
            onError={e => { e.currentTarget.src = DEFAULT_AVATAR_SVG; }}
          />
        )}
        <div className="mdc-msg-body">
          {/* Chỉ hiện tên trong nhóm */}
          {!isMe && isGroup && name && <div className="mdc-msg-sender-name">{name}</div>}
          <img
            src={stickerUrl}
            alt="sticker"
            style={{
              maxWidth: 160, maxHeight: 160, borderRadius: 8, display: 'block',
              opacity: message.status === 'sending' ? 0.6 : 1,
            }}
          />
          <div className="mdc-msg-time" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 2 }}>
            <span className="mdc-msg-time-text">
              {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
        <div style={{ background: 'var(--z-bg-secondary, #F3F4F6)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', color: '#65676B', fontWeight: 500 }}>
          {content}
        </div>
      </div>
    );
  }

  // ── Render poll message ──
  if (type === 'poll' && message.pollId) {
    const pollData = typeof message.pollId === 'object' ? message.pollId : null;
    if (pollData) {
      return (
        <div id={`msg-${_id}`} className={`mdc-msg-wrap ${isMe ? 'me' : 'them'}`}>
          {!isMe && (
            <img src={avatar} alt="avatar" className="mdc-msg-avatar" onError={e => { e.currentTarget.src = DEFAULT_AVATAR_SVG; }} />
          )}
          <div className="mdc-msg-body">
            {!isMe && isGroup && name && <div className="mdc-msg-sender-name">{name}</div>}
            {isPinned && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F59E0B', marginBottom: 4 }}>
                <FaThumbtack size={9} /> Đã ghim
              </div>
            )}
            <PollMessage poll={pollData} userId={userId} onPollVoted={onPollVoted} />
            <div className="mdc-msg-time" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <span>{timeString}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  const bubbleStyle = isMe
    ? { backgroundColor: '#0084FF', color: '#FFFFFF', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', position: 'relative' }
    : { backgroundColor: '#FFFFFF', color: '#050505', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', position: 'relative', border: '1px solid #E5E7EB' };

  const isImageOrVideo = (att) => {
    const cat = getCategory(att.name || att.fileName || '');
    if (cat === 'audio' || att.mimeType?.startsWith('audio/')) return false;
    if (att.mimeType?.startsWith('image/') || att.mimeType?.startsWith('video/')) return true;
    return ["image", "video"].includes(cat);
  };

  const images = mediaList.filter(isImageOrVideo);
  const audios = mediaList.filter(att => {
    if (att.mimeType?.startsWith('audio/')) return true;
    return getCategory(att.name || att.fileName || '') === 'audio';
  });
  const docs = mediaList.filter(att => !isImageOrVideo(att) && !audios.includes(att));

  const handleJumpToReply = (e) => {
    e.stopPropagation();
    if (!replyTo?._id && !replyTo?.id) return;
    const targetId = replyTo._id || replyTo.id;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-msg');
      setTimeout(() => el.classList.remove('highlight-msg'), 1500);
    }
  };

  const handlePin = async () => {
    if (!onPin || pinLoading) return;
    setPinLoading(true);
    setShowMoreMenu(false);
    try { await onPin(_id); } finally { setPinLoading(false); }
  };

  // Lấy tên người gửi của replyTo (cả 1-1 và nhóm)
  const getReplyName = () => {
    if (!replyTo) return null;
    const rSender = replyTo.senderId;
    if (!rSender) return null;
    if (typeof rSender === 'object') {
      const rId = String(rSender._id || rSender.id || '');
      if (rId === String(userId)) return 'Bạn';
      const rNickname = activeConversation?.nicknames?.[rId];
      return rNickname || rSender.fullName || rSender.username || null;
    }
    if (String(rSender) === String(userId)) return 'Bạn';
    return null;
  };

  const handleToggleMoreMenu = (e) => {
    if (!showMoreMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      const distanceToBottom = window.innerHeight - rect.bottom;
      setMenuDirection(distanceToBottom < 220 ? 'top' : 'bottom');
    }
    setShowMoreMenu(!showMoreMenu);
    setShowEmojiPicker(false);
  };

  return (
    <>
      {/* TODO: uncomment khi BE + Mobile sẵn sàng
      {showEditHistory && editHistory.length > 0 && (
        <EditHistoryModal history={editHistory} onClose={() => setShowEditHistory(false)} />
      )} */}
      <div
        id={`msg-${_id}`}
        className={`mdc-msg-wrap ${isMe ? 'me' : 'them'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); }}
        style={{ position: 'relative' }}
      >
        {!isMe && (
          <img
            src={avatar}
            alt="avatar"
            className="mdc-msg-avatar"
            onError={e => { e.currentTarget.src = DEFAULT_AVATAR_SVG; }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }} ref={menuRef}>

          <div style={{ position: 'relative' }}>
            {isRecalled ? (
              <div className="mdc-text-bubble msg-recalled">Tin nhắn đã thu hồi</div>
            ) : (
              <>
                {(replyTo || content) && (
                  <div className="mdc-text-bubble">
                    {replyTo && (
                      <div
                        style={{ borderLeft: `3px solid ${isMe ? '#FFFFFF' : '#0084FF'}`, paddingLeft: '8px', marginBottom: '8px', opacity: 0.85, background: isMe ? 'rgba(0,0,0,0.1)' : '#F0F2F5', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={handleJumpToReply}
                      >
                        {/* Quote sender logic: In group, show name. In 1-1, just show content */}
                        {isGroup && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: isMe ? '#fff' : '#050505', marginBottom: 2 }}>
                            {replyTo.senderId?.fullName || replyTo.senderId?.username || 'Người dùng'}
                          </div>
                        )}
                        <div style={{ fontSize: '13px', color: isMe ? '#fff' : '#050505', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '230px' }}>
                          {replyTo.content || '[Hình ảnh/File]'}
                        </div>
                      </div>
                    )}
                    {content && <span>{renderContentWithMentions(content)}</span>}
                  </div>
                )}

                {/* MEDIA */}
                {(images.length > 0 || docs.length > 0 || audios.length > 0) && (
                  <div style={{ marginTop: (content || replyTo) ? '6px' : '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>

                    {images.length > 0 && (
                      <div style={{
                        display: 'grid', gap: '4px', width: '100%', maxWidth: '320px', borderRadius: '12px', overflow: 'hidden',
                        gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr',
                        gridTemplateRows: images.length > 2 ? '1fr 1fr' : '1fr'
                      }}>
                        {images.slice(0, 4).map((att, i) => {
                          const isLast = i === 3;
                          const remain = images.length - 4;
                          const isVideo = (att.mimeType?.startsWith('video/')) || getCategory(att.name || att.fileName) === 'video';
                          return (
                            <div key={i} className="mdc-img-bubble"
                              style={{
                                width: '100%',
                                aspectRatio: (images.length === 3 && i === 0) ? '2 / 1' : (images.length === 1 ? 'auto' : '1 / 1'),
                                gridColumn: (images.length === 3 && i === 0) ? 'span 2' : 'auto',
                                backgroundColor: '#f0f2f5', margin: 0, borderRadius: 0
                              }}>
                              {isVideo ? (
                                <div style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }} onClick={() => setViewingMedia({ url: toAbsoluteUrl(att.url), isVideo: true, isDoc: false, name: att.fileName || att.name || 'Video', size: formatBytes(att.size || 0), sender: name, time: timeString, date: new Date(createdAt).toLocaleDateString('vi-VN') })}>
                                  <video src={toAbsoluteUrl(att.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                    <FaPlayCircle size={32} color="#fff" style={{ opacity: 0.8 }} />
                                  </div>
                                </div>
                              ) : (
                                <img src={toAbsoluteUrl(att.url)} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }} onClick={() => setViewingMedia({ url: toAbsoluteUrl(att.url), isVideo: false, isDoc: false, name: att.fileName || att.name || 'Image', size: formatBytes(att.size || 0), sender: name, time: timeString, date: new Date(createdAt).toLocaleDateString('vi-VN') })} />
                              )}
                              <a className="mdc-img-dl-btn" title="Tải về" onClick={e => { e.preventDefault(); e.stopPropagation(); forceDownload(att.url, att.fileName || att.name || 'image'); }}><FaDownload size={11} /></a>
                              {isLast && remain > 0 && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                                  +{remain}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {docs.length > 0 && docs.map((att, i) => {
                      const fileName = att.name || att.fileName || `Tệp ${i + 1}`;
                      const downloadUrl = toAbsoluteUrl(att.url);
                      return (
                        <div key={`doc-${i}`} className="mdc-file-bubble" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); openDocument(downloadUrl, fileName); }}>
                          <div className="mdc-fb-icon" style={{ background: getFileColor(fileName) }}>
                            {getExt(fileName).toUpperCase().slice(0, 4)}
                          </div>
                          <div className="mdc-fb-info">
                            <span className="mdc-fb-name">{fileName}</span>
                            <div className="mdc-fb-meta">{formatBytes(att.size)}</div>
                          </div>
                          <a onClick={e => { e.preventDefault(); e.stopPropagation(); forceDownload(att.url, fileName); }} className="mdc-fb-btn"><FaDownload size={13} /></a>
                        </div>
                      );
                    })}

                    {audios.length > 0 && audios.map((att, i) => (
                      <AudioBubble key={`audio-${i}`} url={toAbsoluteUrl(att.url)} duration={att.duration} />
                    ))}
                  </div>
                )}

                <div className="mdc-msg-time" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  {isEdited && <span>(đã sửa)</span>}
                  <span>{timeString}</span>
                  {isMe && (status === 'sending' ? <FaClock size={10} /> : <FaCheckDouble size={10} color={status === 'read' ? '#4ADE80' : 'rgba(255,255,255,0.7)'} />)}
                </div>
              </>
            )}

            {!isRecalled && reactions?.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '-14px',
                right: isMe ? '4px' : 'auto',
                left: isMe ? 'auto' : '4px',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--z-bg-sidebar)',
                padding: '2px 6px',
                borderRadius: '12px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                gap: '2px',
                zIndex: 10,
                border: '1px solid var(--z-border)',
                color: 'var(--z-text-primary)',
                fontSize: '11px'
              }}>
                {reactions.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {r.emoji}
                  </div>
                ))}
                {reactions.length > 0 && (
                  <span style={{ color: 'var(--z-text-secondary)', fontSize: '10px', marginLeft: '2px', fontWeight: '700' }}>
                    {reactions.length}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isRecalled && (
            <div className="mdc-msg-menu-wrap">
              <div className="mdc-msg-menu-pill">
                <button className="mdc-pill-btn" title="Thả cảm xúc" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowMoreMenu(false); }}><FaSmile size={12} /></button>
                <button className="mdc-pill-btn" title="Trả lời" onClick={() => onReply?.(message)}><FaReply size={12} /></button>
                <button className="mdc-pill-btn" title="Thêm" onClick={handleToggleMoreMenu}><FaEllipsisH size={12} /></button>
              </div>

              {showMoreMenu && (
                <div className="mdc-msg-menu" style={{ 
                  right: isMe ? 0 : 'auto', 
                  left: isMe ? 'auto' : 0,
                  top: menuDirection === 'bottom' ? 'calc(100% - 20px)' : 'auto',
                  bottom: menuDirection === 'top' ? 'calc(100% - 20px)' : 'auto',
                }}>
                  {content && (
                    <div className="mdc-mm-item" onClick={() => { navigator.clipboard.writeText(content); setShowMoreMenu(false); }}>
                      <FaCopy size={13} color="#65676B" /> Sao chép
                    </div>
                  )}
                  <div className="mdc-mm-item" onClick={() => { onForward?.(message); setShowMoreMenu(false); }}>
                    <FaShare size={13} color="#65676B" /> Chuyển tiếp
                  </div>

                  {/* ── Nút Ghim / Bỏ ghim ── */}
                  {isPinned ? (
                    <div className="mdc-mm-item" onClick={() => { onUnpin?.(_id); setShowMoreMenu(false); }}>
                      <FaThumbtack size={13} color="#9CA3AF" /> Bỏ ghim
                    </div>
                  ) : (
                    <div className="mdc-mm-item" onClick={handlePin}
                      style={{ opacity: pinLoading ? 0.6 : 1, cursor: pinLoading ? 'wait' : 'pointer' }}>
                      <FaThumbtack size={13} color="#F59E0B" />
                      {pinLoading ? 'Đang ghim...' : 'Ghim tin nhắn'}
                    </div>
                  )}

                  {mediaList.length > 0 && (
                    <div className="mdc-mm-item" onClick={() => { setShowDetailsModal(true); setShowMoreMenu(false); }}>
                      <FaInfoCircle size={13} color="#65676B" /> Xem chi tiết
                    </div>
                  )}

                  {isMe && (
                    <div className="mdc-mm-item" onClick={() => { onRecall?.(_id); setShowMoreMenu(false); }}>
                      <FaUndo size={13} color="#65676B" /> Thu hồi
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--z-border)', margin: '4px 0' }} />
                  <div className="mdc-mm-item danger" onClick={() => { onDelete?.(_id); setShowMoreMenu(false); }}>
                    <FaTrash size={13} /> Xóa {isMe && 'ở phía tôi'}
                  </div>
                </div>
              )}

              {showEmojiPicker && (
                <div className="mdc-msg-emoji-tray" style={{ right: isMe ? '0' : 'auto', left: isMe ? 'auto' : '0' }}>
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

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }} ref={menuRef}>

            <div style={{ position: 'relative' }}>
              {isRecalled ? (
                <div className="mdc-text-bubble msg-recalled">Tin nhắn đã thu hồi</div>
              ) : (
                // TODO: uncomment khi BE + Mobile sẵn sàng
                // isEditing ? (
                //   <div className="mdc-text-bubble">
                //     <InlineEdit
                //       initialText={content}
                //       onSave={(newText) => { onEdit?.(_id, newText); setIsEditing(false); }}
                //       onCancel={() => setIsEditing(false)}
                //     />
                //   </div>
                // ) :
                <>
                  {(replyTo || content) && (
                    <div className="mdc-text-bubble">
                      {replyTo && (
                        <div
                          style={{ borderLeft: `3px solid ${isMe ? '#FFFFFF' : '#0084FF'}`, paddingLeft: '8px', marginBottom: '8px', background: isMe ? 'rgba(0,0,0,0.1)' : '#F0F2F5', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={handleJumpToReply}
                        >
                          {/* Tên người bị reply: luôn hiện trong cả 1-1 lẫn nhóm */}
                          {(() => {
                            const rName = getReplyName();
                            return rName ? (
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: isMe ? '#fff' : '#050505', marginBottom: 2 }}>
                                {rName}
                              </div>
                            ) : null;
                          })()}
                          <div style={{ fontSize: '13px', color: isMe ? '#fff' : '#050505', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '230px' }}>
                            {replyTo.content || '[Hình ảnh/File]'}
                          </div>
                        </div>
                      )}
                      {content && <span>{renderContentWithMentions(content)}</span>}
                    </div>
                  )}

                  {/* MEDIA */}
                  {(images.length > 0 || docs.length > 0 || audios.length > 0) && (
                    <div style={{ marginTop: (content || replyTo) ? '6px' : '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {images.length > 0 && (
                        <div style={{
                          display: 'grid', gap: '4px', width: '100%', maxWidth: '320px', borderRadius: '12px', overflow: 'hidden',
                          gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr',
                          gridTemplateRows: images.length > 2 ? '1fr 1fr' : '1fr'
                        }}>
                          {images.slice(0, 4).map((att, i) => {
                            const isLast = i === 3;
                            const remain = images.length - 4;
                            const isVideo = (att.mimeType?.startsWith('video/')) || getCategory(att.name || att.fileName) === 'video';
                            return (
                              <div key={i} className="mdc-img-bubble"
                                style={{
                                  width: '100%',
                                  aspectRatio: (images.length === 3 && i === 0) ? '2 / 1' : (images.length === 1 ? 'auto' : '1 / 1'),
                                  gridColumn: (images.length === 3 && i === 0) ? 'span 2' : 'auto',
                                  backgroundColor: '#f0f2f5', margin: 0, borderRadius: 0
                                }}>
                                {isVideo ? (
                                  <video src={toAbsoluteUrl(att.url)} controls style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                  <img src={toAbsoluteUrl(att.url)} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                )}
                                <a className="mdc-img-dl-btn" href={toAbsoluteUrl(att.url)} target="_blank" rel="noreferrer" title="Tải về" onClick={e => e.stopPropagation()}><FaDownload size={11} /></a>
                                {isLast && remain > 0 && (
                                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                                    +{remain}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {docs.length > 0 && docs.map((att, i) => {
                        const fileName = att.name || att.fileName || `Tệp ${i + 1}`;
                        const downloadUrl = toAbsoluteUrl(att.url);
                        return (
                          <div key={`doc-${i}`} className="mdc-file-bubble">
                            <div className="mdc-fb-icon" style={{ background: getFileColor(fileName) }}>
                              {getExt(fileName).toUpperCase().slice(0, 4)}
                            </div>
                            <div className="mdc-fb-info">
                              <span className="mdc-fb-name">{fileName}</span>
                              <div className="mdc-fb-meta">{formatBytes(att.size)}</div>
                            </div>
                            <a href={downloadUrl} onClick={e => e.stopPropagation()} download={fileName} className="mdc-fb-btn"><FaDownload size={13} /></a>
                          </div>
                        );
                      })}

                      {audios.length > 0 && audios.map((att, i) => (
                        <AudioBubble key={`audio-${i}`} url={toAbsoluteUrl(att.url)} duration={att.duration} />
                      ))}
                    </div>
                  )}

                  <div className="mdc-msg-time" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {isEdited && <span>(đã sửa)</span>}
                    <span>{timeString}</span>
                    {isMe && (status === 'sending' ? <FaClock size={10} /> : <FaCheckDouble size={10} color={status === 'read' ? '#4ADE80' : 'rgba(255,255,255,0.7)'} />)}
                  </div>
                </>
              )}

              {!isRecalled && reactions?.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: '-14px',
                  right: isMe ? '4px' : 'auto', left: isMe ? 'auto' : '4px',
                  display: 'flex', alignItems: 'center',
                  background: 'var(--z-bg-sidebar)', padding: '2px 6px', borderRadius: '12px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.12)', gap: '2px', zIndex: 10,
                  border: '1px solid var(--z-border)', color: 'var(--z-text-primary)', fontSize: '11px'
                }}>
                  {reactions.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>{r.emoji}</div>
                  ))}
                  {reactions.length > 0 && (
                    <span style={{ color: 'var(--z-text-secondary)', fontSize: '10px', marginLeft: '2px', fontWeight: '700' }}>
                      {reactions.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!isRecalled && (
              // TODO: đổi lại thành !isRecalled && !isEditing khi BE + Mobile sẵn sàng
              <div className="mdc-msg-menu-wrap">
                <div className="mdc-msg-menu-pill">
                  <button className="mdc-pill-btn" title="Thả cảm xúc" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowMoreMenu(false); }}><FaSmile size={12} /></button>
                  <button className="mdc-pill-btn" title="Trả lời" onClick={() => onReply?.(message)}><FaReply size={12} /></button>
                  <button className="mdc-pill-btn" title="Thêm" onClick={() => { setShowMoreMenu(!showMoreMenu); setShowEmojiPicker(false); }}><FaEllipsisH size={12} /></button>
                </div>

                {showMoreMenu && (
                  <div className="mdc-msg-menu" style={{ right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0 }}>
                    {content && (
                      <div className="mdc-mm-item" onClick={() => { navigator.clipboard.writeText(content); setShowMoreMenu(false); }}>
                        <FaCopy size={13} color="#65676B" /> Sao chép
                      </div>
                    )}
                    <div className="mdc-mm-item" onClick={() => { onForward?.(message); setShowMoreMenu(false); }}>
                      <FaShare size={13} color="#65676B" /> Chuyển tiếp
                    </div>

                    {/* TODO: uncomment khi BE + Mobile sẵn sàng
                    {isMe && content && onEdit && (
                      <div className="mdc-mm-item" onClick={() => { setIsEditing(true); setShowMoreMenu(false); }}>
                        <FaEdit size={13} color="#65676B" /> Chỉnh sửa
                      </div>
                    )}
                    {isEdited && editHistory.length > 0 && (
                      <div className="mdc-mm-item" onClick={() => { setShowEditHistory(true); setShowMoreMenu(false); }}>
                        <FaHistory size={13} color="#65676B" /> Lịch sử chỉnh sửa
                      </div>
                    )} */}

                    {isPinned ? (
                      <div className="mdc-mm-item" onClick={() => { onUnpin?.(_id); setShowMoreMenu(false); }}>
                        <FaThumbtack size={13} color="#9CA3AF" /> Bỏ ghim
                      </div>
                    ) : (
                      <div className="mdc-mm-item" onClick={handlePin}
                        style={{ opacity: pinLoading ? 0.6 : 1, cursor: pinLoading ? 'wait' : 'pointer' }}>
                        <FaThumbtack size={13} color="#F59E0B" />
                        {pinLoading ? 'Đang ghim...' : 'Ghim tin nhắn'}
                      </div>
                    )}

                    {isMe && (
                      <div className="mdc-mm-item" onClick={() => { onRecall?.(_id); setShowMoreMenu(false); }}>
                        <FaUndo size={13} color="#65676B" /> Thu hồi
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--z-border)', margin: '4px 0' }} />
                    <div className="mdc-mm-item danger" onClick={() => { onDelete?.(_id); setShowMoreMenu(false); }}>
                      <FaTrash size={13} /> Xóa {isMe && 'ở phía tôi'}
                    </div>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="mdc-msg-emoji-tray" style={{ right: isMe ? '0' : 'auto', left: isMe ? 'auto' : '0' }}>
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

      {showDetailsModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDetailsModal(false)}>
          <div style={{ background: 'var(--z-bg-main)', width: 340, borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: 'var(--z-text-primary)' }}>Chi tiết tin nhắn</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--z-text-secondary)' }}>Người gửi:</span>
                <span style={{ fontWeight: 500, color: 'var(--z-text-primary)' }}>{name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--z-text-secondary)' }}>Thời gian:</span>
                <span style={{ fontWeight: 500, color: 'var(--z-text-primary)' }}>{timeString} - {new Date(createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              
              {mediaList.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: 'var(--z-text-secondary)', marginBottom: 8, fontSize: 13 }}>Tệp đính kèm ({mediaList.length}):</div>
                  <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mediaList.map((m, i) => (
                      <div key={i} style={{ background: 'var(--z-bg-sidebar)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--z-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--z-primary)', fontWeight: 'bold', fontSize: 12 }}>
                          {getExt(m.name || m.fileName || '').toUpperCase().slice(0,3) || 'FILE'}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, color: 'var(--z-text-primary)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || m.fileName || `Tệp ${i+1}`}</div>
                          <div style={{ color: 'var(--z-text-secondary)', fontSize: 12, marginTop: 2 }}>{formatBytes(m.size || 0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowDetailsModal(false)} style={{ width: '100%', padding: '10px 0', marginTop: 20, background: 'var(--z-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--z-primary-dark)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--z-primary)'}>Đóng</button>
          </div>
        </div>,
        document.body
      )}

      {viewingMedia && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setViewingMedia(null); setShowMediaInfo(false); }}>
          {showMediaInfo && (
            <div style={{ position: 'absolute', top: 80, left: 24, color: '#fff', fontSize: 14, background: 'rgba(20,20,20,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px 24px', borderRadius: 16, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.3s ease', transform: showMediaInfo ? 'translateX(0)' : 'translateX(-20px)', opacity: showMediaInfo ? 1 : 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: '600', fontSize: 18, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', wordBreak: 'break-word' }}>{viewingMedia.name}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Dung lượng</span>
                  <span style={{ fontWeight: '500' }}>{viewingMedia.size}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Người gửi</span>
                  <span style={{ fontWeight: '500' }}>{viewingMedia.sender}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Thời gian</span>
                  <span style={{ fontWeight: '500' }}>{viewingMedia.time}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Ngày gửi</span>
                  <span style={{ fontWeight: '500' }}>{viewingMedia.date}</span>
                </div>
              </div>
            </div>
          )}
          
          <a style={{ position: 'absolute', top: 20, right: 120, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); setShowMediaInfo(!showMediaInfo); }} title="Thông tin chi tiết">
            <FaInfoCircle size={24} />
          </a>
          <a style={{ position: 'absolute', top: 20, right: 70, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); forceDownload(viewingMedia.url, viewingMedia.name || 'download'); }} title="Tải xuống">
            <FaDownload size={24} />
          </a>
          <button style={{ position: 'absolute', top: 12, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 36, cursor: 'pointer' }} onClick={() => { setViewingMedia(null); setShowMediaInfo(false); }}>&times;</button>
          
          {viewingMedia.isDoc ? (
            <iframe src={['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(getExt(viewingMedia.name)) && !viewingMedia.url.includes('localhost') ? `https://docs.google.com/viewer?url=${encodeURIComponent(viewingMedia.url)}&embedded=true` : viewingMedia.url} style={{ width: '80%', height: '80%', background: '#fff', border: 'none', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          ) : viewingMedia.isVideo ? (
             <video src={viewingMedia.url} controls autoPlay style={{ maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()} />
          ) : (
             <img src={viewingMedia.url} alt="Full view" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          )}
        </div>,
        document.body
      )}
    </div>
  </>
  );
};