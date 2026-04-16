import React, { useState, useRef, useEffect } from 'react';
import { FaDownload, FaSpinner, FaCloud, FaThumbtack, FaTrash, FaCopy, FaStar, FaEllipsisH, FaTimes, FaSmile, FaShare, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fmtTime, getCategory, getExt, getFileColor, formatBytes } from './CloudUtils';

const EMOJIS = ['👍','❤️','😂','😲','😢','😡'];

/* Zalo-style reply SVG icon */
const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7"/>
    <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);

export function ImagePreview({url,name,onClose}) {
  return (
    <div className="mdc-img-overlay" onClick={onClose}>
      <div className="mdc-img-box" onClick={e=>e.stopPropagation()}>
        <button className="mdc-img-close" onClick={onClose}><FaTimes size={16}/></button>
        <img src={url} alt={name} className="mdc-img-full"/>
        <div className="mdc-img-name">{name}</div>
      </div>
    </div>
  );
}

export function UploadBubble({name, percent}) {
  return (
    <div className="mdc-msg-wrap me">
      <div className="mdc-msg-body">
        <div className="mdc-uploading-bubble">
          <FaSpinner className="spin" size={14}/>
          <div className="mdc-upl-info">
            <span className="mdc-upl-name">{name}</span>
            <div className="mdc-upl-bar">
              <div className="mdc-upl-fill" style={{width:`${percent}%`}}/>
            </div>
            <span className="mdc-upl-pct">{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CloudMsgBubble({msg, onDelete, onPreview, onReaction, pinnedIds, onPin, onForward, onReply}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowReaction(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mediaList = msg.mediaIds || msg.media || msg.attachments || [];
  const hasMedia = mediaList.length > 0;
  const media = hasMedia ? mediaList[0] : null;
  const isImage = hasMedia && getCategory(media.fileName || "") === "image";
  const reactions = msg.reactions || [];
  const isPinned = pinnedIds?.has(msg._id);

  const copyText = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Đã sao chép");
    setShowMenu(false);
  };

  return (
    <div className="mdc-msg-wrap me" onMouseLeave={()=>{setShowMenu(false);setShowReaction(false);}}>
      {isPinned && <div style={{position:'absolute',top:-8,right:40,fontSize:10,color:'#F59E0B',display:'flex',alignItems:'center',gap:4}}><FaThumbtack size={9}/>Đã ghim</div>}
      <div className="mdc-msg-body">
        {/* Text bubble — wraps reply-quote + content together */}
        {(msg.replyTo || (!hasMedia && msg.content)) && (
          <div className="mdc-text-bubble" style={msg.replyTo ? {padding:0, overflow:'hidden'} : {}}>
            {msg.replyTo && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,0,0,0.18)',
                borderLeft: '3px solid rgba(255,255,255,0.7)',
                padding: '8px 12px',
              }}>
                {/* Thumbnail if reply has image */}
                {(()=>{
                  const rm=(msg.replyTo.mediaIds||msg.replyTo.media||msg.replyTo.attachments||[])[0];
                  const isImg=rm&&getCategory(rm.fileName||'')==='image';
                  return isImg?<img src={rm.url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:4,flexShrink:0}}/>:null;
                })()}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.9)',marginBottom:2}}>
                    {msg.replyTo.senderId?.fullName||msg.replyTo.senderId?.username||msg.replyTo.sender?.fullName||msg.replyTo.sender?.username||'Bạn'}
                  </div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.72)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:230}}>
                    {msg.replyTo.content||(()=>{
                      const rm=(msg.replyTo.mediaIds||msg.replyTo.media||msg.replyTo.attachments||[])[0];
                      if(!rm)return 'Tin nhắn';
                      const cat=getCategory(rm.fileName||'');
                      if(cat==='image')return '[Hình ảnh]';
                      if(cat==='video')return '[Video]';
                      return `[${rm.fileName||'Tệp đính kèm'}]`;
                    })()}
                  </div>
                </div>
              </div>
            )}
            {msg.content && (
              <div style={{padding: msg.replyTo ? '8px 12px' : undefined}}>{msg.content}</div>
            )}
          </div>
        )}

        {/* Image bubble — clean, no filename bar */}
        {hasMedia && isImage && (
          <div className="mdc-img-bubble" onClick={()=>onPreview(media.url, media.fileName)}>
            <img src={media.url} alt={media.fileName} className="mdc-img-thumb"/>
            {/* Floating download button on hover */}
            <a
              className="mdc-img-dl-btn"
              href={media.url}
              target="_blank"
              rel="noreferrer"
              onClick={e=>e.stopPropagation()}
              title="Tải về"
            >
              <FaDownload size={11}/>
            </a>
          </div>
        )}

        {/* File bubble */}
        {hasMedia && !isImage && (
          <div className="mdc-file-bubble">
            <div className="mdc-fb-icon" style={{background:getFileColor(media.fileName)}}>
              <span>{getExt(media.fileName).toUpperCase().slice(0,4) || 'FILE'}</span>
            </div>
            <div className="mdc-fb-info">
              <span className="mdc-fb-name">{media.fileName}</span>
              <div className="mdc-fb-meta">
                <span>{formatBytes(media.size)}</span>
                <span className="mdc-fb-cloud"><FaCloud size={9}/> Đã có trên Cloud</span>
              </div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {/* Preview PDF/docx qua Google Docs Viewer — chỉ với Cloudinary URL */}
              {media.url && media.url.includes('cloudinary.com') && (
                <a
                  className="mdc-fb-btn"
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(media.url)}&embedded=true`}
                  target="_blank"
                  rel="noreferrer"
                  title="Xem trước"
                  style={{fontSize:11,padding:'3px 8px',background:'#3B82F6',color:'#fff',borderRadius:6,textDecoration:'none'}}
                >
                  Xem
                </a>
              )}
              <a className="mdc-fb-btn" href={media.url} target="_blank" rel="noreferrer" title="Tải về"><FaDownload size={13}/></a>
            </div>
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap',justifyContent:'flex-end'}}>
            {reactions.map((r,i)=>(
              <span key={i} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:12,padding:'2px 7px',fontSize:12,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}} onClick={()=>onReaction&&onReaction(msg._id,r.emoji)}>
                {r.emoji} <span style={{fontSize:11,color:'#65676B'}}>{r.count||1}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mdc-msg-time">
          {fmtTime(msg.createdAt)}
          <span className="mdc-msg-sent"><FaCheck size={10} /> Đã gửi</span>
        </div>
      </div>

      {/* Action buttons — Zalo-style pill */}
      <div className="mdc-msg-menu-wrap" ref={menuRef}>
        <div className="mdc-msg-menu-pill">
          {/* Emotion */}
          <button
            className="mdc-pill-btn"
            title="Thả cảm xúc"
            onClick={(e)=>{e.stopPropagation();setShowReaction(v=>!v);setShowMenu(false);}}
          >
            <FaSmile size={12} color="#65676B" />
          </button>

          {/* Reply — Zalo style curved arrow SVG */}
          <button
            className="mdc-pill-btn"
            title="Trả lời"
            onClick={(e)=>{e.stopPropagation();onReply&&onReply(msg);}}
          >
            <ReplyIcon />
          </button>

          {/* Forward */}
          <button className="mdc-pill-btn" title="Chuyển tiếp" onClick={(e)=>{e.stopPropagation();onForward&&onForward(msg);}}>
            <FaShare size={12} color="#65676B" />
          </button>

          {/* More */}
          <button className="mdc-pill-btn" onClick={(e)=>{e.stopPropagation();setShowMenu(v=>!v);setShowReaction(false);}} title="Thêm">
            <FaEllipsisH size={12} color="#65676B" />
          </button>
        </div>

        {/* Emoji reaction tray */}
        {showReaction && (
          <div className="mdc-msg-emoji-tray">
            {EMOJIS.map(e=>(
              <span key={e} onClick={()=>{onReaction&&onReaction(msg._id,e);setShowReaction(false);}} style={{fontSize:20,cursor:'pointer',transition:'transform .1s'}} onMouseEnter={ev=>ev.currentTarget.style.transform='scale(1.3)'} onMouseLeave={ev=>ev.currentTarget.style.transform='scale(1)'}>{e}</span>
            ))}
          </div>
        )}

        {showMenu && (
          <div className="mdc-msg-menu">
            {msg.content && (<div className="mdc-mm-item" onClick={copyText}><FaCopy size={12}/> Sao chép</div>)}
            <div className="mdc-mm-item" onClick={()=>{onPin&&onPin(msg._id);setShowMenu(false);}}><FaThumbtack size={12} color="#F59E0B"/> {isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}</div>
            <div className="mdc-mm-item" onClick={()=>{toast.success("Tin nhắn được đánh dấu");setShowMenu(false);}}><FaStar size={12} color="#F59E0B"/> Đánh dấu tin nhắn</div>
            {hasMedia && (<a className="mdc-mm-item" href={media?.url} target="_blank" rel="noreferrer" onClick={()=>setShowMenu(false)}><FaDownload size={12}/> Lưu về máy</a>)}
            <div style={{borderTop:'1px solid #F0F2F5',margin:'4px 0'}}/>
            <div className="mdc-mm-item danger" onClick={()=>{setShowMenu(false);onDelete(msg._id);}}><FaTrash size={12}/> Xóa</div>
          </div>
        )}
      </div>
    </div>
  );
}
