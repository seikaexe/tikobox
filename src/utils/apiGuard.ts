import type { RequestHandler } from "express";
import { fail } from "./format.js";
import { logSecurity } from "./securityLog.js";

const MAX_URL_LENGTH = 2500;

/* Hanya GET/HEAD/OPTIONS, dan batasi panjang URL request. */
export const apiGuard: RequestHandler = (req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, HEAD, OPTIONS").status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    logSecurity("method_not_allowed", req);
    res.setHeader("allow", "GET, HEAD, OPTIONS").status(405).json(fail("Metode tidak diizinkan."));
    return;
  }

  if (req.originalUrl.length > MAX_URL_LENGTH) {
    logSecurity("url_too_long", req, { length: req.originalUrl.length });
    res.status(414).json(fail("URL terlalu panjang."));
    return;
  }

  next();
};

/* Hentikan request yang terlalu lama (jangan dipasang di route streaming). */
export function requestTimeout(ms: number): RequestHandler {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logSecurity("request_timeout", req, { ms });
        res.status(504).json(fail("Permintaan terlalu lama, coba lagi."));
      }
    }, ms);
    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);
    next();
  };
}
