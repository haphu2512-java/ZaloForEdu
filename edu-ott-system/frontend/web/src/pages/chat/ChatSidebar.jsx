import React, { useState } from "react";
import { FaSearch, FaUsers, FaCloud, FaUserSecret, FaArrowLeft, FaUserPlus, FaThumbtack } from "react-icons/fa";
import { useLanguage } from '../../contexts/LanguageContext';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23d8dadf'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23bcc0c4'/%3E%3Cpath d='M6 35 Q6 26 20 26 Q34 26 34 35' fill='%23bcc0c4'/%3E%3C/svg%3E";

const formatChatTimestamp = (dateString) => {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (isToday) return timeStr;
  if (isYesterday) return `Hôm qua ${timeStr}`;
  return `${timeStr} ngày ${dateStr}`;
};

export const ChatSidebar = ({
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  friendConvs, strangerConvs,
  activeConversation, setActiveConversation,
  navigate,
  getConversationName, getConversationAvatar, getOtherParticipant,
  setShowAddFriendModal, setShowCreateGroupModal,
  setShowStrangerPanel,
  userId, friendIds,
  // Conversation actions
  handlePinConversation, handleClassifyConversation, handleHideConversation,
  handleMuteConversation, handleDeleteConversationCtx, handleLeaveGroupCtx,
  // Hidden conversations
  showHidden, hiddenConvs, handlePinButtonClick, handleUnhideConversation,
  // PIN modal
  showPinModal, setShowPinModal, pinModalMode, setPinModalMode,
  pinInput, setPinInput, pinConfirm, setPinConfirm,
  pinCurrentInput, setPinCurrentInput,
  pinError, setPinError, pinStep, setPinStep, handlePinSubmit,
  hasPin, handleEnterChangeMode, handleEnterForgotMode, resetPinModal,
  // New props for context menu & report
  ctxMenu, setCtxMenu, reportTarget, setReportTarget,
}) => {
  const { t } = useLanguage();

  const CATS = [
    { key: 'all', label: 'Tất cả', emoji: null },
    { key: 'primary', label: 'Chính', emoji: '💬' },
    { key: 'work', label: 'Việc', emoji: '💼' },
    { key: 'family', label: 'G.đình', emoji: '🏠' },
    { key: 'other', label: 'Khác', emoji: '🗂️' },
  ];

  return (
    <aside className="room-sidebar">
      <div className="rs-header">
        <span style={{ fontWeight: 800, fontSize: 18 }}>Đoạn chat</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button title="Thêm bạn bè" onClick={() => setShowAddFriendModal(true)}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--z-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-secondary)", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--z-border)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--z-bg-hover)"}
          ><FaUserPlus size={15} /></button>
          <button title="Tạo nhóm" onClick={() => setShowCreateGroupModal(true)}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--z-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-secondary)", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--z-border)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--z-bg-hover)"}
          ><FaUsers size={15} /></button>
        </div>
      </div>

      <div className="rs-search-bar">
        <FaSearch color="var(--z-text-secondary)" size={14} />
        <input placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px 4px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--z-border)' }}>
        {CATS.map(cat => {
          const isActive = categoryFilter === cat.key;
          return (
            <button key={cat.key} onClick={() => setCategoryFilter(cat.key)}
              style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, background: isActive ? 'var(--z-primary)' : 'var(--z-bg-hover)', color: isActive ? '#fff' : 'var(--z-text-secondary)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
            >{cat.emoji ? `${cat.emoji} ${cat.label}` : cat.label}</button>
          );
        })}
      </div>

      {/* Hidden conversations toggle */}
      <div onClick={handlePinButtonClick}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: showHidden ? 'var(--z-primary)' : 'var(--z-text-muted)', fontWeight: showHidden ? 700 : 500, borderBottom: '1px solid var(--z-border)', background: showHidden ? 'rgba(0,104,255,0.05)' : 'transparent', transition: 'background 0.15s' }}
      >
        <span>👁‍🗨</span>
        <span>{showHidden ? 'Ẩn danh sách ẩn' : 'Hội thoại đã ẩn'}</span>
        {!showHidden && hiddenConvs.length > 0 && (
          <span style={{ marginLeft: 'auto', background: '#6366f1', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{hiddenConvs.length}</span>
        )}
      </div>

      <div className="rs-list">
        {/* Hidden conversations panel */}
        {showHidden && (
          <div style={{ borderBottom: '2px solid var(--z-border)', paddingBottom: 4, marginBottom: 4 }}>
            {hiddenConvs.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--z-text-muted)' }}>Không có hội thoại nào bị ẩn</div>
            ) : hiddenConvs.map(conv => {
              const name = getConversationName(conv);
              if (!name) return null;
              return (
                <div key={conv._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--z-bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setActiveConversation(conv); navigate('/chat/' + conv._id); }}
                >
                  <img src={getConversationAvatar(conv)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: 0.65 }} onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--z-text-muted)', marginTop: 2 }}>Đã ẩn</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleUnhideConversation(conv); }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'var(--z-bg-main)', color: 'var(--z-primary)', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                  >Hiện lại</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Stranger conversations item */}
        {strangerConvs.length > 0 && (
          <div className="chat-list-item" onClick={() => setShowStrangerPanel(true)} style={{ cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0068FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FaUserSecret size={20} color="#fff" />
            </div>
            <div className="cli-info">
              <div className="cli-top">
                <span className="cli-name" style={{ fontWeight: 700 }}>Tin nhắn từ người lạ</span>
              </div>
              <div className="cli-bottom">
                <span className="cli-msg">Gửi từ người chưa có trong danh bạ...</span>
                <div className="cli-unread" style={{ background: '#ef4444' }}>●</div>
              </div>
            </div>
          </div>
        )}

        {/* Pinned divider */}
        {friendConvs.some(c => c.preference?.isPinned) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px 3px', fontSize: 10, fontWeight: 600, color: 'var(--z-text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', opacity: 0.7 }}>
            <FaThumbtack size={8} /> Đã ghim
          </div>
        )}

        {/* Conversation list */}
        {friendConvs.map((conv, idx) => {
          const isActive = activeConversation?._id === conv._id;
          const convName = getConversationName(conv);
          if (!convName) return null;
          const unread = conv.unreadCount || 0;
          const isSelf = conv.type === 'direct' && conv.participants?.length === 1;
          const isPinned = conv.preference?.isPinned === true;
          const prevConv = friendConvs[idx - 1];
          const showUnpinnedHeader = isPinned === false && prevConv?.preference?.isPinned === true;

          return (
            <React.Fragment key={conv._id}>
              {showUnpinnedHeader && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px 3px', fontSize: 10, fontWeight: 600, color: 'var(--z-text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', opacity: 0.7 }}>
                  Cuộc trò chuyện
                </div>
              )}
              <div className={`chat-list-item ${isActive ? 'active' : ''} ${isPinned ? 'pinned-conv' : ''}`}
                onClick={() => { setActiveConversation(conv); navigate('/chat/' + conv._id); }}
                style={{ position: 'relative' }}
              >
                {isSelf ? (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0068FF, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FaCloud size={20} color="#fff" />
                  </div>
                ) : (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img className="cli-avatar" src={getConversationAvatar(conv)} alt="avt" onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                    {isPinned && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#F59E0B', border: '2px solid var(--z-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaThumbtack size={7} color="#fff" />
                      </div>
                    )}
                  </div>
                )}
                <div className="cli-info">
                  <div className="cli-top">
                    <span className="cli-name" style={{ fontWeight: unread > 0 ? 800 : 600, color: unread > 0 ? 'var(--z-text-primary)' : '' }}>{convName}</span>
                    <span className="cli-time" style={{ color: unread > 0 ? 'var(--z-primary)' : 'var(--z-text-muted)' }}>
                      {conv.latestMessage ? formatChatTimestamp(conv.latestMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div className="cli-bottom">
                    <span className="cli-msg" style={{ fontWeight: unread > 0 ? 700 : 400, color: unread > 0 ? 'var(--z-text-primary)' : 'var(--z-text-secondary)' }}>
                      {conv.latestMessage?.isRecalled ? t('recalledMessage') || 'Tin nhắn đã thu hồi' : (conv.latestMessage?.content || (conv.latestMessage?.mediaIds?.length > 0 || conv.latestMessage?.attachments?.length > 0 ? '[Hình ảnh/File]' : t('noMessages') || 'Chưa có tin nhắn'))}
                    </span>
                    {unread > 0 && <div className="cli-unread">{unread > 99 ? '99+' : unread}</div>}
                  </div>
                </div>

                <button className={`conv-ctx-btn${isPinned ? ' pinned' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelf) { handlePinConversation(conv); }
                    else { setCtxMenu({ conv, x: e.clientX, y: e.clientY }); }
                  }}
                  title={isSelf ? (isPinned ? 'Bỏ ghim' : 'Ghim lên đầu') : 'Tuỳ chọn'}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'var(--z-bg-main)', border: '1px solid var(--z-border)', cursor: 'pointer', padding: '3px 7px', borderRadius: 8, color: isPinned ? '#F59E0B' : 'var(--z-text-primary)', transition: 'opacity 0.15s, color 0.15s', zIndex: 3, fontSize: 14, fontWeight: 900, letterSpacing: 1, lineHeight: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
                >
                  {isSelf ? <FaThumbtack size={11} style={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(45deg)', transition: 'transform 0.2s' }} /> : '···'}
                </button>
              </div>
            </React.Fragment>
          );
        })}
        {friendConvs.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--z-text-muted)', fontSize: 13 }}>Không tìm thấy cuộc trò chuyện nào</div>}
      </div>

      {/* PIN Modal */}
      {showPinModal && (() => {
        // ── Labels per mode + step ───────────────────────────────────────
        const isForgotStep1 = pinModalMode === 'forgot' && pinStep === 1;

        const titles = {
          unlock: 'Nhập mã PIN',
          setup: pinStep === 1 ? 'Tạo mã PIN bảo mật' : 'Xác nhận mã PIN',
          change: pinStep === 1 ? 'Xác minh PIN hiện tại' : pinStep === 2 ? 'Nhập PIN mới' : 'Xác nhận PIN mới',
          forgot: pinStep === 1 ? 'Xác minh bằng mật khẩu' : pinStep === 2 ? 'Đặt PIN mới' : 'Xác nhận PIN mới',
        };
        const hints = {
          unlock: 'Nhập 4 chữ số để xem hội thoại đã ẩn.',
          setup: pinStep === 1 ? 'Nhập 4 chữ số để bảo vệ hội thoại ẩn.' : 'Nhập lại PIN để xác nhận.',
          change: pinStep === 1 ? 'Nhập PIN hiện tại — sẽ xác minh ngay với máy chủ.' : pinStep === 2 ? 'Nhập mã PIN mới (4 chữ số).' : 'Nhập lại PIN mới để xác nhận.',
          forgot: pinStep === 1 ? 'Nhập mật khẩu đăng nhập tài khoản để đặt lại PIN.' : pinStep === 2 ? 'Nhập mã PIN mới (4 chữ số).' : 'Nhập lại PIN mới để xác nhận.',
        };
        const submitLabel = {
          unlock: 'Xác nhận',
          setup: pinStep === 1 ? 'Tiếp theo' : 'Tạo PIN',
          change: pinStep < 3 ? 'Tiếp theo' : 'Đổi PIN',
          forgot: pinStep === 1 ? 'Xác minh' : pinStep === 2 ? 'Tiếp theo' : 'Lưu PIN',
        };

        // Auto-advance when 4 digits entered (not for password text input)
        const onDigitChange = (val) => {
          setPinInput(val);
          setPinError('');
          if (val.length === 4) {
            setTimeout(() => document.getElementById('pin-submit-btn')?.click(), 120);
          }
        };

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPinModal(false); resetPinModal?.(); } }}
          >
            <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 18, padding: '28px 32px', width: 320, boxShadow: '0 8px 40px rgba(0,0,0,0.22)', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{pinModalMode === 'forgot' && pinStep === 1 ? '🔑' : '🔒'}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 6 }}>
                {titles[pinModalMode]}
              </div>
              <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
                {hints[pinModalMode]}
              </div>

              {/* ── Password text input (forgot step 1 only) ─────────────── */}
              {isForgotStep1 ? (
                <div style={{ marginBottom: 20 }}>
                  <input
                    autoFocus
                    type="password"
                    placeholder="Mật khẩu tài khoản"
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('pin-submit-btn')?.click(); }}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${pinError ? '#ef4444' : 'var(--z-border)'}`, background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <>
                  {/* 4-dot PIN display */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ width: 48, height: 56, borderRadius: 12, border: `2px solid ${pinError ? '#ef4444' : i < pinInput.length ? 'var(--z-primary)' : 'var(--z-border)'}`, background: 'var(--z-bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: 'var(--z-text-primary)', transition: 'border-color 0.15s' }}>
                        {i < pinInput.length ? '●' : ''}
                      </div>
                    ))}
                  </div>
                  {/* Hidden input for keyboard */}
                  <input autoFocus type="tel" maxLength={4} value={pinInput}
                    onChange={e => onDigitChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('pin-submit-btn')?.click(); }}
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                  />
                </>
              )}

              {pinError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, fontWeight: 600 }}>{pinError}</div>}

              {/* Number pad — only for PIN digits, not password */}
              {!isForgotStep1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, idx) => (
                    <button key={idx}
                      onClick={() => {
                        if (k === '') return;
                        if (k === '⌫') { setPinInput(p => p.slice(0, -1)); setPinError(''); return; }
                        setPinInput(p => {
                          const next = p.length < 4 ? p + k : p;
                          if (next.length === 4) setTimeout(() => document.getElementById('pin-submit-btn')?.click(), 120);
                          return next;
                        });
                        setPinError('');
                      }}
                      style={{ padding: '14px', borderRadius: 12, border: '1px solid var(--z-border)', background: k === '' ? 'transparent' : 'var(--z-bg-main)', color: 'var(--z-text-primary)', fontSize: 18, fontWeight: 600, cursor: k === '' ? 'default' : 'pointer', visibility: k === '' ? 'hidden' : 'visible' }}
                    >{k}</button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: isForgotStep1 ? 0 : undefined }}>
                <button onClick={() => { setShowPinModal(false); resetPinModal?.(); }}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >Huỷ</button>
                <button id="pin-submit-btn" onClick={handlePinSubmit}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--z-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                >{submitLabel[pinModalMode]}</button>
              </div>

              {/* Footer links — only show in unlock mode */}
              {pinModalMode === 'unlock' && hasPin && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20 }}>
                  <span
                    onClick={handleEnterChangeMode}
                    style={{ fontSize: 12, color: 'var(--z-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                  >Đổi mã PIN</span>
                  <span
                    onClick={handleEnterForgotMode}
                    style={{ fontSize: 12, color: 'var(--z-text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                  >Quên PIN?</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </aside>
  );
};