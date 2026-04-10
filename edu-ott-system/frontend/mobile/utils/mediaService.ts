import { fetchAPI } from './api';
import type { MediaItem } from '../types/chat';

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
  return res.data;
}

export async function deleteMediaById(mediaId: string): Promise<void> {
  await fetchAPI(`/media/${mediaId}`, {
    method: 'DELETE',
  });
}
