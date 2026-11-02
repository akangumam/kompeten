# KOMPETEN — Serah Terima dari Figma Make ke Antigravity

Prompt 13 adalah prompt terakhir di Figma Make. Setelah commit `prompt 13: perbaikan akhir & serah terima` (tag `figma-make-final`), project Make dibekukan dan pengembangan berlanjut di Antigravity (Next.js + NestJS). Arsitektur target: `.agents/rules/05-kompeten-arsitektur.md`. Angka acuan: `docs/golden-values.md`.

## Status per modul

| Modul | Status | Catatan |
|---|---|---|
| App shell, login, peran aktif, Mode Presentasi | ✅ | Sesi di sessionStorage; OTP disimulasikan |
| Dashboard (4 tab) | ✅ | Angka dari data seed |
| Recruitment (lowongan, DICAP, tes, penawaran, portal pelamar) | ✅ | Portal pelamar sisi mobile 390×844 |
| Data Pegawai (direktori, transaksi, hubungan industrial, data master, perubahan data pribadi) | ✅ | |
| Kehadiran (absensi, cuti/izin, tukar shift, overtime) | ✅ | Absen dari mesin; persetujuan pegawai SPL dan konfirmasi tukar shift |
| People Development (kompetensi, training, KPI) | ✅ | Sumber nilai uji `manual` / `aplikasi` |
| Payroll (komponen, proses, slip, pembayaran, rekonsiliasi, perubahan gaji, hak akhir) | ✅ | Periode Final = snapshot |
| Koperasi (anggota, simpanan, kasbon, pinjaman, budget, unit dagang, SHU, pengaturan) | ✅ | Antrean "Dari aplikasi" untuk Sekretaris |
| Pengaturan Sistem (pengguna, peran, kebijakan keamanan, audit log) | ✅ | |

## Keterbatasan prototipe

- Semua data hidup di memori (`src/data/*`) dan kembali ke seed saat halaman dimuat ulang. Tidak ada backend, basis data, atau penyimpanan berkas.
- OTP, tautan reset kata sandi, dan semua pengajuan "dari aplikasi" disimulasikan: kode OTP tampil di toast, aksi aplikasi lewat tombol berlabel `(simulasi)`. Semuanya hanya tampil bila `DEMO_MODE` true (`src/lib/demo.ts`).
- Kata sandi dibandingkan apa adanya di memori. Backend wajib memakai hash (argon2/bcrypt), OTP lewat email, dan pembatasan laju di server.
- Tanggal demo tetap `DEMO_TODAY` (26 Okt 2026, `src/lib/today.ts`). Belum ada service Clock.
- Notifikasi, PDF, WhatsApp, email, dan unggah berkas hanya berupa toast atau pratinjau tiruan.
- Tidak ada router: navigasi lewat `activePage`. Target Next.js App Router memetakan `PageId` ke rute (lihat README).
- Aset `public/` memakai Git LFS.

## Keputusan terbuka (dari Roadmap)

1. Outsourcing: perlakuan karyawan alih daya di roster, payroll, dan koperasi.
2. Tanggal bayar per golongan (Organik, Harian, dan lainnya).
3. Angka resmi (headcount dan target yang dipakai sebagai acuan perusahaan).
4. Cut-off kehadiran dan payroll.
5. Cuti bersama dan kalender libur.
6. Batas pengeluaran koperasi.
7. Dasar pembagian SHU.
8. Uang pisah, PHK, Kompetensi, dan pajak PKWT.
9. Masa simpan data pelamar.
10. Domain email.
11. Hosting.
12. Penyedia WhatsApp.
13. Formulir 1721-A1.
14. Mode offline aplikasi mobile.
15. Foto profil.
16. Refresh token.

## Langkah pertama di Antigravity (fase M0)

1. Buat monorepo pnpm + Turborepo: `apps/web`, `apps/api`, `packages/shared`.
2. Pindahkan prototipe ke `apps/web` sebagai Next.js App Router: `src/pages/*` menjadi rute, `PageId` menjadi segmen URL, `activePage` diganti router. Pertahankan `src/components`, `src/index.css`, dan `public/brand/` apa adanya.
3. Biarkan `src/data/*` tetap sebagai data mock lewat lapisan adapter (satu antarmuka per modul) agar halaman tidak berubah saat backend menggantikannya.
4. Salin `.agents/rules/01–05`, `AGENTS.md`, `CLAUDE.md`, dan `docs/` ke root monorepo; tambahkan `docs/arsitektur.md` dan `docs/api/*` dari luar repo.
5. Pastikan `pnpm i`, `pnpm dev`, `pnpm build` lulus dan semua angka di `docs/golden-values.md` tetap sama, lalu commit (satu fase = satu commit) dengan laporan angka golden yang dicek.
