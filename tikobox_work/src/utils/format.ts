import type { TikTokResult } from "../services/downloader.js";
import { createMediaToken } from "./mediaToken.js";

/*
 * Bentuk response API (mirip tikwm):
 *
 * { code: 0, msg: "success", processed_time: 1.23, data: { ... } }
 * { code: -1, msg: "pesan error" }
 */
export function toApiData(r: TikTokResult) {
  const v = r.video ?? {};
  const play = v.sd ?? v.hd ?? "";
  const hdplay = v.hd ?? v.sd ?? "";
  const wmplay = v.wm ?? play;
  const m = r.music;
  const st = r.stats ?? {};
  const mediaToken = createMediaToken(r.cookie);

  return {
    id: r.id ?? "",
    region: r.region ?? "",
    title: r.title ?? "",
    cover: r.cover ?? r.thumbnail ?? "",
    origin_cover: r.originCover ?? r.thumbnail ?? "",
    duration: r.duration ?? 0,
    play,
    wmplay,
    hdplay,
    size: v.sdSize ?? 0,
    wm_size: v.wmSize ?? 0,
    hd_size: v.hdSize ?? 0,
    music: r.audio ?? "",
    music_info: {
      id: m?.id ?? "",
      title: m?.title ?? "",
      play: r.audio ?? "",
      cover: m?.cover ?? "",
      author: m?.author ?? "",
      original: m?.original ?? false,
      duration: m?.duration ?? 0,
      album: m?.album ?? ""
    },
    play_count: st.play ?? 0,
    digg_count: st.digg ?? 0,
    comment_count: st.comment ?? 0,
    share_count: st.share ?? 0,
    download_count: 0,
    collect_count: st.collect ?? 0,
    create_time: r.createTime ?? 0,
    author: {
      id: r.author?.id ?? "",
      unique_id: r.author?.username ?? "",
      nickname: r.author?.nickname ?? "",
      avatar: r.author?.avatar ?? ""
    },
    ...(r.images?.length ? { images: r.images } : {}),
    ...(mediaToken ? { media_token: mediaToken } : {})
  };
}

export function fail(message: string) {
  return { code: -1, msg: message };
}
