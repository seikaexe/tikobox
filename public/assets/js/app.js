const $ = (id) => document.getElementById(id);
const form = $("downloadForm");
const input = $("url");
const submitBtn = $("submitBtn");
const pasteBtn = $("pasteBtn");
const statusBox = $("status");
const resultBox = $("result");
const progressBox = $("progress");
const progressLabel = $("progressLabel");
const progressPct = $("progressPct");
const progressBar = $("progressBar");

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Base URL otomatis: API selalu diambil dari domain tempat halaman ini dibuka
const API = `${location.origin}/api`;

const blobCache = new Map();
let current = null;
let progressNow = 0;
let slideIndex = 0;

// Monetag Onclick: muat setelah hasil video tampil, sebelum pengunjung menekan tombol download.
// Jika dimuat di dalam handler klik download, script terlambat menangkap klik pertama.
let monetagOnclickLoaded = false;
function loadMonetagOnclick() {
  if (monetagOnclickLoaded) return;
  monetagOnclickLoaded = true;
  const script = document.createElement("script");
  script.dataset.zone = "12232293";
  script.src = "https://al5sm.com/tag.min.js";
  script.async = true;
  (document.body || document.documentElement).appendChild(script);
}

function setStatus(message, type = "") {
  statusBox.hidden = false;
  statusBox.className = "status" + (type ? " " + type : "");
  statusBox.textContent = message;
}

function setProgress(pct, label) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  progressNow = v;
  progressBox.hidden = false;
  progressBar.style.width = v + "%";
  progressBar.classList.toggle("done", v === 0);
  progressPct.textContent = v + "%";
  if (label) progressLabel.textContent = label;
}

// Ubah response API (format tikwm) ke bentuk yang dipakai tampilan
function adapt(d) {
  const slides = Array.isArray(d.images) && d.images.length;
  const hd = d.hdplay && d.hdplay !== d.play ? d.hdplay : undefined;
  return {
    id: d.id,
    title: d.title,
    author: { username: d.author?.unique_id, nickname: d.author?.nickname },
    thumbnail: d.origin_cover || d.cover,
    video: slides ? undefined : { hd, sd: d.play || d.hdplay, hdSize: d.hd_size, sdSize: d.size },
    audio: d.music,
    images: slides ? d.images : undefined,
    cookie: d.cookie
  };
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function proxyUrl(url, name) {
  const c = current?.cookie ? `&c=${encodeURIComponent(current.cookie)}` : "";
  return `${API}/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}${c}`;
}

// Gambar lewat proxy supaya tidak diblokir hotlink/referrer TikTok
function imgProxy(url) {
  return `${API}/download?url=${encodeURIComponent(url)}&name=img.jpg&inline=1`;
}

// Fallback gambar: kalau lewat proxy gagal, coba URL aslinya. Pakai listener
// (bukan atribut onerror) supaya CSP tidak perlu mengizinkan inline handler.
document.addEventListener("error", (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.dataset.src && el.src !== el.dataset.src) el.src = el.dataset.src;
}, true);

function imgTag(url, cls, alt, id = "") {
  return `<img ${id ? `id="${id}" ` : ""}class="${cls}" src="${esc(imgProxy(url))}" data-src="${esc(url)}" alt="${alt}" referrerpolicy="no-referrer">`;
}

// Ambil link TikTok / tt.site dari teks yang ditempel (boleh tanpa https://)
function normalizeInput(raw) {
  const text = String(raw || "").trim();
  const m =
    text.match(/https?:\/\/[^\s"'<>]+/i) ||
    text.match(/(?<![a-z0-9-])(?:[a-z0-9-]+\.)*(?:tiktok\.com|tt\.site)\/[^\s"'<>]*/i);
  if (!m) return text;
  const link = m[0].replace(/[.,;:!?)\]]+$/, "");
  return /^https?:\/\//i.test(link) ? link : "https://" + link;
}

// Unduh file lewat proxy sambil menghitung persen. Rentang persen: from sampai 100.
async function getBlob(url, name, { size = 0, from = 0, label = "Mengunduh" } = {}) {
  if (blobCache.has(url)) {
    setProgress(100, label);
    return blobCache.get(url);
  }

  setProgress(from, label);
  const res = await fetch(proxyUrl(url, name));
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.msg || "Gagal mengambil file, coba lagi.");
  }

  let blob;
  if (!res.body) {
    blob = await res.blob();
  } else {
    const total = Number(res.headers.get("content-length")) || size || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      const ratio = total
        ? Math.min(loaded / total, 0.99)
        : (1 - Math.exp(-loaded / 3e6)) * 0.95;
      setProgress(from + ratio * (100 - from), label);
    }
    blob = new Blob(chunks, { type: res.headers.get("content-type") || "" });
  }

  blobCache.set(url, blob);
  setProgress(100, label);
  return blob;
}

function triggerDownload(blob, name) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}

// Android dan desktop: file langsung terunduh. iPhone: menu share, pilih Simpan Video.
async function saveMedia(url, name, mime, { gallery = true, size = 0, from = 0, label = "Mengunduh video" } = {}) {
  const raw = await getBlob(url, name, { size, from, label });
  // Audio: paksa tipe audio/mpeg supaya browser tidak menambah ekstensi .mp4 di belakang .mp3
  const blob = gallery ? raw : new Blob([raw], { type: mime });
  const file = new File([blob], name, { type: blob.type || mime });

  if (gallery && isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      setStatus("Pilih Simpan Video untuk memasukkannya ke galeri.", "ok");
    } catch (e) {
      if (e.name === "AbortError") return setStatus("Penyimpanan dibatalkan.");
      if (e.name === "NotAllowedError") return setStatus("File sudah siap, tekan tombol simpan sekali lagi.", "ok");
      throw e;
    }
    return;
  }

  triggerDownload(blob, name);
  setStatus(gallery ? "Selesai, cek galeri atau folder unduhan kamu." : "Selesai, file sudah diunduh.", "ok");
}

function fileBase(d) {
  return `tikobox-${d.id || Date.now()}`;
}

function showSlide(i) {
  const list = current?.images;
  if (!list?.length) return;
  slideIndex = (i + list.length) % list.length;
  const img = $("slideImg");
  const count = $("slideCount");
  if (img) { img.dataset.src = list[slideIndex]; img.src = imgProxy(list[slideIndex]); }
  if (count) count.textContent = `${slideIndex + 1} / ${list.length}`;
}

function bindSwipe() {
  const el = $("slider");
  if (!el) return;
  let x0 = null;
  el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) showSlide(slideIndex + (dx < 0 ? 1 : -1));
  });
}

function render(d) {
  const best = d.video?.hd || d.video?.sd;
  const bestSize = d.video?.hd ? d.video.hdSize : d.video?.sdSize;
  const author = d.author?.username ? "@" + d.author.username : d.author?.nickname || "-";
  const base = fileBase(d);
  const isSlides = !best && d.images?.length;
  let media = d.thumbnail ? imgTag(d.thumbnail, "thumb", "Thumbnail") : "";
  let actions = "";

  if (best) {
    actions += `<button class="btn btn-primary" data-act="video" data-size="${bestSize || 0}" data-url="${esc(best)}" data-name="${base}.mp4">
      ${isIOS ? "SIMPAN KE GALERI" : "DOWNLOAD VIDEO"}${d.video.hd ? " HD" : ""}</button>`;
    const row = [];
    if (d.video.hd && d.video.sd)
      row.push(`<button class="btn btn-blue btn-sm" data-act="video" data-size="${d.video.sdSize || 0}" data-url="${esc(d.video.sd)}" data-name="${base}-sd.mp4">VIDEO SD</button>`);
    if (d.audio)
      row.push(`<button class="btn btn-pink btn-sm" data-act="audio" data-url="${esc(d.audio)}" data-name="${base}.mp3">MP3</button>`);
    if (row.length) actions += `<div class="row">${row.join("")}</div>`;
  } else if (isSlides) {
    const n = d.images.length;
    slideIndex = 0;
    d.images.forEach((u) => { const im = new Image(); im.src = imgProxy(u); });
    media = `
      <div class="slider" id="slider">
        ${imgTag(d.images[0], "thumb", "Foto", "slideImg")}
        ${n > 1 ? `<button class="slide-btn prev" type="button" data-act="prev" aria-label="Foto sebelumnya">&lt;</button>
        <button class="slide-btn next" type="button" data-act="next" aria-label="Foto berikutnya">&gt;</button>` : ""}
        <span class="slide-count" id="slideCount">1 / ${n}</span>
      </div>`;
    actions += `<div class="row">
      <button class="btn btn-primary" data-act="curphoto">${isIOS ? "SIMPAN FOTO" : "DOWNLOAD FOTO"}</button>
      ${n > 1 ? `<button class="btn" data-act="allphotos">${isIOS ? "SIMPAN SEMUA" : "DOWNLOAD SEMUA"}</button>` : ""}
    </div>`;
    if (d.audio)
      actions += `<div class="row"><button class="btn btn-pink btn-sm" data-act="audio" data-url="${esc(d.audio)}" data-name="${base}.mp3">MP3</button></div>`;
  }

  resultBox.className = "result" + (isSlides ? " slides" : "");
  resultBox.innerHTML = `
    ${media}
    <div>
      <h2>${esc(d.title || "TikTok Video")}</h2>
      <p class="meta">${esc(author)}</p>
      <div class="actions">${actions}</div>
      <p class="hint">${isIOS ? "Di iPhone, pilih Simpan Video pada menu yang muncul." : "Tekan tombol download, file akan muncul di galeri"}</p>
    </div>`;
  resultBox.hidden = false;
  if (best) loadMonetagOnclick();
  if (isSlides) bindSwipe();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = normalizeInput(input.value);
  if (!url) return setStatus("Tempel link TikTok dulu.", "err");
  input.value = url;

  resultBox.hidden = true;
  statusBox.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "MEMPROSES";
  setProgress(0, "Memproses link");

  // Naik pelan sampai 90% selama menunggu provider
  const ticker = setInterval(() => {
    if (progressNow < 90) setProgress(progressNow + Math.max(1, (90 - progressNow) * 0.08));
  }, 200);

  try {
    const res = await fetch(`${API}/tiktok?url=${encodeURIComponent(url)}`);
    const json = await res.json().catch(() => null);
    clearInterval(ticker);
    if (!res.ok || json?.code !== 0) throw new Error(json?.msg || "Gagal memproses URL");

    current = adapt(json.data);
    render(current);
    setProgress(100, "Selesai diproses, silakan download");
  } catch (error) {
    clearInterval(ticker);
    progressBox.hidden = true;
    setStatus(error.message || "Terjadi kesalahan.", "err");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "DOWNLOAD";
  }
});

// Download langsung tanpa interstitial AdSense.

resultBox.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;

  const { act, url, name } = btn.dataset;
  if (act === "prev" || act === "next") return showSlide(slideIndex + (act === "next" ? 1 : -1));

  const size = Number(btn.dataset.size) || 0;


  btn.disabled = true;
  statusBox.hidden = true;

  try {
    if (act === "video") {
      await saveMedia(url, name, "video/mp4", { size, label: "Mengunduh video" });
    } else if (act === "audio") {
      await saveMedia(url, name, "audio/mpeg", { gallery: false, label: "Mengunduh audio" });
    } else if (act === "curphoto" && current?.images) {
      const n = `${fileBase(current)}-${slideIndex + 1}.jpg`;
      await saveMedia(current.images[slideIndex], n, "image/jpeg", { label: "Mengunduh foto" });
    } else if (act === "allphotos" && current?.images) {
      const base = fileBase(current);
      const list = current.images;
      const blobs = [];

      for (let i = 0; i < list.length; i++) {
        const n = `${base}-${i + 1}.jpg`;
        const from = (i / list.length) * 100;
        const b = await getBlob(list[i], n, { from, label: `Foto ${i + 1} dari ${list.length}` });
        blobs.push({ blob: b, name: n });
        setProgress(((i + 1) / list.length) * 100);
      }

      const files = blobs.map((x) => new File([x.blob], x.name, { type: x.blob.type || "image/jpeg" }));
      if (isIOS && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files });
          setStatus("Pilih Simpan Gambar untuk memasukkannya ke galeri.", "ok");
        } catch (e) {
          if (e.name !== "AbortError") throw e;
        }
      } else {
        for (const x of blobs) {
          triggerDownload(x.blob, x.name);
          await new Promise((r) => setTimeout(r, 300));
        }
        setStatus("Selesai, foto sudah diunduh.", "ok");
      }
    }
  } catch (error) {
    progressBox.hidden = true;
    setStatus(error.message || "Gagal menyimpan file.", "err");
  } finally {
    btn.disabled = false;
  }
});

document.addEventListener("keydown", (e) => {
  if (!current?.images?.length || resultBox.hidden || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight") showSlide(slideIndex + 1);
  if (e.key === "ArrowLeft") showSlide(slideIndex - 1);
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return setStatus("Clipboard kosong, salin link TikTok dulu.", "err");
    input.value = text;
    statusBox.hidden = true;
    input.focus();
  } catch {
    input.focus();
    setStatus("Izinkan akses clipboard, atau tekan lama pada kolom lalu pilih Tempel.", "err");
  }
});

// Buka BASE_URL/?url=LINK : link terisi dan langsung diproses otomatis
(() => {
  const q = new URLSearchParams(location.search).get("url");
  if (!q) return;
  input.value = normalizeInput(q);
  form.requestSubmit();
})();
