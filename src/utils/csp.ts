/*
 * Satu sumber kebenaran untuk Content-Security-Policy.
 * Dipakai Helmet (server.ts). Salinan string-nya ada di vercel.json
 * (halaman statis di Vercel dilayani CDN, bukan Express) -- kalau ini diubah,
 * jalankan ulang: npm run csp:print dan salin hasilnya ke vercel.json.
 */
const GOOGLE_ADS_SCRIPT = [
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://www.googletagservices.com",
  "https://partner.googleadservices.com",
  "https://www.google.com",
  "https://*.adtrafficquality.google"
];

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
  // 'unsafe-inline' hanya demi kode iklan AdSense (halaman statis tidak bisa pakai nonce per-request)
  "script-src": ["'self'", "'unsafe-inline'", ...GOOGLE_ADS_SCRIPT],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", ...TIKTOK_MEDIA],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", "https://pagead2.googlesyndication.com", "https://googleads.g.doubleclick.net", "https://*.adtrafficquality.google"],
  "frame-src": ["https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com", "https://www.google.com", "https://*.adtrafficquality.google"],
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
