// Resolve an asset URL to something the browser can actually fetch.
// Server-uploaded files come back as relative paths like "/uploads/...",
// but the SPA dev-server is on a different port, so a bare relative URL
// would 404 (or fall through to index.html). Prefix relative paths with
// the API base. Already-absolute URLs (http://, https://, data:, blob:)
// pass through untouched.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
};
