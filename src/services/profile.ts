import { extractScriptJson, fetchHtml } from "./downloader.js";

const USERNAME_RE = /^[A-Za-z0-9._]{1,24}$/;
const HASHTAG_RE = /^[\p{L}\p{N}_]{1,60}$/u;

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export function parseUsername(input: unknown): string {
  const v = typeof input === "string" ? input.trim().replace(/^@/, "") : "";
  if (!USERNAME_RE.test(v)) throw new InputError("Username TikTok tidak valid.");
  return v;
}

export function parseHashtag(input: unknown): string {
  let v = typeof input === "string" ? input.trim().replace(/^[#＃]/, "") : "";
  try { v = v.normalize("NFC"); } catch {}
  if (!HASHTAG_RE.test(v)) throw new InputError("Hashtag tidak valid.");
  return v;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const iso = (t: number): string => (t > 0 ? new Date(t * 1000).toISOString() : "");

/* Snowflake ID TikTok: 32 bit teratas = detik unix saat akun/objek dibuat. */
function timeFromId(id: string): number {
  try {
    const t = Number(BigInt(id) >> 32n);
    return t > 1_300_000_000 && t < 4_000_000_000 ? t : 0;
  } catch {
    return 0;
  }
}

export type TikTokProfile = Awaited<ReturnType<typeof getProfile>>;

export async function getProfile(username: string) {
  const { html } = await fetchHtml(`https://www.tiktok.com/@${encodeURIComponent(username)}`);
  const root = extractScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  const scope = root?.__DEFAULT_SCOPE__ ?? {};
  const detail = scope["webapp.user-detail"];

  if (!detail || !detail.userInfo) {
    if (detail?.statusCode === 10202 || detail?.statusMsg === "user_not_exist") {
      throw new InputError("Akun TikTok tidak ditemukan.");
    }
    throw new Error("Data profil tidak tersedia. TikTok mungkin membatasi permintaan, coba lagi.");
  }

  const u = detail.userInfo.user ?? {};
  const s = detail.userInfo.stats ?? detail.userInfo.statsV2 ?? {};
  const id = str(u.id);
  const createTime = num(u.createTime) || timeFromId(id);
  const nickChange = num(u.nickNameModifyTime);
  const idChange = num(u.uniqueIdModifyTime);

  return {
    id,
    sec_uid: str(u.secUid),
    unique_id: str(u.uniqueId) || username,
    nickname: str(u.nickname),
    signature: str(u.signature),
    bio_link: str(u.bioLink?.link),
    verified: Boolean(u.verified),
    private_account: Boolean(u.privateAccount),
    region: str(u.region),
    language: str(u.language),
    avatar: {
      large: str(u.avatarLarger),
      medium: str(u.avatarMedium),
      thumb: str(u.avatarThumb)
    },
    stats: {
      friend_count: num(s.friendCount),
      follower_count: num(s.followerCount),
      following_count: num(s.followingCount),
      video_count: num(s.videoCount),
      like_count: num(s.heartCount ?? s.heart),
      digg_count: num(s.diggCount)
    },
    created_at: iso(createTime),
    created_time: createTime,
    nickname_changed_at: iso(nickChange),
    nickname_changed_time: nickChange,
    username_changed_at: iso(idChange),
    username_changed_time: idChange
  };
}

export async function getHashtag(name: string) {
  const { html } = await fetchHtml(`https://www.tiktok.com/tag/${encodeURIComponent(name)}`);
  const root = extractScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  const scope = root?.__DEFAULT_SCOPE__ ?? {};
  const detail = scope["webapp.challenge-detail"];
  const info = detail?.challengeInfo;

  if (!info || !info.challenge) {
    if (detail?.statusCode === 10205 || detail?.statusMsg === "challenge_not_exist") {
      throw new InputError("Hashtag tidak ditemukan.");
    }
    throw new Error("Data hashtag tidak tersedia. TikTok mungkin membatasi permintaan, coba lagi.");
  }

  const c = info.challenge;
  const s = info.stats ?? info.statsV2 ?? {};
  return {
    id: str(c.id),
    title: str(c.title) || name,
    desc: str(c.desc),
    is_commerce: Boolean(c.isCommerce),
    cover: str(c.coverLarger) || str(c.coverMedium) || str(c.coverThumb),
    stats: {
      video_count: num(s.videoCount),
      view_count: num(s.viewCount)
    }
  };
}
