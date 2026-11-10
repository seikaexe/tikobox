import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; reset: number };

export function rateLimit(max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
    }

    let bucket = buckets.get(ip);
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count++;

    if (bucket.count > max) {
      res.setHeader("retry-after", String(Math.ceil((bucket.reset - now) / 1000)));
      res.status(429).json({ code: -1, msg: "Terlalu banyak permintaan. Coba lagi sebentar lagi." });
      return;
    }
    next();
  };
}
