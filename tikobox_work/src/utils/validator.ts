const TIKTOK_HOSTS = [
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "m.tiktok.com",
  "tt.site",
  "www.tt.site"
];

const MEDIA_HOST_SUFFIXES = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "tiktokv.us",
  "byteoversea.com",
  "ibytedtos.com",
  "muscdn.com",
  "tiktokcdn-eu.com",
  "tiktokv.eu",
  "tiktok.com"
];

/*
 * Ambil link TikTok / tt.site dari teks yang ditempel.
 * Boleh tanpa https://, boleh ada caption di sekitarnya.
 */
export function normalizeTikTokInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const text = value.trim().slice(0, 1000);
  const match =
    text.match(/https?:\/\/[^\s"'<>]+/i) ??
    text.match(/(?<![a-z0-9-])(?:[a-z0-9-]+\.)*(?:tiktok\.com|tt\.site)\/[^\s"'<>]*/i);

  if (!match) return undefined;

  let link = match[0].replace(/[.,;:!?)\]]+$/, "");
  if (!/^https?:\/\//i.test(link)) link = "https://" + link;
  return link;
}

export function isTikTokUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;

  try {
    const u = new URL(value.trim());

    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return false;
    }

    const host = u.hostname.toLowerCase();

    return (
      TIKTOK_HOSTS.includes(host) ||
      host.endsWith(".tiktok.com") ||
      host.endsWith(".tt.site")
    );
  } catch {
    return false;
  }
}

export function isAllowedMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;

  try {
    const u = new URL(value);

    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return false;
    }

    const host = u.hostname.toLowerCase();

    return MEDIA_HOST_SUFFIXES.some(
      (s) => host === s || host.endsWith("." + s)
    );
  } catch {
    return false;
  }
}

export function safeFileName(
  value: unknown,
  fallback = "tikobox"
): string {
  const raw = typeof value === "string" ? value : fallback;

  const clean = raw
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);

  return clean || fallback;
}