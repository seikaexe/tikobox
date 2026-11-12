import { extractScriptJson, fetchHtml } from "./downloader.js";

/*
 * Profil dan hashtag TikTok.
 *
 * Sumber data: halaman publik TikTok (https://www.tiktok.com/@username dan
 * https://www.tiktok.com/tag/nama) lewat fetchHtml (SSRF guard + allowlist host).
 * Data dibaca dari JSON __UNIVERSAL_DATA_FOR_REHYDRATION__ di halaman tersebut.
 * Tanpa pihak ketiga, tanpa login.
 */

/* Error karena input atau data tidak ditemukan (route memetakan ke HTTP 404). */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

const USERNAME_RE = /^[A-Za-z0-9._]{1,24}$/;
const HASHTAG_RE = /^[\p{L}\p{N}_]{1,100}$/u;

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseUsername(input: unknown): string {
  const raw = first(input);
  if (typeof raw !== "string") throw new InputError("Username wajib diisi");

  let name = raw.trim().slice(0, 200);
  try { name = decodeURIComponent(name); } catch {}
  name = name.replace(/^@/, "");

  if (!USERNAME_RE.test(name)) throw new InputError("Username tidak valid");
  return name;
}

export function parseHashtag(input: unknown): string {
  const raw = first(input);
  if (typeof raw !== "string") throw new InputError("Nama hashtag wajib diisi");

  let name = raw.trim().slice(0, 300);
  try { name = decodeURIComponent(name); } catch {}
  name = name.replace(/^#/, "");

  if (!HASHTAG_RE.test(name)) throw new InputError("Nama hashtag tidak valid");
  return name;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/* Unix detik -> ISO 8601 UTC. Kosong ("") bila tidak tersedia. */
function isoFromSeconds(v: unknown): string {
  const s = Number(v);
  if (!Number.isFinite(s) || s <= 0) return "";
  const d = new Date(s * 1000);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/* ID TikTok adalah snowflake: 32 bit teratas = waktu pembuatan (detik). */
function secondsFromId(id: string): number {
  if (!/^\d{10,20}$/.test(id)) return 0;
  try {
    const s = Number(BigInt(id) >> 32n);
    return s > 1_400_000_000 && s < 4_000_000_000 ? s : 0;
  } catch {
    return 0;
  }
}

function assertNotChallenge(html: string): never {
  if (/captcha|verify-bar|security check/i.test(html)) {
    throw new Error("TikTok meminta verifikasi (captcha) untuk server ini, coba lagi nanti");
  }
  throw new Error("Data tidak ditemukan di halaman TikTok");
}

export type TikTokProfile = ReturnType<typeof buildProfile>;

function buildProfile(user: any, stats: any, statsV2: any) {
  const id = str(user.id);
  const created = Number(user.createTime) > 0 ? Number(user.createTime) : secondsFromId(id);
  // statsV2 berisi string angka besar yang lebih presisi; stats sebagai cadangan
  const pick = (v2: string, v1: string) => num(statsV2?.[v2]) || num(stats?.[v1]);

  return {
    id,
    unique_id: str(user.uniqueId),
    nickname: str(user.nickname),
    bio: str(user.signature),
    verified: user.verified === true,
    private: user.privateAccount === true,
    region: str(user.region),
    avatar: {
      large: str(user.avatarLarger),
      medium: str(user.avatarMedium),
      thumb: str(user.avatarThumb)
    },
    stats: {
      follower_count: pick("followerCount", "followerCount"),
      following_count: pick("followingCount", "followingCount"),
      friend_count: pick("friendCount", "friendCount"),
      like_count: pick("heartCount", "heartCount") || pick("heart", "heart"),
      video_count: pick("videoCount", "videoCount")
    },
    created_at: isoFromSeconds(created),
    nickname_changed_at: isoFromSeconds(user.nickNameModifyTime),
    username_changed_at: isoFromSeconds(user.uniqueIdModifyTime),
    url: `https://www.tiktok.com/@${str(user.uniqueId)}`
  };
}

export async function getProfile(username: string) {
  const { html } = await fetchHtml(`https://www.tiktok.com/@${encodeURIComponent(username)}`);

  const universal = extractScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  const scope = universal?.__DEFAULT_SCOPE__?.["webapp.user-detail"];

  if (!scope) assertNotChallenge(html);

  const info = scope.userInfo;
  if (!info?.user) {
    // statusCode 10221 (tidak ditemukan), 10222 (privat/dibatasi), dll
    if (Number(scope.statusCode) > 0) throw new InputError("Akun tidak ditemukan");
    assertNotChallenge(html);
  }

  return buildProfile(info.user, info.stats, info.statsV2);
}

export async function getHashtag(name: string) {
  const { html } = await fetchHtml(`https://www.tiktok.com/tag/${encodeURIComponent(name)}`);

  const universal = extractScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  const scope = universal?.__DEFAULT_SCOPE__?.["webapp.challenge-detail"];

  if (!scope) assertNotChallenge(html);

  const info = scope.challengeInfo;
  if (!info?.challenge) {
    if (Number(scope.statusCode) > 0) throw new InputError("Hashtag tidak ditemukan");
    assertNotChallenge(html);
  }

  const c = info.challenge;
  const pick = (v2: string, v1: string) => num(info.statsV2?.[v2]) || num(info.stats?.[v1]);

  return {
    id: str(c.id),
    name: str(c.title) || name,
    description: str(c.desc),
    stats: {
      video_count: pick("videoCount", "videoCount"),
      view_count: pick("viewCount", "viewCount")
    },
    url: `https://www.tiktok.com/tag/${encodeURIComponent(str(c.title) || name)}`
  };
}
