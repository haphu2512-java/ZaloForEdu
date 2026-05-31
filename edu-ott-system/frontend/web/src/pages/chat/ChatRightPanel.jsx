import { useState, useEffect, useRef } from 'react';
import { FaBell, FaBellSlash, FaThumbtack, FaUserPlus, FaUserSecret, FaArrowLeft, FaTrashAlt, FaSignOutAlt, FaLink, FaEllipsisH, FaChevronDown, FaChevronUp, FaCalendarAlt, FaUserTimes, FaKey, FaSync, FaPen, FaCheck, FaTimes, FaFlag, FaTag, FaPoll, FaCrown, FaStar, FaEdit, FaLevelUpAlt, FaLevelDownAlt, FaBan, FaCamera } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { conversationService } from '../../services/conversationService';
import { pollService } from '../../services/pollService';
import { uploadFile } from '../../services/mediaService';
import { userService } from '../../services/userService';
import { useLanguage } from '../../contexts/LanguageContext';
import { getFileColor, getExt, formatBytes, toAbsoluteUrl, openDocument } from './chatUtils';
import PinnedMessagesPanel from './Modals/PinnedMessagesPanel';
import ReportUserModal from './Modals/ReportUserModal';
import { useFriendStore } from '../../store/friendStore';
import { useConfirm } from '../../contexts/ConfirmContext';
import ClassifyConversationModal from './Modals/ClassifyConversationModal';
import ConfirmTransferModal from './Modals/ConfirmTransferModal';
import './MemberMenu.css';
import { DEFAULT_AVATAR } from '../../utils/constants';



// Tooltip component
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', right: 0,
          background: 'rgba(30,30,30,0.92)', color: '#fff', fontSize: 12, borderRadius: 8,
          padding: '8px 12px', whiteSpace: 'normal', width: 240, zIndex: 999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)', lineHeight: 1.6, pointerEvents: 'none',
          wordBreak: 'break-word',
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', right: 6, borderWidth: 5, borderStyle: 'solid', borderColor: 'rgba(30,30,30,0.92) transparent transparent transparent' }} />
        </span>
      )}
    </span>
  );
};

// Accordion component dùng React state thay vì DOM manipulation
const Accordion = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="crp-accordion">
      <div
        className="crp-acc-header"
        onClick={() => setIsOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <span>{title}</span>
        {isOpen ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
      </div>
      {isOpen && <div className="crp-acc-body">{children}</div>}
    </div>
  );
};

export const ChatRightPanel = ({
  activeConversation,
  setActiveConversation,
  getConversationAvatar,
  getConversationName,
  fetchConversations,
  imgFiles,
  docFiles,
  linkItems,
  handleDeleteConversation,
  handleLeaveGroup,
  handleDisbandGroup,
  setShowCreateGroupModal,
  handleUpdateGroupSettings,
  handleMute,
  handleGroupAction,
  reminders = [],
  handleCreateReminder,
  handleUpdateReminder,
  handleDeleteReminder,
  joinRequests = [],
  handleProcessJoinRequest,
  pendingEditReminder,
  onPendingEditConsumed,
  onShowReminderList = () => { },
  onShowAddMember,
  onShowPoll,
  pinnedMessages = [],
  onUnpin,
  onJump,
  polls = [],
  loadingPolls = false,
}) => {
  const { t } = useLanguage();
  const confirm = useConfirm();

  // Local states
  const [rightPanelMode, setRightPanelMode] = useState('default');
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isGroupNameEditing, setIsGroupNameEditing] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [showMemberActionId, setShowMemberActionId] = useState(null);
  const [muteOption, setMuteOption] = useState(60);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remTime, setRemTime] = useState('');
  const [editingReminder, setEditingReminder] = useState(null);
  const [editRemTitle, setEditRemTitle] = useState('');
  const [editRemTime, setEditRemTime] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [blockedMembers, setBlockedMembers] = useState([]);
  // ── Tính năng mới ──
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [convCategory, setConvCategory] = useState('primary');
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const groupAvatarInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingNicknameId, setEditingNicknameId] = useState(null);
  const [nicknameDraft, setNicknameDraft] = useState('');

  // Sync category từ preference khi đổi conversation
  useEffect(() => {
    setConvCategory(activeConversation?.preference?.category || 'primary');
  }, [activeConversation?._id, activeConversation?.preference?.category]);

  useEffect(() => {
    if (rightPanelMode !== 'blocked' || !activeConversation) return;
    if (activeConversation.type !== 'group' && activeConversation.roomModel !== 'Group') return;
    conversationService.listBlockedMembers(activeConversation._id)
      .then(res => setBlockedMembers(res.data || []))
      .catch(() => setBlockedMembers([]));
  }, [rightPanelMode, activeConversation?._id]);

  useEffect(() => {
    if (!pendingEditReminder) return;
    setEditingReminder(pendingEditReminder);
    setEditRemTitle(pendingEditReminder.title);
    setEditRemTime(new Date(pendingEditReminder.remindAt).toISOString().slice(0, 16));
    onPendingEditConsumed?.();
  }, [pendingEditReminder]);

  useEffect(() => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const myId = currentUser._id || currentUser.id;
    // Only check ownerId, not createdBy (owner can be transferred)
    const isOwner = activeConversation?.ownerId?._id === myId || activeConversation?.ownerId === myId;
    const isAdmin = activeConversation?.adminIds?.some(aid => (aid._id || aid) === myId) || isOwner;
    if (!isOwner && !isAdmin) return;
    conversationService.getInviteLink(activeConversation._id)
      .then(res => {
        const data = res.data;
        setInviteCode(data.inviteCode || '');
        const origin = window.location.origin;
        setInviteLink(`${origin}/join/${data.inviteCode}`);
      })
      .catch(() => { });
  }, [activeConversation?._id]);


  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const myId = currentUser._id || currentUser.id;
  const { blockFriend, unblockUser, blockedUsers } = useFriendStore();

  // Only check ownerId, not createdBy (owner can be transferred)
  const isOwner = activeConversation?.ownerId?._id === myId || activeConversation?.ownerId === myId;
  const isAdmin = activeConversation?.adminIds?.some(aid => (aid._id || aid) === myId) || isOwner;
  const isPrivileged = isOwner || isAdmin;
  const isGroup = activeConversation?.type === 'group' || activeConversation?.roomModel === 'Group';

  const mutedUntil = activeConversation?.preference?.mutedUntil;
  const isMuted = mutedUntil && new Date(mutedUntil) > new Date();

  const openMuteModal = () => {
    if (isMuted) {
      // Đang mute → bật lại thông báo ngay, không cần modal
      handleMute(0);
      return;
    }
    setMuteOption(60);
    setShowMuteModal(true);
  };
  const canEditGroupInfo = isPrivileged || activeConversation?.settings?.canMembersUpdateInfo !== false;

  const getMemberRole = (member) => {
    const mid = member._id || member.id;
    // Only check ownerId, not createdBy (owner can be transferred)
    if (activeConversation?.ownerId?._id === mid || activeConversation?.ownerId === mid) return 'owner';
    if (activeConversation?.adminIds?.some(aid => (aid._id || aid) === mid)) return 'admin';
    return 'member';
  };

  const handleConfirmMute = () => {
    setShowMuteModal(false);
    handleMute(muteOption);
  };
  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !isGroup || !canEditGroupInfo) return;
    try {
      setIsUploadingAvatar(true);
      const uploadRes = await userService.uploadAvatar(file);
      const newAvatarUrl = toAbsoluteUrl(uploadRes.url);
      await conversationService.updateGroupAvatar(activeConversation._id, newAvatarUrl);
      setActiveConversation(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      fetchConversations?.();
      toast.success('Cập nhật ảnh nhóm thành công');
    } catch (err) {
      console.error('Upload group avatar error:', err);
      toast.error('Tải ảnh lên thất bại');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveNickname = async (memberId) => {
    const keyStr = String(memberId);
    const current = activeConversation.nicknames?.[keyStr] || '';
    const draft = nicknameDraft.trim();
    if (draft === current) { setEditingNicknameId(null); return; }
    try {
      await conversationService.updateNickname(activeConversation._id, memberId, draft);
      setActiveConversation(prev => {
        const next = { ...prev, nicknames: { ...prev.nicknames } };
        if (draft === '') {
          delete next.nicknames[keyStr];
        } else {
          next.nicknames[keyStr] = draft;
        }
        return next;
      });
      fetchConversations?.();
      toast.success(draft === '' ? 'Đã xóa biệt danh' : 'Đã cập nhật biệt danh');
    } catch {
      toast.error('Cập nhật biệt danh thất bại');
    } finally {
      setEditingNicknameId(null);
    }
  };

  return (
    <>
      <aside className="chat-right-panel" style={{ background: 'var(--z-bg-sidebar)', borderLeft: '1px solid var(--z-border)', display: 'flex', flexDirection: 'column' }}>
        {rightPanelMode === 'default' ? (
          <>
            {/* HEADER */}
            <div className="crp-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', borderBottom: '1px solid var(--z-border)' }}>
              <div
                style={{ position: 'relative', width: 64, height: 64, marginBottom: 12, flexShrink: 0 }}
                onClick={() => isGroup && canEditGroupInfo && !isUploadingAvatar && groupAvatarInputRef.current?.click()}
              >
                <img
                  className="crp-avatar"
                  src={getConversationAvatar(activeConversation)}
                  alt="avt"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', opacity: isUploadingAvatar ? 0.5 : 1 }}
                />
                {isGroup && canEditGroupInfo && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: isUploadingAvatar ? 1 : 0,
                    transition: '0.2s', cursor: 'pointer',
                    color: '#fff',
                  }}
                    className="crp-avatar-overlay"
                  >
                    {isUploadingAvatar
                      ? <span style={{ fontSize: 10 }}>...</span>
                      : <FaCamera size={18} />}
                  </div>
                )}
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleGroupAvatarChange}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                {isGroupNameEditing ? (
                  <input
                    className="crp-name-edit"
                    value={editGroupName}
                    onChange={e => setEditGroupName(e.target.value)}
                    onBlur={() => {
                      setIsGroupNameEditing(false);
                      if (editGroupName.trim() && editGroupName !== activeConversation.name) {
                        conversationService.updateGroupName(activeConversation._id, editGroupName).then(() => {
                          setActiveConversation({ ...activeConversation, name: editGroupName });
                          fetchConversations();
                          toast.success('Đổi tên nhóm thành công');
                        });
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    autoFocus
                  />
                ) : (
                  <div className="crp-name" style={{ fontSize: 18, fontWeight: 600, color: 'var(--z-text-primary)', textAlign: 'center' }}>
                    {getConversationName(activeConversation)}
                  </div>
                )}
                {isGroup && !isGroupNameEditing && canEditGroupInfo && (
                  <div style={{ cursor: 'pointer', color: 'var(--z-text-secondary)', padding: '2px' }} onClick={() => { setEditGroupName(activeConversation.name || ''); setIsGroupNameEditing(true); }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="crp-actions" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, width: '100%' }}>
                <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: isMuted ? 'var(--z-primary)' : 'var(--z-text-primary)' }} onClick={openMuteModal}>
                  <div className="crp-action-icon" style={{ background: isMuted ? 'var(--z-primary-light, #e8f0fe)' : 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMuted ? <FaBellSlash size={16} color="var(--z-primary)" /> : <FaBell size={16} />}
                  </div>
                  <span style={{ fontSize: 12 }}>{isMuted ? t('unmute') : t('mute')}</span>
                </div>

                {!isGroup ? (
                  <>
                    <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => toast.success('Đã ghim hội thoại')}>
                      <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaThumbtack size={16} /></div>
                      <span style={{ fontSize: 12 }}>{t('pin')}</span>
                    </div>
                    {/* FIX 3 — gọi setShowCreateGroupModal() không tham số,
                        ChatPage wrapper tự lấy otherParticipant để pre-select */}
                    <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setShowCreateGroupModal()}>
                      <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserPlus size={16} /></div>
                      <span style={{ fontSize: 12 }}>{t('createGroup')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={onShowAddMember}>
                      <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserPlus size={16} /></div>
                      <span style={{ fontSize: 12 }}>{t('addMember')}</span>
                    </div>
                    <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setRightPanelMode('manage')}>
                      <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserSecret size={16} /></div>
                      <span style={{ fontSize: 12 }}>{t('manage')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BODY */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ACCORDION THÀNH VIÊN */}
              {isGroup && (
                <Accordion title={`${t('groupMembers')} (${activeConversation.participants?.length || 0})`}>
                  <div style={{ padding: '8px 16px' }}>
                    {(activeConversation.participants || []).map((p, idx) => {
                      const role = getMemberRole(p);
                      const pid = p._id || p.id || p;
                      const keyStr = typeof pid === 'string' ? pid : (pid?._id || pid?.id || `member-${idx}`);
                      const displayName = p.fullName || p.username || 'Người dùng';
                      const avatarSrc = toAbsoluteUrl(p.avatar || p.avatarUrl) || DEFAULT_AVATAR;
                      return (
                        <div key={keyStr} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', position: 'relative', borderBottom: '1px solid var(--z-border)' }}>
                          <img src={avatarSrc} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                            {role !== 'member' && (
                              <div style={{ fontSize: 10, color: role === 'owner' ? '#f59e0b' : 'var(--z-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {role === 'owner' ? (
                                  <>
                                    <FaCrown size={10} color="#f59e0b" />
                                    <span>{t('groupOwner')}</span>
                                  </>
                                ) : (
                                  <>
                                    <FaStar size={10} color="var(--z-primary)" />
                                    <span>{t('groupAdmin')}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Biệt danh */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              {editingNicknameId === keyStr ? (
                                <input
                                  autoFocus
                                  value={nicknameDraft}
                                  onChange={e => setNicknameDraft(e.target.value)}
                                  onBlur={() => handleSaveNickname(p._id || p.id)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveNickname(p._id || p.id);
                                    if (e.key === 'Escape') setEditingNicknameId(null);
                                  }}
                                  style={{
                                    border: 'none', borderBottom: '1px solid var(--z-primary)',
                                    background: 'transparent', outline: 'none',
                                    fontSize: 11, color: 'var(--z-text-secondary)', width: 90
                                  }}
                                  placeholder="Biệt danh..."
                                />
                              ) : (
                                <span
                                  title="Click để đặt biệt danh"
                                  style={{ fontSize: 11, color: 'var(--z-text-secondary)', cursor: 'pointer' }}
                                  onClick={() => {
                                    setNicknameDraft(activeConversation.nicknames?.[keyStr] || '');
                                    setEditingNicknameId(keyStr);
                                  }}
                                >
                                  {activeConversation.nicknames?.[keyStr] || <em style={{ opacity: 0.5 }}>Đặt biệt danh</em>}
                                </span>
                              )}
                            </div>
                          </div>
                          {isAdmin && keyStr !== myId && role !== 'owner' && (
                            <div
                              style={{ cursor: 'pointer', color: 'var(--z-text-secondary)', padding: '4px', borderRadius: 4, position: 'relative' }}
                              onClick={() => setShowMemberActionId(showMemberActionId === keyStr ? null : keyStr)}
                            >
                              <FaEllipsisH size={14} />
                            </div>
                          )}
                          {showMemberActionId === keyStr && (
                            <div className="member-action-menu">
                              {/* Đổi biệt danh */}
                              <div className="member-action-item" onClick={() => {
                                setNicknameDraft(activeConversation.nicknames?.[keyStr] || '');
                                setEditingNicknameId(keyStr);
                                setShowMemberActionId(null);
                              }}>
                                <FaEdit />
                                <span>Đổi biệt danh</span>
                              </div>

                              {/* Divider */}
                              {isOwner && <div className="member-menu-divider" />}

                              {/* Nâng quyền / Hạ quyền */}
                              {isOwner && role === 'member' && (
                                <>
                                  <div className="member-action-item primary" onClick={() => { handleGroupAction('promote', keyStr); setShowMemberActionId(null); }}>
                                    <FaStar />
                                    <span>Lên Phó nhóm</span>
                                  </div>
                                  <div className="member-action-item warning" onClick={() => {
                                    setTransferTarget({ id: keyStr, name: displayName });
                                    setShowConfirmTransfer(true);
                                    setShowMemberActionId(null);
                                  }}>
                                    <FaCrown />
                                    <span>Chuyển quyền Trưởng nhóm</span>
                                  </div>
                                </>
                              )}

                              {isOwner && role === 'admin' && (
                                <>
                                  <div className="member-action-item" onClick={() => { handleGroupAction('demote', keyStr); setShowMemberActionId(null); }}>
                                    <FaLevelDownAlt />
                                    <span>Hạ quyền</span>
                                  </div>
                                  <div className="member-action-item warning" onClick={() => {
                                    setTransferTarget({ id: keyStr, name: displayName });
                                    setShowConfirmTransfer(true);
                                    setShowMemberActionId(null);
                                  }}>
                                    <FaCrown />
                                    <span>Chuyển quyền Trưởng nhóm</span>
                                  </div>
                                </>
                              )}

                              {/* Divider */}
                              {isOwner && <div className="member-menu-divider" />}

                              {/* Mời ra khỏi nhóm */}
                              <div className="member-action-item danger" onClick={async () => { if (await confirm(`Mời ${displayName} ra khỏi nhóm?`, { isDanger: true })) handleGroupAction('remove', keyStr); setShowMemberActionId(null); }}>
                                <FaBan />
                                <span>Mời ra khỏi nhóm</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Accordion>
              )}

              {/* NHẮC HẸN */}
              {isGroup && (
                <Accordion title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaCalendarAlt size={13} /> {t('remindersList')}</span>} defaultOpen={false}>
                  <div style={{ padding: '8px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        onClick={onShowReminderList}
                        style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--z-border)', background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <FaCalendarAlt size={12} /> Xem tất cả ({reminders.length})
                      </button>
                      <button
                        data-create-reminder
                        style={{ flex: 1, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 12, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, fontWeight: 600 }}
                        onClick={() => { setRemTitle(''); setRemTime(''); setShowAddReminder(true); }}
                      >+ Tạo mới</button>
                    </div>
                    {reminders.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--z-text-muted)', textAlign: 'center', padding: '12px 0' }}>Chưa có nhắc hẹn nào</div>
                    )}
                  </div>
                </Accordion>
              )}

              {/* ẢNH / VIDEO */}
              {/* GHIM & GHI CHÚ */}
              <Accordion title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaThumbtack size={13} /> {t('pinnedMessages')}</span>} defaultOpen={false}>
                <div style={{ padding: '8px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                      style={{ border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 11, cursor: 'pointer', padding: '4px 10px', borderRadius: 12 }}
                      onClick={() => setShowPinnedPanel(true)}
                    >Xem tất cả</button>
                  </div>
                  {pinnedMessages.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--z-text-muted)', textAlign: 'center', padding: '12px 0' }}>Chưa có tin nhắn ghim nào</div>
                  ) : (
                    pinnedMessages.slice(0, 3).map((pin, idx) => (
                      <div key={pin._id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }}
                        onClick={() => onJump && onJump(pin.messageId?._id || pin.messageId)}
                      >
                        <FaThumbtack size={10} color="#F59E0B" style={{ marginTop: 4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--z-text-primary)', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pin.messageId?.content || (pin.messageId?.mediaIds?.length > 0 ? '[Hình ảnh]' : (pin.messageId?.attachments?.length > 0 ? '[Tập tin]' : '[Tin nhắn]'))}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--z-text-muted)', marginTop: 2 }}>
                            {new Date(pin.pinnedAt || pin.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <button title="Bỏ ghim" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm('Bỏ ghim tin nhắn này?')) {
                              onUnpin && onUnpin(pin.messageId?._id || pin.messageId);
                            }
                          }}>
                          <FaTimes size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Accordion>

              {/* BÌNH CHỌN */}
              {isGroup && (
                <Accordion title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaPoll size={13} /> {t('polls')}</span>} defaultOpen={false}>
                  <div style={{ padding: '8px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <button
                        style={{ border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 11, cursor: 'pointer', padding: '4px 10px', borderRadius: 12 }}
                        onClick={onShowPoll}
                      >+ Tạo mới</button>
                    </div>
                    {loadingPolls ? (
                      <div style={{ fontSize: 12, color: 'var(--z-text-muted)', textAlign: 'center', padding: '12px 0' }}>Đang tải...</div>
                    ) : polls.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--z-text-muted)', textAlign: 'center', padding: '12px 0' }}>Chưa có bình chọn nào</div>
                    ) : (
                      polls.map((poll, idx) => (
                        <div key={poll._id || `poll-${idx}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => {
                          if (poll.messageId) {
                            onJump && onJump(poll.messageId?._id || poll.messageId);
                          } else {
                            toast.info(`Bình chọn: ${poll.question}`);
                          }
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {poll.question}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--z-text-secondary)', marginTop: 2 }}>
                            {poll.options?.length} lựa chọn • {(() => {
                              const uniqueVoters = new Set();
                              poll.options?.forEach(opt => {
                                opt.votes?.forEach(vId => uniqueVoters.add(String(vId._id || vId)));
                              });
                              return uniqueVoters.size;
                            })()} lượt bình chọn
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Accordion>
              )}

              <Accordion title={t('imageVideo') || 'Ảnh/Video'}>
                <div style={{ padding: '8px 16px' }}>
                  {imgFiles.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4 }}>
                      {imgFiles.slice(0, 8).map((m, i) => (
                        <img key={i} src={m.url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} onClick={() => window.open(m.url, '_blank')} title="Xem ảnh" />
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 4, textAlign: 'center' }}>{t('noImageVideo') || 'Chưa có ảnh/video'}</div>}
                </div>
              </Accordion>

              {/* FILE */}
              <Accordion title={t('files')}>
                <div style={{ padding: '8px 16px' }}>
                  {docFiles.length > 0 ? (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {docFiles.slice(0, 3).map((m, i) => {
                        const fname = m.name || m.fileName;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => openDocument(m.url, fname)} title="Xem tài liệu">
                            <div style={{ width: 36, height: 40, borderRadius: 6, background: getFileColor(fname), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 'bold', flexShrink: 0 }}>
                              {getExt(fname).substring(0, 3).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fname}</div>
                              <div style={{ fontSize: 11, color: 'var(--z-text-secondary)' }}>{formatBytes(m.size)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 4, textAlign: 'center' }}>Chưa có File nào</div>}
                </div>
              </Accordion>

              {/* LINK */}
              <Accordion title={t('links')}>
                <div style={{ padding: '8px 16px' }}>
                  {linkItems && linkItems.length > 0 ? (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {linkItems.slice(0, 3).map((link, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--z-bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--z-primary)', flexShrink: 0 }}><FaLink size={14} /></div>
                          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--z-text-primary)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</a>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 4, textAlign: 'center' }}>Chưa có Link nào</div>}
                </div>
              </Accordion>

            </div>
          </>
        ) : rightPanelMode === 'manage' ? (
          // MANAGE MODE
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('default')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>{t('groupManage')}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="crp-group-manage" style={{ padding: 0 }}>
                {/* BANNER CHO NON-ADMIN */}
                {!isPrivileged && (
                  <div style={{ padding: '12px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#1f2937', fontSize: 13, fontWeight: 500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" /></svg>
                    Tính năng chỉ dành cho quản trị viên
                  </div>
                )}

                {/* 1. Quyền của thành viên (Checkboxes) */}
                <div style={{ padding: '16px 16px 8px', fontSize: 14, fontWeight: 600, color: isPrivileged ? 'var(--z-text-primary)' : 'var(--z-text-secondary)' }}>
                  Cho phép các thành viên trong nhóm:
                </div>

                {[
                  { text: 'Thay đổi tên & ảnh đại diện của nhóm', key: 'canMembersUpdateInfo' },
                  { text: 'Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại', key: 'canMembersPin' },
                  { text: 'Tạo mới ghi chú, nhắc hẹn', key: 'canMembersCreateReminders' },
                  { text: 'Tạo mới bình chọn', key: 'canMembersCreatePolls' },
                  { text: 'Gửi tin nhắn', key: 'canMembersSendMessages' }
                ].map((item, i) => {
                  const isChecked = activeConversation?.settings?.[item.key] !== false; // default is true
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: isPrivileged ? 'pointer' : 'default', opacity: isPrivileged ? 1 : 0.8 }} onClick={() => {
                      if (!isPrivileged) return;
                      handleUpdateGroupSettings({ [item.key]: !isChecked });
                    }}>
                      <span style={{ fontSize: 15, color: 'var(--z-text-primary)' /* Zalo uses primary text for these */, flex: 1, paddingRight: 16 }}>{item.text}</span>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: isChecked ? (isPrivileged ? 'var(--z-primary)' : '#c8cdd4') : '#ccc', flexShrink: 0 }}>
                        <rect width="20" height="20" rx="4" fill="currentColor" />
                        {isChecked && <path d="M14 8l-5 5-2-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                    </div>
                  );
                })}

                <div style={{ height: 8, background: 'var(--z-bg-main)', borderTop: '1px solid var(--z-border)', borderBottom: '1px solid var(--z-border)', margin: '8px 0' }} />

                {/* 2. Cài đặt duyệt / Toggles */}
                {[
                  {
                    label: 'Chế độ phê duyệt thành viên mới',
                    key: 'isApprovalRequired',
                    tooltip: 'Khi bật, thành viên mới phải được trưởng/phó nhóm duyệt mới được tham gia.',
                  },
                  {
                    label: 'Đánh dấu tin nhắn từ trưởng/phó nhóm',
                    key: 'markAdminMessages',
                    tooltip: 'Khi bật, tin nhắn từ Trưởng/phó nhóm sẽ có ký hiệu chìa khóa.',
                  },
                  {
                    label: 'Cho phép thành viên mới đọc tin nhắn gần nhất',
                    key: 'allowNewMembersReadHistory',
                    tooltip: 'Khi bật, thành viên mới sẽ xem được các tin nhắn trong nhóm trước khi họ tham gia.',
                  },
                  {
                    label: 'Cho phép dùng link tham gia nhóm',
                    key: 'allowInviteLink',
                    tooltip: 'Khi bật, bất kỳ ai có link đều có thể yêu cầu tham gia nhóm.',
                  },
                ].map(({ label, key, tooltip }) => {
                  const val = activeConversation?.settings?.[key];
                  const isOn = key === 'isApprovalRequired' ? !!val : val !== false;
                  return (
                    <div key={key} className="crp-gm-switch" style={{ padding: '12px 16px', opacity: isPrivileged ? 1 : 0.6, pointerEvents: isPrivileged ? 'auto' : 'none' }}>
                      <div style={{ flex: 1, fontSize: 15, color: isPrivileged ? 'var(--z-text-primary)' : 'var(--z-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {label}
                        <Tooltip text={tooltip}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--z-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--z-text-secondary)', cursor: 'default', flexShrink: 0 }}>?</span>
                        </Tooltip>
                      </div>
                      <div
                        className={`crp-gm-switch-btn ${isOn ? 'active' : ''}`}
                        onClick={() => { if (isPrivileged) handleUpdateGroupSettings({ [key]: !isOn }); }}
                      >
                        <div className="crp-gm-switch-ball" />
                      </div>
                    </div>
                  );
                })}

                {/* Link box - chỉ hiện khi allowInviteLink = true */}
                {activeConversation?.settings?.allowInviteLink !== false && (
                  <div style={{ margin: '0 16px 16px', padding: '12px', background: 'var(--z-bg-main)', borderRadius: 8, opacity: isPrivileged ? 1 : 0.6, pointerEvents: isPrivileged ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--z-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {inviteLink || 'Đang tải link...'}
                      </div>
                      <div style={{ display: 'flex', gap: 12, color: 'var(--z-primary)', flexShrink: 0 }}>
                        <FaLink size={14} style={{ cursor: 'pointer' }} title="Copy link" onClick={() => {
                          if (inviteLink) { navigator.clipboard.writeText(inviteLink); toast.success('Đã copy link mời'); }
                        }} />
                        <FaSync size={14} style={{ cursor: 'pointer' }} title="Tạo link mới" onClick={async () => {
                          if (!inviteCode) return;
                          try {
                            const res = await conversationService.resetInviteLink(inviteCode);
                            const newCode = res.data.inviteCode;
                            setInviteCode(newCode);
                            setInviteLink(`${window.location.origin}/join/${newCode}`);
                            toast.success('Đã tạo link mời mới');
                          } catch { toast.error('Lỗi tạo link'); }
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ height: 8, background: 'var(--z-bg-main)', borderTop: '1px solid var(--z-border)', borderBottom: '1px solid var(--z-border)', margin: '8px 0' }} />

                {/* 3. Duyệt thành viên & Phân quyền */}
                {isPrivileged && (
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setRightPanelMode('join-requests')}>
                    <FaUserPlus size={18} color="var(--z-text-secondary)" />
                    <span style={{ fontSize: 15, color: 'var(--z-text-primary)', flex: 1 }}>Duyệt thành viên mới</span>
                    {joinRequests.length > 0 && (
                      <span style={{ background: '#ef4444', color: 'white', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{joinRequests.length}</span>
                    )}
                  </div>
                )}
                {isPrivileged && isGroup && (
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setRightPanelMode('blocked')}>
                    <FaUserTimes size={18} color="var(--z-text-secondary)" />
                    <span style={{ fontSize: 15, color: 'var(--z-text-primary)' }}>Chặn khỏi nhóm</span>
                  </div>
                )}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setRightPanelMode('manage-roles')}>
                  <FaKey size={18} color="var(--z-text-secondary)" />
                  <span style={{ fontSize: 15, color: 'var(--z-text-primary)' }}>Trưởng & phó nhóm</span>
                </div>

                <div style={{ height: 8, background: 'var(--z-bg-main)', borderTop: '1px solid var(--z-border)', borderBottom: '1px solid var(--z-border)', margin: '8px 0' }} />

                {/* 4. Giải tán */}
                {isOwner && (
                  <div style={{ padding: '16px' }}>
                    <button style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#ffe4e6', color: '#e11d48', fontSize: 15, fontWeight: 600, cursor: 'pointer' }} onClick={handleDisbandGroup}>
                      Giải tán nhóm
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : rightPanelMode === 'manage-roles' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('manage')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Trưởng & phó nhóm</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {(() => {
                const owner = activeConversation?.participants?.find(p => getMemberRole(p) === 'owner');
                const admins = activeConversation?.participants?.filter(p => getMemberRole(p) === 'admin') || [];
                return (
                  <>
                    {owner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <img src={toAbsoluteUrl(owner.avatarUrl || owner.avatar) || DEFAULT_AVATAR} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{owner.fullName || owner.username}</div>
                          <div style={{ fontSize: 13, color: 'var(--z-text-secondary)' }}>Trưởng nhóm</div>
                        </div>
                      </div>
                    )}
                    {admins.map(admin => {
                      const adminId = admin._id || admin.id;
                      return (
                        <div key={adminId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--z-border)' }}>
                          <img src={toAbsoluteUrl(admin.avatarUrl || admin.avatar) || DEFAULT_AVATAR} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{admin.fullName || admin.username}</div>
                            <div style={{ fontSize: 13, color: 'var(--z-text-secondary)' }}>Phó nhóm</div>
                          </div>
                          {isOwner && (
                            <button style={{ border: 'none', background: '#ffe4e6', color: '#e11d48', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                              onClick={async () => { if (await confirm(`Gỡ quyền phó nhóm của ${admin.fullName || admin.username}?`)) handleGroupAction('demote', adminId); }}>
                              Xóa
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {isOwner && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                        <button style={{ padding: '12px', background: 'var(--z-bg-main)', border: '1px solid var(--z-border)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setRightPanelMode('add-admin')}>
                          Thêm phó nhóm
                        </button>
                        <button style={{ padding: '12px', background: 'var(--z-bg-main)', border: '1px solid var(--z-border)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setRightPanelMode('transfer-owner')}>
                          Chuyển quyền trưởng nhóm
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : rightPanelMode === 'add-admin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('manage-roles')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Thêm phó nhóm</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              {(activeConversation?.participants?.filter(p => getMemberRole(p) === 'member') || []).map(member => (
                <div key={member._id || member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }}
                  onClick={async () => {
                    if (await confirm(`Chỉ định ${member.fullName || member.username} làm phó nhóm?`)) {
                      handleGroupAction('promote', member._id || member.id);
                      setRightPanelMode('manage-roles');
                    }
                  }}>
                  <img src={toAbsoluteUrl(member.avatarUrl || member.avatar) || DEFAULT_AVATAR} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{member.fullName || member.username}</div>
                </div>
              ))}
              {(activeConversation?.participants?.filter(p => getMemberRole(p) === 'member').length === 0) && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--z-text-muted)' }}>Tất cả thành viên đã là Quản trị viên</div>
              )}
            </div>
          </div>
        ) : rightPanelMode === 'transfer-owner' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('manage-roles')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Chuyển quyền trưởng nhóm</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--z-text-muted)' }}>Lưu ý: Nếu chuyển quyền trưởng nhóm, bạn sẽ trở thành Phó nhóm.</div>
              {(activeConversation?.participants?.filter(p => getMemberRole(p) !== 'owner') || []).map(member => (
                <div key={member._id || member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }}
                  onClick={async () => {
                    if (await confirm(`Bạn có muốn nhường quyền trưởng nhóm cho ${member.fullName || member.username}? Bạn sẽ không thể khôi phục lại quyền trừ khi người đó chuyển lại cho bạn.`, { isDanger: true })) {
                      handleGroupAction('transfer', member._id || member.id);
                      setRightPanelMode('default'); // Xong thì nhảy ra ngoài vì không còn là owner
                    }
                  }}>
                  <img src={toAbsoluteUrl(member.avatarUrl || member.avatar) || DEFAULT_AVATAR} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{member.fullName || member.username}</div>
                </div>
              ))}
            </div>
          </div>
        ) : rightPanelMode === 'join-requests' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('manage')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Duyệt thành viên mới</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {joinRequests.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--z-text-muted)', fontSize: 13, padding: '40px 0' }}>Không có yêu cầu nào đang chờ</div>
              ) : joinRequests.map(req => {
                const user = req.userId || {};
                return (
                  <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--z-border)' }}>
                    <img src={toAbsoluteUrl(user.avatarUrl || user.avatar) || DEFAULT_AVATAR} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--z-text-primary)' }}>{user.username || 'Người dùng'}</div>
                      {req.reason && <div style={{ fontSize: 12, color: 'var(--z-text-secondary)', marginTop: 2 }}>"{req.reason}"</div>}
                      <div style={{ fontSize: 11, color: 'var(--z-text-muted)', marginTop: 2 }}>{new Date(req.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleProcessJoinRequest(req._id, 'approve')}
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaCheck size={10} /> Duyệt
                      </button>
                      <button onClick={() => handleProcessJoinRequest(req._id, 'reject')}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaTimes size={10} /> Từ chối
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : rightPanelMode === 'blocked' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('manage')}>
              <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Chặn khỏi nhóm</span>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--z-text-secondary)', borderBottom: '1px solid var(--z-border)', background: 'var(--z-bg-main)' }}>
              Những người đã bị chặn không thể tham gia lại nhóm, trừ khi được trưởng/phó nhóm bỏ chặn hoặc thêm lại.
            </div>
            {/* Chặn thành viên đang trong nhóm */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--z-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', marginBottom: 8 }}>Thêm vào danh sách chặn</div>
              {(activeConversation?.participants || []).filter(p => {
                const pid = String(p._id || p.id || p);
                return pid !== myId && getMemberRole(p) !== 'owner';
              }).map(p => {
                const pid = String(p._id || p.id || p);
                const isAlreadyBlocked = blockedMembers.some(b => String(b._id || b) === pid);
                return (
                  <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <img src={toAbsoluteUrl(p.avatarUrl || p.avatar) || DEFAULT_AVATAR} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.username || 'Thành viên'}</div>
                    {!isAlreadyBlocked && (
                      <button onClick={async () => {
                        if (!await confirm(`Chặn ${p.username || 'thành viên này'} khỏi nhóm?`, { isDanger: true })) return;
                        try {
                          await conversationService.blockMember(activeConversation._id, pid);
                          toast.success('Đã chặn thành viên');
                          fetchConversations();
                          const res = await conversationService.listBlockedMembers(activeConversation._id);
                          setBlockedMembers(res.data || []);
                        } catch { toast.error('Lỗi chặn thành viên'); }
                      }} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Chặn
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Danh sách đã bị chặn */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', marginBottom: 8 }}>Đã bị chặn ({blockedMembers.length})</div>
              {blockedMembers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--z-text-muted)', fontSize: 13, padding: '20px 0' }}>Chưa có ai bị chặn</div>
              ) : blockedMembers.map(u => {
                const uid = typeof u === 'string' ? u : (u.id || u._id || String(u));
                const name = u.username || 'Người dùng';

                const handleUnblock = async () => {
                  try {
                    await conversationService.unblockMember(activeConversation._id, uid);
                    toast.success(`Đã bỏ chặn ${name}`);
                    const res = await conversationService.listBlockedMembers(activeConversation._id);
                    setBlockedMembers(res.data || []);
                  } catch (err) {
                    toast.error(`Lỗi: ${err?.response?.data?.message || err?.message}`);
                  }
                };

                return (
                  <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--z-border)' }}>
                    <img src={toAbsoluteUrl(u.avatarUrl || u.avatar) || DEFAULT_AVATAR} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--z-text-primary)' }}>{name}</div>
                    <button onClick={handleUnblock} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: 'var(--z-bg-main)', color: 'var(--z-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Bỏ chặn
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* NÚT CUỐI - Xóa lịch sử hoặc Rời nhóm + Tính năng mới */}
        {rightPanelMode === 'default' && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--z-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Nút phân loại hội thoại */}
            <button
              onClick={() => setShowClassifyModal(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              <FaTag size={14} color="#6366f1" />
              Phân loại: {(() => {
                const cats = { primary: 'Chính', work: 'Công việc', family: 'Gia đình', other: 'Khác' };
                return cats[convCategory] || 'Chính';
              })()}
            </button>

            {/* Nút chặn + báo cáo (chỉ hiện với hội thoại 1-1) */}
            {!isGroup && (() => {
              const otherParticipant = (activeConversation?.participants || []).find(p => {
                const pid = String(p._id || p.id || p);
                return pid !== myId;
              });
              if (!otherParticipant) return null;
              const targetId = String(otherParticipant._id || otherParticipant.id || otherParticipant);
              const targetName = otherParticipant.username || otherParticipant.fullName || 'người dùng này';
              const isBlockedByMe = blockedUsers.some(u => String(u._id || u.id) === targetId);
              return (
                <>
                  {/* Nút chặn / bỏ chặn */}
                  <button
                    onClick={async () => {
                      if (isBlockedByMe) {
                        const res = await unblockUser(targetId);
                        if (res?.success) toast.success(`Đã bỏ chặn ${targetName}`);
                        else toast.error(res?.error || 'Bỏ chặn thất bại');
                      } else {
                        if (!await confirm(`Chặn ${targetName}? Bạn sẽ không thể nhắn tin cho nhau.`, { isDanger: true })) return;
                        const res = await blockFriend(targetId);
                        if (res?.success) toast.success(`Đã chặn ${targetName}`);
                        else toast.error(res?.error || 'Chặn thất bại');
                      }
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${isBlockedByMe ? '#fde68a' : '#fee2e2'}`, background: isBlockedByMe ? '#fffbeb' : '#fff5f5', color: isBlockedByMe ? '#d97706' : '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                  >
                    <FaBan size={14} />
                    {isBlockedByMe ? `Bỏ chặn ${targetName}` : `Chặn ${targetName}`}
                  </button>

                  {/* Nút báo cáo */}
                  <button
                    onClick={() => setShowReportModal(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                  >
                    <FaFlag size={14} />
                    Báo cáo tài khoản
                  </button>
                  {showReportModal && (
                    <ReportUserModal
                      targetUserId={targetId}
                      targetUserName={targetName}
                      onClose={() => setShowReportModal(false)}
                    />
                  )}
                </>
              );
            })()}

            {/* Nút xóa hoặc rời nhóm */}
            {!isGroup ? (
              <div className="crp-gm-button danger" style={{ marginTop: 0 }} onClick={handleDeleteConversation}>
                <FaTrashAlt size={14} /> Xóa lịch sử trò chuyện
              </div>
            ) : (
              <div className="crp-gm-button danger" style={{ marginTop: 0 }} onClick={handleLeaveGroup}>
                <FaSignOutAlt size={14} /> Rời nhóm
              </div>
            )}
          </div>
        )}
      </aside>

      {/* MODAL TẠO / SỬA NHẮC HẸN */}
      {(showAddReminder || editingReminder) && (() => {
        const isEdit = !!editingReminder;
        const title = isEdit ? editRemTitle : remTitle;
        const time = isEdit ? editRemTime : remTime;
        const setTitle = isEdit ? setEditRemTitle : setRemTitle;
        const setTime = isEdit ? setEditRemTime : setRemTime;
        const quickOpts = [
          { label: '15 phút nữa', mins: 15 },
          { label: '30 phút nữa', mins: 30 },
          { label: '9:00 ngày mai', special: 'tomorrow9' },
          { label: 'Khác', special: 'custom' },
        ];
        const formatDisplayTime = (val) => {
          if (!val) return '';
          const d = new Date(val);
          const now = new Date();
          const isToday = d.toDateString() === now.toDateString();
          const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
          const isTomorrow = d.toDateString() === tomorrow.toDateString();
          const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          if (isToday) return `Hôm nay lúc ${timeStr}`;
          if (isTomorrow) return `Ngày mai lúc ${timeStr}`;
          return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        };
        const activeQuick = (() => {
          if (!time) return null;
          const d = new Date(time);
          const now = new Date();
          const diffMs = d - now;
          const diffMins = Math.round(diffMs / 60000);
          if (diffMins >= 13 && diffMins <= 17) return '15 phút nữa';
          if (diffMins >= 28 && diffMins <= 32) return '30 phút nữa';
          const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
          if (Math.abs(d - tomorrow) < 60000) return '9:00 ngày mai';
          return null;
        })();
        const handleClose = () => { setShowAddReminder(false); setEditingReminder(null); setRemTitle(''); setRemTime(''); };
        const handleSave = () => {
          if (!title.trim()) return toast.error('Vui lòng nhập nội dung');
          if (!time) return toast.error('Vui lòng chọn thời gian');
          if (isEdit) {
            handleUpdateReminder(editingReminder._id, title, time);
            setEditingReminder(null);
          } else {
            handleCreateReminder(title.trim(), new Date(time));
            setShowAddReminder(false);
            setRemTitle(''); setRemTime('');
          }
        };
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={handleClose}>
            <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 16, width: 460, maxWidth: '94vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--z-border)' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--z-text-primary)' }}>{isEdit ? 'Sửa nhắc hẹn' : 'Tạo nhắc hẹn'}</span>
                <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--z-text-secondary)', padding: 4, borderRadius: 6 }}>
                  <FaTimes size={16} />
                </button>
              </div>
              {/* Body */}
              <div style={{ padding: '16px 20px' }}>
                {/* Content input */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', marginBottom: 6 }}>Nhập nội dung</div>
                <textarea
                  autoFocus
                  rows={4}
                  placeholder="Nhập nội dung mới hoặc dán link"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--z-primary)', borderRadius: 8, background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {/* Quick time */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', margin: '14px 0 8px' }}>Chọn thời gian</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {quickOpts.map(opt => {
                    const isActive = activeQuick === opt.label;
                    return (
                      <button key={opt.label}
                        style={{ padding: '6px 14px', fontSize: 13, border: `1.5px solid ${isActive ? 'var(--z-primary)' : 'var(--z-border)'}`, borderRadius: 20, cursor: 'pointer', background: isActive ? 'rgba(0,104,255,0.08)' : 'transparent', color: isActive ? 'var(--z-primary)' : 'var(--z-text-primary)', fontWeight: isActive ? 600 : 400, transition: 'all .15s' }}
                        onClick={() => {
                          if (opt.special === 'custom') return;
                          const now = new Date();
                          let d;
                          if (opt.special === 'tomorrow9') {
                            d = new Date(now);
                            d.setDate(d.getDate() + 1);
                            d.setHours(9, 0, 0, 0);
                          } else {
                            d = new Date(now.getTime() + opt.mins * 60000);
                          }
                          // Format to local datetime-local format (YYYY-MM-DDTHH:mm)
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          setTime(`${year}-${month}-${day}T${hours}:${minutes}`);
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {/* Date picker row */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', margin: '14px 0 8px' }}>Chọn ngày nhắc hẹn</div>
                <label style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--z-border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: 'var(--z-bg-main)', position: 'relative' }}>
                  <span style={{ flex: 1, fontSize: 14, color: time ? 'var(--z-text-primary)' : 'var(--z-text-muted)' }}>
                    {time ? formatDisplayTime(time) : 'Chọn ngày giờ...'}
                  </span>
                  <span style={{ color: 'var(--z-text-secondary)' }}>📅</span>
                  <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
                </label>
                {/* Repeat row */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--z-text-secondary)', margin: '14px 0 8px' }}>Chọn kiểu lặp lại (vd: Lặp lại hàng tuần)</div>
                <select style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--z-border)', borderRadius: 8, background: 'var(--z-bg-main)', color: 'var(--z-text-primary)', fontSize: 14, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23888\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', outline: 'none', cursor: 'pointer' }}>
                  <option value="">Không lặp lại</option>
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
                <button onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                <button onClick={handleSave} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  {isEdit ? 'Lưu thay đổi' : 'Tạo nhắc hẹn'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SLIDE-OVER: TIN NHẮN ĐÃ GHIM ── */}
      {showPinnedPanel && activeConversation && (() => {
        // Only check ownerId, not createdBy (owner can be transferred)
        const isOwnerStr = activeConversation?.ownerId?._id || activeConversation?.ownerId;
        const isOwnerLocal = isOwnerStr && String(isOwnerStr) === String(myId);
        const isAdminLocal = activeConversation?.adminIds?.some(aid => String(aid._id || aid) === String(myId)) || isOwnerLocal;
        const canPinLocal = activeConversation?.settings?.canMembersPin !== false;
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', justifyContent: 'flex-end' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPinnedPanel(false); }}
          >
            <div style={{ width: 360, background: 'var(--z-bg-sidebar)', height: '100%', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
              <PinnedMessagesPanel
                conversationId={activeConversation._id}
                isPrivileged={isOwnerLocal || isAdminLocal}
                canPin={canPinLocal}
                onClose={() => setShowPinnedPanel(false)}
                onJumpToMessage={onJump}
              />
            </div>
          </div>
        );
      })()}

      {/* ── MODAL PHÂN LOẠI HỘI THOẠI ── */}
      {showClassifyModal && activeConversation && (
        <ClassifyConversationModal
          conversationId={activeConversation._id}
          currentCategory={convCategory}
          onClose={() => setShowClassifyModal(false)}
          onUpdated={(newCat) => setConvCategory(newCat)}
        />
      )}

      {/* MODAL TẮT THÔNG BÁO */}
      {showMuteModal && (
        <div className="mute-modal-overlay" onClick={() => setShowMuteModal(false)}>
          <div className="mute-modal-box" onClick={e => e.stopPropagation()}>
            <div className="mute-modal-title">🔕 Tắt thông báo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Trong 1 giờ', val: 60 },
                { label: 'Trong 4 giờ', val: 240 },
                { label: 'Trong 8 giờ', val: 480 },
                { label: 'Cho đến khi mở lại', val: -1 },
              ].map(opt => (
                <label key={opt.val} className="mute-opt">
                  <input type="radio" name="mute_duration" checked={muteOption === opt.val} onChange={() => setMuteOption(opt.val)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mute-actions">
              <button className="mute-btn cancel" onClick={() => setShowMuteModal(false)}>Hủy</button>
              <button className="mute-btn ok" onClick={handleConfirmMute}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHUYỂN QUYỀN */}
      <ConfirmTransferModal
        isOpen={showConfirmTransfer}
        onClose={() => {
          setShowConfirmTransfer(false);
          setTransferTarget(null);
        }}
        onConfirm={() => {
          if (transferTarget) {
            handleGroupAction('transfer', transferTarget.id);
          }
          setShowConfirmTransfer(false);
          setTransferTarget(null);
        }}
        memberName={transferTarget?.name || ''}
      />
    </>
  );
};