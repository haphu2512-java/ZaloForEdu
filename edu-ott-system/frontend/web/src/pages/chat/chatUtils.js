export const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
export const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm"];
export const DOC_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "txt", "csv"];
export const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz"];
export const AUDIO_EXTS = ["mp3", "wav", "ogg", "m4a"];

export function getExt(s = "") {
  return (s.split(".").pop() || "").toLowerCase();
}

export function getCategory(n = "") {
  const e = getExt(n);
  if (IMAGE_EXTS.includes(e)) return "image";
  if (VIDEO_EXTS.includes(e)) return "video";
  if (DOC_EXTS.includes(e)) return "doc";
  if (ARCHIVE_EXTS.includes(e)) return "archive";
  if (AUDIO_EXTS.includes(e)) return "audio";
  return "other";
}

export function getFileColor(n = "") {
  const e = getExt(n);
  if (IMAGE_EXTS.includes(e)) return "#10B981";
  if (VIDEO_EXTS.includes(e)) return "#8B5CF6";
  if (e === "pdf") return "#EF4444";
  if (["doc", "docx"].includes(e)) return "#2563EB";
  if (["xls", "xlsx"].includes(e)) return "#16A34A";
  if (["ppt", "pptx"].includes(e)) return "#EA580C";
  if (ARCHIVE_EXTS.includes(e)) return "#D97706";
  return "#6B7280";
}

export function formatBytes(b) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');

export function toAbsoluteUrl(url) {
  if (!url) return '';
  if (/^(https?|blob|data):/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function forceDownload(url, filename) {
  try {
    const absUrl = toAbsoluteUrl(url);
    const response = await fetch(absUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    window.open(toAbsoluteUrl(url), '_blank');
  }
}

export function openDocument(url, fileName) {
  const absUrl = toAbsoluteUrl(url);
  const ext = getExt(fileName || absUrl);
  
  if (ext === 'pdf' || ['txt', 'csv'].includes(ext)) {
    window.open(absUrl, '_blank');
  } else if (DOC_EXTS.includes(ext)) {
    if (absUrl.includes('localhost') || absUrl.includes('127.0.0.1')) {
      window.open(absUrl, '_blank');
    } else {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(absUrl)}&embedded=false`, '_blank');
    }
  } else {
    window.open(absUrl, '_blank');
  }
}
