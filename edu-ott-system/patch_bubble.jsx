  return (
    <div 
      id={`msg-${_id}`}
      className={`mdc-msg-wrap ${isMe ? 'me' : 'them'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); if (!showMoreMenu && !showEmojiPicker) setShowMoreMenu(false); }}
    >
      {!isMe && <img src={avatar} alt="avatar" className="mdc-msg-avatar" />}
      
      <div className="mdc-msg-body">
        
        {!isMe && sender && (
          <div className="mdc-msg-sender-name">{name}</div>
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
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: isMe ? '#fff' : '#050505' }}>{replyTo.sender?.fullName || replyTo.sender?.username || 'Người dùng'}</div>
                        <div style={{ fontSize: '13px', color: isMe ? '#fff' : '#050505', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '230px' }}>{replyTo.content || '[Hình ảnh/File]'}</div>
                      </div>
                    )}

                    {content && <span>{content}</span>}
                  </div>
                )}

                {/* KHU VỰC RENDER MEDIA */}
                {(images.length > 0 || docs.length > 0 || audios.length > 0) && (
                  <div style={{ marginTop: (content || replyTo) ? '6px' : '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    
                    {/* Render GRID Ảnh Zalo-style */}
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
                            <div key={i} className="mdc-img-bubble" onClick={() => {/* handle preview */}} 
                              style={{ 
                                width: '100%', 
                                aspectRatio: (images.length === 3 && i === 0) ? '2 / 1' : (images.length === 1 ? 'auto' : '1 / 1'),
                                gridColumn: (images.length === 3 && i === 0) ? 'span 2' : 'auto',
                                backgroundColor: '#f0f2f5', margin: 0, borderRadius: 0
                              }}>
                              {isVideo ? (
                                <video src={att.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <img src={att.url} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              )}
                              <a className="mdc-img-dl-btn" href={att.url} target="_blank" rel="noreferrer" title="Tải về" onClick={e=>e.stopPropagation()}><FaDownload size={11}/></a>
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

                    {/* Render Danh sách File Tài liệu */}
                    {docs.length > 0 && docs.map((att, i) => {
                      const fileName = att.name || att.fileName || `Tệp ${i+1}`;
                      const downloadUrl = att.url;
                      return (
                        <div key={`doc-${i}`} className="mdc-file-bubble">
                          <div className="mdc-fb-icon" style={{ background: getFileColor(fileName) }}>
                            {getExt(fileName).toUpperCase().slice(0,4)}
                          </div>
                          <div className="mdc-fb-info">
                            <span className="mdc-fb-name">{fileName}</span>
                            <div className="mdc-fb-meta">{formatBytes(att.size)}</div>
                          </div>
                          <a href={downloadUrl} onClick={e=>e.stopPropagation()} download={fileName} className="mdc-fb-btn"><FaDownload size={13}/></a>
                        </div>
                      );
                    })}

                    {/* Render Tin nhắn thoại (Voice Chat) */}
                    {audios.length > 0 && audios.map((att, i) => (
                      <AudioBubble key={`audio-${i}`} url={att.url} />
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
              <div style={{ position: 'absolute', bottom: '-12px', right: isMe ? '8px' : 'auto', left: isMe ? 'auto' : '8px', display: 'flex', background: '#FFFFFF', padding: '2px 6px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', gap: '2px', zIndex: 2, border: '1px solid #E5E7EB', color: '#111827' }}>
                {reactions.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                    {r.emoji} {reactions.length > 1 && <span style={{ color: '#65676B', fontSize: '10px', marginLeft: '3px', fontWeight: 'bold' }}>{reactions.length}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isRecalled && (
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
                  <div className="mdc-mm-item" onClick={() => { setShowMoreMenu(false); }}>
                    <FaThumbtack size={13} color="#F59E0B" /> Ghim tin nhắn
                  </div>
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
  );
