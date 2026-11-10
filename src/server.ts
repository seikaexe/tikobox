import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import apiRouter from "./routes/api.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security headers; allow the existing AdSense integration and docs inline snippet.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use("/api", apiRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ code: -1, msg: "Endpoint tidak ditemukan." });
});

// Di Vercel, folder public/ dilayani CDN dan express.static diabaikan, jadi
// bagian ini hanya dipakai saat dijalankan lokal (npm run dev / npm start).
// Di Vercel, /docs diarahkan ke /docs.html lewat rewrite di vercel.json.
const publicDir = path.join(process.cwd(), "public");
const sendPage = (file: string): RequestHandler => (_req, res) => {
  res.sendFile(path.join(publicDir, file), (err) => {
    if (err && !res.headersSent) res.status(404).type("text/plain").send("Halaman tidak ditemukan.");
  });
};
app.use(express.static(publicDir));
app.get("/", sendPage("index.html"));
app.get("/docs", sendPage("docs.html"));

// Tangani error supaya function tidak masuk keadaan tidak menentu.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ code: -1, msg: "Terjadi kesalahan pada server." });
});

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!process.env.VERCEL && isMain) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Tikobox berjalan di http://localhost:${port}`));
}

export default app;
