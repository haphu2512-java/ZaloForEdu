import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaSpinner, FaPaperPlane, FaThumbsUp, FaSmile, FaMicrophone, FaPoll } from 'react-icons/fa';
import { VoiceRecorder } from '../../components/shared/VoiceRecorder';
import { StickerSuggest } from './StickerSuggest';

export const MessageInput = ({
  theme,
  placeholder,
  onSend,
  onSendSticker,
  onSendLike,
  onUploadFiles,
  onShowPoll,
  members = [],
  replyTo = null,
  onCancelReply,
  isGroup = false
}) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null); // 'all' or partial name
  const [mentionIndex, setMentionIndex] = useState(0);
  // Sticker suggest state
  const [stickerQuery, setStickerQuery] = useState('');   // query đang search
  const [showSticker, setShowSticker] = useState(false);  // đang hiện panel
  const stickerTimerRef = useRef(null);
  const inputRef = useRef(null);

  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const emojiRef = useRef(null);

  // Filter members based on mentionQuery
  const filteredMembers = mentionQuery === null ? [] :
    [{ _id: 'all', username: 'all', fullName: 'Tất cả mọi người' }, ...members]
      .filter(m =>
        m.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 8);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Detect @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1));
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

    // Sticker suggest: debounce 400ms, trigger khi gõ ≥ 2 ký tự
    clearTimeout(stickerTimerRef.current);
    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      stickerTimerRef.current = setTimeout(() => {
        setStickerQuery(trimmed);
        setShowSticker(true);
      }, 400);
    } else {
      setShowSticker(false);
      setStickerQuery('');
    }
  };

  const insertMention = (member) => {
    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);

    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = `@${member.username || 'all'} `;

    const newText = words.join(' ') + textAfterCursor;
    setText(newText);
    setMentionQuery(null);
    inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Xử lý chọn sticker từ panel Tenor
  const handleSelectSticker = useCallback((sticker) => {
    setShowSticker(false);
    setStickerQuery('');
    if (onSendSticker) {
      onSendSticker(sticker);
    }
  }, [onSendSticker]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSending) return;
    const textToSend = text.trim();
    setText('');
    if (inputRef.current) inputRef.current.value = '';
    setShowEmoji(false);
    setShowSticker(false);
    setStickerQuery('');
    setIsSending(true);
    setMentionQuery(null);
    try {
      await onSend(textToSend);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      setText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUploadFiles(files);
    }
    e.target.value = "";
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mdc-input-area" style={{ borderTop: '1px solid var(--z-border)', position: 'relative' }}>
      {/* Reply Preview */}
      {replyTo && (
        <div style={{ padding: '8px 16px', background: 'var(--z-bg-sidebar)', borderBottom: '1px solid var(--z-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ borderLeft: '3px solid var(--z-primary)', paddingLeft: 10, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--z-primary)', marginBottom: 2 }}>
              Trả lời {replyTo.senderId?.fullName || replyTo.senderId?.username || 'người dùng'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyTo.content || '[Hình ảnh/Tệp]'}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            style={{ background: 'var(--z-bg-hover)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--z-text-secondary)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Sticker Suggest (Tenor GIF) */}
      {showSticker && (
        <StickerSuggest
          query={stickerQuery}
          onSelect={handleSelectSticker}
          onClose={() => setShowSticker(false)}
        />
      )}

      {/* Mention Suggestions */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div style={{ position: 'absolute', bottom: '100%', left: 16, width: 280, background: 'var(--z-bg-sidebar)', border: '1px solid var(--z-border)', borderRadius: 8, boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--z-text-muted)', borderBottom: '1px solid var(--z-border)', background: 'var(--z-bg-main)' }}>Nhắc tên thành viên</div>
          {filteredMembers.map((m, idx) => (
            <div
              key={m._id}
              onClick={() => insertMention(m)}
              onMouseEnter={() => setMentionIndex(idx)}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: idx === mentionIndex ? 'var(--z-bg-hover)' : 'transparent' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: m._id === 'all' ? 'var(--z-primary)' : '#ccc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {m._id === 'all' ? '@' : (m.avatarUrl ? <img src={m.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (m.fullName?.[0] || m.username?.[0]))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-primary)' }}>{m.fullName || m.username}</div>
                {m.username && m._id !== 'all' && <div style={{ fontSize: 11, color: 'var(--z-text-muted)' }}>@{m.username}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={imageRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
      <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={handleFiles} />
      <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFiles} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z" />
      <input ref={folderRef} type="file" webkitdirectory="true" multiple style={{ display: "none" }} onChange={handleFiles} />

      <div className="mdc-toolbar" style={{ position: 'relative' }}>
        <button type="button" className="mdc-tool-btn" title="Sticker/Emoji" onClick={() => setShowEmoji(!showEmoji)}>
          <FaSmile size={18} />
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi ảnh" onClick={() => imageRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Đính kèm file" onClick={() => fileRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
        <button type="button" className="mdc-tool-btn" title="Gửi video" onClick={() => videoRef.current?.click()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
        </button>
        {isGroup && (
          <button type="button" className="mdc-tool-btn" title="Tạo bình chọn" onClick={onShowPoll}>
            <FaPoll size={18} />
          </button>
        )}

        <button type="button" className="mdc-tool-btn" title="Gửi ghi âm" onClick={() => setShowRecorder(true)}>
          <FaMicrophone size={18} />
        </button>

        {showEmoji && (
          <div ref={emojiRef} style={{ position: 'absolute', bottom: '100%', left: '10px', marginBottom: '10px', zIndex: 50, background: theme === 'dark' ? '#242526' : '#fff', border: '1px solid var(--border-color, #E5E7EB)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '12px' }}>
            {['😀', '😂', '😍', '🥰', '👍', '❤️', '🔥', '😭', '🙏', '🎉'].map(e => (
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

      {/* Voice Recorder hoặc Text Input */}
      {showRecorder ? (
        <div className="mdc-input-row" style={{ height: 60 }}>
          <VoiceRecorder
            onCancel={() => setShowRecorder(false)}
            onSend={(blob, duration) => {
              // Universal extension mapping dựa trên mimeType
              let extension = '.webm';
              if (blob.type.includes('mp4')) {
                extension = '.mp4';
              } else if (blob.type.includes('mpeg') || blob.type.includes('mp3')) {
                extension = '.mp3';
              } else if (blob.type.includes('ogg')) {
                extension = '.ogg';
              } else if (blob.type.includes('wav')) {
                extension = '.wav';
              } else if (blob.type.includes('m4a') || blob.type.includes('mp4a')) {
                extension = '.m4a';
              } else if (blob.type.includes('aac')) {
                extension = '.aac';
              } else if (blob.type.includes('webm')) {
                extension = '.webm';
              }

              const file = new File([blob], `voice_${Date.now()}${extension}`, { type: blob.type });
              // Pass duration as metadata
              file.duration = duration;
              onUploadFiles([file]);
              setShowRecorder(false);
              if (onCancelReply) onCancelReply();
            }}
          />
        </div>
      ) : (
        <div className="mdc-input-row">
          <div className="mdc-input-wrap">
            <input
              ref={inputRef}
              className="mdc-input"
              placeholder={placeholder}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {text.trim() ? (
            <button className="mdc-send-btn" onClick={handleSend} disabled={isSending}>
              {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane size={15} />}
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