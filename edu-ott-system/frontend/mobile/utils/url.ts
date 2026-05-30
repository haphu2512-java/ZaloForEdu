import { API_BASE_URL } from './api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

export function toAbsoluteUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
