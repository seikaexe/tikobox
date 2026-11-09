# Tikobox

TikTok Downloader (TypeScript + Express) dengan tema Neobrutalism. Provider: tikwm.

## Halaman

- `/` untuk downloader
- `/docs` untuk panduan

## Struktur

- `public/` berisi halaman website
- `src/routes/` berisi route internal yang dipakai halaman
- `src/services/downloader.ts` berisi adapter tikwm
- `src/utils/` berisi validator dan rate limit

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
- `vercel.json` hanya mengarahkan `/docs` ke `docs.html`
- Jalur `/api/*` ditangani Express (`/api/tiktok`, `/api/download`, `/api/health`)

Untuk cek tipe sebelum deploy, jalankan `npm run typecheck`.
