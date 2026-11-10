import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TTL_SECONDS = 10 * 60;

function getKey(): Buffer | undefined {
  const secret = process.env.MEDIA_TOKEN_SECRET;
  if (!secret || secret.length < 32) return undefined;
  return createHash("sha256").update(secret).digest();
}

export function createMediaToken(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const secretKey = getKey();
  if (!secretKey) return undefined;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey, iv);
  const payload = JSON.stringify({ cookie: cookie.slice(0, 1500), exp: Math.floor(Date.now() / 1000) + TTL_SECONDS });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readMediaToken(token: unknown): string | undefined {
  if (typeof token !== "string" || token.length > 4096) return undefined;
  const secretKey = getKey();
  if (!secretKey) return undefined;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return undefined;
    const decipher = createDecipheriv("aes-256-gcm", secretKey, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const payload = JSON.parse(plain) as { cookie?: unknown; exp?: unknown };
    if (typeof payload.cookie !== "string" || typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return undefined;
    return payload.cookie;
  } catch { return undefined; }
}
