import { Router, Request, Response } from "express";
import { Readable } from "node:stream";
import { isTikTokUrl, isAllowedMediaUrl } from "../utils/validator.js";
import { downloadTikTok, providerUserAgent, providerReferer } from "../services/downloader.js";

export const tiktokRouter = Router();

tiktokRouter.get("/tiktok", async (req: Request, res: Response) => {
  const url = String(req.query.url || "").trim();

  if (!url || !isTikTokUrl(url)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_URL", message: "URL TikTok tidak valid" }
    });
  }

  try {
    const data = await downloadTikTok(url);
    return res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Downloader provider error";
    return res.status(502).json({
      success: false,
      error: { code: "DOWNLOAD_PROVIDER_ERROR", message }
    });
  }
});

// Proxy file media supaya browser langsung menyimpan file (tanpa membuka tab baru).
tiktokRouter.get("/download", async (req: Request, res: Response) => {
  const target = String(req.query.url || "");
  const name = String(req.query.name || "tikobox.mp4")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80) || "tikobox.mp4";

  if (!isAllowedMediaUrl(target)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_MEDIA_URL", message: "URL media tidak diizinkan" }
    });
  }

  try {
    const upstream = await fetch(target, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer },
      redirect: "follow"
    });

    if (!upstream.ok || !upstream.body || !isAllowedMediaUrl(upstream.url)) {
      return res.status(502).json({
        success: false,
        error: { code: "MEDIA_FETCH_FAILED", message: "Gagal mengambil file media" }
      });
    }

    const type = upstream.headers.get("content-type") || guessType(name);
    // content-length hanya valid bila body tidak dikompres
    const length = upstream.headers.get("content-encoding") ? null : upstream.headers.get("content-length");

    res.setHeader("Content-Type", type);
    if (length) res.setHeader("Content-Length", length);
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Cache-Control", "no-store");

    const stream = Readable.fromWeb(upstream.body as any);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: { code: "MEDIA_FETCH_FAILED", message: "Gagal mengambil file media" }
      });
    }
  }
});

function guessType(name: string): string {
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "video/mp4";
}
