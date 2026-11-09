export type TikTokResult = {
  id?: string;
  title?: string;
  author?: { username?: string; nickname?: string };
  thumbnail?: string;
  duration?: number;
  video?: { hd?: string; sd?: string; hdSize?: number; sdSize?: number };
  audio?: string;
  images?: string[];
};

const TIKWM_API = "https://www.tikwm.com/api/";
const TIKWM_ORIGIN = "https://www.tikwm.com";
const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

export async function downloadTikTok(url: string): Promise<TikTokResult> {
  const endpoint = new URL(TIKWM_API);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("hd", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);

    const raw = (await response.json()) as any;
    if (raw?.code !== 0 || !raw?.data) {
      throw new Error(raw?.msg || "Video tidak ditemukan atau tidak bisa diproses");
    }
    return normalize(raw.data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Provider terlalu lama merespons. Coba lagi");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function abs(value?: string): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  if (value.startsWith("//")) return "https:" + value;
  if (value.startsWith("/")) return TIKWM_ORIGIN + value;
  return value;
}

function normalize(d: any): TikTokResult {
  const images = Array.isArray(d.images)
    ? (d.images.map((i: string) => abs(i)).filter(Boolean) as string[])
    : [];

  return {
    id: d.id ? String(d.id) : undefined,
    title: d.title,
    author: {
      username: d.author?.unique_id,
      nickname: d.author?.nickname
    },
    thumbnail: abs(d.origin_cover) ?? abs(d.cover),
    duration: typeof d.duration === "number" ? d.duration : undefined,
    video: images.length
      ? undefined
      : {
          hd: abs(d.hdplay),
          sd: abs(d.play),
          hdSize: Number(d.hd_size) || undefined,
          sdSize: Number(d.size) || undefined
        },
    audio: abs(d.music),
    images: images.length ? images : undefined
  };
}

export const providerUserAgent = UA;
export const providerReferer = TIKWM_ORIGIN + "/";
