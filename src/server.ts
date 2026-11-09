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

// Hanya untuk jalan lokal / server biasa. Di Vercel, public/ dilayani CDN.
const here = path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (!process.env.VERCEL && isMain) {
  const publicDir = path.join(here, "..", "public");
  app.use(express.static(publicDir));
  app.get("/docs", (_req, res) => res.sendFile(path.join(publicDir, "docs.html")));

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Tikobox berjalan di http://localhost:${port}`));
}

export default app;
