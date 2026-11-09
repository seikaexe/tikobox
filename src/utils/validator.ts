export function isTikTokUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host === "tiktok.com" || host.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}

const MEDIA_HOSTS = [
  "tikwm.com",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "tiktokv.us",
  "muscdn.com",
  "byteoversea.com"
];

/** Hanya izinkan host media TikTok / tikwm agar proxy download aman dari SSRF. */
export function isAllowedMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return MEDIA_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}
