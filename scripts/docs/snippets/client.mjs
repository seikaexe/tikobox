// Node.js 18+ tanpa dependency. Jalankan: node client.mjs
import { createWriteStream } from "node:fs"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

const BASE = "https://tikobox.my.id"
const UA = "MyTikoboxClient/1.0"

class TikoboxError extends Error {
  constructor(message, status) {
    super(message)
    this.name = "TikoboxError"
    this.status = status
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function api(path, params = {}, retries = 2) {
  const url = new URL(path, BASE)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(35_000)
    })
    const json = await res.json().catch(() => ({ code: -1, msg: `HTTP ${res.status}` }))

    // 429: tunggu sesuai header retry-after lalu ulangi
    if (res.status === 429 && attempt < retries) {
      await sleep((Number(res.headers.get("retry-after")) || 5) * 1000)
      continue
    }
    if (json.code !== 0) throw new TikoboxError(json.msg, res.status)
    return json.data
  }
}

const getVideo = (link) => api("/api/tiktok", { url: link })
const getProfile = (username) => api("/api/user", { unique_id: username })
const getHashtag = (name) => api("/api/hashtag", { name })

async function saveMedia(mediaUrl, file, cookie = "") {
  const url = new URL("/api/download", BASE)
  url.searchParams.set("url", mediaUrl)
  url.searchParams.set("name", file)
  if (cookie) url.searchParams.set("c", cookie)

  const res = await fetch(url, { headers: { "User-Agent": UA } })
  if (!res.ok) throw new TikoboxError((await res.json()).msg, res.status)

  await pipeline(Readable.fromWeb(res.body), createWriteStream(file))
  console.log("tersimpan:", file)
}

// Contoh pemakaian
const video = await getVideo("https://vt.tiktok.com/ZSxxxxxxx/")

if (video.images) {
  for (const [i, image] of video.images.entries()) {
    await saveMedia(image, `${video.id}-${i + 1}.jpg`, video.cookie)
  }
} else {
  await saveMedia(video.play, `${video.id}.mp4`, video.cookie)
}
if (video.music) await saveMedia(video.music, `${video.id}.mp3`, video.cookie)

console.log(await getProfile("tiktok"))
console.log(await getHashtag("fyp"))
