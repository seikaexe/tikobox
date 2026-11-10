import type { NextFunction, Request, RequestHandler, Response } from "express";
import { clientIp } from "./clientIp.js";
import { isSuspiciousClient } from "./botGuard.js";
import { logSecurity } from "./securityLog.js";

/*
 * Rate limit fixed-window.
 *
 * Penyimpanan terpusat: Upstash Redis lewat REST (tanpa dependency tambahan).
 * Aktif otomatis kalau salah satu pasangan env ini ada:
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   KV_REST_API_URL + KV_REST_API_TOKEN   (integrasi Upstash di Vercel Marketplace)
 *
 * Tanpa env itu, atau kalau Redis error, dipakai Map lokal sebagai cadangan
 * (hanya efektif per-instance).
 */

type Hit = { count: number; reset: number };

const local = new Map<string, Hit>();
let lastBackendWarn = 0;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : undefined;
}

async function redisHit(cfg: { url: string; token: string }, key: string, ttlMs: number): Promise<number> {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: JSON.stringify([["INCR", key], ["PEXPIRE", key, ttlMs]]),
    signal: AbortSignal.timeout(1500)
  });
  if (!res.ok) throw new Error(`redis http ${res.status}`);
  const out = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = out[0]?.result;
  if (typeof count !== "number") throw new Error(out[0]?.error || "redis bad reply");
  return count;
}

function localHit(key: string, reset: number): number {
  const now = Date.now();
  if (local.size > 5000) {
    for (const [k, h] of local) if (h.reset <= now) local.delete(k);
  }
  const hit = local.get(key) ?? { count: 0, reset };
  hit.count++;
  local.set(key, hit);
  return hit.count;
}

type Options = {
  name: string;
  max: number;
  windowMs: number;
  /** Batas lebih ketat untuk klien otomatis (UA kosong / curl / dll). */
  suspiciousMax?: number;
};

export function rateLimit(opts: Options): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const windowIdx = Math.floor(now / opts.windowMs);
    const reset = (windowIdx + 1) * opts.windowMs;
    const key = `rl:${opts.name}:${clientIp(req)}:${windowIdx}`;
    const max = opts.suspiciousMax && isSuspiciousClient(req) ? opts.suspiciousMax : opts.max;

    let count: number;
    const cfg = redisConfig();
    if (cfg) {
      try {
        count = await redisHit(cfg, key, opts.windowMs * 2);
      } catch (err) {
        if (now - lastBackendWarn > 60_000) {
          lastBackendWarn = now;
          logSecurity("ratelimit_backend_error", undefined, {
            reason: err instanceof Error ? err.message : "unknown"
          });
        }
        count = localHit(key, reset);
      }
    } else {
      count = localHit(key, reset);
    }

    const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
    res.setHeader("ratelimit-limit", String(max));
    res.setHeader("ratelimit-remaining", String(Math.max(0, max - count)));
    res.setHeader("ratelimit-reset", String(retryAfter));

    if (count > max) {
      if (count === max + 1) logSecurity("rate_limited", req, { limiter: opts.name });
      res.setHeader("retry-after", String(retryAfter));
      res.status(429).json({ code: -1, msg: "Terlalu banyak permintaan. Coba lagi sebentar lagi." });
      return;
    }
    next();
  };
}
