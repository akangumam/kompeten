# AGENTS.md — KOMPETEN HRIS & Koperasi

Aturan desain dan bisnis lengkap ada di `.agents/rules/` (4 file, dibaca otomatis). File ini hanya berisi cara kerja per prompt.

## Stack prototipe
React + Vite + Tailwind v4 + shadcn/ui (`src/index.css` = sumber token). Target akhir Next.js App Router. Navigasi via `activePage` (tanpa router). Hari ini demo = `DEMO_TODAY` (26 Okt 2026, `src/lib/today.ts`). Semua data di `src/data/*`, hidup di memori (reset saat reload).

## Cara kerja setiap prompt
1. Baca prompt sampai habis, lalu periksa kode yang ada sebelum mengubah. Pakai ulang komponen; jangan membuat duplikat.
2. **PART A** pada prompt berisi aturan baru: tambahkan aturan bisnis ke `.agents/rules/04-kompeten-aturan-bisnis.md`, aturan komponen/visual ke file 02/03. Jaga setiap file rules < 12.000 karakter; kalau hampir penuh, buat file `05-…` baru.
3. Kerjakan hanya yang diminta. Jangan mengubah angka, seed, atau aturan di luar prompt.
4. Sebelum melapor, wajib:
   - `pnpm exec tsc -b` dan `pnpm build` lulus.
   - Tidak ada import ke file yang tidak ada.
   - Jalankan cek di bagian **Checks** prompt lewat browser (lebar 1440px untuk HR; 390×844 untuk Portal/mobile) dan pastikan tidak ada error di console.
5. **Commit git** setelah cek lulus: `git add -A && git commit -m "prompt {kode}: {ringkasan}"` (contoh: `prompt 09f: portal pelamar`). Satu prompt = satu commit, supaya mudah di-rollback.
6. Laporan dalam Bahasa Indonesia, ringkas:
   - Hasil tiap cek (lulus/gagal + angka yang terlihat).
   - Keputusan yang Anda ambil sendiri (data/aturan yang tidak disebut prompt).
   - Yang tidak sempat diuji.
   - Hash commit.

## Larangan
- Jangan menggambar ulang logo/favicon; selalu pakai aset resmi di `public/brand/`.
- Jangan menulis hex/palet Tailwind; pakai token.
- Jangan menghitung ulang payroll Final (snapshot).
- Jangan menghapus data seed demo atau membuat tombol reset demo.
