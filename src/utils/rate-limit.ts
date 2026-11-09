import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

export function rateLimit() {
  const windowMs = 60000;
  const max = 30;
  const buckets = new Map<string, Bucket>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan, coba lagi sebentar" }
      });
    }
    next();
  };
}
