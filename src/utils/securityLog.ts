import type { Request } from "express";
import { clientIp, maskIp } from "./clientIp.js";

type Extra = Record<string, string | number | boolean | undefined>;

/*
 * Catat kejadian mencurigakan sebagai satu baris JSON.
 * Sengaja TIDAK mencatat: cookie, header, query string, body.
 * IP disamarkan, path dipotong tanpa query.
 */
export function logSecurity(event: string, req?: Request, extra: Extra = {}) {
  const clean: Extra = {};
  for (const [k, v] of Object.entries(extra)) {
    clean[k] = typeof v === "string" ? v.replace(/[\r\n]/g, " ").slice(0, 200) : v;
  }

  console.warn(
    JSON.stringify({
      t: new Date().toISOString(),
      type: "security",
      event,
      ...(req
        ? {
            ip: maskIp(clientIp(req)),
            method: req.method,
            path: req.originalUrl.split("?")[0].slice(0, 120),
            ua: (req.get("user-agent") || "").replace(/[\r\n]/g, " ").slice(0, 80)
          }
        : {}),
      ...clean
    })
  );
}
