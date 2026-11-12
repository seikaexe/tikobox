# Audit Tikobox - 12 sampai 13 November 2026

## Endpoint yang ditemukan (semua GET, semua terdokumentasi)
| Endpoint | Status |
|---|---|
| `/api/tiktok`, `/api/{link}`, `/api/?url=` | berfungsi (kode asli) |
| `/api/download` | berfungsi (kode asli) |
| `/api/user`, `/api/user/:username`, `/api/@username` | **baru bisa jalan setelah `profile.ts` ditulis ulang**, belum diuji ke TikTok live |
| `/api/hashtag`, `/api/hashtag/:name` | sama seperti di atas |
| `/api/health`, `/api/` | berfungsi |

Tidak ada di source: pencarian user, media processing (konversi), POST/PUT/DELETE, API key. Dicatat di `/docs/reference/not-available/`.

## Bug
1. **Kritis**: `src/services/profile.ts` tidak ada di ZIP padahal diimpor `routes/api.ts` sehingga server gagal start. Ditulis ulang (field mengikuti README, sumber: JSON `__UNIVERSAL_DATA_FOR_REHYDRATION__` halaman publik TikTok).
2. Timeout 504: `setHeader` dipanggil sebelum cek `headersSent` sehingga melempar error yang tercatat di log. Urutan diperbaiki.
3. `HEAD /api/download` mengunduh seluruh file dari TikTok di server padahal body dibuang. Sekarang upstream dibatalkan.
4. `GET /api/path-apa-saja` (bukan link TikTok) menghasilkan 400 "link tidak valid" bukan 404 karena route `/*splat`. Dibiarkan demi kompatibilitas, didokumentasikan.
5. Input salah pada profil/hashtag menghasilkan 404, bukan 400. Dibiarkan, didokumentasikan.
6. Batas URL 2500 karakter bisa terlewati bila cookie `c` panjang (status 414). Cookie opsional, didokumentasikan.

## Keamanan
Sudah baik: allowlist host, redirect manual per hop, cek DNS ke IP publik, filter tipe konten, nama file disaring, CSP sandbox + nosniff, log tanpa data sensitif, scanner UA diblok, rate limit per IP.
Sisa risiko (tidak diubah):
- DNS rebinding (cek DNS dan fetch terpisah): risiko rendah karena host dibatasi ke domain TikTok.
- `script-src 'unsafe-inline'` di CSP masih ada. Halaman docs baru tidak memakai script inline, jadi bisa dihapus (lihat SARAN-CELAH.md) setelah dites di produksi.
- Rate limit fixed-window, per instance bila tanpa Redis.
- `data.cookie` (cookie sesi TikTok milik server) ikut dikirim ke klien. Itu perilaku lama yang dipakai UI, didokumentasikan.
- Tidak ada header CORS (disengaja, didokumentasikan). Tidak ada batas ukuran download (kebijakan produk, tidak diubah).

## Hasil validasi
| Pemeriksaan | Hasil |
|---|---|
| `tsc --strict` seluruh `src/` | lulus, **dengan stub** untuk tipe express/helmet (paket tidak bisa diinstal, jaringan mati) |
| Uji unit `profile.ts` (35 kasus, HTML TikTok tiruan) | 35 lulus |
| Contoh kode (5 bahasa x 7 endpoint + 4 klien lengkap x 2 mode) vs server tiruan | 72 lulus |
| 26 halaman x 4 ukuran layar (360, 390, 820, 1366) | tanpa overflow horizontal, tanpa error konsol, highlight dan tombol salin ada di semua blok |
| Link internal dan anchor | 0 rusak |
| Sidebar, search, tab bahasa, salin, drawer mobile | berfungsi di Chromium |
| `npm install`, `npm run typecheck`, lint, build asli | **tidak dijalankan** (tidak ada jaringan, proyek tidak punya script lint/build) |
| Pengujian ke TikTok live, server Express asli | **tidak dilakukan** |

## Yang masih perlu dikerjakan
1. Jalankan `npm install && npm run typecheck && npm start` di mesin Anda.
2. Uji `/api/@username` dan `/api/hashtag/fyp` ke TikTok sungguhan. Bila struktur data berbeda, sesuaikan `profile.ts` lalu perbarui docs.
3. Uji di Vercel: `/docs`, `/docs/downloader/video/` (link memakai trailing slash).
4. Pertimbangkan menghapus `'unsafe-inline'` dari CSP.
