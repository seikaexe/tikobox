import type { Request, RequestHandler } from "express";
import { logSecurity } from "./securityLog.js";
import { fail } from "./format.js";

const SCANNER_UA = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|wpscan|zgrab|nuclei)/i;
const AUTOMATION_UA =
  /(curl|wget|python-requests|python-urllib|aiohttp|httpx|scrapy|go-http-client|java\/|okhttp|libwww|node-fetch|undici|axios|headless|phantomjs|selenium|puppeteer|playwright|postman|insomnia|httpie)/i;

/* Klien otomatis: UA kosong/pendek atau UA tool otomatis. */
export function isSuspiciousClient(req: Request): boolean {
  const ua = req.get("user-agent") || "";
  return ua.length < 10 || AUTOMATION_UA.test(ua);
}

/*
 * Deteksi pola request otomatis.
 * - Scanner keamanan selalu diblokir.
 * - Klien otomatis lain TIDAK diblokir (API ini memang publik), tapi kena batas
 *   rate yang lebih ketat (lihat rateLimit). Set BOT_MODE=block untuk memblokirnya.
 */
export const botGuard: RequestHandler = (req, res, next) => {
  const ua = req.get("user-agent") || "";

  if (SCANNER_UA.test(ua)) {
    logSecurity("scanner_blocked", req);
    res.status(403).json(fail("Akses ditolak."));
    return;
  }

  if (isSuspiciousClient(req) && process.env.BOT_MODE === "block") {
    logSecurity("automation_blocked", req);
    res.status(403).json(fail("Akses ditolak."));
    return;
  }

  next();
};
