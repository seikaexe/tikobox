# Saran celah / risiko (hasil baca kode)

1. **CSP `script-src 'unsafe-inline'`** (csp.ts / vercel.json): dulu perlu untuk iklan. Sekarang `index.html` tidak butuh inline script; `docs.html` baris ~98 masih punya `<script>` inline. Pindahkan ke `docs.js` lalu hapus `'unsafe-inline'` dari `script-src`.
2. **`img-src https:`** terlalu longgar. Batasi ke domain CDN TikTok (`TIKTOK_MEDIA`) + `'self'` karena gambar sudah lewat `/api/download`.
3. **Endpoint `/api/download` adalah open proxy terbatas** (host TikTok saja, sudah ada SSRF guard). Bagus; pastikan `safeFetch` memvalidasi ulang IP di setiap redirect (DNS rebinding) dan batasi ukuran maksimum body.
4. **Rate limit**: kalau tidak ada Redis (`rateLimit.ts`), limit hanya in-memory per instance serverless sehingga mudah dilewati. Pasang Redis/Upstash untuk produksi.
5. **Parameter `c` (cookie) di `/api/download`** diteruskan ke upstream; sudah disaring karakter, tapi batasi hanya ke host TikTok (sudah lewat `allowUrl`) dan jangan di-log.
6. **Endpoint profil/hashtag baru** memakai scraping HTML TikTok: rawan diblok/captcha dari IP datacenter. Tambahkan cache singkat (30-60 dtk) dan proxy residensial bila sering gagal.
7. **CORS**: tidak ada header CORS, jadi API hanya bisa dipakai dari domain sendiri atau server-ke-server. Tambahkan `Access-Control-Allow-Origin` bila API mau dipakai publik.
8. **`BOT_MODE`**: klien otomatis (curl, dll.) tidak diblokir, hanya dibatasi rate. Normal untuk API publik.
9. **`npm start` memakai `tsx` di production**: lebih aman/cepat jalankan hasil `tsc` build.
