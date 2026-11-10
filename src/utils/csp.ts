/*
 * Satu sumber kebenaran untuk Content-Security-Policy.
 * Dipakai Helmet (server.ts). Salinan string-nya ada di vercel.json
 * (halaman statis di Vercel dilayani CDN, bukan Express) -- kalau ini diubah,
 * jalankan ulang: npm run csp:print dan salin hasilnya ke vercel.json.
 */
const TIKTOK_MEDIA = [
  "https://*.tiktokcdn.com",
  "https://*.tiktokcdn-us.com",
  "https://*.tiktokcdn-eu.com",
  "https://*.tiktokv.com",
  "https://*.tiktokv.us",
  "https://*.tiktokv.eu",
  "https://*.byteoversea.com",
  "https://*.ibytedtos.com",
  "https://*.muscdn.com"
];

export const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-inline' dipertahankan karena halaman statis tidak bisa pakai nonce per-request
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", ...TIKTOK_MEDIA],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"]
};

export function cspString(): string {
  return (
    Object.entries(cspDirectives)
      .map(([k, v]) => `${k} ${v.join(" ")}`)
      .join("; ") + "; upgrade-insecure-requests"
  );
}
