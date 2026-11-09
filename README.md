# TikoBox

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

Production:

```bash
npm run build
npm start
```

Port default 3000. Ubah lewat environment variable `PORT` bila perlu. Project ini tidak memakai database dan tidak membutuhkan file `.env`.

Gunakan downloader hanya untuk konten yang kamu berhak unduh dan sesuai kebijakan platform serta hukum yang berlaku.


## Deploy Vercel

Project ini sudah memiliki `api/index.ts` dan `vercel.json` untuk deployment Vercel.

- Frontend: file statis di `public/`
- API: `/api/*`
- Health check: `/api/health`
- TikTok API: `/api/tiktok?url=...`
- Media proxy: `/api/download?url=...&name=...`
