# Tikobox

TikTok Downloader (TypeScript + Express) dengan tema Neobrutalism. Tanpa layanan pihak ketiga: semua data diambil langsung dari TikTok.

## Halaman

- `/` untuk downloader
- `/docs` untuk panduan

## Struktur

- `public/` berisi halaman website
- `src/routes/` berisi route internal yang dipakai halaman
- `src/services/downloader.ts` berisi pengambil data langsung dari TikTok
- `src/utils/` berisi validator dan rate limit

## Link yang didukung

`tiktok.com`, `vt.tiktok.com`, `vm.tiktok.com`, `tt.site`, `www.tt.site` (boleh tanpa `https://`).

Base URL otomatis mengikuti domain tempat situs dibuka. Buka `BASE_URL/?url=LINK` dan video langsung diproses.

API: `BASE_URL/api/` lalu tempel link TikTok apa adanya, hasilnya JSON. Contoh: `BASE_URL/api/https://vt.tiktok.com/xxxx`.

## Response API

Formatnya mirip tikwm:

```json
{
  "code": 0,
  "msg": "success",
  "processed_time": 1.2345,
  "data": {
    "id": "...", "title": "...", "cover": "...", "origin_cover": "...", "duration": 15,
    "play": "mp4 tanpa watermark", "wmplay": "mp4 watermark", "hdplay": "mp4 HD",
    "size": 0, "wm_size": 0, "hd_size": 0,
    "music": "mp3", "music_info": { "id": "", "title": "", "play": "", "cover": "", "author": "" },
    "play_count": 0, "digg_count": 0, "comment_count": 0, "share_count": 0, "collect_count": 0,
    "create_time": 0,
    "author": { "id": "", "unique_id": "", "nickname": "", "avatar": "" },
    "images": ["hanya untuk postingan foto"]
  }
}
```

Kalau gagal: `{ "code": -1, "msg": "pesan error" }`.

## Menjalankan

```bash
npm install
npm run dev
```

Server biasa (non-Vercel):

```bash
npm start
```

Port default 3000. Ubah lewat environment variable `PORT` bila perlu. Project ini tidak memakai database dan tidak membutuhkan file `.env`.

Gunakan downloader hanya untuk konten yang kamu berhak unduh dan sesuai kebijakan platform serta hukum yang berlaku.

## Deploy Vercel

Tidak perlu build command dan tidak perlu environment variable.

1. Push project ke GitHub, lalu import di Vercel. Framework terdeteksi otomatis sebagai Express.
2. Biarkan Build Command, Output Directory, dan Install Command kosong (default).
3. Deploy.

Cara kerjanya:

- `src/server.ts` mengekspor app Express sebagai default export, dan Vercel menjalankannya sebagai satu function
- `public/` dilayani CDN Vercel, jadi `/` dan semua file di `/assets` tidak melewati function
- `vercel.json` hanya berisi rewrite `/docs` ke `/docs.html`
- Jalur `/api/*` ditangani Express (`/api/tiktok`, `/api/download`, `/api/health`)
- `express.static` hanya berlaku saat dijalankan lokal, di Vercel diabaikan

Untuk cek tipe sebelum deploy, jalankan `npm run typecheck`.
