// Jalankan dari halaman di domain Tikobox yang sama (mis. di console browser),
// atau di runtime ES module. Dari domain lain, browser memblokir response (tidak ada header CORS)
const BASE = "https://tikobox.my.id"

async function api(path, params = {}) {
  const url = new URL(path, BASE)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url)
  const json = await res.json()

  if (json.code !== 0) {
    const error = new Error(json.msg)
    error.status = res.status
    error.retryAfter = Number(res.headers.get("retry-after")) || 0
    throw error
  }
  return json.data
}

async function saveMedia(mediaUrl, filename, cookie = "") {
  const url = new URL("/api/download", BASE)
  url.searchParams.set("url", mediaUrl)
  url.searchParams.set("name", filename)
  if (cookie) url.searchParams.set("c", cookie)

  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json()).msg)

  const link = document.createElement("a")
  link.href = URL.createObjectURL(await res.blob())
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// Contoh pemakaian
try {
  const video = await api("/api/tiktok", { url: "https://vt.tiktok.com/ZSxxxxxxx/" })
  await saveMedia(video.play, `${video.id}.mp4`, video.cookie)
} catch (error) {
  console.error(error.status, error.message)
}
