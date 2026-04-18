import { useState, useEffect, useCallback, useRef } from "react";
import { FaCloud, FaSpinner, FaThumbtack, FaCheck, FaEllipsisV, FaTimes, FaSearch } from "react-icons/fa";
import { uploadFile } from "../../services/mediaService";
import { chatService } from "../../services/chatService";
import { useAuthStore } from "../../store/authStore";
import { useFriendStore } from "../../store/friendStore";
import { socketService } from "../../services/socketService";
import toast from "react-hot-toast";
import "./MyDocumentsPage.css";

import { getCategory } from "./CloudUtils";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");
const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};
const normalizeMsg = (msg) => ({
  ...msg,
  mediaIds: (msg.mediaIds || []).map(m =>
    typeof m === "object" && m.url ? { ...m, url: toAbsoluteUrl(m.url) } : m
  ),
  media: (msg.media || []).map(m =>
    typeof m === "object" && m.url ? { ...m, url: toAbsoluteUrl(m.url) } : m
  ),
});
import { CloudHeader } from "./CloudHeader";
import { CloudInput } from "./CloudInput";
import { CloudRightPanel } from "./CloudRightPanel";
import { CloudMsgBubble, UploadBubble, ImagePreview } from "./CloudMsgBubble";
import { CleanupModal } from "./CleanupModal";

/* ===== MAIN PAGE ===== */
export default function MyDocumentsPage(){
  const{user}=useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const[convId,setConvId]=useState(null);
  const[messages,setMessages]=useState([]);
  const[loading,setLoading]=useState(true);
  const[uploads,setUploads]=useState([]);
  const[isSending,setIsSending]=useState(false);
  const[isDragging,setIsDragging]=useState(false);
  const[shareOpen,setShareOpen]=useState(false);
  const[msgToShare,setMsgToShare]=useState(null);
  const[friendSearch,setFriendSearch]=useState("");
  const[replyTo,setReplyTo]=useState(null);
  
  const[searchQuery,setSearchQuery]=useState("");
  const[filterTab,setFilterTab]=useState("all");
  const[apiSearchResults,setApiSearchResults]=useState(null); // null = chưa search API
  const[isSearching,setIsSearching]=useState(false);
  const searchDebounceRef=useRef(null);
  
  const[showCleanup,setShowCleanup]=useState(false);
  const[preview,setPreview]=useState(null);
  const[pinnedIds,setPinnedIds]=useState(new Set());
  const[showRightPanel, setShowRightPanel] = useState(true);
  const[msgToDelete, setMsgToDelete] = useState(null);
  const[removingId, setRemovingId] = useState(null);

  const pageRef=useRef(null);
  const messagesEndRef=useRef(null);


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
    try{
      const [msgRes, pinRes] = await Promise.all([
        chatService.getMessages(cid,null,100),
        chatService.getPinnedMessages(cid),
      ]);
      const items=msgRes.data?.data?.items||[];
      setMessages([...items].reverse().map(normalizeMsg));
      const pinned=pinRes.data?.data||[];
      setPinnedIds(new Set(pinned.map(p=>p.messageId?._id||p.messageId||p._id)));
    }
    catch(err){console.error("Load msgs:",err);}
  },[]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{setLoading(true);const cid=await getOrCreateSelfConv();if(!cancelled){setConvId(cid);if(cid)await loadMessages(cid);setLoading(false);}})();
    return()=>{cancelled=true;};
  },[getOrCreateSelfConv,loadMessages]);

  // load friend list for forward modal
  useEffect(()=>{ fetchFriends(); },[fetchFriends]);

  // Debounced API search khi query >= 2 ký tự
  useEffect(()=>{
    if(searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if(!searchQuery.trim()||searchQuery.trim().length<2){
      setApiSearchResults(null);
      return;
    }
    searchDebounceRef.current=setTimeout(async()=>{
      if(!convId)return;
      setIsSearching(true);
      try{
        const res=await chatService.searchMessages(convId,searchQuery.trim());
        const items=(res.data?.data?.items||[]).map(normalizeMsg);
        setApiSearchResults(items);
      }catch{setApiSearchResults(null);}
      finally{setIsSearching(false);}
    },500);
    return()=>{if(searchDebounceRef.current)clearTimeout(searchDebounceRef.current);};
  },[searchQuery,convId]);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,uploads]);

  useEffect(()=>{
    if(!convId)return;
    socketService.connect();
    const handler=(msg)=>{
      const cid=msg.conversationId?._id||msg.conversationId;
      if(cid!==convId)return;
      // Bỏ qua nếu đã có trong list (API đã add rồi)
      setMessages(prev=>prev.some(m=>m._id===msg._id)?prev:[...prev,normalizeMsg(msg)]);
    };
    socketService.on("new_message",handler);
    return()=>socketService.off("new_message",handler);
  },[convId]);

  useEffect(()=>{
    const zone=pageRef.current;if(!zone)return;
    const onDragOver=(e)=>{e.preventDefault();setIsDragging(true);};
    const onDragLeave=(e)=>{if(!zone.contains(e.relatedTarget))setIsDragging(false);};
    const onDrop=(e)=>{
      e.preventDefault();
      setIsDragging(false);
      Array.from(e.dataTransfer.files).forEach(f => handleUploadFile(f, null));
    };
    zone.addEventListener("dragover",onDragOver);zone.addEventListener("dragleave",onDragLeave);zone.addEventListener("drop",onDrop);
    return()=>{zone.removeEventListener("dragover",onDragOver);zone.removeEventListener("dragleave",onDragLeave);zone.removeEventListener("drop",onDrop);};
  },[convId]);

  const handleUploadFile=useCallback(async(file, replySnapshot=null)=>{
    if(!convId){toast.error("Chưa sẵn sàng");return;}
    const uid=Date.now()+Math.random();
    setUploads(prev=>[...prev,{id:uid,name:file.name,percent:0}]);
    try{
      const media=await uploadFile(file,{folder:"zaloapp/cloud",onProgress:(pct)=>setUploads(prev=>prev.map(u=>u.id===uid?{...u,percent:pct}:u))});
      
      const payload={conversationId:convId,content:"",mediaIds:[media._id||media.id]};
      if(replySnapshot) payload.replyTo=replySnapshot._id;
      
      const sendRes=await chatService.sendMessage(payload);
      const newMsg=sendRes.data?.data;
      if(newMsg){
        // Gắn media object đầy đủ vào cả media lẫn mediaIds để render ngay
        const normalizedMedia = { ...media, url: toAbsoluteUrl(media.url) };
        newMsg.media=[normalizedMedia];
        newMsg.mediaIds=[normalizedMedia];
        if(replySnapshot && !newMsg.replyTo){
          newMsg.replyTo = replySnapshot;
        }
        setMessages(prev=>[...prev,newMsg]);
      }
      setUploads(prev=>prev.filter(u=>u.id!==uid));
      toast.success("Đã lưu: "+file.name);
    }catch(err){setUploads(prev=>prev.filter(u=>u.id!==uid));toast.error(err.message||"Tải lên thất bại");}
  },[convId]);

  const handleUploadFiles=(files, replyToId=null)=>{
    // Get full object from state using the replyToId if we assume we just pass replyTo object
    // Wait, the input gives us replyToId, let's just pass `replyTo` from state directly? No, CloudInput doesn't pass the object back, 
    // it passes replyToId. Oh well, we can just grab `replyTo` state variable inside handleUploadFiles!
    const replySnapshot = replyTo;
    files.forEach(f => handleUploadFile(f, replySnapshot));
  };

  const handleSendText=async(text, replyToId=null)=>{
    if(!text.trim()||!convId||isSending)return;
    setIsSending(true);
    const replySnapshot = replyTo;
    try{
      const payload={conversationId:convId,content:text.trim()};
      if(replyToId) payload.replyTo=replyToId;
      const res=await chatService.sendMessage(payload);
      const newMsg=res.data?.data;
      if(newMsg){
        if(replySnapshot && !newMsg.replyTo) newMsg.replyTo = replySnapshot;
        setMessages(prev=>[...prev,newMsg]);
      }
    }
    catch(err){toast.error("Gửi thất bại: "+(err.response?.data?.message||err.message));}
    finally{setIsSending(false);setReplyTo(null);}
  };

  const confirmDelete = (msgId) => {
    setMsgToDelete(msgId);
  };

  const executeDelete = async () => {
    if (!msgToDelete) return;
    try {
      await chatService.deleteMessage(msgToDelete);
      // Kích hoạt hiệu ứng biến mất
      setRemovingId(msgToDelete);
      
      // Đợi animation chạy xong (300ms) mới xóa khỏi state
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m._id !== msgToDelete));
        setRemovingId(null);
        toast.success("Đã xóa tin nhắn", {
          icon: '🗑️',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      }, 300);
    } catch(err) {
      toast.error("Xóa thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setMsgToDelete(null);
    }
  };

  const handleBulkDelete = async (msgIds) => {
    if(!window.confirm(`Xóa ${msgIds.length} tin nhắn đã chọn?`))return;
    try{
      await Promise.all(msgIds.map(id=>chatService.deleteMessage(id)));
      setMessages(prev=>prev.filter(m=>!msgIds.includes(m._id)));
      toast.success(`Đã xóa ${msgIds.length} mục`);
    }catch(err){toast.error("Xóa thất bại");}
  };

  const handleReaction=async(msgId, emoji)=>{
    try{
      await chatService.reactMessage?.(msgId, emoji);
      setMessages(prev=>prev.map(m=>{
        if(m._id!==msgId)return m;
        const reactions=m.reactions||[];
        const existing=reactions.find(r=>r.emoji===emoji);
        if(existing){
          const updated = reactions.map(r=>r.emoji===emoji?{...r,count:(r.count||1)-1}:r).filter(r=>r.count>0);
          return {...m,reactions:updated};
        }
        return {...m,reactions:[...reactions,{emoji,count:1}]};
      }));
    }catch(err){console.error("Reaction err:",err);}
  };

  const handlePin=async(msgId)=>{
    const isPinned=pinnedIds.has(msgId);
    if(!isPinned&&pinnedIds.size>=3){
      toast.error("Chỉ được ghim tối đa 3 tin nhắn. Vui lòng bỏ ghim tin nhắn cũ trước.");
      return;
    }
    try{
      if(isPinned){
        await chatService.unpinMessage(convId,msgId);
        setPinnedIds(prev=>{const s=new Set(prev);s.delete(msgId);return s;});
        toast.success("Đã bỏ ghim");
      }else{
        await chatService.pinMessage(convId,msgId);
        setPinnedIds(prev=>new Set([...prev,msgId]));
        toast.success("Đã ghim lên đầu");
      }
    }catch(err){
      toast.error("Thao tác ghim thất bại: "+(err.response?.data?.message||err.message));
    }
  };

  const openShareModal=(msg)=>{
    setMsgToShare(msg);
    setFriendSearch("");
    setShareOpen(true);
  };

  const executeForward=async(friend)=>{
    if(!msgToShare)return;
    try{
      const targetId=friend._id||friend.id;
      // Tìm hoặc tạo conversation với bạn
      const res=await chatService.getConversations(null,100);
      const convs=res.data?.data?.items||[];
      let targetConvId=null;
      const existing=convs.find(c=>c.type==="direct"&&c.participants?.some(p=>(p._id||p.id||p)===targetId));
      if(existing){
        targetConvId=existing._id;
      }else{
        const cr=await chatService.createConversation({type:"direct",participantIds:[targetId]});
        targetConvId=cr.data?.data?._id||cr.data?.data?.id;
      }
      // Gửi nội dung tin nhắn đầu tiên
      const content=msgToShare.content||""; 
      const mediaIds=(msgToShare.mediaIds||msgToShare.media||msgToShare.attachments||[]).map(m=>m._id||m.id||m);
      await chatService.sendMessage({conversationId:targetConvId,content,mediaIds});
      toast.success(`Đã chuyển tiếp tới ${friend.fullName||friend.username}`);
      setShareOpen(false);
    }catch(err){
      toast.error("Chuyển tiếp thất bại: "+(err.response?.data?.message||err.message));
    }
  };

  // Dùng kết quả API search nếu có, ngược lại dùng client-side filter
  const baseList = apiSearchResults !== null ? apiSearchResults : messages;
  const filtered = baseList.filter(msg=>{
    const media=msg.mediaIds?.[0]||msg.media?.[0];
    let passTab=true;
    if(filterTab==="text")passTab=!media&&!!msg.content;
    else if(filterTab==="image")passTab=!!media&&["image","video"].includes(getCategory(media.fileName||""));
    else if(filterTab==="file")passTab=!!media&&!["image","video"].includes(getCategory(media.fileName||""));

    // Client-side filter chỉ áp dụng khi chưa có API results
    let passSearch=true;
    if(apiSearchResults===null&&searchQuery.trim()){
      const q=searchQuery.toLowerCase();
      const inContent=(msg.content||"").toLowerCase().includes(q);
      const inFileName=(media?.fileName||"").toLowerCase().includes(q);
      passSearch=inContent||inFileName;
    }
    return passTab&&passSearch;
  });

  const sortedFiltered = filtered;
  const pinnedMessages = messages.filter(m => pinnedIds.has(m._id));

  const grouped = sortedFiltered.reduce((acc, msg) => {
    const dateLabel = new Date(msg.createdAt).toLocaleDateString("vi-VN", {day: '2-digit', month: '2-digit', year: 'numeric'});
    if(!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(msg);
    return acc;
  }, {});

  const allMedia = messages.flatMap(m => m.mediaIds || m.media || []);
  const totalBytes = allMedia.reduce((s, m) => s + (m.size || 0), 0);
  const pctUsed = Math.min(100, (totalBytes / (1024 * 1024 * 1024)) * 100);
  const imgFiles = allMedia.filter(m => ["image", "video"].includes(getCategory(m.fileName || "")));
  const docFiles = allMedia.filter(m => !["image", "video"].includes(getCategory(m.fileName || "")));

  return (
    <div className="mdc-page" ref={pageRef}>
      {isDragging&&(<div className="mdc-drag-overlay"><div className="mdc-drag-inner"><FaCloud size={52}/><p>Thả file vào đây để lưu trữ</p></div></div>)}
      
      <div className="mdc-chat-area">
        <CloudHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onInfo={() => setShowRightPanel(p => !p)}
          currentFilter={filterTab}
          onFilterChange={setFilterTab}
        />

        {pinnedMessages.length > 0 && (
          <div className="mdc-pinned-banner">
            <div className="mdc-pinned-icon-wrap"><FaThumbtack size={12} style={{transform:'rotate(0deg)'}}/></div>
            <div className="mdc-pinned-info">
              <div className="mdc-pinned-title">Tin nhắn</div>
              <div className="mdc-pinned-text">
                {(() => {
                  const m = pinnedMessages[pinnedMessages.length - 1];
                  if (m.content) return m.content;
                  const media = m.mediaIds?.[0] || m.media?.[0];
                  return media ? `[Tập tin] ${media.fileName}` : "Tin nhắn đã ghim";
                })()}
              </div>
            </div>
            <div className="mdc-pinned-actions">
              {pinnedMessages.length > 1 && (
                <div className="mdc-pinned-count">+{pinnedMessages.length - 1} ghim <FaCheck size={10} style={{transform:'rotate(90deg)', marginLeft:4}}/></div>
              )}
              <button className="mdc-pinned-close" onClick={() => handlePin(pinnedMessages[pinnedMessages.length-1]._id)} title="Bỏ ghim">
                <FaEllipsisV size={14}/>
              </button>
            </div>
          </div>
        )}


        {searchQuery&&(
          <div style={{padding:'4px 16px',fontSize:12,color:'#8A8D91',background:'var(--z-bg-secondary)',display:'flex',alignItems:'center',gap:6}}>
            {isSearching
              ? <><FaSpinner className="spin" size={11}/> Đang tìm kiếm...</>
              : <>Tìm thấy <strong>{filtered.length}</strong> kết quả cho "<strong>{searchQuery}</strong>"{apiSearchResults!==null&&<span style={{color:'#60a5fa',marginLeft:4}}>(kết quả từ server)</span>}</>
            }
          </div>
        )}

        <div className="mdc-messages" style={{ flex: 1, overflowY: 'auto' }}>
          {loading?(<div className="mdc-loading"><FaSpinner className="spin" size={28}/></div>):filtered.length===0&&uploads.length===0?(
            <div className="mdc-empty"><div className="mdc-empty-icon"><FaCloud size={52}/></div><h3>{searchQuery?"Không tìm thấy kết quả":"Chưa có nội dung nào"}</h3><p>{searchQuery?`Không có file nào chứa từ khóa "${searchQuery}"`:"Gửi ảnh, video, tài liệu hoặc ghi chú để lưu trữ cá nhân"}</p></div>
          ):(
            <>{Object.entries(grouped).map(([dateLabel,items])=>(<div key={dateLabel}><div className="mdc-date-sep">{dateLabel}</div>{items.map(msg=>(<CloudMsgBubble key={msg._id} msg={msg} isRemoving={removingId===msg._id} onDelete={confirmDelete} onPreview={(url,name)=>setPreview({url,name})} onReaction={handleReaction} pinnedIds={pinnedIds} onPin={handlePin} onForward={openShareModal} onReply={(m)=>setReplyTo(m)} searchQuery={searchQuery}/>))}</div>))}{uploads.map(u=>(<UploadBubble key={u.id} name={u.name} percent={u.percent}/>))}</>

          )}
          <div ref={messagesEndRef}/>
        </div>

        <CloudInput
          onSendText={handleSendText}
          isSending={isSending}
          onUploadFiles={handleUploadFiles}
          replyTo={replyTo}
          onClearReply={()=>setReplyTo(null)}
        />
      </div>

      {showRightPanel && (
        <CloudRightPanel
          totalBytes={totalBytes}
          pctUsed={pctUsed}
          setShowCleanup={setShowCleanup}
          imgFiles={imgFiles}
          docFiles={docFiles}
          setFilterTab={setFilterTab}
          setPreview={setPreview}
        />
      )}

      {preview&&<ImagePreview url={preview.url} name={preview.name} onClose={()=>setPreview(null)}/>}
      {showCleanup&&<CleanupModal messages={messages} onDelete={handleBulkDelete} onClose={()=>setShowCleanup(false)}/>}

      {/* Share / Forward Modal */}
      {shareOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShareOpen(false)}>
          <div style={{background:'#fff',borderRadius:12,width:420,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 8px 32px rgba(0,0,0,0.22)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid #F0F2F5'}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:'#050505'}}>Chuyển tiếp tin nhắn</h3>
              <button onClick={()=>setShareOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#65676B',padding:4}}><FaTimes size={16}/></button>
            </div>
            <div style={{padding:'12px 20px',borderBottom:'1px solid #F0F2F5'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'#F0F2F5',borderRadius:8,padding:'8px 12px'}}>
                <FaSearch size={13} color="#8A8D91"/>
                <input
                  autoFocus
                  style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:14,color:'#050505'}}
                  placeholder="Tìm kiếm bạn bè..."
                  value={friendSearch}
                  onChange={e=>setFriendSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
              {friends.filter(f=>(f.fullName||f.username||"").toLowerCase().includes(friendSearch.toLowerCase())).length===0
                ? <div style={{textAlign:'center',color:'#8A8D91',padding:24,fontSize:14}}>Không tìm thấy bạn bè nào</div>
                : friends.filter(f=>(f.fullName||f.username||"").toLowerCase().includes(friendSearch.toLowerCase())).map((friend,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 20px',cursor:'pointer',transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#F0F2F5'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <img src={friend.avatarUrl||friend.avatar||`https://i.pravatar.cc/150?u=${friend._id}`} alt="avt" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover'}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:'#050505'}}>{friend.fullName||friend.username}</div>
                        {friend.username&&friend.fullName&&<div style={{fontSize:12,color:'#8A8D91'}}>@{friend.username}</div>}
                      </div>
                    </div>
                    <button
                      onClick={()=>executeForward(friend)}
                      style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#0068FF',color:'#fff',cursor:'pointer',fontWeight:600,fontSize:13,flexShrink:0}}
                    >Gửi</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
      {/* Modal xác nhận xóa tin nhắn */}
      {msgToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-sidebar, #fff)', width: 400, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'slideDown 0.2s ease-out' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #E5E7EB)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #111827)' }}>Xác nhận xóa</h3>
            </div>
            <div style={{ padding: '20px', fontSize: 14, color: 'var(--text-secondary, #4B5563)' }}>
              Bạn có chắc chắn muốn xóa tin nhắn này không? Tin nhắn đã xóa sẽ không thể khôi phục.
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color, #E5E7EB)', background: 'var(--bg-hover, #F9FAFB)' }}>
              <button 
                onClick={() => setMsgToDelete(null)}
                style={{ padding: '8px 16px', background: 'var(--bg-main, #EAECEF)', color: 'var(--text-primary, #111827)', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button 
                onClick={executeDelete}
                style={{ padding: '8px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}