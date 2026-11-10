import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import path from "node:path";
import apiRouter from "./routes/api.js";
import { cspDirectives } from "./utils/csp.js";
import { fail } from "./utils/format.js";

const app = express();
app.disable("x-powered-by");
// Percayai proxy hanya di Vercel / bila TRUST_PROXY=1 (lihat utils/clientIp.ts)
app.set("trust proxy", process.env.VERCEL || process.env.TRUST_PROXY === "1" ? 1 : false);

// Security headers. Catatan: di Vercel halaman statis dilayani CDN, jadi header
// untuk halaman diatur lewat vercel.json; Helmet melindungi /api dan mode lokal.
app.use(
  helmet({
    contentSecurityPolicy: { useDefaults: false, directives: cspDirectives },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 63_072_000, includeSubDomains: true }
  })
);

app.use("/api", apiRouter);
app.use("/api", (_req, res) => {
  res.status(404).json(fail("Endpoint tidak ditemukan."));
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

app.use((_req, res) => {
  res.status(404).type("text/plain").send("Halaman tidak ditemukan.");
});

// Error handler: detail dan stack trace hanya ke log server, tidak ke klien.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof err === "object" && err !== null && "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;
  const clientError = status >= 400 && status < 500;

  if (!clientError) console.error(err);
  if (res.headersSent) return;
  res.status(clientError ? status : 500).json(fail(clientError ? "Permintaan tidak valid" : "Terjadi kesalahan pada server"));
});

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!process.env.VERCEL && isMain) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Tikobox berjalan di http://localhost:${port}`));
}

export default app;
