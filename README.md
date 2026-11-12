# Tikobox

TikTok Downloader (TypeScript + Express) dengan tema Neobrutalism. Tanpa layanan pihak ketiga: semua data diambil langsung dari TikTok.

## Halaman

- `/` untuk downloader
- `/docs` untuk dokumentasi API developer (halaman statis di `public/docs/`)

## Struktur

- `public/` berisi halaman website
- `src/routes/` berisi route internal yang dipakai halaman
- `src/services/downloader.ts` berisi pengambil data langsung dari TikTok
- `src/utils/` berisi validator dan rate limit

## Link yang didukung

`tiktok.com`, `vt.tiktok.com`, `vm.tiktok.com`, `tt.site`, `www.tt.site` (boleh tanpa `https://`).

Base URL otomatis mengikuti domain tempat situs dibuka. Buka `BASE_URL/?url=LINK` dan video langsung diproses.

API: `BASE_URL/api/` lalu tempel link TikTok apa adanya, hasilnya JSON. Contoh: `BASE_URL/api/https://vt.tiktok.com/xxxx`.

## API profil & hashtag (semua di `/api/`)

- `/api/@username` atau `/api/user?unique_id=username` : nickname, username, jumlah teman (`friend_count`), follower, mengikuti, jumlah video, total like, foto profil (`avatar.large/medium/thumb`, `avatar_download`), kapan akun dibuat (`created_at`), kapan nickname terakhir diubah (`nickname_changed_at`), kapan username terakhir diubah (`username_changed_at`), bio, verified, private, region.
- `/api/hashtag?name=fyp` atau `/api/hashtag/fyp` : `stats.video_count` (jumlah video yang memakai hashtag) dan `stats.view_count` (jumlah penonton).

Catatan: `created_at` memakai `createTime` TikTok; bila kosong dihitung dari ID akun. Waktu ubah nickname/username kosong (`""`) bila akun belum pernah mengubahnya atau TikTok tidak menyediakannya.

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

Port default 3000. Ubah lewat environment variable `PORT` bila perlu. Project ini tidak memakai database. Environment variable bersifat opsional (lihat bagian Keamanan).

Gunakan downloader hanya untuk konten yang kamu berhak unduh dan sesuai kebijakan platform serta hukum yang berlaku.

## Keamanan

- **Security headers**: Helmet untuk `/api` dan mode lokal; `vercel.json` untuk halaman statis di Vercel. CSP didefinisikan di `src/utils/csp.ts`. Kalau diubah, jalankan `npm run csp:print` lalu salin hasilnya ke `vercel.json`.
- **SSRF**: redirect diikuti manual, tiap hop divalidasi (allowlist host, http/https, tanpa kredensial/port, DNS harus publik). Lihat `src/utils/ssrf.ts`.
- **Download**: tanpa batas ukuran/durasi (sengaja dihilangkan). Tetap ada rate limit, dan hanya tipe video/audio/gambar yang boleh diproxy.
- **Timeout**: 15 detik menunggu header dari upstream, 28 detik untuk lookup (tidak membatasi lama download).
- **Rate limit terpusat**: otomatis memakai Upstash Redis bila ada `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (atau `KV_REST_API_URL` + `KV_REST_API_TOKEN` dari integrasi Upstash di Vercel). Tanpa itu dipakai Map lokal (hanya per-instance).
- **Bot protection**: scanner keamanan diblokir; klien otomatis (curl, python, dll) kena batas lebih ketat. `BOT_MODE=block` untuk memblokir total.
- **Security log**: satu baris JSON per kejadian (`type: "security"`), tanpa cookie/query/header, IP disamarkan.
- `TRUST_PROXY=1` hanya bila di belakang proxy sendiri (bukan Vercel).

## Deploy Vercel

Tidak perlu build command. Environment variable opsional (lihat bagian Keamanan); untuk rate limit terpusat tambahkan Upstash Redis dari Vercel Marketplace.

1. Push project ke GitHub, lalu import di Vercel. Framework terdeteksi otomatis sebagai Express.
2. Biarkan Build Command, Output Directory, dan Install Command kosong (default).
3. Deploy.

Cara kerjanya:

- `src/server.ts` mengekspor app Express sebagai default export, dan Vercel menjalankannya sebagai satu function
- `public/` dilayani CDN Vercel, jadi `/` dan semua file di `/assets` tidak melewati function
- `vercel.json` hanya berisi rewrite `/docs` ke `/docs/index.html`
- Jalur `/api/*` ditangani Express (`/api/tiktok`, `/api/download`, `/api/health`)
- `express.static` hanya berlaku saat dijalankan lokal, di Vercel diabaikan

Untuk cek tipe sebelum deploy, jalankan `npm run typecheck`.

## Dokumentasi /docs

Konten ada di `scripts/docs/content.mjs`, hasil HTML statis di `public/docs/` (di-commit, tanpa build command saat deploy).

- `npm run docs:build` generate ulang halaman, cek link internal dan aturan tanpa titik di akhir kalimat
- `npm run docs:test` jalankan semua contoh kode terhadap server tiruan lokal (butuh node, bash, curl, jq, python3 + requests, php)
- Ubah `scripts/docs/snippets/*` atau `examples.mjs` untuk contoh kode, jangan edit HTML hasil generate
