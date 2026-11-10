import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SecurityError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "SecurityError";
  }
}

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||     // CGNAT
    (a === 169 && b === 254) ||               // link-local / metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224                                  // multicast + reserved
  );
}

function isPrivateV6(raw: string): boolean {
  const ip = raw.toLowerCase();
  if (ip === "::" || ip === "::1") return true;

  // IPv4-mapped: ::ffff:1.2.3.4 atau ::ffff:7f00:1
  const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return isPrivateV4(dotted[1]);
  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }

  return (
    /^f[cd]/.test(ip) ||          // unique local fc00::/7
    /^fe[89ab]/.test(ip) ||       // link-local fe80::/10
    ip.startsWith("ff") ||        // multicast
    ip.startsWith("64:ff9b:") ||  // NAT64
    ip.startsWith("2001:db8")     // dokumentasi
  );
}

export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateV4(ip);
  if (v === 6) return isPrivateV6(ip);
  return true; // bukan IP valid -> anggap tidak aman
}

/*
 * Pastikan hostname mengarah ke alamat publik: bukan localhost, bukan IP privat,
 * dan semua hasil DNS-nya publik.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    !host ||
    host === "localhost" ||
    /\.(localhost|local|internal|localdomain|lan|home|corp)$/.test(host)
  ) {
    throw new SecurityError("Host internal tidak diizinkan.", "internal_host");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new SecurityError("IP privat tidak diizinkan.", "private_ip");
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SecurityError("Host tidak dapat di-resolve.", "dns_failed");
  }

  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw new SecurityError("Host mengarah ke alamat privat.", "private_resolution");
  }
}

type SafeFetchOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Dipanggil untuk URL awal DAN setiap hop redirect. */
  allowUrl: (url: string) => boolean;
  maxRedirects?: number;
  /** Batas waktu sampai header respons diterima (ms). */
  timeoutMs?: number;
};

/*
 * fetch GET yang aman dari SSRF: redirect diikuti manual, dan setiap hop
 * divalidasi (allowlist host, http/https, tanpa kredensial/port aneh, IP publik).
 */
export async function safeFetch(input: string, opts: SafeFetchOptions): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? 3;
  let current = input;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      throw new SecurityError("URL tidak valid.", "bad_url");
    }

    if (
      (u.protocol !== "https:" && u.protocol !== "http:") ||
      u.username || u.password || u.port
    ) {
      throw new SecurityError("URL tidak diizinkan.", "bad_url");
    }
    if (!opts.allowUrl(u.toString())) {
      throw new SecurityError("Host tidak ada di allowlist.", "host_not_allowed");
    }
    await assertPublicHost(u.hostname);

    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (opts.signal?.aborted) ctrl.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);

    let res: Response;
    try {
      res = await fetch(u, { method: "GET", headers: opts.headers, redirect: "manual", signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!location) throw new SecurityError("Redirect tanpa tujuan.", "bad_redirect");
      current = new URL(location, u).toString();
      continue;
    }

    return res;
  }

  throw new SecurityError("Terlalu banyak redirect.", "too_many_redirects");
}
