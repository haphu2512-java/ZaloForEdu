import React, { useState } from 'react';
import { FaDownload, FaCheckDouble, FaCheck, FaClock, FaSmile } from 'react-icons/fa';

export const MessageBubble = ({ message, isMe, onReaction }) => {
    const { _id, content, type, status, sender, isEdited, isDeleted, replyTo, createdAt, reactions } = message;
    const [showPicker, setShowPicker] = useState(false);
    const emojis = ['👍', '❤️', '😂', '😮', '😢'];

    const actualSender = sender || message.senderId;

    // Kết hợp mọi định dạng mảng chứa media (API có lúc trả về attachments, có lúc mediaIds)
    const mediaList = message.attachments || message.mediaIds || message.media || [];

    const timeString = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const avatar = actualSender?.avatarUrl || actualSender?.avatar || 'https://i.pravatar.cc/150';
    const name = actualSender?.fullName || actualSender?.username || 'Người dùng';

    if (type === 'system') {
        return <div className="msg-system"><span>{content}</span></div>;
    }

    const renderStatus = () => {
        if (!isMe) return null;
        if (status === 'sending') return <FaClock size={10} />;
        if (status === 'sent') return <FaCheck size={10} />;
        if (status === 'delivered') return <FaCheckDouble size={10} color="var(--z-text-muted)" />;
        return <FaCheckDouble size={10} />;
    };

    return (
        <div className={`msg-wrap ${isMe ? 'me' : 'them'}`} onMouseLeave={() => setShowPicker(false)}>
            {!isMe && (
                <img src={avatar} className="msg-avatar" alt="avatar" style={actualSender?.isActive === false ? { filter: 'grayscale(1)', opacity: 0.5 } : {}} />
            )}

            <div className="msg-body">
                {!isMe && actualSender && (
                    <div className="msg-sender-name">
                        {name} {actualSender.isActive === false && <span style={{ color: '#EF4444', fontSize: '10px' }}>(Vô hiệu hóa)</span>}
                    </div>
                )}

                <div className={`msg-bubble ${isDeleted ? 'msg-deleted' : ''}`}>
                    {isDeleted ? (
                        <span>Tin nhắn đã bị thu hồi</span>
                    ) : (
                        <>
                            {replyTo && (
                                <div className="msg-reply">
                                    <div className="msg-reply-name">{replyTo.sender?.fullName || replyTo.sender?.username || 'Unknown'}</div>
                                    <div className="msg-reply-content">{replyTo.content || '[File đính kèm]'}</div>
                                </div>
                            )}

                            {content && <p style={{ margin: 0 }}>{content}</p>}

                            {/* RENDER ẢNH/FILE TỪ MEDIALIST SAU KHI UPLOAD HOẶC LẤY TỪ DB */}
                            {mediaList.length > 0 && (
                                <div style={{ marginTop: content ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {mediaList.map((att, i) => {
                                        // Nếu id là string (chưa được populate) thì bỏ qua
                                        if (typeof att === 'string') return null;

                                        const isImg = att.type?.startsWith('image/') || att.mimeType?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                                        const url = att.url;
                                        const fileName = att.name || att.fileName || `Tệp đính kèm ${i + 1}`;

                                        return isImg ? (
                                            <img key={i} src={url} alt="attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'inherit', textDecoration: 'none' }}>
                                                <FaDownload size={14} />
                                                <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="msg-meta">
                                {isEdited && <span style={{ fontStyle: 'italic' }}>(đã sửa)</span>}
                                <span>{timeString}</span>
                                {renderStatus()}
                            </div>
                        </>
                    )}

                    {!isDeleted && reactions?.length > 0 && (
                        <div className="msg-reactions">
                            {reactions.slice(0, 3).map((r, i) => (
                                <div key={i} className="msg-react-badge">
                                    {r.emoji} {reactions.length > 1 && <span style={{ color: 'var(--z-text-muted)' }}>{reactions.length}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!isDeleted && (
                    <div className="msg-smile-btn" onClick={() => setShowPicker(!showPicker)}>
                        <FaSmile size={14} />
                    </div>
                )}

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