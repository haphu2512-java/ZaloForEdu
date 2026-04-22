      {/* ── BÊN PHẢI: RIGHT PANEL ── */}
      {activeConversation && showRightPanel && (
        <aside className="chat-right-panel" style={{ width: 320, background: 'var(--z-bg-sidebar)', borderLeft: '1px solid var(--z-border)', display: 'flex', flexDirection: 'column' }}>
          {rightPanelMode === 'default' ? (
            <>
              <div className="crp-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', borderBottom: '1px solid var(--z-border)' }}>
                <img className="crp-avatar" src={getConversationAvatar(activeConversation)} alt="avt" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
                
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
                            setActiveConversation({...activeConversation, name: editGroupName});
                            fetchConversations();
                            toast.success("Đổi tên nhóm thành công");
                          });
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur();
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="crp-name" style={{ fontSize: 18, fontWeight: 600, color: 'var(--z-text-primary)', textAlign: 'center' }}>
                      {getConversationName(activeConversation)}
                    </div>
                  )}
                  {(activeConversation.type === 'group' || activeConversation.roomModel === 'Group') && !isGroupNameEditing && (
                    <div style={{ cursor: 'pointer', color: 'var(--z-text-secondary)', padding: '2px' }} onClick={() => { setEditGroupName(activeConversation.name || ""); setIsGroupNameEditing(true); }}>
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </div>
                  )}
                </div>

                <div className="crp-actions" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, width: '100%' }}>
                  <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setShowMuteModal(true)}>
                    <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaBell size={16} /></div>
                    <span style={{ fontSize: 12 }}>Tắt TB</span>
                  </div>
                  
                  {activeConversation.type !== 'group' && activeConversation.roomModel !== 'Group' ? (
                    <>
                      <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setShowCreateGroupModal(true)}>
                        <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserPlus size={16} /></div>
                        <span style={{ fontSize: 12 }}>Tạo nhóm</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => {toast.success("Đã thêm thành viên");}}>
                        <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserPlus size={16} /></div>
                        <span style={{ fontSize: 12 }}>Thêm TV</span>
                      </div>
                      <div className="crp-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--z-text-primary)' }} onClick={() => setRightPanelMode('manage')}>
                        <div className="crp-action-icon" style={{ background: 'var(--z-bg-main)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaUserSecret size={16} /></div>
                        <span style={{ fontSize: 12 }}>Quản lý</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* ACCORDION THÀNH VIÊN */}
                {(activeConversation.type === 'group' || activeConversation.roomModel === 'Group') && (
                  <div className="crp-accordion">
                    <div className="crp-acc-header" onClick={(e) => { const el = e.currentTarget.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                      Thành viên nhóm ({activeConversation.participants?.length || 0})
                    </div>
                    <div className="crp-acc-body" style={{ padding: '8px 16px', display: 'none' }}>
                      {(activeConversation.participants || []).slice(0, 5).map(p => (
                        <div key={p.id || p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                          <img src={p.avatar || p.avatarUrl || 'https://i.pravatar.cc/150'} style={{ width: 32, height: 32, borderRadius: '50%' }} alt=""/>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.fullName || 'Người dùng'}</div>
                        </div>
                      ))}
                      {activeConversation.participants?.length > 5 && (
                        <div style={{ fontSize: 13, color: 'var(--z-primary)', cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}>Xem tất cả</div>
                      )}
                    </div>
                  </div>
                )}

                {/* BẢNG TIN NHÓM */}
                {(activeConversation.type === 'group' || activeConversation.roomModel === 'Group') && (
                  <div className="crp-accordion">
                    <div className="crp-acc-header" onClick={(e) => { const el = e.currentTarget.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                      Bảng tin nhóm
                    </div>
                    <div className="crp-acc-body" style={{ padding: '8px 16px', display: 'none' }}>
                      <div className="crp-acc-item" onClick={()=>toast('Chưa có nhắc hẹn')}>
                        <div className="crp-acc-icon"><FaBell size={14}/></div>
                        <div className="crp-acc-text">Danh sách nhắc hẹn</div>
                      </div>
                      <div className="crp-acc-item" onClick={()=>toast('Ghi chú, ghim, bình chọn')}>
                        <div className="crp-acc-icon"><FaThumbtack size={14}/></div>
                        <div className="crp-acc-text">Ghi chú, ghim, bình chọn</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="crp-accordion">
                  <div className="crp-acc-header" onClick={(e) => { const el = e.currentTarget.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                    {t('imageVideo')}
                  </div>
                  <div className="crp-acc-body">
                    {imgFiles.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 12 }}>
                        {imgFiles.slice(0, 8).map((m, i) => (
                          <img key={i} src={m.url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 4 }} />
                        ))}
                      </div>
                    ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 12, textAlign: 'center' }}>{t('noImageVideo')}</div>}
                  </div>
                </div>

                <div className="crp-accordion">
                  <div className="crp-acc-header" onClick={(e) => { const el = e.currentTarget.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                    File
                  </div>
                  <div className="crp-acc-body">
                    {docFiles.length > 0 ? (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {docFiles.slice(0, 3).map((m, i) => {
                          const fname = m.name || m.fileName;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 40, borderRadius: 6, background: getFileColor(fname), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                {getExt(fname).substring(0,3).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: 'var(--z-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fname}</div>
                                <div style={{ fontSize: 11, color: 'var(--z-text-secondary)' }}>{formatBytes(m.size)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 12, textAlign: 'center' }}>Chưa có File nào</div>}
                  </div>
                </div>

                <div className="crp-accordion">
                  <div className="crp-acc-header" onClick={(e) => { const el = e.currentTarget.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                    Link
                  </div>
                  <div className="crp-acc-body">
                    {linkItems.length > 0 ? (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {linkItems.slice(0, 3).map((link, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--z-bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--z-primary)' }}><FaLink size={14} /></div>
                            <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--z-text-primary)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</a>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ fontSize: 13, color: 'var(--z-text-muted)', marginTop: 12, textAlign: 'center' }}>Chưa có Link nào</div>}
                  </div>
                </div>

              </div>
            </>
          ) : (
            // MANAGE MODE
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--z-border)', cursor: 'pointer' }} onClick={() => setRightPanelMode('default')}>
                <FaArrowLeft size={16} color="var(--z-text-secondary)" style={{ marginRight: 12 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--z-text-primary)' }}>Quản lý nhóm</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div className="crp-group-manage" style={{ marginTop: 16 }}>
                  <div className="crp-gm-switch">
                    <span className="crp-gm-switch-text">Phê duyệt thành viên mới</span>
                    <div className="crp-gm-switch-btn" onClick={(e)=>e.currentTarget.classList.toggle('active')}><div className="crp-gm-switch-ball" /></div>
                  </div>
                  <div className="crp-gm-switch">
                    <span className="crp-gm-switch-text">Chỉ trưởng nhóm sửa thông tin</span>
                    <div className="crp-gm-switch-btn active" onClick={(e)=>e.currentTarget.classList.toggle('active')}><div className="crp-gm-switch-ball" /></div>
                  </div>
                  <div className="crp-gm-switch">
                    <span className="crp-gm-switch-text">Gửi tin nhắn</span>
                    <div className="crp-gm-switch-btn active" onClick={(e)=>e.currentTarget.classList.toggle('active')}><div className="crp-gm-switch-ball" /></div>
                  </div>
                  
                  <div style={{ height: 16 }} />
                  
                  <div className="crp-gm-button">Chuyển quyền trưởng nhóm</div>
                  <div className="crp-gm-button danger" onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn giải tán nhóm không?")) {
                      toast.success("Giải tán nhóm thành công!");
                    }
                  }}>Giải tán nhóm</div>
                </div>
              </div>
            </div>
          )}
          
          {rightPanelMode === 'default' && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--z-border)' }}>
              {activeConversation.type !== 'group' && activeConversation.roomModel !== 'Group' ? (
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
      )}

      {/* MODAL TẮT THÔNG BÁO */}
      {showMuteModal && (
        <div className="mute-modal-overlay" onClick={() => setShowMuteModal(false)}>
          <div className="mute-modal-box" onClick={e => e.stopPropagation()}>
            <div className="mute-modal-title">Tắt thông báo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="mute-opt">
                <input type="radio" name="mute_duration" defaultChecked />
                <span>Trong 1 giờ</span>
              </label>
              <label className="mute-opt">
                <input type="radio" name="mute_duration" />
                <span>Trong 4 giờ</span>
              </label>
              <label className="mute-opt">
                <input type="radio" name="mute_duration" />
                <span>Đến 8:00 sáng mai</span>
              </label>
              <label className="mute-opt">
                <input type="radio" name="mute_duration" />
                <span>Cho đến khi mở lại</span>
              </label>
            </div>
            <div className="mute-actions">
              <button className="mute-btn cancel" onClick={() => setShowMuteModal(false)}>Hủy</button>
              <button className="mute-btn ok" onClick={() => { setShowMuteModal(false); toast.success('Đã tắt thông báo'); }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
