import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BASE, LINK, MEDIA, examples } from "./examples.mjs";
import { L, c, code, ep, h2, h3, json, note, ol, p, params, table, tabs, ul } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const snippet = (name) => readFileSync(path.join(here, "snippets", name), "utf8").trimEnd();
const ex = (spec) => tabs(examples(spec));

/* ---------- Contoh data (nilai ilustrasi, bukan data nyata) ---------- */

const T = (extra) => ({ code: 0, msg: "success", processed_time: 1.2345, ...extra });

const videoData = {
  id: "7300000000000000000",
  region: "ID",
  title: "Contoh judul video",
  cover: "https://p16-sign.tiktokcdn.com/xxxx/cover.jpeg",
  origin_cover: "https://p16-sign.tiktokcdn.com/xxxx/origin.jpeg",
  duration: 15,
  play: "https://v16m.tiktokcdn.com/xxxx/video.mp4",
  wmplay: "https://v16m.tiktokcdn.com/xxxx/video-wm.mp4",
  hdplay: "https://v16m.tiktokcdn.com/xxxx/video-hd.mp4",
  size: 1048576,
  wm_size: 1048576,
  hd_size: 2097152,
  music: "https://sf16.tiktokcdn.com/xxxx/music.mp3",
  music_info: {
    id: "7200000000000000000",
    title: "original sound",
    play: "https://sf16.tiktokcdn.com/xxxx/music.mp3",
    cover: "https://p16-sign.tiktokcdn.com/xxxx/music-cover.jpeg",
    author: "username",
    original: true,
    duration: 15,
    album: ""
  },
  play_count: 1000,
  digg_count: 100,
  comment_count: 10,
  share_count: 5,
  download_count: 0,
  collect_count: 3,
  create_time: 1700000000,
  author: {
    id: "6800000000000000000",
    unique_id: "username",
    nickname: "Nama Akun",
    avatar: "https://p16-sign.tiktokcdn.com/xxxx/avatar.jpeg"
  },
  cookie: "ttwid=xxxx"
};

const slideData = {
  ...videoData,
  title: "Contoh postingan foto",
  play: "",
  wmplay: "",
  hdplay: "",
  size: 0,
  wm_size: 0,
  hd_size: 0,
  images: [
    "https://p16-sign.tiktokcdn.com/xxxx/foto-1.jpeg",
    "https://p16-sign.tiktokcdn.com/xxxx/foto-2.jpeg"
  ]
};

const profileData = {
  id: "6800000000000000000",
  unique_id: "username",
  nickname: "Nama Akun",
  bio: "Bio akun",
  verified: false,
  private: false,
  region: "ID",
  avatar: {
    large: "https://p16-sign.tiktokcdn.com/xxxx/avatar-larger.jpeg",
    medium: "https://p16-sign.tiktokcdn.com/xxxx/avatar-medium.jpeg",
    thumb: "https://p16-sign.tiktokcdn.com/xxxx/avatar-thumb.jpeg"
  },
  stats: { follower_count: 1000, following_count: 100, friend_count: 50, like_count: 5000, video_count: 20 },
  created_at: "2020-01-01T00:00:00.000Z",
  nickname_changed_at: "",
  username_changed_at: "",
  url: "https://www.tiktok.com/@username",
  avatar_download: "/api/download?url=https%3A%2F%2Fp16-sign.tiktokcdn.com%2Fxxxx%2Favatar-larger.jpeg&name=username.jpg"
};

const hashtagData = {
  id: "229207",
  name: "fyp",
  description: "",
  stats: { video_count: 1000000, view_count: 50000000000 },
  url: "https://www.tiktok.com/tag/fyp"
};

const err = (msg) => ({ code: -1, msg });

/* ---------- Potongan umum ---------- */

const illustrative = note("info", `Nilai pada contoh response bersifat ilustrasi, bukan data nyata`);

const errorTable = (rows) => table(["Status", "msg", "Penyebab"], rows.map(([s, m, d]) => [c(String(s)), m ? c(m) : "-", d]));

const commonErrors = [
  [429, "Terlalu banyak permintaan. Coba lagi sebentar lagi.", `Melewati batas request, lihat ${L("rate-limits", "Rate Limit")}`],
  [405, "Metode tidak diizinkan.", "Metode selain GET, HEAD, atau OPTIONS"],
  [414, "URL terlalu panjang.", "Panjang URL request lebih dari 2500 karakter"]
];

/* ---------- Halaman ---------- */

export const groups = [
  { id: "mulai", title: "Mulai" },
  { id: "downloader", title: "Downloader" },
  { id: "tiktok", title: "TikTok" },
  { id: "utility", title: "Utility" },
  { id: "guides", title: "Panduan" },
  { id: "reference", title: "Referensi" }
];

export const pages = [];
const add = (page) => pages.push(page);

/* ===== MULAI ===== */

add({
  slug: "",
  group: "mulai",
  title: "Dokumentasi Tikobox API",
  nav: "Beranda",
  desc: "REST API untuk mengambil video, audio, foto, profil, dan hashtag TikTok",
  body: [
    p(`Tikobox adalah TikTok Downloader sekaligus REST API untuk developer. Semua endpoint berada di bawah ${c("/api/")}, memakai method ${c("GET")}, dan mengembalikan JSON`),
    note("ok", `Tanpa API key dan tanpa login. Cukup kirim request ke Base URL`),
    h2("mulai-cepat", "Mulai Cepat"),
    code("bash", `curl -sS -G "${BASE}/api/tiktok" \\\n  -A "MyTikoboxClient/1.0" \\\n  --data-urlencode "url=${LINK}"`, "cURL"),
    p(`Lanjut ke ${L("getting-started", "Memulai")} untuk alur lengkap dari mengambil info video sampai menyimpan file`),
    h2("endpoint", "Daftar Endpoint"),
    table(
      ["Method", "Endpoint", "Fungsi"],
      [
        ['<span class="m m-get">GET</span>', c("/api/tiktok"), `Info video, audio, atau foto dari link TikTok. ${L("downloader/video", "Detail")}`],
        ['<span class="m m-get">GET</span>', c("/api/{link}"), `Bentuk singkat: tempel link setelah ${c("/api/")}. ${L("downloader/video", "Detail", "#bentuk-singkat")}`],
        ['<span class="m m-get">GET</span>', c("/api/download"), `Proxy unduh file media. ${L("downloader/media-proxy", "Detail")}`],
        ['<span class="m m-get">GET</span>', c("/api/user"), `Profil akun. Juga ${c("/api/user/{username}")} dan ${c("/api/@{username}")}. ${L("tiktok/profile", "Detail")}`],
        ['<span class="m m-get">GET</span>', c("/api/hashtag"), `Statistik hashtag. Juga ${c("/api/hashtag/{name}")}. ${L("tiktok/hashtag", "Detail")}`],
        ['<span class="m m-get">GET</span>', c("/api/health"), `Cek server hidup. ${L("utility/health", "Detail")}`],
        ['<span class="m m-get">GET</span>', c("/api/"), `Info penggunaan API. ${L("utility/info", "Detail")}`]
      ]
    ),
    h2("kategori", "Kategori"),
    ul([
      `${L("downloader/video", "Video")}, ${L("downloader/audio", "Audio")}, dan ${L("downloader/slideshow", "Slideshow")} diambil dari satu endpoint ${c("/api/tiktok")}`,
      `${L("tiktok/profile", "Profil")} dan ${L("tiktok/hashtag", "Hashtag")} untuk data akun dan tagar`,
      `Fitur yang belum ada, seperti pencarian user dan pemrosesan media, dijelaskan di ${L("reference/not-available", "Belum Tersedia")}`
    ])
  ].join("\n")
});

add({
  slug: "getting-started",
  group: "mulai",
  title: "Memulai",
  desc: "Dari request pertama sampai file tersimpan",
  body: [
    p(`Alur dasar ada dua langkah: ambil info lewat ${c("/api/tiktok")}, lalu unduh file lewat ${c("/api/download")}`),
    h2("langkah-1", "1. Ambil Info Link"),
    p(`Kirim link TikTok ke parameter ${c("url")}. Link boleh berupa link pendek (${c("vt.tiktok.com")}, ${c("vm.tiktok.com")}, ${c("tt.site")}) maupun link lengkap`),
    ex({ path: "/api/tiktok", params: { url: LINK } }),
    p(`Cek ${c("code")} pada body. Nilai ${c("0")} berarti sukses dan data ada di ${c("data")}. Nilai ${c("-1")} berarti gagal dan alasannya ada di ${c("msg")}`),
    json(T({ data: { id: videoData.id, title: videoData.title, play: videoData.play, music: videoData.music, "...": "lihat Format Response" } }), "Response"),
    h2("langkah-2", "2. Unduh File"),
    p(`Pakai URL dari ${c("data.play")}, ${c("data.music")}, atau ${c("data.images")} sebagai parameter ${c("url")} di ${c("/api/download")}`),
    ex({ path: "/api/download", params: { url: MEDIA, name: "video.mp4" }, save: "video.mp4" }),
    note("info", `URL media dari TikTok bisa kedaluwarsa. Unduh segera setelah mengambil info, jangan disimpan untuk dipakai berhari-hari`),
    h2("selanjutnya", "Selanjutnya"),
    ul([
      `Pahami ${L("rate-limits", "Rate Limit")} dan ${L("errors", "Penanganan Error")}`,
      `Contoh klien lengkap: ${L("guides/curl", "cURL")}, ${L("guides/javascript", "JavaScript")}, ${L("guides/nodejs", "Node.js")}, ${L("guides/python", "Python")}, ${L("guides/php", "PHP")}`,
      `Semua field response ada di ${L("reference/response-format", "Format Response")}`
    ])
  ].join("\n")
});

add({
  slug: "base-url",
  group: "mulai",
  title: "Base URL",
  desc: "Alamat dasar semua request API",
  body: [
    p(`Semua endpoint berada di bawah ${c("/api/")} pada domain Tikobox`),
    `<div class="baseurl"><code id="baseUrl">${BASE}</code><button id="copyBase" class="btn btn-primary btn-sm" type="button">SALIN</button></div>`,
    `<div class="baseurl"><code id="apiUrl">${BASE}/api/</code><button id="copyApi" class="btn btn-primary btn-sm" type="button">SALIN</button></div>`,
    note("info", `Pada halaman ini, kedua alamat di atas mengikuti domain tempat dokumentasi dibuka. Contoh kode di seluruh dokumentasi juga mengikuti domain yang sama`),
    h2("aturan", "Aturan"),
    ul([
      `Endpoint API tidak pernah berada di luar ${c("/api/")}`,
      `Dokumentasi berada di ${c("/docs/")}`,
      `Response berupa JSON UTF-8, kecuali ${L("downloader/media-proxy", c("/api/download"))} yang mengembalikan file`,
      `Method yang diterima: ${c("GET")}, ${c("HEAD")}, dan ${c("OPTIONS")}`
    ])
  ].join("\n")
});

add({
  slug: "authentication",
  group: "mulai",
  title: "Autentikasi",
  desc: "API publik tanpa API key",
  body: [
    p(`Saat ini API tidak memakai autentikasi. Tidak ada API key, token, atau header ${c("Authorization")} yang perlu dikirim`),
    h2("identifikasi", "Identifikasi Klien"),
    p(`Karena tanpa API key, pembatasan request dilakukan per alamat IP. Server juga membaca header ${c("User-Agent")} untuk membedakan klien otomatis dari browser, lihat ${L("rate-limits", "Rate Limit", "#klien-otomatis")}`),
    p(`Kirim ${c("User-Agent")} yang menjelaskan aplikasi kamu, misalnya:`),
    code("http", `User-Agent: MyTikoboxClient/1.0`, "Header"),
    h2("penggunaan-browser", "Penggunaan dari Browser"),
    p(`Response API tidak menyertakan header CORS. Browser di domain lain tidak bisa membaca response ${c("fetch")} ke API ini. Panggil API dari server kamu (backend), lalu teruskan hasilnya ke frontend`),
    note("warn", `Jangan menaruh kunci atau rahasia di request. API ini tidak membutuhkannya`)
  ].join("\n")
});

add({
  slug: "rate-limits",
  group: "mulai",
  title: "Rate Limit",
  desc: "Batas request per menit",
  body: [
    p(`Batas dihitung per alamat IP dengan jendela tetap 60 detik. Hitungan di-reset saat jendela berganti`),
    table(
      ["Kelompok", "Endpoint", "Normal", "Klien otomatis"],
      [
        ["lookup", `${c("/api/tiktok")}, ${c("/api/{link}")}, ${c("/api/user")}, ${c("/api/hashtag")}, ${c("/api/")}`, "30 per menit", "12 per menit"],
        ["download", c("/api/download"), "60 per menit", "15 per menit"],
        ["-", c("/api/health"), "Tanpa batas", "Tanpa batas"]
      ]
    ),
    note("warn", `Semua endpoint kelompok lookup berbagi satu hitungan yang sama. Satu request profil, hashtag, atau video masing-masing memakai jatah 30 per menit yang sama`),
    h2("klien-otomatis", "Klien Otomatis"),
    p(`Request dianggap klien otomatis jika ${c("User-Agent")} kosong, kurang dari 10 karakter, atau mengandung nama tool umum seperti curl, wget, python-requests, axios, node-fetch, undici, okhttp, Postman, dan sejenisnya. Klien seperti ini mendapat batas yang lebih ketat seperti pada tabel`),
    p(`Scanner keamanan (misalnya sqlmap, nikto, nmap) selalu ditolak dengan status ${c("403")}`),
    h2("header", "Header Response"),
    table(
      ["Header", "Isi"],
      [
        [c("ratelimit-limit"), "Batas untuk request ini"],
        [c("ratelimit-remaining"), "Sisa jatah pada jendela berjalan"],
        [c("ratelimit-reset"), "Detik sampai jendela berganti"],
        [c("retry-after"), "Detik yang harus ditunggu, hanya pada status 429"]
      ]
    ),
    h2("respons-429", "Response 429"),
    json(err("Terlalu banyak permintaan. Coba lagi sebentar lagi."), "429"),
    p(`Tunggu selama nilai ${c("retry-after")} lalu ulangi. Contoh penanganan otomatis ada di setiap ${L("guides/nodejs", "panduan bahasa")}`),
    h2("catatan", "Catatan"),
    ul([
      `Download tidak dibatasi ukuran file maupun durasi video, hanya dibatasi jumlah request`,
      `Pada deployment tanpa Redis, hitungan disimpan di memori tiap instance sehingga bisa terpisah antar instance. Redis (Upstash) bersifat opsional dan hanya perlu diatur oleh pemilik deployment`
    ])
  ].join("\n")
});

add({
  slug: "errors",
  group: "mulai",
  title: "Penanganan Error",
  desc: "Format error dan cara menanganinya",
  body: [
    p(`Semua error memakai format yang sama dan status HTTP yang sesuai`),
    json(err("pesan error"), "Format error"),
    ul([
      `${c("code")} selalu ${c("-1")} untuk error`,
      `${c("msg")} berisi pesan yang aman ditampilkan. Detail teknis internal tidak dikirim ke klien`
    ]),
    h2("urutan", "Urutan Pengecekan"),
    ol([
      `Cek status HTTP`,
      `Parse body sebagai JSON. Bila gagal di-parse, anggap error jaringan atau proxy`,
      `Cek ${c("code !== 0")}, lalu baca ${c("msg")}`
    ]),
    h2("jenis", "Jenis Error"),
    errorTable([
      [400, "Link TikTok tidak valid. Tempel link setelah /api/, contoh: /api/https://vt.tiktok.com/xxxx", "Link kosong atau bukan host TikTok yang didukung"],
      [400, "URL media tidak diizinkan.", "URL pada /api/download bukan host media TikTok"],
      [403, "Akses ditolak.", "Scanner keamanan, atau /api/download dipanggil dari halaman situs lain di browser"],
      [404, "Username tidak valid", "Input profil atau hashtag kosong, salah format, atau data tidak ditemukan"],
      [502, "", "TikTok gagal diakses atau data tidak tersedia. Isi msg bervariasi, lihat tabel di bawah"],
      [504, "Permintaan terlalu lama, coba lagi.", "Proses melebihi 28 detik"],
      ...commonErrors
    ]),
    h2("pesan-502", "Pesan pada Status 502"),
    table(
      ["msg", "Arti"],
      [
        [c("Video tidak tersedia (privat, dihapus, atau dibatasi wilayah)"), "Konten tidak bisa diakses dari server"],
        [c("TikTok meminta verifikasi (captcha) untuk server ini, coba lagi nanti"), "TikTok menantang server. Ulangi beberapa saat kemudian"],
        [c("Data video TikTok tidak ditemukan di halaman"), "Halaman terbuka tetapi data video tidak ada"],
        [c("Permintaan ke TikTok terlalu lama, coba lagi."), "TikTok tidak merespons tepat waktu"],
        [c("Link tidak diizinkan."), "Link atau redirect mengarah ke tujuan yang ditolak oleh validasi keamanan"],
        [c("Gagal memproses URL"), "Pesan umum untuk error lain"]
      ]
    ),
    h2("saran", "Saran Penanganan"),
    ul([
      `Status ${c("429")}: tunggu sesuai ${c("retry-after")}, lalu ulangi`,
      `Status ${c("502")} dan ${c("504")}: boleh diulang dengan jeda, tetapi batasi jumlah percobaan`,
      `Status ${c("400")} dan ${c("404")}: perbaiki input, mengulang request yang sama tidak akan berhasil`
    ])
  ].join("\n")
});

add({
  slug: "changelog",
  group: "mulai",
  title: "Changelog",
  desc: "Riwayat perubahan dokumentasi dan API",
  body: [
    h2("2026-11-12", "12 November 2026"),
    h3("Dokumentasi"),
    ul([
      `Dokumentasi developer baru di ${c("/docs/")}: semua endpoint, contoh cURL, Fetch, Node.js, Python, PHP, pencarian, dan navigasi`,
      `Panduan pengguna web dipindahkan ke ${L("guides/web", "Panduan Aplikasi Web")}`
    ]),
    h3("Kode"),
    ul([
      `Menambahkan ${c("src/services/profile.ts")} yang dipakai endpoint profil dan hashtag`,
      `${c("HEAD /api/download")} tidak lagi mengunduh file dari TikTok, hanya mengembalikan header`,
      `Perbaikan urutan pengecekan pada response timeout di ${c("/api/tiktok")} dan endpoint lookup lain`
    ]),
    note("info", `Response endpoint yang sudah ada tidak diubah`)
  ].join("\n")
});

/* ===== DOWNLOADER ===== */

const videoTable = table(
  ["Field", "Tipe", "Keterangan"],
  [
    [c("id"), "string", "ID video"],
    [c("region"), "string", "Kode wilayah pembuatan, kosong bila tidak ada"],
    [c("title"), "string", "Caption video"],
    [c("cover"), "string", "URL gambar cover"],
    [c("origin_cover"), "string", "URL cover asli"],
    [c("duration"), "number", "Durasi, 0 bila tidak tersedia"],
    [c("play"), "string", "URL MP4 tanpa watermark (kualitas standar)"],
    [c("wmplay"), "string", `URL MP4 dengan watermark. Sama dengan ${c("play")} bila versi watermark tidak ada`],
    [c("hdplay"), "string", `URL MP4 HD. Sama dengan ${c("play")} bila HD tidak ada`],
    [c("size"), "number", `Ukuran ${c("play")} dalam byte, 0 bila tidak diketahui`],
    [c("wm_size")+"", "number", `Ukuran ${c("wmplay")} dalam byte`],
    [c("hd_size"), "number", `Ukuran ${c("hdplay")} dalam byte`],
    [c("create_time"), "number", "Waktu posting, Unix timestamp"],
    [c("author"), "object", `${c("id")}, ${c("unique_id")}, ${c("nickname")}, ${c("avatar")}`],
    [c("cookie"), "string", `Hanya ada bila TikTok memberi cookie sesi. Teruskan ke ${c("/api/download")} lewat parameter ${c("c")}`]
  ]
);

add({
  slug: "downloader/video",
  group: "downloader",
  title: "Video Downloader",
  desc: "Ambil info dan URL video TikTok tanpa watermark",
  body: [
    ep("GET", "/api/tiktok"),
    p(`Mengambil data satu link TikTok: URL video (tanpa watermark, watermark, HD), cover, statistik, penulis, dan musik. Link foto dan slideshow memakai endpoint yang sama, lihat ${L("downloader/slideshow", "Slideshow")}`),
    h2("parameter", "Parameter Query"),
    params([["url", "string", true, `Link TikTok. Boleh tanpa ${c("https://")} dan boleh ada teks lain di sekitarnya, link pertama akan diambil`]]),
    h2("link", "Link yang Didukung"),
    table(
      ["Host", "Contoh"],
      [
        [c("tiktok.com"), c("https://www.tiktok.com/@user/video/7300000000000000000")],
        [c("vt.tiktok.com"), c("https://vt.tiktok.com/ZSxxxxxxx/")],
        [c("vm.tiktok.com"), c("https://vm.tiktok.com/ZSxxxxxxx/")],
        [`${c("tt.site")}, ${c("www.tt.site")}`, c("https://www.tt.site/t/xxxx")]
      ]
    ),
    ul([
      `Subdomain ${c("*.tiktok.com")} dan ${c("m.tiktok.com")} juga diterima`,
      `Link dengan username dan password (${c("user:pass@host")}) atau port eksplisit ditolak`,
      `Panjang link maksimal 500 karakter`
    ]),
    h2("request", "Contoh Request"),
    ex({ path: "/api/tiktok", params: { url: LINK } }),
    h2("sukses", "Response Sukses"),
    illustrative,
    json(T({ data: videoData }), "200"),
    h3("Field data"),
    videoTable,
    p(`Daftar lengkap termasuk ${c("music_info")}, statistik, dan ${c("images")} ada di ${L("reference/response-format", "Format Response")}`),
    h2("error", "Response Error"),
    json(err("Link TikTok tidak valid. Tempel link setelah /api/, contoh: /api/https://vt.tiktok.com/xxxx"), "400"),
    errorTable([
      [400, "Link TikTok tidak valid...", "Parameter url kosong atau bukan link TikTok"],
      [502, "Video tidak tersedia (privat, dihapus, atau dibatasi wilayah)", "Video tidak bisa diakses"],
      [502, "TikTok meminta verifikasi (captcha) untuk server ini, coba lagi nanti", "Server ditantang captcha oleh TikTok"],
      [504, "Permintaan terlalu lama, coba lagi.", "Proses melebihi 28 detik"],
      ...commonErrors
    ]),
    h2("bentuk-singkat", "Bentuk Singkat"),
    ep("GET", "/api/{link}"),
    p(`Link bisa ditempel langsung setelah ${c("/api/")}. Hasilnya sama persis dengan ${c("/api/tiktok")}, begitu juga ${c("/api/?url=LINK")}`),
    code("bash", `curl -sS -A "MyTikoboxClient/1.0" "${BASE}/api/${LINK}"`, "cURL"),
    note("warn", `Path yang tidak dikenali di bawah ${c("/api/")} diperlakukan sebagai link TikTok sehingga mengembalikan status 400 dengan pesan link tidak valid, bukan 404`),
    h2("catatan", "Catatan"),
    ul([
      `Data diambil langsung dari halaman TikTok. Video privat, dihapus, atau dibatasi wilayah tidak bisa diambil`,
      `URL media memiliki masa berlaku dari TikTok, unduh segera lewat ${L("downloader/media-proxy", "Media Proxy")}`,
      `${c("download_count")} selalu ${c("0")} karena tidak disediakan oleh sumber data`,
      `Response tidak di-cache (${c("cache-control: no-store")})`,
      `Batas waktu proses 28 detik`
    ])
  ].join("\n")
});

add({
  slug: "downloader/audio",
  group: "downloader",
  title: "Audio Downloader",
  desc: "Ambil musik atau suara dari video TikTok",
  body: [
    p(`Audio tidak punya endpoint sendiri. URL audio ada di response ${L("downloader/video", c("/api/tiktok"))} pada field ${c("music")} dan ${c("music_info.play")}, lalu diunduh lewat ${L("downloader/media-proxy", c("/api/download"))}`),
    h2("field", "Field Audio"),
    table(
      ["Field", "Tipe", "Keterangan"],
      [
        [c("music"), "string", "URL audio, kosong bila tidak tersedia"],
        [c("music_info.id"), "string", "ID musik"],
        [c("music_info.title"), "string", "Judul musik"],
        [c("music_info.play"), "string", `URL audio, sama dengan ${c("music")}`],
        [c("music_info.cover"), "string", "URL cover musik"],
        [c("music_info.author"), "string", "Nama pembuat musik"],
        [c("music_info.original"), "boolean", "Suara asli dari pembuat video"],
        [c("music_info.duration"), "number", "Durasi musik"],
        [c("music_info.album"), "string", "Nama album, kosong bila tidak ada"]
      ]
    ),
    h2("alur", "Alur"),
    ol([
      `Panggil ${c("/api/tiktok")} lalu ambil ${c("data.music")}`,
      `Pastikan nilainya tidak kosong`,
      `Unduh lewat ${c("/api/download")} dengan ${c("name")} berakhiran ${c(".mp3")}`
    ]),
    note("info", `Bila ${c("name")} berakhiran ${c(".mp3")}, server memaksa ${c("content-type: audio/mpeg")} agar file tidak tersimpan sebagai ${c(".mp3.mp4")}`),
    h2("request", "Contoh Unduh Audio"),
    ex({ path: "/api/download", params: { url: "https://sf16.tiktokcdn.com/xxxx/music.mp3", name: "audio.mp3" }, save: "audio.mp3" }),
    illustrative,
    h2("error", "Response Error"),
    p(`Sama dengan ${L("downloader/media-proxy", "Media Proxy", "#error")}`)
  ].join("\n")
});

add({
  slug: "downloader/slideshow",
  group: "downloader",
  title: "Slideshow Downloader",
  desc: "Ambil semua foto dari postingan foto TikTok",
  body: [
    p(`Postingan foto (slideshow) memakai endpoint ${L("downloader/video", c("/api/tiktok"))}. Bedanya, response memiliki field ${c("images")} dan tidak memiliki video`),
    h2("deteksi", "Mendeteksi Postingan Foto"),
    ul([
      `${c("data.images")} hanya ada untuk postingan foto, berupa array URL gambar`,
      `${c("data.play")}, ${c("data.wmplay")}, dan ${c("data.hdplay")} berisi string kosong`,
      `${c("data.size")}, ${c("data.wm_size")}, dan ${c("data.hd_size")} bernilai ${c("0")}`,
      `${c("data.music")} tetap berisi audio bila tersedia`
    ]),
    h2("request", "Contoh Request"),
    ex({ path: "/api/tiktok", params: { url: "https://www.tiktok.com/@username/photo/7300000000000000000" } }),
    h2("sukses", "Response Sukses"),
    illustrative,
    json(T({ data: slideData }), "200"),
    h2("unduh", "Mengunduh Foto"),
    p(`Unduh setiap URL pada ${c("images")} lewat ${L("downloader/media-proxy", c("/api/download"))}. Tipe gambar yang diizinkan: JPEG, PNG, WebP, GIF, AVIF, HEIC`),
    ex({ path: "/api/download", params: { url: "https://p16-sign.tiktokcdn.com/xxxx/foto-1.jpeg", name: "foto-1.jpg" }, save: "foto-1.jpg" }),
    note("info", `Contoh klien lengkap yang menangani video dan foto sekaligus ada di ${L("guides/nodejs", "panduan Node.js")}, ${L("guides/python", "Python")}, ${L("guides/php", "PHP")}, dan ${L("guides/curl", "cURL")}`)
  ].join("\n")
});

add({
  slug: "downloader/media-proxy",
  group: "downloader",
  title: "Media Proxy",
  desc: "Unduh file media TikTok lewat server Tikobox",
  body: [
    ep("GET", "/api/download"),
    p(`Meneruskan (stream) file video, audio, atau gambar dari CDN TikTok. Tidak ada transcoding, kompresi, atau pengubahan isi file. Endpoint ini dipakai tombol unduh di website Tikobox`),
    h2("parameter", "Parameter Query"),
    params([
      ["url", "string", true, "URL media dari CDN TikTok, maksimal 2000 karakter"],
      ["name", "string", false, `Nama file untuk ${c("content-disposition")}. Karakter selain huruf, angka, ${c("_")}, ${c(".")}, ${c("-")} diganti ${c("_")}, maksimal 80 karakter, default ${c("tikobox")}`],
      ["c", "string", false, `Cookie dari ${c("data.cookie")}. Hanya karakter ASCII yang bisa dicetak, maksimal 2000 karakter`],
      ["inline", "string", false, `Isi ${c("1")} agar file ditampilkan di browser (${c("inline")}), selain itu menjadi ${c("attachment")}`]
    ]),
    h2("host", "Host yang Diizinkan"),
    p(`Hanya host berikut (dan subdomainnya) lewat ${c("http")} atau ${c("https")}, tanpa username, password, atau port:`),
    ul(
      ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com", "tiktokv.com", "tiktokv.us", "tiktokv.eu", "byteoversea.com", "ibytedtos.com", "muscdn.com", "tiktok.com"].map(
        (h) => c(h)
      )
    ),
    h2("request", "Contoh Request"),
    ex({ path: "/api/download", params: { url: MEDIA, name: "video.mp4" }, save: "video.mp4" }),
    h2("sukses", "Response Sukses"),
    p(`Status ${c("200")} dengan body berupa file. Header yang dikirim:`),
    table(
      ["Header", "Isi"],
      [
        [c("content-type"), `Dari TikTok. Diizinkan: ${c("video/*")}, ${c("audio/*")}, gambar (jpeg, png, webp, gif, avif, heic), ${c("application/octet-stream")}`],
        [c("content-length"), "Ada bila TikTok mengirimkannya"],
        [c("content-disposition"), `${c("attachment")} atau ${c("inline")}, beserta nama file`],
        [c("cache-control"), c("no-store")],
        [c("x-content-type-options"), c("nosniff")],
        [c("content-security-policy"), c("default-src 'none'; sandbox")]
      ]
    ),
    h2("error", "Response Error"),
    p(`Error tetap berupa JSON, bukan file`),
    json(err("URL media tidak diizinkan."), "400"),
    errorTable([
      [400, "URL media tidak diizinkan.", "Host tidak ada di daftar, URL terlalu panjang, atau redirect ke tujuan yang ditolak"],
      [403, "Akses ditolak.", `Browser mengirim ${c("sec-fetch-site: cross-site")}, yaitu dipanggil dari halaman situs lain`],
      [502, "Gagal mengambil file dari provider (HTTP 403).", "TikTok menolak permintaan. Angka mengikuti status dari TikTok"],
      [502, "Tipe file tidak didukung.", "Tipe konten dari TikTok bukan video, audio, atau gambar yang diizinkan"],
      [502, "Gagal mengambil file, coba lagi.", "Koneksi ke TikTok gagal"],
      ...commonErrors
    ]),
    h2("catatan", "Catatan"),
    ul([
      `Tidak ada batas ukuran file maupun durasi. Yang dibatasi hanya jumlah request, lihat ${L("rate-limits", "Rate Limit")}`,
      `Batas waktu menunggu header dari TikTok adalah 15 detik. Lama unduhan sendiri tidak dibatasi`,
      `Panjang total URL request maksimal 2500 karakter. Cookie panjang yang di-encode bisa melewati batas ini sehingga status ${c("414")}. Cookie bersifat opsional`,
      `Header ${c("Range")} tidak diteruskan, jadi resume unduhan tidak didukung`,
      `${c("HEAD")} mengembalikan header tanpa mengunduh file`,
      `Pemanggilan dari browser di domain lain diblokir. Gunakan dari server kamu`
    ])
  ].join("\n")
});

/* ===== TIKTOK ===== */

add({
  slug: "tiktok/profile",
  group: "tiktok",
  title: "Profil TikTok",
  desc: "Informasi profil akun TikTok",
  body: [
    ep("GET", "/api/user"),
    ep("GET", "/api/user/{username}"),
    ep("GET", "/api/@{username}"),
    p(`Mengambil informasi profil publik dari halaman akun TikTok. Ketiga bentuk URL menghasilkan response yang sama`),
    h2("parameter", "Parameter"),
    params([
      ["unique_id", "string", true, `Username, dengan atau tanpa ${c("@")}. Query ${c("username")} diterima sebagai alias. Pada bentuk path ${c("/api/user/{username}")} dan ${c("/api/@{username}")}, username ditulis langsung di URL`]
    ]),
    p(`Aturan username: 1 sampai 24 karakter dari huruf, angka, titik, dan underscore`),
    h2("request", "Contoh Request"),
    ex({ path: "/api/user", params: { unique_id: "username" } }),
    code("bash", `curl -sS -A "MyTikoboxClient/1.0" "${BASE}/api/@username"`, "Bentuk path"),
    h2("sukses", "Response Sukses"),
    illustrative,
    json(T({ data: profileData }), "200"),
    h2("field", "Field data"),
    table(
      ["Field", "Tipe", "Keterangan"],
      [
        [c("id"), "string", "User ID"],
        [c("unique_id"), "string", "Username"],
        [c("nickname"), "string", "Nama tampilan"],
        [c("bio"), "string", "Biografi"],
        [c("verified"), "boolean", "Akun terverifikasi"],
        [c("private"), "boolean", "Akun privat"],
        [c("region"), "string", "Kode wilayah akun, kosong bila tidak tersedia"],
        [c("avatar.large"), "string", "Foto profil ukuran besar"],
        [c("avatar.medium"), "string", "Foto profil ukuran sedang"],
        [c("avatar.thumb"), "string", "Foto profil ukuran kecil"],
        [c("stats.follower_count"), "number", "Jumlah followers"],
        [c("stats.following_count"), "number", "Jumlah following"],
        [c("stats.friend_count"), "number", "Jumlah teman"],
        [c("stats.like_count"), "number", "Total likes"],
        [c("stats.video_count"), "number", "Jumlah video"],
        [c("created_at"), "string", "Waktu akun dibuat, ISO 8601 UTC"],
        [c("nickname_changed_at"), "string", `Waktu nickname terakhir diubah, ISO 8601 UTC. ${c('""')} bila tidak tersedia`],
        [c("username_changed_at"), "string", `Waktu username terakhir diubah, ISO 8601 UTC. ${c('""')} bila tidak tersedia`],
        [c("url"), "string", "Link profil di TikTok"],
        [c("avatar_download"), "string", `Path relatif ke ${c("/api/download")} untuk mengunduh foto profil. Tambahkan Base URL di depannya`]
      ]
    ),
    h2("sumber", "Sumber Data dan Batasan"),
    ul([
      `Data diambil dari halaman publik ${c("tiktok.com/@username")}, tanpa login dan tanpa layanan pihak ketiga`,
      `${c("created_at")} memakai waktu pembuatan dari TikTok. Bila kosong, waktu dihitung dari User ID akun`,
      `Waktu perubahan nickname dan username kosong bila akun belum pernah mengubahnya atau TikTok tidak menyediakannya`,
      `Angka yang tidak tersedia ditulis ${c("0")}, sehingga ${c("0")} tidak selalu berarti benar-benar nol`,
      `Struktur halaman TikTok dapat berubah dan TikTok dapat menampilkan captcha ke server. Field bisa kosong dan request bisa gagal sewaktu-waktu`,
      `Hanya data publik yang tersedia, tidak ada email, nomor telepon, atau data privat`
    ]),
    h2("error", "Response Error"),
    json(err("Akun tidak ditemukan"), "404"),
    errorTable([
      [404, "Username wajib diisi", "Parameter kosong"],
      [404, "Username tidak valid", "Format username salah"],
      [404, "Akun tidak ditemukan", "TikTok menyatakan akun tidak ada"],
      [502, "TikTok meminta verifikasi (captcha) untuk server ini, coba lagi nanti", "Server ditantang captcha oleh TikTok"],
      [502, "Data tidak ditemukan di halaman TikTok", "Halaman terbuka tetapi data profil tidak ada"],
      [504, "Permintaan terlalu lama, coba lagi.", "Proses melebihi 28 detik"],
      ...commonErrors
    ]),
    note("info", `Input yang salah pada endpoint ini mengembalikan status ${c("404")}, bukan ${c("400")}`)
  ].join("\n")
});

add({
  slug: "tiktok/hashtag",
  group: "tiktok",
  title: "Hashtag TikTok",
  desc: "Jumlah video dan total views hashtag",
  body: [
    ep("GET", "/api/hashtag"),
    ep("GET", "/api/hashtag/{name}"),
    p(`Mengambil informasi dan statistik satu hashtag dari halaman tag TikTok. Daftar video milik hashtag tidak tersedia`),
    h2("parameter", "Parameter"),
    params([
      ["name", "string", true, `Nama hashtag, dengan atau tanpa ${c("#")}. Query ${c("hashtag")} diterima sebagai alias. Pada bentuk path ${c("/api/hashtag/{name}")}, nama ditulis langsung di URL`]
    ]),
    p(`Aturan nama: 1 sampai 100 karakter berupa huruf (termasuk huruf non-Latin), angka, dan underscore`),
    note("warn", `Karakter ${c("#")} pada URL dianggap fragment oleh browser dan HTTP client. Tulis tanpa ${c("#")} atau encode menjadi ${c("%23")}`),
    h2("request", "Contoh Request"),
    ex({ path: "/api/hashtag", params: { name: "fyp" } }),
    code("bash", `curl -sS -A "MyTikoboxClient/1.0" "${BASE}/api/hashtag/fyp"`, "Bentuk path"),
    h2("sukses", "Response Sukses"),
    illustrative,
    json(T({ data: hashtagData }), "200"),
    h2("field", "Field data"),
    table(
      ["Field", "Tipe", "Keterangan"],
      [
        [c("id"), "string", "ID hashtag"],
        [c("name"), "string", "Nama hashtag"],
        [c("description"), "string", "Deskripsi, kosong bila tidak ada"],
        [c("stats.video_count"), "number", "Jumlah video yang memakai hashtag"],
        [c("stats.view_count"), "number", "Total views"],
        [c("url"), "string", "Link hashtag di TikTok"]
      ]
    ),
    h2("sumber", "Sumber Data dan Batasan"),
    ul([
      `Angka berasal dari halaman ${c("tiktok.com/tag/nama")} pada saat request. Nilainya bisa berbeda dengan yang tampil di aplikasi TikTok atau pada waktu lain, karena TikTok memperbarui dan membulatkan statistik dengan caranya sendiri`,
      `Angka yang tidak tersedia ditulis ${c("0")}`,
      `Struktur halaman TikTok dapat berubah dan TikTok dapat menampilkan captcha ke server. Request bisa gagal sewaktu-waktu`,
      `Statistik lain seperti tren harian atau daftar video tidak tersedia`
    ]),
    h2("error", "Response Error"),
    json(err("Hashtag tidak ditemukan"), "404"),
    errorTable([
      [404, "Nama hashtag wajib diisi", "Parameter kosong"],
      [404, "Nama hashtag tidak valid", "Format nama salah"],
      [404, "Hashtag tidak ditemukan", "TikTok menyatakan hashtag tidak ada"],
      [502, "TikTok meminta verifikasi (captcha) untuk server ini, coba lagi nanti", "Server ditantang captcha oleh TikTok"],
      [502, "Data tidak ditemukan di halaman TikTok", "Halaman terbuka tetapi data hashtag tidak ada"],
      [504, "Permintaan terlalu lama, coba lagi.", "Proses melebihi 28 detik"],
      ...commonErrors
    ])
  ].join("\n")
});

/* ===== UTILITY ===== */

add({
  slug: "utility/health",
  group: "utility",
  title: "Health Check",
  desc: "Cek apakah API berjalan",
  body: [
    ep("GET", "/api/health"),
    p(`Mengembalikan status sederhana untuk monitoring. Tidak memeriksa koneksi ke TikTok, hanya memastikan server menjawab. Tidak dikenai rate limit`),
    h2("request", "Contoh Request"),
    ex({ path: "/api/health" }),
    h2("sukses", "Response Sukses"),
    json({ code: 0, msg: "success", data: { status: "ok" } }, "200"),
    note("info", `Response ini tidak memiliki ${c("processed_time")}`)
  ].join("\n")
});

add({
  slug: "utility/info",
  group: "utility",
  title: "API Info",
  desc: "Ringkasan penggunaan API dari server",
  body: [
    ep("GET", "/api/"),
    p(`Tanpa parameter, mengembalikan ringkasan penggunaan. Dengan ${c("?url=LINK")}, endpoint ini langsung memproses link seperti ${L("downloader/video", c("/api/tiktok"))}. Termasuk dalam kelompok rate limit lookup`),
    h2("request", "Contoh Request"),
    ex({ path: "/api/", raw: true }),
    h2("sukses", "Response Sukses"),
    json(
      {
        code: 0,
        msg: "success",
        name: "Tikobox API",
        usage: {
          format: "/api/ + link TikTok",
          example: "/api/https://vt.tiktok.com/xxxx",
          supported: ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com", "tt.site", "www.tt.site"],
          profile: "/api/@username  atau  /api/user?unique_id=username",
          hashtag: "/api/hashtag?name=fyp  atau  /api/hashtag/fyp"
        }
      },
      "200"
    ),
    note("info", `Bentuk response ini berbeda dari endpoint lain: tidak ada ${c("data")} dan ${c("processed_time")}`)
  ].join("\n")
});

/* ===== PANDUAN ===== */

const guideHeader = (lead) => p(lead);

add({
  slug: "guides/curl",
  group: "guides",
  title: "cURL",
  desc: "Skrip bash lengkap: ambil info lalu simpan video, foto, dan audio",
  body: [
    guideHeader(`Skrip berikut mengambil info link, lalu menyimpan video atau semua foto, dan audio bila ada. Membutuhkan ${c("curl")} dan ${c("jq")}`),
    h2("skrip", "Skrip Lengkap"),
    code("bash", snippet("tikobox.sh"), "tikobox.sh"),
    code("bash", `chmod +x tikobox.sh\n./tikobox.sh "${LINK}"`, "Menjalankan"),
    h2("tips", "Tips"),
    ul([
      `Gunakan ${c("-G")} bersama ${c("--data-urlencode")} agar nilai query di-encode dengan benar`,
      `Gunakan ${c("-f")} saat mengunduh agar curl gagal pada status HTTP error dan tidak menyimpan JSON error sebagai file`,
      `Lihat sisa jatah dengan ${c("curl -sSI")} lalu baca header ${c("ratelimit-remaining")}`
    ]),
    code("bash", `curl -sS -D - -o /dev/null -A "MyTikoboxClient/1.0" "${BASE}/api/health"`, "Melihat header")
  ].join("\n")
});

add({
  slug: "guides/javascript",
  group: "guides",
  title: "JavaScript",
  desc: "Fetch API di browser atau runtime ES module",
  body: [
    guideHeader(`Contoh memakai ${c("fetch")} bawaan. Browser di domain lain tidak bisa membaca response karena API tidak mengirim header CORS. Contoh ini berjalan dari halaman di domain Tikobox yang sama, atau di runtime lain yang mendukung ${c("fetch")}. Untuk aplikasi web kamu sendiri, panggil API dari backend`),
    h2("kode", "Contoh Lengkap"),
    code("js", snippet("browser.js"), "browser.js"),
    h2("catatan", "Catatan"),
    ul([
      `Browser tidak mengizinkan pengaturan header ${c("User-Agent")} lewat ${c("fetch")}`,
      `${c("/api/download")} menolak request ${c("cross-site")} dari browser (status 403)`,
      `Baca ${c("retry-after")} dari header bila status 429`
    ]),
    p(`Untuk Node.js, lihat ${L("guides/nodejs", "panduan Node.js")}`)
  ].join("\n")
});

add({
  slug: "guides/nodejs",
  group: "guides",
  title: "Node.js",
  desc: "Klien Node.js 18+ tanpa dependency, dengan retry 429",
  body: [
    guideHeader(`Memakai ${c("fetch")} bawaan Node.js 18 ke atas dan ES module (${c(".mjs")}), tanpa dependency tambahan`),
    h2("kode", "Klien Lengkap"),
    code("js", snippet("client.mjs"), "client.mjs"),
    code("bash", `node client.mjs`, "Menjalankan"),
    h2("catatan", "Catatan"),
    ul([
      `${c("api()")} mengulang otomatis maksimal 2 kali saat status 429 sesuai ${c("retry-after")}`,
      `${c("saveMedia()")} memakai stream sehingga file besar tidak dimuat penuh ke memori`,
      `Timeout 35 detik pada lookup melebihi batas server 28 detik`
    ])
  ].join("\n")
});

add({
  slug: "guides/python",
  group: "guides",
  title: "Python",
  desc: "Klien Python dengan requests dan retry 429",
  body: [
    guideHeader(`Memakai library ${c("requests")}. Instal dengan ${c("pip install requests")}`),
    h2("kode", "Klien Lengkap"),
    code("python", snippet("client.py"), "client.py"),
    code("bash", `python client.py`, "Menjalankan"),
    h2("catatan", "Catatan"),
    ul([
      `${c("requests")} memakai ${c("params=")} untuk meng-encode query otomatis`,
      `${c("save_media()")} memakai ${c("stream=True")} agar file ditulis bertahap`,
      `${c("requests.Session")} memakai ulang koneksi dan header ${c("User-Agent")}`
    ])
  ].join("\n")
});

add({
  slug: "guides/php",
  group: "guides",
  title: "PHP",
  desc: "Klien PHP dengan cURL dan retry 429",
  body: [
    guideHeader(`Memakai ekstensi cURL bawaan PHP 7.4 ke atas, tanpa library tambahan`),
    h2("kode", "Klien Lengkap"),
    code("php", snippet("client.php"), "client.php"),
    code("bash", `php client.php`, "Menjalankan"),
    h2("catatan", "Catatan"),
    ul([
      `${c("http_build_query")} meng-encode parameter dengan benar`,
      `${c("tikobox_save()")} menulis langsung ke file dan menghapusnya bila status bukan 200`,
      `Hasil ${c("json_decode")} dengan argumen ${c("true")} berupa array asosiatif`
    ])
  ].join("\n")
});

add({
  slug: "guides/web",
  group: "guides",
  title: "Aplikasi Web",
  desc: "Cara memakai Tikobox lewat website",
  body: [
    p(`Tikobox dipakai untuk mengunduh video TikTok tanpa watermark. Tempel link, lalu video langsung tersimpan di perangkat kamu`),
    h2("cara", "Cara Pakai"),
    ol([
      `Buka TikTok, pilih video, lalu tekan <b>Bagikan</b>, lalu <b>Salin tautan</b>`,
      `Buka ${L("base-url", "Base URL")}, tempel tautan pada kolom yang tersedia`,
      `Tekan <b>DOWNLOAD</b> dan tunggu proses link selesai`,
      `Setelah hasil muncul, tekan tombol download pada video untuk menyimpannya`,
      `Video langsung tersimpan ke galeri`
    ]),
    p(`Kamu juga bisa membuka ${c("BASE_URL/?url=LINK")} dan video langsung diproses`),
    h2("galeri", "Simpan ke Galeri"),
    `<div class="platforms"><div><h3>Android</h3><p>File langsung diunduh dan otomatis muncul di aplikasi Galeri atau Google Foto</p></div><div><h3>iPhone</h3><p>Tekan <b>Simpan ke Galeri</b>, lalu pilih <b>Simpan Video</b> pada menu yang muncul</p></div><div><h3>Desktop</h3><p>File langsung diunduh ke folder Downloads di komputer kamu</p></div></div>`,
    h2("catatan", "Catatan"),
    note("info", `Gunakan hanya untuk video milik kamu atau yang kamu punya izin mengunduhnya`),
    ul([`Video harus berstatus publik`, `Jika gagal, periksa tautan lalu coba lagi beberapa saat kemudian`, `Postingan foto (slideshow) tersimpan sebagai gambar`])
  ].join("\n")
});

/* ===== REFERENSI ===== */

add({
  slug: "reference/response-format",
  group: "reference",
  title: "Format Response",
  desc: "Struktur JSON semua response",
  body: [
    h2("envelope", "Envelope"),
    json({ code: 0, msg: "success", processed_time: 1.2345, data: {} }, "Sukses"),
    json({ code: -1, msg: "pesan error" }, "Gagal"),
    table(
      ["Field", "Tipe", "Keterangan"],
      [
        [c("code"), "number", `${c("0")} sukses, ${c("-1")} gagal`],
        [c("msg"), "string", `${c("success")} atau pesan error`],
        [c("processed_time"), "number", "Lama proses dalam detik. Ada pada response lookup, tidak ada pada health dan info"],
        [c("data"), "object", "Isi hasil, hanya ada saat sukses"]
      ]
    ),
    h2("video", "Data Video"),
    p(`Untuk ${L("downloader/video", c("/api/tiktok"))}`),
    videoTable,
    table(
      ["Field", "Tipe", "Keterangan"],
      [
        [c("music"), "string", `URL audio. Lihat ${L("downloader/audio", "Audio")}`],
        [c("music_info"), "object", `${c("id")}, ${c("title")}, ${c("play")}, ${c("cover")}, ${c("author")}, ${c("original")}, ${c("duration")}, ${c("album")}`],
        [c("play_count")+"", "number", "Jumlah ditonton"],
        [c("digg_count"), "number", "Jumlah like"],
        [c("comment_count"), "number", "Jumlah komentar"],
        [c("share_count"), "number", "Jumlah dibagikan"],
        [c("collect_count"), "number", "Jumlah disimpan"],
        [c("download_count"), "number", `Selalu ${c("0")}`],
        [c("images"), "string[]", `Hanya ada pada postingan foto. Lihat ${L("downloader/slideshow", "Slideshow")}`]
      ]
    ),
    h2("profil", "Data Profil"),
    p(`Lihat ${L("tiktok/profile", "Profil TikTok", "#field")}`),
    h2("hashtag", "Data Hashtag"),
    p(`Lihat ${L("tiktok/hashtag", "Hashtag TikTok", "#field")}`),
    h2("konvensi", "Konvensi"),
    ul([
      `Field string yang tidak tersedia berisi string kosong, bukan ${c("null")}`,
      `Field angka yang tidak tersedia berisi ${c("0")}`,
      `Field opsional (${c("images")}, ${c("cookie")}) tidak ada sama sekali saat tidak tersedia`,
      `Urutan field di JSON tidak dijamin, akses berdasarkan nama`
    ])
  ].join("\n")
});

add({
  slug: "reference/status-codes",
  group: "reference",
  title: "Status Code",
  desc: "Status HTTP yang dikembalikan API",
  body: [
    table(
      ["Status", "Arti", "Kapan"],
      [
        [c("200"), "OK", "Request berhasil"],
        [c("204"), "No Content", `Response untuk ${c("OPTIONS")}, dengan header ${c("allow: GET, HEAD, OPTIONS")}`],
        [c("400"), "Bad Request", "Link atau URL media tidak valid, atau parameter path tidak bisa di-decode"],
        [c("403"), "Forbidden", `Scanner keamanan, atau ${c("/api/download")} dipanggil lintas situs dari browser`],
        [c("404"), "Not Found", "Profil atau hashtag tidak ditemukan atau input salah"],
        [c("405"), "Method Not Allowed", `Method selain ${c("GET")}, ${c("HEAD")}, ${c("OPTIONS")}`],
        [c("414"), "URI Too Long", "URL lebih dari 2500 karakter"],
        [c("429"), "Too Many Requests", `Melewati rate limit, baca ${c("retry-after")}`],
        [c("500"), "Internal Server Error", `Kesalahan server tak terduga, msg ${c("Terjadi kesalahan pada server")}`],
        [c("502"), "Bad Gateway", "TikTok gagal diakses, data tidak tersedia, atau diblokir"],
        [c("504"), "Gateway Timeout", "Proses lookup melebihi 28 detik"]
      ]
    ),
    note("info", `Detail pesan per endpoint ada di ${L("errors", "Penanganan Error")}`)
  ].join("\n")
});

add({
  slug: "reference/security",
  group: "reference",
  title: "Keamanan dan Batasan",
  desc: "Perlindungan di server dan batasan teknis untuk integrator",
  body: [
    h2("perlindungan", "Perlindungan di Server"),
    table(
      ["Area", "Penerapan"],
      [
        ["Validasi input", `Link TikTok dan URL media divalidasi dengan allowlist host, hanya ${c("http")} atau ${c("https")}, tanpa kredensial dan tanpa port`],
        ["SSRF", `Redirect diikuti manual, setiap hop divalidasi, dan DNS harus mengarah ke IP publik`],
        ["Tipe file", `Hanya video, audio, dan gambar rasteri yang diproxy. SVG dan HTML ditolak`],
        ["Nama file", `Disaring menjadi karakter aman sehingga tidak bisa memuat path atau karakter kontrol`],
        ["Header keamanan", `Helmet dan Content-Security-Policy. File hasil proxy dikirim dengan CSP sandbox dan ${c("nosniff")}`],
        ["Log", `Kejadian keamanan dicatat tanpa cookie, query, dan header, dengan IP disamarkan`],
        ["Error", `Pesan error disaring agar tidak membocorkan jalur file atau detail jaringan`]
      ]
    ),
    h2("batasan", "Batasan Teknis"),
    table(
      ["Hal", "Nilai"],
      [
        ["Panjang URL request", "2500 karakter"],
        ["Panjang link TikTok", "500 karakter (teks input dipotong di 1000 karakter)"],
        ["Panjang URL media", "2000 karakter"],
        ["Timeout lookup", "28 detik"],
        ["Timeout header dari TikTok saat unduh", "15 detik"],
        ["Maksimal redirect saat unduh", "3"],
        ["Ukuran file unduhan", "Tidak dibatasi"],
        ["Method", "GET, HEAD, OPTIONS"],
        ["CORS", "Tidak ada header CORS"]
      ]
    ),
    h2("saran", "Saran untuk Integrator"),
    ul([
      `Panggil API dari backend, bukan dari browser pengguna`,
      `Jangan menyimpan URL media untuk jangka panjang, masa berlakunya ditentukan TikTok`,
      `Perlakukan ${c("data.cookie")} sebagai data sementara dan jangan dibagikan ke pihak lain`,
      `Batasi jumlah percobaan ulang dan hormati ${c("retry-after")}`,
      `Gunakan konten hanya sesuai hak dan kebijakan platform serta hukum yang berlaku`
    ])
  ].join("\n")
});

add({
  slug: "reference/not-available",
  group: "reference",
  title: "Belum Tersedia",
  desc: "Fitur yang tidak ada di API saat ini",
  body: [
    p(`Fitur berikut tidak ditemukan di implementasi API saat ini. Tidak ada endpoint untuk fitur ini, jadi jangan dipanggil`),
    table(
      ["Fitur", "Status"],
      [
        ["Pencarian user TikTok", "Belum tersedia. Profil hanya bisa diambil dengan username yang sudah diketahui"],
        ["Daftar video milik user atau hashtag", "Belum tersedia"],
        ["Pemrosesan media (konversi, kompres, gabung, potong)", `Belum tersedia. ${L("downloader/media-proxy", "Media Proxy")} hanya meneruskan file apa adanya`],
        ["Method POST, PUT, DELETE", "Belum tersedia, semua endpoint hanya GET"],
        ["API key dan kuota per akun", "Belum tersedia. Pembatasan hanya per IP"],
        ["Header CORS untuk pemakaian dari browser", "Belum tersedia"],
        ["Batch atau banyak link sekaligus", "Belum tersedia"],
        ["Webhook", "Belum tersedia"]
      ]
    ),
    p(`Halaman ini diperbarui seiring kode berubah. Lihat ${L("changelog", "Changelog")}`)
  ].join("\n")
});

add({
  slug: "reference/faq",
  group: "reference",
  title: "FAQ",
  desc: "Pertanyaan yang sering muncul",
  body: [
    h2("apikey", "Apakah perlu API key?"),
    p(`Tidak. Lihat ${L("authentication", "Autentikasi")}`),
    h2("cors", "Kenapa fetch dari website saya gagal dengan error CORS?"),
    p(`API tidak mengirim header CORS. Panggil dari backend kamu, lalu kirim hasilnya ke frontend`),
    h2("limit", "Kenapa saya kena 429 padahal baru sedikit request?"),
    p(`Profil, hashtag, dan video berbagi satu jatah per menit. Klien otomatis (termasuk ${c("curl")} dan library HTTP tanpa ${c("User-Agent")} sendiri) mendapat batas lebih rendah. Lihat ${L("rate-limits", "Rate Limit")}`),
    h2("batas-download", "Apakah ada batas ukuran atau jumlah download?"),
    p(`Tidak ada batas ukuran file atau durasi. Yang ada hanya rate limit per menit`),
    h2("wm", "Bagaimana mendapatkan video dengan watermark?"),
    p(`Pakai ${c("data.wmplay")}. Bila TikTok tidak menyediakan versi watermark, nilainya sama dengan ${c("data.play")}`),
    h2("kedaluwarsa", "Kenapa URL video tidak bisa dibuka lagi setelah beberapa waktu?"),
    p(`URL media dari TikTok memiliki masa berlaku. Ambil ulang lewat ${c("/api/tiktok")}`),
    h2("captcha", "Kenapa sering muncul error captcha?"),
    p(`TikTok dapat menantang permintaan dari server. Ulangi beberapa saat kemudian. Ini lebih sering terjadi pada endpoint profil dan hashtag karena memakai halaman publik TikTok`),
    h2("foto", "Bagaimana mengunduh postingan foto?"),
    p(`Lihat ${L("downloader/slideshow", "Slideshow Downloader")}`),
    h2("hastag-beda", "Kenapa angka hashtag berbeda dengan di aplikasi?"),
    p(`Lihat bagian sumber data di ${L("tiktok/hashtag", "Hashtag TikTok", "#sumber")}`)
  ].join("\n")
});
