import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import { tiktokRouter } from "./routes/tiktok.js";
import { rateLimit } from "./utils/rate-limit.js";
import { NOT_FOUND_HTML } from "./utils/not-found.js";

const app = express();
const publicDir = path.join(process.cwd(), "public");

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Lokal: Express melayani folder public. Di Vercel, public/ dilayani CDN dan baris ini diabaikan.
app.use(express.static(publicDir));

app.use("/api", rateLimit(), tiktokRouter);

app.get("/api/health", (_req: Request, res: Response): void => {
  res.json({ success: true, service: "tikobox", status: "ok" });
});

// Lokal saja. Di Vercel, /docs dialihkan ke docs.html lewat vercel.json
app.get("/docs", (_req: Request, res: Response): void => {
  res.sendFile(path.join(publicDir, "docs.html"));
});

app.use((req: Request, res: Response): void => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" }
    });
    return;
  }
  res.status(404).type("html").send(NOT_FOUND_HTML);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Internal server error" }
  });
});

// Server lokal. Vercel tidak memakai listen dan cukup membaca default export.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`TikoBox running on http://localhost:${port}`);
  });
}

export default app;
