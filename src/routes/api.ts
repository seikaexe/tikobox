import { Router, type Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { downloadTikTok, providerReferer, providerUserAgent } from "../services/downloader.js";
import { isAllowedMediaUrl, isTikTokUrl, normalizeTikTokInput, safeFileName } from "../utils/validator.js";
import { rateLimit } from "../utils/rateLimit.js";
import { fail, toApiData } from "../utils/format.js";
import { readMediaToken } from "../utils/mediaToken.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ code: 0, msg: "success", data: { status: "ok" } });
});

const lookupLimit = rateLimit(30, 60_000);

async function lookup(input: unknown, res: Response) {
  const started = Date.now();
  const url = normalizeTikTokInput(input);
  if (!url || !isTikTokUrl(url)) {
    res.status(400).json(fail("Link TikTok tidak valid. Tempel link setelah /api/, contoh: /api/https://vt.tiktok.com/xxxx"));
    return;
  }

  try {
    const data = await downloadTikTok(url);
    res.setHeader("cache-control", "no-store");
    res.json({ code: 0, msg: "success", processed_time: Number(((Date.now() - started) / 1000).toFixed(4)), data: toApiData(data) });
  } catch (error) {
    console.error("[Tikobox] Lookup provider error:", error);
    res.status(502).json(fail("Gagal memproses link. Provider mungkin sedang sibuk, coba lagi."));
  }
}

router.get("/tiktok", lookupLimit, (req, res) => lookup(req.query.url, res));

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MEDIA_TIMEOUT_MS = 25_000;

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const p = address.split(".").map(Number);
    return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127));
  }
  if (version === 6) {
    const a = address.toLowerCase();
    return a !== "::" && a !== "::1" && !a.startsWith("fc") && !a.startsWith("fd") &&
      !a.startsWith("fe8") && !a.startsWith("fe9") && !a.startsWith("fea") && !a.startsWith("feb") &&
      !a.startsWith("::ffff:127.") && !a.startsWith("::ffff:10.") && !a.startsWith("::ffff:192.168.");
  }
  return false;
}

async function validateMediaDestination(value: string): Promise<URL | undefined> {
  if (!isAllowedMediaUrl(value)) return undefined;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return undefined;
    const addresses = await lookup(u.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((item) => !isPublicAddress(item.address))) return undefined;
    return u;
  } catch { return undefined; }
}

async function fetchMediaSafely(initialUrl: string, cookie: string, signal: AbortSignal): Promise<Response | undefined> {
  let target = initialUrl;
  for (let hop = 0; hop <= 4; hop++) {
    const safeUrl = await validateMediaDestination(target);
    if (!safeUrl) return undefined;
    const response = await fetch(safeUrl, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer, accept: "*/*", ...(cookie ? { cookie } : {}) },
      signal,
      redirect: "manual"
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || hop === 4) return undefined;
    target = new URL(location, safeUrl).href;
    try { await response.body?.cancel(); } catch {}
  }
  return undefined;
}

router.get("/download", rateLimit(40, 60_000), async (req, res) => {
  const rawUrl = req.query.url;
  if (typeof rawUrl !== "string" || rawUrl.length > 2000) {
    res.status(400).json(fail("URL media tidak valid.")); return;
  }
  const name = safeFileName(req.query.name);
  const cookie = readMediaToken(req.query.t) || "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_TIMEOUT_MS);
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });

  try {
    const upstream = await fetchMediaSafely(rawUrl, cookie, controller.signal);
    if (!upstream) { res.status(400).json(fail("Alamat media atau redirect tidak diizinkan.")); return; }
    if (!upstream.ok || !upstream.body) { res.status(502).json(fail("Provider gagal mengirim file.")); return; }

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > MAX_DOWNLOAD_BYTES) { await upstream.body.cancel(); res.status(413).json(fail("Ukuran file melebihi batas 100 MB.")); return; }
    if (!/^(video\/|audio\/|image\/|application\/octet-stream)/i.test(type)) {
      await upstream.body.cancel(); res.status(415).json(fail("Tipe file dari provider tidak didukung.")); return;
    }

    res.setHeader("content-type", /\.mp3$/i.test(name) ? "audio/mpeg" : type);
    if (length) res.setHeader("content-length", String(length));
    const inline = req.query.inline === "1";
    res.setHeader("content-disposition", `${inline ? "inline" : "attachment"}; filename="${name}"`);
    res.setHeader("cache-control", "private, no-store, max-age=0");
    res.setHeader("x-content-type-options", "nosniff");

    let received = 0;
    const limiter = new Transform({ transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > MAX_DOWNLOAD_BYTES) callback(new Error("Download size limit exceeded"));
      else callback(null, chunk);
    }});
    await pipeline(Readable.fromWeb(upstream.body as any), limiter, res);
  } catch (error) {
    if (!res.headersSent) res.status(502).json(fail("Gagal mengambil file, coba lagi."));
    else if (!res.writableEnded) res.destroy();
    if (!(error instanceof Error && error.name === "AbortError")) console.error("[Tikobox] Media proxy error:", error);
  } finally { clearTimeout(timer); }
});

// /api/  : info penggunaan, atau proses langsung kalau ada ?url=
router.get("/", lookupLimit, (req, res) => {
  if (req.query.url) return lookup(req.query.url, res);
  res.json({
    code: 0,
    msg: "success",
    name: "Tikobox API",
    usage: {
      format: "/api/ + link TikTok",
      example: "/api/https://vt.tiktok.com/xxxx",
      supported: ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com", "tt.site", "www.tt.site"]
    }
  });
});

// /api/https://vt.tiktok.com/xxx : tempel link apa adanya setelah /api/
router.get("/*splat", lookupLimit, (req, res) => {
  let raw = req.originalUrl.replace(/^\/api\//, "");
  try { raw = decodeURIComponent(raw); } catch {}
  // sebagian proxy menyatukan "//" menjadi "/"
  raw = raw.replace(/^(https?):\/(?!\/)/i, "$1://");
  return lookup(raw, res);
});

export default router;
