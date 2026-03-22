# Yor.iAPP - Migrasi dari Google Apps Script ke Vercel

Aplikasi E-Arsip digital yang sebelumnya berjalan di Google Apps Script, sekarang di-migrasi ke Vercel dengan backend Node.js (Express) + Prisma (PostgreSQL) + Vercel Blob.

## Persyaratan
- Akun Vercel
- Database PostgreSQL (bisa menggunakan Vercel Postgres)
- Token Vercel Blob (dapatkan dari dashboard Vercel)

## Langkah-langkah Deploy

1. **Clone repository ini** ke GitHub.

2. **Buat proyek di Vercel** dan hubungkan dengan repository.

3. **Tambahkan environment variables** di Vercel:
   - `DATABASE_URL` (dari Vercel Postgres)
   - `JWT_SECRET` (string acak, misal `rahasia123`)
   - `BLOB_READ_WRITE_TOKEN` (dari Vercel Blob)

4. **Setup database**:
   - Pastikan Vercel Postgres sudah aktif.
   - Jalankan migrasi (otomatis saat deploy, karena `prisma generate` di `postinstall`).
   - Atau jika perlu, jalankan `npx prisma db push` setelah deploy.

5. **Deploy**:
   - Vercel akan otomatis build dan deploy.
   - Setelah selesai, buka URL yang diberikan.

## Struktur
- `api/index.js`: Backend Express dengan semua endpoint.
- `prisma/schema.prisma`: Skema database.
- `public/`: Frontend statis (login.html, dashboard.html).

## Catatan
- File yang diupload disimpan di Vercel Blob, URL preview dan download sama.
- Profile picture disimpan sebagai base64 di database (bisa diubah ke blob jika perlu).
- Status aktivasi user ada di kolom `status`; jika null, fitur upload/edit/hapus dinonaktifkan.

## Pengembangan Lokal
1. Install dependencies: `npm install`
2. Copy `.env.example` ke `.env` dan isi dengan data lokal.
3. Jalankan `vercel dev` untuk development.
