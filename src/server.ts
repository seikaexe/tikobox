import express, { Request, Response, NextFunction } from "express";
import { tiktokRouter } from "./routes/tiktok.js";
import { rateLimit } from "./utils/rate-limit.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", rateLimit(), tiktokRouter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "tikobox", status: "ok" });
});


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Internal server error" }
  });
});

export default app;
