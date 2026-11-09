const TIKTOK_HOSTS = ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com", "www.tiktok.com"];

const MEDIA_HOST_SUFFIXES = [
  "tikwm.com",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "tiktokv.us",
  "byteoversea.com",
  "ibytedtos.com",
  "muscdn.com"
];

export function isTikTokUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return TIKTOK_HOSTS.includes(host) || host.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}

export function isAllowedMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return MEDIA_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
  } catch {
    return false;
  }
}

export function safeFileName(value: unknown, fallback = "tikobox"): string {
  const raw = typeof value === "string" ? value : fallback;
  const clean = raw.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "").slice(0, 80);
  return clean || fallback;
}
