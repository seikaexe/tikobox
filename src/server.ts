import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import apiRouter from "./routes/api.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

app.use("/api", apiRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: { message: "Endpoint tidak ditemukan." } });
});

// Halaman statis dilayani Express juga, supaya / dan /docs tetap jalan
// walaupun CDN Vercel tidak menangani public/ (penyebab "Cannot GET /").
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get("/docs", (_req, res) => res.sendFile(path.join(publicDir, "docs.html")));

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!process.env.VERCEL && isMain) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Tikobox berjalan di http://localhost:${port}`));
}

export default app;
