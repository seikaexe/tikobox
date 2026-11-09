import { Router, Request, Response } from "express";
import { Readable } from "node:stream";
import { isTikTokUrl, isAllowedMediaUrl } from "../utils/validator.js";
import { downloadTikTok, providerUserAgent, providerReferer } from "../services/downloader.js";

export const tiktokRouter = Router();

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

tiktokRouter.get("/tiktok", async (req: Request, res: Response): Promise<void> => {
  const url = String(req.query.url || "").trim();

  if (!url || !isTikTokUrl(url)) {
    fail(res, 400, "INVALID_URL", "URL TikTok tidak valid");
    return;
  }

  try {
    const data = await downloadTikTok(url);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Downloader provider error";
    fail(res, 502, "DOWNLOAD_PROVIDER_ERROR", message);
  }
});

// Proxy file media supaya browser langsung menyimpan file (tanpa membuka tab baru).
tiktokRouter.get("/download", async (req: Request, res: Response): Promise<void> => {
  const target = String(req.query.url || "");
  const name =
    String(req.query.name || "tikobox.mp4")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80) || "tikobox.mp4";

  if (!isAllowedMediaUrl(target)) {
    fail(res, 400, "INVALID_MEDIA_URL", "URL media tidak diizinkan");
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: { "user-agent": providerUserAgent, referer: providerReferer },
      redirect: "follow"
    });

    if (!upstream.ok || !upstream.body || !isAllowedMediaUrl(upstream.url)) {
      fail(res, 502, "MEDIA_FETCH_FAILED", "Gagal mengambil file media");
      return;
    }

    const type = upstream.headers.get("content-type") || guessType(name);
    // content-length hanya valid bila body tidak dikompres
    const length = upstream.headers.get("content-encoding")
      ? null
      : upstream.headers.get("content-length");

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
      fail(res, 502, "MEDIA_FETCH_FAILED", "Gagal mengambil file media");
    } else {
      res.destroy();
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
