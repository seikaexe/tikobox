import type { Request } from "express";

const first = (h: string | string[] | undefined) =>
  (Array.isArray(h) ? h[0] : h)?.split(",")[0]?.trim() || undefined;

/*
 * IP klien yang tidak mudah dipalsukan.
 * - Vercel: pakai header yang diisi Vercel sendiri.
 * - Di belakang proxy sendiri: set TRUST_PROXY=1 agar X-Forwarded-For dipercaya.
 * - Selain itu: alamat socket (header dari klien diabaikan).
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  if (process.env.VERCEL) {
    return first(h["x-vercel-forwarded-for"]) || first(h["x-real-ip"]) || first(h["x-forwarded-for"]) || req.socket.remoteAddress || "unknown";
  }
  if (process.env.TRUST_PROXY === "1") {
    return first(h["x-forwarded-for"]) || req.socket.remoteAddress || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

// Samarkan IP untuk log: IPv4 -> a.b.c.0, IPv6 -> 3 grup pertama
export function maskIp(ip: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, ".0");
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::";
  return "unknown";
}
