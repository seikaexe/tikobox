import { Router, type Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { downloadTikTok, providerReferer, providerUserAgent } from "../services/downloader.js";
import { isAllowedMediaUrl, isTikTokUrl, normalizeTikTokInput, safeFileName } from "../utils/validator.js";
import { rateLimit } from "../utils/rateLimit.js";
import { fail, toApiData } from "../utils/format.js";

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
    const message = error instanceof Error ? error.message : "Gagal memproses URL";
    res.status(502).json(fail(message));
  }
}

router.get("/tiktok", lookupLimit, (req, res) => lookup(req.query.url, res));

router.get("/download", rateLimit(60, 60_000), async (req, res) => {
  const url = req.query.url;
  if (!isAllowedMediaUrl(url)) {
    res.status(400).json(fail("URL media tidak diizinkan."));
    return;
  }

  const name = safeFileName(req.query.name);
  const cookie = typeof req.query.c === "string" ? req.query.c.replace(/[\r\n]/g, "").slice(0, 2000) : "";
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(url, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer, accept: "*/*", ...(cookie ? { cookie } : {}) },
      signal: controller.signal,
      redirect: "follow"
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json(fail(`Gagal mengambil file dari provider (HTTP ${upstream.status}).`));
      return;
    }

    let type = upstream.headers.get("content-type") || "application/octet-stream";
    // Nama .mp3 harus bertipe audio, bukan video/mp4, supaya tidak jadi .mp3.mp4
    if (/\.mp3$/i.test(name)) type = "audio/mpeg";
    const length = upstream.headers.get("content-length");
    res.setHeader("content-type", type);
    if (length) res.setHeader("content-length", length);
    const inline = req.query.inline === "1";
    res.setHeader("content-disposition", `${inline ? "inline" : "attachment"}; filename="${name}"`);
    res.setHeader("cache-control", "no-store");

    await pipeline(Readable.fromWeb(upstream.body as any), res);
  } catch {
    if (!res.headersSent) {
      res.status(502).json(fail("Gagal mengambil file, coba lagi."));
    } else if (!res.writableEnded) {
      res.destroy();
    }
  }
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
