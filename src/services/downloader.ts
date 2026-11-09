/*
  Made By Seikagenou
  Telegram : t.me/seikagenou
  Mohon Untuk Tidak Menghapus, Mengedit, dll Watermark Di Dalam Kode Ini
*/

import { Readable } from "node:stream";

export type TikTokResult = {
  id?: string;
  title?: string;
  author?: {
    username?: string;
    nickname?: string;
  };
  thumbnail?: string;
  duration?: number;
  video?: {
    hd?: string;
    sd?: string;
    hdSize?: number;
    sdSize?: number;
  };
  audio?: string;
  images?: string[];
};

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0.0.0 Mobile Safari/537.36";

const TIMEOUT = 30_000;

const HEADERS: Record<string, string> = {
  "user-agent": UA,
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9," +
    "image/avif,image/webp,*/*;q=0.8",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache"
};

export async function downloadTikTok(
  url: string
): Promise<TikTokResult> {
  const finalUrl = await resolveTikTokUrl(url);

  const html = await fetchHtml(finalUrl);

  const data = extractTikTokData(html);

  if (!data) {
    throw new Error(
      "Data video TikTok tidak ditemukan di halaman"
    );
  }

  const result = normalizeTikTokData(data, html);

  if (!result.id && !result.video?.hd && !result.video?.sd) {
    throw new Error(
      "URL video tidak ditemukan. TikTok mungkin memblokir halaman atau mengubah struktur HTML"
    );
  }

  return result;
}

/*
 * Resolve:
 *
 * vt.tiktok.com
 * vm.tiktok.com
 * www.tt.site
 * www.tt.site/t/...
 *
 * menjadi URL TikTok final
 */
async function resolveTikTokUrl(
  input: string
): Promise<string> {
  let current = input.trim();

  for (let i = 0; i < 5; i++) {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      TIMEOUT
    );

    try {
      const response = await fetch(current, {
        method: "GET",
        headers: {
          ...HEADERS,
          accept: "text/html,*/*;q=0.8"
        },
        redirect: "manual",
        signal: controller.signal
      });

      const location =
        response.headers.get("location");

      if (!location) {
        return current;
      }

      current = new URL(
        location,
        current
      ).href;

    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "TikTok terlalu lama merespons saat resolve URL"
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return current;
}

/*
 * Ambil HTML halaman TikTok secara langsung
 */
async function fetchHtml(
  url: string
): Promise<string> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT
  );

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `TikTok returned HTTP ${response.status}`
      );
    }

    return await response.text();

  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "TikTok terlalu lama merespons. Coba lagi"
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Strategi:
 *
 * 1. __UNIVERSAL_DATA_FOR_REHYDRATION__
 * 2. SIGI_STATE
 * 3. Regex fallback
 */
function extractTikTokData(
  html: string
): any | null {
  const universal =
    extractScriptJson(
      html,
      "__UNIVERSAL_DATA_FOR_REHYDRATION__"
    );

  if (universal) {
    const item =
      findVideoObject(universal);

    if (item) {
      return item;
    }
  }

  const sigi =
    extractScriptJson(
      html,
      "SIGI_STATE"
    );

  if (sigi) {
    const item =
      findVideoObject(sigi);

    if (item) {
      return item;
    }
  }

  return extractFromHtml(html);
}

/*
 * Ambil JSON dari:
 *
 * <script id="..." type="application/json">
 *   {...}
 * </script>
 */
function extractScriptJson(
  html: string,
  id: string
): any | null {
  const pattern =
    new RegExp(
      `<script[^>]*id=["']${escapeRegExp(id)}["'][^>]*>` +
      `([\\s\\S]*?)` +
      `</script>`,
      "i"
    );

  const match =
    html.match(pattern);

  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(
      htmlDecode(
        match[1].trim()
      )
    );
  } catch {
    return null;
  }
}

/*
 * Cari object video secara recursive
 */
function findVideoObject(
  root: any
): any | null {
  const visited =
    new WeakSet<object>();

  function walk(
    value: any
  ): any | null {
    if (
      value === null ||
      typeof value !== "object"
    ) {
      return null;
    }

    if (visited.has(value)) {
      return null;
    }

    visited.add(value);

    /*
     * Struktur video TikTok biasanya
     * mempunyai playAddr / downloadAddr
     */
    if (
      typeof value.id === "string" &&
      (
        typeof value.video === "object" ||
        typeof value.playAddr === "object" ||
        typeof value.downloadAddr === "object"
      )
    ) {
      return value;
    }

    if (
      typeof value.itemId === "string" &&
      typeof value.video === "object"
    ) {
      return value;
    }

    if (
      Array.isArray(value)
    ) {
      for (const item of value) {
        const found =
          walk(item);

        if (found) {
          return found;
        }
      }

      return null;
    }

    for (
      const key of Object.keys(value)
    ) {
      const found =
        walk(value[key]);

      if (found) {
        return found;
      }
    }

    return null;
  }

  return walk(root);
}

/*
 * Fallback apabila JSON SSR
 * tidak tersedia
 */
function extractFromHtml(
  html: string
): any | null {
  const playAddr =
    findUrl(
      html,
      /"playAddr"\s*:\s*"([^"]+)"/i
    );

  const downloadAddr =
    findUrl(
      html,
      /"downloadAddr"\s*:\s*"([^"]+)"/i
    );

  const cover =
    findUrl(
      html,
      /"originCover"\s*:\s*"([^"]+)"/i
    ) ??
    findUrl(
      html,
      /"cover"\s*:\s*"([^"]+)"/i
    );

  const id =
    findString(
      html,
      /"id"\s*:\s*"(\d{10,})"/i
    ) ??
    findString(
      html,
      /"itemId"\s*:\s*"(\d{10,})"/i
    );

  const title =
    findString(
      html,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"]+)["']/i
    ) ??
    findString(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i
    );

  if (
    !playAddr &&
    !downloadAddr &&
    !id
  ) {
    return null;
  }

  return {
    id,
    desc: title,

    video: {
      playAddr,
      downloadAddr
    },

    cover
  };
}

/*
 * Normalisasi object TikTok
 */
function normalizeTikTokData(
  d: any,
  html: string
): TikTokResult {
  const video =
    d.video ?? {};

  const playAddr =
    firstUrl([
      video.playAddr,
      video.play_addr,
      video.playAddrH264,
      d.playAddr,
      d.play_addr
    ]);

  const downloadAddr =
    firstUrl([
      video.downloadAddr,
      video.download_addr,
      d.downloadAddr,
      d.download_addr
    ]);

  const cover =
    firstUrl([
      video.cover,
      video.originCover,
      video.origin_cover,
      d.cover,
      d.originCover,
      d.origin_cover
    ]) ??
    findUrl(
      html,
      /"originCover"\s*:\s*"([^"]+)"/i
    );

  const username =
    d.author?.uniqueId ??
    d.author?.unique_id ??
    d.author?.username ??
    d.authorMeta?.name;

  const nickname =
    d.author?.nickname ??
    d.author?.nickName ??
    d.authorMeta?.nickName;

  const images =
    extractImages(d);

  const duration =
    Number(
      video.duration ??
      d.duration
    );

  const id =
    d.id ??
    d.itemId ??
    d.item_id;

  const title =
    d.desc ??
    d.description ??
    d.title ??
    d.text;

  return {
    id:
      id != null
        ? String(id)
        : undefined,

    title:
      typeof title === "string"
        ? cleanText(title)
        : undefined,

    author: {
      username:
        typeof username === "string"
          ? username
          : undefined,

      nickname:
        typeof nickname === "string"
          ? nickname
          : undefined
    },

    thumbnail:
      cleanUrl(cover),

    duration:
      Number.isFinite(duration)
        ? duration
        : undefined,

    video:
      images.length
        ? undefined
        : {
            hd:
              cleanUrl(
                downloadAddr ??
                playAddr
              ),

            sd:
              cleanUrl(
                playAddr
              )
          },

    audio:
      firstUrl([
        video.music?.playUrl,
        video.music?.play_url,
        d.music?.playUrl,
        d.music?.play_url
      ]),

    images:
      images.length
        ? images
        : undefined
  };
}

/*
 * Ambil slideshow/photo TikTok
 */
function extractImages(
  d: any
): string[] {
  const candidates = [
    d.imagePost?.images,
    d.images,
    d.imagePost?.imageList,
    d.slideshowImageLinks
  ];

  for (
    const list of candidates
  ) {
    if (!Array.isArray(list)) {
      continue;
    }

    const result =
      list
        .map((item: any) => {
          if (typeof item === "string") {
            return cleanUrl(item);
          }

          return firstUrl([
            item?.displayImage?.urlList?.[0],
            item?.originUrl,
            item?.url,
            item?.src
          ]);
        })
        .filter(Boolean) as string[];

    if (result.length) {
      return result;
    }
  }

  return [];
}

/*
 * Download URL media langsung
 */
export async function downloadMedia(
  mediaUrl: string,
  destination: string
): Promise<void> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      120_000
    );

  try {
    const response =
      await fetch(mediaUrl, {
        headers: {
          "user-agent": UA,
          accept: "*/*",
          referer:
            "https://www.tiktok.com/"
        },
        redirect: "follow",
        signal: controller.signal
      });

    if (!response.ok) {
      throw new Error(
        `Media returned HTTP ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error(
        "Response video kosong"
      );
    }

    const fs =
      await import("node:fs");

    const stream =
      Readable.fromWeb(
        response.body as any
      );

    await new Promise<void>(
      (resolve, reject) => {
        const output =
          fs.createWriteStream(
            destination
          );

        stream.pipe(output);

        output.on(
          "finish",
          resolve
        );

        output.on(
          "error",
          reject
        );

        stream.on(
          "error",
          reject
        );
      }
    );

  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Download video terlalu lama"
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function firstUrl(
  values: any[]
): string | undefined {
  for (
    const value of values
  ) {
    const url =
      cleanUrl(value);

    if (url) {
      return url;
    }
  }

  return undefined;
}

function cleanUrl(
  value: any
): string | undefined {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return undefined;
  }

  let url =
    value
      .replace(/\\u002F/g, "/")
      .replace(/\\u0026/g, "&")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

  if (
    url.startsWith("//")
  ) {
    url =
      "https:" + url;
  }

  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
}

function findUrl(
  html: string,
  regex: RegExp
): string | undefined {
  const match =
    html.match(regex);

  return cleanUrl(
    match?.[1]
  );
}

function findString(
  html: string,
  regex: RegExp
): string | undefined {
  return html.match(regex)?.[1];
}

function cleanText(
  text: string
): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .trim();
}

function htmlDecode(
  value: string
): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export const providerUserAgent =
  UA;

export const providerReferer =
  "https://www.tiktok.com/";
