import { Router, type Request, type Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { downloadTikTok, providerReferer, providerUserAgent } from "../services/downloader.js";
import { isAllowedMediaUrl, isTikTokUrl, normalizeTikTokInput, safeFileName } from "../utils/validator.js";
import { rateLimit } from "../utils/rateLimit.js";
import { apiGuard, requestTimeout } from "../utils/apiGuard.js";
import { botGuard } from "../utils/botGuard.js";
import { SecurityError, safeFetch } from "../utils/ssrf.js";
import { logSecurity } from "../utils/securityLog.js";
import { fail, publicMessage, toApiData } from "../utils/format.js";

const router = Router();

const UPSTREAM_HEADER_TIMEOUT_MS = 15_000;
const LOOKUP_TIMEOUT_MS = 28_000;

// Hanya media yang boleh diproxy. SVG/HTML sengaja tidak masuk agar tidak bisa jadi XSS.
const ALLOWED_TYPES = /^(video\/|audio\/|image\/(jpeg|png|webp|gif|avif|heic)$|application\/octet-stream$)/;

router.use(apiGuard, botGuard);

router.get("/health", (_req, res) => {
  res.json({ code: 0, msg: "success", data: { status: "ok" } });
});

const lookupGuards = [
  rateLimit({ name: "lookup", max: 30, windowMs: 60_000, suspiciousMax: 12 }),
  requestTimeout(LOOKUP_TIMEOUT_MS)
];

async function lookup(input: unknown, req: Request, res: Response) {
  const started = Date.now();
  const url = normalizeTikTokInput(input);
  if (!url || !isTikTokUrl(url)) {
    res.status(400).json(fail("Link TikTok tidak valid. Tempel link setelah /api/, contoh: /api/https://vt.tiktok.com/xxxx"));
    return;
  }

  try {
    const data = await downloadTikTok(url);
    res.setHeader("cache-control", "no-store");
    if (res.headersSent) return; // sudah kena timeout 504
    res.json({ code: 0, msg: "success", processed_time: Number(((Date.now() - started) / 1000).toFixed(4)), data: toApiData(data) });
  } catch (error) {
    if (error instanceof SecurityError) {
      logSecurity("lookup_blocked", req, { code: error.code });
    } else {
      console.error("[Tikobox] lookup gagal:", error instanceof Error ? error.message : error);
    }
    if (res.headersSent) return;
    res.status(502).json(fail(publicMessage(error)));
  }
}

router.get("/tiktok", lookupGuards, (req: Request, res: Response) => lookup(req.query.url, req, res));

router.get("/download", rateLimit({ name: "download", max: 60, windowMs: 60_000, suspiciousMax: 15 }), async (req, res) => {
  // Proxy ini hanya untuk halaman Tikobox sendiri; blokir hotlink dari situs lain.
  if (req.get("sec-fetch-site") === "cross-site") {
    logSecurity("hotlink_blocked", req);
    res.status(403).json(fail("Akses ditolak."));
    return;
  }

  const url = req.query.url;
  if (!isAllowedMediaUrl(url)) {
    let host = "";
    try { host = typeof url === "string" ? new URL(url).hostname : ""; } catch {}
    logSecurity("media_url_rejected", req, { host });
    res.status(400).json(fail("URL media tidak diizinkan."));
    return;
  }

  const name = safeFileName(req.query.name);
  // Cookie hanya berisi karakter ASCII yang dapat dicetak (tanpa CR/LF/kontrol)
  const cookie = typeof req.query.c === "string" ? req.query.c.replace(/[^\x20-\x7E]/g, "").slice(0, 2000) : "";
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await safeFetch(url, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer, accept: "*/*", ...(cookie ? { cookie } : {}) },
      signal: controller.signal,
      allowUrl: isAllowedMediaUrl,
      timeoutMs: UPSTREAM_HEADER_TIMEOUT_MS
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json(fail(`Gagal mengambil file dari provider (HTTP ${upstream.status}).`));
      return;
    }

    const upstreamType = (upstream.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.test(upstreamType)) {
      logSecurity("media_type_rejected", req, { type: upstreamType });
      await upstream.body.cancel().catch(() => {});
      res.status(502).json(fail("Tipe file tidak didukung."));
      return;
    }

    const length = Number(upstream.headers.get("content-length"));

    let type = upstreamType;
    // Nama .mp3 harus bertipe audio, bukan video/mp4, supaya tidak jadi .mp3.mp4
    if (/\.mp3$/i.test(name)) type = "audio/mpeg";
    res.setHeader("content-type", type);
    if (Number.isFinite(length) && length > 0) res.setHeader("content-length", String(length));
    const inline = req.query.inline === "1";
    res.setHeader("content-disposition", `${inline ? "inline" : "attachment"}; filename="${name}"`);
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("content-security-policy", "default-src 'none'; sandbox");

    await pipeline(Readable.fromWeb(upstream.body as any), res);
  } catch (error) {
    if (error instanceof SecurityError) {
      logSecurity("ssrf_blocked", req, { code: error.code });
    }

    if (!res.headersSent) {
      const status = error instanceof SecurityError ? 400 : 502;
      res.status(status).json(fail(error instanceof SecurityError ? "URL media tidak diizinkan." : "Gagal mengambil file, coba lagi."));
    } else if (!res.writableEnded) {
      res.destroy();
    }
  }
});

// /api/  : info penggunaan, atau proses langsung kalau ada ?url=
router.get("/", lookupGuards, (req: Request, res: Response) => {
  if (req.query.url) return lookup(req.query.url, req, res);
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
router.get("/*splat", lookupGuards, (req: Request, res: Response) => {
  let raw = req.originalUrl.replace(/^\/api\//, "");
  try { raw = decodeURIComponent(raw); } catch {}
  // sebagian proxy menyatukan "//" menjadi "/"
  raw = raw.replace(/^(https?):\/(?!\/)/i, "$1://");
  return lookup(raw, req, res);
});

export default router;
