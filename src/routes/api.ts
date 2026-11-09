import { Router } from "express";
import { Readable } from "node:stream";
import { downloadTikTok, providerReferer, providerUserAgent } from "../services/downloader.js";
import { isAllowedMediaUrl, isTikTokUrl, safeFileName } from "../utils/validator.js";
import { rateLimit } from "../utils/rateLimit.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok" });
});

router.get("/tiktok", rateLimit(30, 60_000), async (req, res) => {
  const url = req.query.url;
  if (!isTikTokUrl(url)) {
    res.status(400).json({ success: false, error: { message: "Link TikTok tidak valid." } });
    return;
  }

  try {
    const data = await downloadTikTok(url.trim());
    res.setHeader("cache-control", "no-store");
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses URL";
    res.status(502).json({ success: false, error: { message } });
  }
});

router.get("/download", rateLimit(60, 60_000), async (req, res) => {
  const url = req.query.url;
  if (!isAllowedMediaUrl(url)) {
    res.status(400).json({ success: false, error: { message: "URL media tidak diizinkan." } });
    return;
  }

  const name = safeFileName(req.query.name);
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(url, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer },
      signal: controller.signal,
      redirect: "follow"
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ success: false, error: { message: "Gagal mengambil file dari provider." } });
      return;
    }

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const length = upstream.headers.get("content-length");
    res.setHeader("content-type", type);
    if (length) res.setHeader("content-length", length);
    res.setHeader("content-disposition", `attachment; filename="${name}"`);
    res.setHeader("cache-control", "no-store");

    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch {
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: { message: "Gagal mengambil file, coba lagi." } });
    } else {
      res.end();
    }
  }
});

export default router;
