import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { FaCloud, FaDownload, FaFileVideo, FaPlus, FaSearch, FaTrash, FaSpinner, FaTimes, FaPaperPlane, FaEllipsisV } from "react-icons/fa";
import { uploadFile } from "../../services/mediaService";
import { chatService } from "../../services/chatService";
import { useAuthStore } from "../../store/authStore";
import { socketService } from "../../services/socketService";
import toast from "react-hot-toast";
import "./MyDocumentsPage.css";

const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];
const DOC_EXTS = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"];
const ARCHIVE_EXTS = ["zip","rar","7z","tar","gz"];

function getExt(s=""){return(s.split(".").pop()||"").toLowerCase();}
function getCategory(n=""){const e=getExt(n);if(IMAGE_EXTS.includes(e))return"image";if(VIDEO_EXTS.includes(e))return"video";if(DOC_EXTS.includes(e))return"doc";if(ARCHIVE_EXTS.includes(e))return"archive";return"other";}
function getFileColor(n=""){const e=getExt(n);if(IMAGE_EXTS.includes(e))return"#10B981";if(VIDEO_EXTS.includes(e))return"#8B5CF6";if(e==="pdf")return"#EF4444";if(["doc","docx"].includes(e))return"#2563EB";if(["xls","xlsx"].includes(e))return"#16A34A";if(["ppt","pptx"].includes(e))return"#EA580C";if(ARCHIVE_EXTS.includes(e))return"#D97706";return"#6B7280";}
function formatBytes(b){if(!b)return"0 B";const k=1024,s=["B","KB","MB","GB"];const i=Math.floor(Math.log(b)/Math.log(k));return parseFloat((b/Math.pow(k,i)).toFixed(1))+" "+s[i];}
function fmtTime(d){if(!d)return"";try{return format(new Date(d),"HH:mm");}catch{return"";}}
function fmtDateSep(d){if(!d)return"";try{const date=new Date(d);const now=new Date();const diff=Math.floor((now-date)/86400000);if(diff===0)return"Hôm nay";if(diff===1)return"Hôm qua";const days=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];if(diff<7)return days[date.getDay()]+" "+format(date,"dd/MM");return format(date,"dd/MM/yyyy");}catch{return"";}}

function ImagePreview({url,name,onClose}){return(<div className="mdc-img-overlay" onClick={onClose}><div className="mdc-img-box" onClick={e=>e.stopPropagation()}><button className="mdc-img-close" onClick={onClose}><FaTimes size={16}/></button><img src={url} alt={name} className="mdc-img-full"/><div className="mdc-img-name">{name}</div></div></div>);}

function MsgBubble({msg,onDelete,onPreview}){
  const [showMenu,setShowMenu]=useState(false);
  const menuRef=useRef(null);
  useEffect(()=>{if(!showMenu)return;const h=(e)=>{if(menuRef.current&&!menuRef.current.contains(e.target))setShowMenu(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[showMenu]);
  if(msg.isRecalled)return(<div className="mdc-msg-wrap me"><div className="mdc-msg-body"><div className="mdc-recalled">Tin nhắn đã được thu hồi</div><div className="mdc-msg-time">{fmtTime(msg.createdAt)}</div></div></div>);
  const media=msg.mediaIds?.[0]||msg.media?.[0]||null;
  const hasMedia=!!media;
  const isImage=hasMedia&&IMAGE_EXTS.includes(getExt(media.fileName||""));
  return(
    <div className="mdc-msg-wrap me" onMouseLeave={()=>setShowMenu(false)}>
      <div className="mdc-msg-body">
        {!hasMedia&&msg.content&&<div className="mdc-text-bubble">{msg.content}</div>}
        {hasMedia&&isImage&&(<div className="mdc-img-bubble" onClick={()=>onPreview(media.url,media.fileName)}><img src={media.url} alt={media.fileName} className="mdc-img-thumb"/><div className="mdc-img-bar"><span>{media.fileName}</span><a href={media.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}><FaDownload size={11}/></a></div></div>)}
        {hasMedia&&!isImage&&(<div className="mdc-file-bubble"><div className="mdc-fb-icon" style={{background:getFileColor(media.fileName)}}><span>{getExt(media.fileName).toUpperCase().slice(0,4)}</span></div><div className="mdc-fb-info"><span className="mdc-fb-name">{media.fileName}</span><div className="mdc-fb-meta"><span>{formatBytes(media.size)}</span><span className="mdc-fb-cloud"><FaCloud size={9}/> Đã có trên Cloud</span></div></div><a className="mdc-fb-btn" href={media.url} target="_blank" rel="noreferrer"><FaDownload size={13}/></a></div>)}
        <div className="mdc-msg-time">{fmtTime(msg.createdAt)}<span className="mdc-msg-sent">✓ Đã gửi</span></div>
      </div>
      <div className="mdc-msg-menu-wrap" ref={menuRef}>
        <button className="mdc-msg-menu-btn" onClick={()=>setShowMenu(v=>!v)}><FaEllipsisV size={11}/></button>
        {showMenu&&(<div className="mdc-msg-menu">{hasMedia&&(<a className="mdc-mm-item" href={media?.url} target="_blank" rel="noreferrer" onClick={()=>setShowMenu(false)}><FaDownload size={12}/> Lưu về máy</a>)}<div className="mdc-mm-item danger" onClick={()=>{setShowMenu(false);onDelete(msg._id);}}><FaTrash size={12}/> Xóa</div></div>)}
      </div>
    </div>
  );
}

function UploadBubble({name,percent}){return(<div className="mdc-msg-wrap me"><div className="mdc-msg-body"><div className="mdc-uploading-bubble"><FaSpinner className="spin" size={14}/><div className="mdc-upl-info"><span className="mdc-upl-name">{name}</span><div className="mdc-upl-bar"><div className="mdc-upl-fill" style={{width:`${percent}%`}}/></div><span className="mdc-upl-pct">{percent}%</span></div></div></div></div>);}

export default function MyDocumentsPage(){
  const{user}=useAuthStore();
  const[convId,setConvId]=useState(null);
  const[messages,setMessages]=useState([]);
  const[loading,setLoading]=useState(true);
  const[uploads,setUploads]=useState([]);
  const[textInput,setTextInput]=useState("");
  const[isSending,setIsSending]=useState(false);
  const[preview,setPreview]=useState(null);
  const[isDragging,setIsDragging]=useState(false);
  const[filterTab,setFilterTab]=useState("all");
  const imageInputRef=useRef(null);
  const videoInputRef=useRef(null);
  const fileInputRef=useRef(null);
  const messagesEndRef=useRef(null);
  const pageRef=useRef(null);

  const getOrCreateSelfConv=useCallback(async()=>{
    if(!user)return null;
    try{
      const res=await chatService.getConversations(null,100);
      const convs=res.data?.data?.items||[];
      const myId=user._id||user.id;
      const selfConv=convs.find(c=>c.type==="direct"&&c.participants?.every(p=>(p._id||p.id||p)===myId));
      if(selfConv)return selfConv._id;
      const cr=await chatService.createConversation({type:"direct",participantIds:[myId]});
      return cr.data?.data?._id||cr.data?.data?.id;
    }catch(err){console.error("Self conv:",err);return null;}
  },[user]);

  const loadMessages=useCallback(async(cid)=>{
    if(!cid)return;
    try{const res=await chatService.getMessages(cid,null,100);const items=res.data?.data?.items||[];setMessages([...items].reverse());}
    catch(err){console.error("Load msgs:",err);}
  },[]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{setLoading(true);const cid=await getOrCreateSelfConv();if(!cancelled){setConvId(cid);if(cid)await loadMessages(cid);setLoading(false);}})();
    return()=>{cancelled=true;};
  },[getOrCreateSelfConv,loadMessages]);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,uploads]);

  useEffect(()=>{
    if(!convId)return;
    socketService.connect();
    const handler=(msg)=>{const cid=msg.conversationId?._id||msg.conversationId;if(cid===convId)setMessages(prev=>prev.some(m=>m._id===msg._id)?prev:[...prev,msg]);};
    socketService.on("new_message",handler);
    return()=>socketService.off("new_message",handler);
  },[convId]);

  useEffect(()=>{
    const zone=pageRef.current;if(!zone)return;
    const onDragOver=(e)=>{e.preventDefault();setIsDragging(true);};
    const onDragLeave=(e)=>{if(!zone.contains(e.relatedTarget))setIsDragging(false);};
    const onDrop=(e)=>{e.preventDefault();setIsDragging(false);Array.from(e.dataTransfer.files).forEach(handleUploadFile);};
    zone.addEventListener("dragover",onDragOver);zone.addEventListener("dragleave",onDragLeave);zone.addEventListener("drop",onDrop);
    return()=>{zone.removeEventListener("dragover",onDragOver);zone.removeEventListener("dragleave",onDragLeave);zone.removeEventListener("drop",onDrop);};
  },[convId]);

  const handleUploadFile=useCallback(async(file)=>{
    if(!convId){toast.error("Chưa sẵn sàng");return;}
    const uid=Date.now()+Math.random();
    setUploads(prev=>[...prev,{id:uid,name:file.name,percent:0}]);
    try{
      const media=await uploadFile(file,{folder:"zaloapp/cloud",onProgress:(pct)=>setUploads(prev=>prev.map(u=>u.id===uid?{...u,percent:pct}:u))});
      const sendRes=await chatService.sendMessage({conversationId:convId,content:"",mediaIds:[media._id||media.id]});
      const newMsg=sendRes.data?.data;
      if(newMsg){newMsg.media=[media];setMessages(prev=>[...prev,newMsg]);}
      setUploads(prev=>prev.filter(u=>u.id!==uid));
      toast.success("Đã lưu: "+file.name);
    }catch(err){setUploads(prev=>prev.filter(u=>u.id!==uid));toast.error(err.message||"Tải lên thất bại");}
  },[convId]);

  const handleFileInput=(e)=>{Array.from(e.target.files).forEach(handleUploadFile);e.target.value="";};

  const handleSendText=async()=>{
    if(!textInput.trim()||!convId||isSending)return;
    setIsSending(true);
    try{const res=await chatService.sendMessage({conversationId:convId,content:textInput.trim()});const newMsg=res.data?.data;if(newMsg)setMessages(prev=>[...prev,newMsg]);setTextInput("");}
    catch(err){toast.error("Gửi thất bại: "+(err.response?.data?.message||err.message));}
    finally{setIsSending(false);}
  };

  const handleDelete=async(msgId)=>{
    if(!window.confirm("Xóa tin nhắn này?"))return;
    try{await chatService.deleteMessage(msgId);setMessages(prev=>prev.filter(m=>m._id!==msgId));toast.success("Đã xóa");}
    catch(err){toast.error("Xóa thất bại: "+(err.response?.data?.message||err.message));}
  };

  const filtered=messages.filter(msg=>{
    if(filterTab==="all")return true;
    const media=msg.mediaIds?.[0]||msg.media?.[0];
    if(filterTab==="text")return!media&&!!msg.content;
    if(!media)return false;
    const cat=getCategory(media.fileName||"");
    if(filterTab==="image")return["image","video"].includes(cat);
    if(filterTab==="file")return!["image","video"].includes(cat);
    return true;
  });

  const grouped=filtered.reduce((acc,msg)=>{const key=fmtDateSep(msg.createdAt);if(!acc[key])acc[key]=[];acc[key].push(msg);return acc;},{});
  const allMedia=messages.flatMap(m=>m.mediaIds||m.media||[]);
  const totalBytes=allMedia.reduce((s,m)=>s+(m.size||0),0);
  const pctUsed=Math.min(100,(totalBytes/(1024*1024*1024))*100);
  const imgFiles=allMedia.filter(m=>["image","video"].includes(getCategory(m.fileName)));
  const docFiles=allMedia.filter(m=>!["image","video"].includes(getCategory(m.fileName)));

  return(
    <div className="mdc-page" ref={pageRef}>
      {isDragging&&(<div className="mdc-drag-overlay"><div className="mdc-drag-inner"><FaCloud size={52}/><p>Thả file vào đây để lưu trữ</p></div></div>)}
      <div className="mdc-chat-area">
        <div className="mdc-header">
          <div className="mdc-header-left"><div className="mdc-header-icon"><FaCloud size={20}/></div><div><div className="mdc-header-title">My Documents</div><div className="mdc-header-sub">Lưu và đồng bộ dữ liệu giữa các thiết bị</div></div></div>
          <div className="mdc-header-actions"><button className="mdc-hdr-btn"><FaSearch size={15}/></button><button className="mdc-hdr-btn"><FaEllipsisV size={15}/></button></div>
        </div>
        <div className="mdc-filter-tabs">
          {[{k:"all",l:"Tất cả"},{k:"image",l:"Ảnh/Video"},{k:"file",l:"File"},{k:"text",l:"Ghi chú"}].map(t=>(<button key={t.k} className={`mdc-ftab ${filterTab===t.k?"active":""}`} onClick={()=>setFilterTab(t.k)}>{t.l}</button>))}
        </div>
        <div className="mdc-messages">
          {loading?(<div className="mdc-loading"><FaSpinner className="spin" size={28}/></div>):filtered.length===0&&uploads.length===0?(
            <div className="mdc-empty"><div className="mdc-empty-icon"><FaCloud size={52}/></div><h3>Chưa có nội dung nào</h3><p>Gửi ảnh, video, tài liệu hoặc ghi chú để lưu trữ cá nhân</p><button className="mdc-empty-btn" onClick={()=>fileInputRef.current?.click()}><FaPlus size={13}/> Tải lên ngay</button></div>
          ):(
            <>{Object.entries(grouped).map(([dateLabel,items])=>(<div key={dateLabel}><div className="mdc-date-sep">{dateLabel}</div>{items.map(msg=>(<MsgBubble key={msg._id} msg={msg} onDelete={handleDelete} onPreview={(url,name)=>setPreview({url,name})}/>))}</div>))}{uploads.map(u=>(<UploadBubble key={u.id} name={u.name} percent={u.percent}/>))}</>
          )}
          <div ref={messagesEndRef}/>
        </div>
        <div className="mdc-input-area">
          <input ref={imageInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
          <input ref={videoInputRef} type="file" accept="video/*" multiple style={{display:"none"}} onChange={handleFileInput}/>
          <input ref={fileInputRef} type="file" multiple style={{display:"none"}} onChange={handleFileInput} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"/>
          <div className="mdc-toolbar">
            <button className="mdc-tool-btn" title="Gửi ảnh" onClick={()=>imageInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
            <button className="mdc-tool-btn" title="Đính kèm file" onClick={()=>fileInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
            <button className="mdc-tool-btn" title="Gửi video" onClick={()=>videoInputRef.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></button>
            <button className="mdc-tool-btn" title="Gửi thư mục" onClick={()=>{if(fileInputRef.current){fileInputRef.current.setAttribute("webkitdirectory","");fileInputRef.current.click();}}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
          </div>
          <div className="mdc-input-row">
            <div className="mdc-input-wrap"><input className="mdc-input" value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Nhập @, tin nhắn tới My Documents" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)handleSendText();}}/></div>
            {textInput.trim()?(<button className="mdc-send-btn" onClick={handleSendText} disabled={isSending}>{isSending?<FaSpinner className="spin" size={14}/>:<FaPaperPlane size={15}/>}</button>):(<button className="mdc-like-btn" onClick={()=>fileInputRef.current?.click()}><FaPlus size={16}/></button>)}
          </div>
        </div>
      </div>
      <div className="mdc-info-panel">
        <div className="mdc-ip-header"><div className="mdc-ip-icon"><FaCloud size={28}/></div><h3>My Documents</h3><p>Lưu trữ và truy cập nhanh những nội dung quan trọng của bạn ngay trên ZaloApp</p></div>
        <div className="mdc-ip-section">
          <div className="mdc-ip-storage-row"><span className="mdc-ip-label">Dung lượng</span><span className="mdc-ip-value">{formatBytes(totalBytes)} / 1 GB</span></div>
          <div className="mdc-ip-progress"><div className="mdc-ip-pg-img" style={{width:`${Math.min(pctUsed*0.6,60)}%`}}/><div className="mdc-ip-pg-vid" style={{width:`${Math.min(pctUsed*0.2,20)}%`}}/><div className="mdc-ip-pg-doc" style={{width:`${Math.min(pctUsed*0.15,15)}%`}}/><div className="mdc-ip-pg-other" style={{width:`${Math.min(pctUsed*0.05,5)}%`}}/></div>
          <div className="mdc-ip-legend"><span><div className="mdc-ip-dot" style={{background:"#F59E0B"}}/>Ảnh</span><span><div className="mdc-ip-dot" style={{background:"#10B981"}}/>Video</span><span><div className="mdc-ip-dot" style={{background:"#3B82F6"}}/>File</span><span><div className="mdc-ip-dot" style={{background:"#94A3B8"}}/>Khác</span></div>
          <button className="mdc-ip-clean-btn">Xem và dọn dẹp My Documents</button>
        </div>
        <div className="mdc-ip-upgrade"><div className="mdc-ip-upgrade-icon">ℹ️</div><div><div className="mdc-ip-upgrade-title">Nâng cấp dung lượng My Documents</div><div className="mdc-ip-upgrade-desc">Mở rộng lên đến 100GB và tự động bảo toàn dữ liệu trò chuyện với zCloud.</div><button className="mdc-ip-upgrade-btn">Thêm dung lượng</button></div></div>
        <div className="mdc-ip-section"><div className="mdc-ip-section-title">⏰ Danh sách nhắc hẹn</div><div className="mdc-ip-empty-sub">Chưa có nhắc hẹn nào</div></div>
        <div className="mdc-ip-section">
          <div className="mdc-ip-section-title-row"><span>Ảnh/Video</span><button className="mdc-ip-view-all" onClick={()=>setFilterTab("image")}>Xem tất cả</button></div>
          <div className="mdc-ip-media-grid">{imgFiles.slice(0,6).map((m,i)=>(<div key={i} className="mdc-ip-media-item" onClick={()=>setPreview({url:m.url,name:m.fileName})}>{getCategory(m.fileName)==="image"?<img src={m.url} alt=""/>:<div className="mdc-ip-video-thumb"><FaFileVideo size={20} color="white"/></div>}</div>))}{imgFiles.length===0&&<div className="mdc-ip-empty-sub">Chưa có ảnh/video</div>}</div>
        </div>
        <div className="mdc-ip-section">
          <div className="mdc-ip-section-title-row"><span>File</span><button className="mdc-ip-view-all" onClick={()=>setFilterTab("file")}>Xem tất cả</button></div>
          {docFiles.slice(0,3).map((m,i)=>(<div key={i} className="mdc-ip-file-row"><div className="mdc-ip-file-icon" style={{background:getFileColor(m.fileName)}}><span>{getExt(m.fileName).toUpperCase().slice(0,3)}</span></div><div className="mdc-ip-file-info"><span className="mdc-ip-file-name">{m.fileName}</span><span className="mdc-ip-file-size">{formatBytes(m.size)}</span></div><a href={m.url} target="_blank" rel="noreferrer" className="mdc-ip-file-dl"><FaDownload size={12}/></a></div>))}
          {docFiles.length===0&&<div className="mdc-ip-empty-sub">Chưa có file tài liệu</div>}
        </div>
      </div>
      {preview&&<ImagePreview url={preview.url} name={preview.name} onClose={()=>setPreview(null)}/>}
    </div>
  );
}
