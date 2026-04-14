import { format } from "date-fns";

const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","svg"];
const VIDEO_EXTS = ["mp4","mov","avi","mkv","webm"];
const DOC_EXTS = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"];
const ARCHIVE_EXTS = ["zip","rar","7z","tar","gz"];

export function getExt(s=""){return(s.split(".").pop()||"").toLowerCase();}

export function getCategory(n=""){
  const e=getExt(n);
  if(IMAGE_EXTS.includes(e))return"image";
  if(VIDEO_EXTS.includes(e))return"video";
  if(DOC_EXTS.includes(e))return"doc";
  if(ARCHIVE_EXTS.includes(e))return"archive";
  return"other";
}

export function getFileColor(n=""){
  const e=getExt(n);
  if(IMAGE_EXTS.includes(e))return"#10B981";
  if(VIDEO_EXTS.includes(e))return"#8B5CF6";
  if(e==="pdf")return"#EF4444";
  if(["doc","docx"].includes(e))return"#2563EB";
  if(["xls","xlsx"].includes(e))return"#16A34A";
  if(["ppt","pptx"].includes(e))return"#EA580C";
  if(ARCHIVE_EXTS.includes(e))return"#D97706";
  return"#6B7280";
}

export function formatBytes(b){
  if(!b)return"0 B";
  const k=1024,s=["B","KB","MB","GB"];
  const i=Math.floor(Math.log(b)/Math.log(k));
  return parseFloat((b/Math.pow(k,i)).toFixed(1))+" "+s[i];
}

export function fmtTime(d){
  if(!d)return"";
  try{return format(new Date(d),"HH:mm");}catch{return"";}
}

export function fmtDateSep(d){
  if(!d)return"";
  try{
    const date=new Date(d);
    const now=new Date();
    const diff=Math.floor((now-date)/86400000);
    if(diff===0)return"Hôm nay";
    if(diff===1)return"Hôm qua";
    const days=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
    if(diff<7)return days[date.getDay()]+" "+format(date,"dd/MM");
    return format(date,"dd/MM/yyyy");
  }catch{return"";}
}
