import { fetchAPI } from './api';
import type { MediaItem } from '../types/chat';
import { API_BASE_URL } from './api';

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: string;
  uploadUrl: string;
};

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

export function toAbsoluteMediaUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeMedia(item: MediaItem): MediaItem {
  return {
    ...item,
    _id: item._id || item.id || '',
    id: item.id || item._id || '',
    url: toAbsoluteMediaUrl(item.url),
  };
}

export async function uploadMediaBase64(payload: {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}): Promise<MediaItem> {
  const res = await fetchAPI('/media/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeMedia(res.data);
}

export async function uploadImageToCloudinary(localUri: string): Promise<string> {
  const signatureRes = await fetchAPI('/media/cloudinary/signature', {
    method: 'POST',
    body: JSON.stringify({ resourceType: 'image' }),
  });
  const sig = signatureRes.data as CloudinarySignature;

  const ext = localUri.split('.').pop()?.toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const fileName = `avatar-${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;

  const formData = new FormData();
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', String(sig.timestamp));
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);
  formData.append('public_id', sig.publicId);
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as any);

  const uploadRes = await fetch(sig.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Cloudinary upload failed');
  }

  await fetchAPI('/media/cloudinary/register', {
    method: 'POST',
    body: JSON.stringify({
      fileName,
      mimeType,
      size: Number(uploadData?.bytes || 0),
      url: uploadData?.secure_url || uploadData?.url,
      publicId: uploadData?.public_id,
      resourceType: uploadData?.resource_type || 'image',
    }),
  });

  return uploadData?.secure_url || uploadData?.url;
}

export async function getMediaById(mediaId: string): Promise<MediaItem> {
  const res = await fetchAPI(`/media/${mediaId}`);
  return normalizeMedia(res.data);
}

export async function deleteMediaById(mediaId: string): Promise<void> {
  await fetchAPI(`/media/${mediaId}`, {
    method: 'DELETE',
  });
}

export async function uploadMediaForm(payload: {
  uri: string;
  fileName: string;
  mimeType: string;
  duration?: number; // Optional duration in seconds for audio/video
}): Promise<MediaItem> {
  console.log('[Upload] uploadMediaForm called with:', {
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    duration: payload.duration,
  });

  const formData = new FormData();
  formData.append('file', {
    uri: payload.uri,
    name: payload.fileName,
    type: payload.mimeType,
  } as any);
  
  // Add duration if provided
  if (payload.duration) {
    console.log('[Upload] Adding duration to FormData:', payload.duration);
    formData.append('duration', payload.duration.toString());
  } else {
    console.warn('[Upload] No duration provided!');
  }

  const res = await fetchAPI('/media/upload-form', {
    method: 'POST',
    body: formData,
  });
  
  console.log('[Upload] Response:', {
    mediaId: res.data?._id || res.data?.id,
    duration: res.data?.duration,
  });
  
  return normalizeMedia(res.data);
}
