# KOMPETEN — HRIS & Koperasi Karyawan PT Primaplast Indonesia

Prototipe web internal PT Primaplast Indonesia (±248 karyawan): rekrutmen, kepegawaian, kehadiran, payroll, people development, dan koperasi dalam satu aplikasi. Dibuat di Figma Make; pengembangan berlanjut di Antigravity (Next.js + NestJS). Status akhir dan langkah berikutnya: [`docs/HANDOFF.md`](docs/HANDOFF.md). Angka acuan uji: [`docs/golden-values.md`](docs/golden-values.md).

## Stack prototipe

React 19 + TypeScript + Vite, Tailwind CSS v4 (token di `src/index.css`), shadcn/ui, Lucide React, Sonner (toast). Font Space Grotesk. Semua data dummy hidup di memori dan kembali ke seed saat halaman dimuat ulang.

## Cara menjalankan

```bash
pnpm i        # instal dependensi
pnpm dev      # server pengembangan (Vite)
pnpm build    # build produksi
pnpm exec tsc -b   # type-check (wajib lulus bersama pnpm build)
```

Aset di `public/` (gambar, ikon, logo) dilacak dengan **Git LFS**. Pasang `git-lfs` dan jalankan `git lfs install` sebelum clone atau pull; jangan mengubah `.gitattributes`.

## Struktur folder

| Folder | Isi |
|---|---|
| `src/pages` | Satu file per halaman utama (`PageId`) |
| `src/components/<modul>` | Komponen per modul (`koperasi`, `payroll`, `shift`, `overtime`, `training`, `employee`, …); `ui/` = shadcn |
| `src/data` | Data seed dan rumus bisnis; `master/` = parameter berlaku efektif |
| `src/lib` | Akses (`access.ts`), sesi, format, validator, `today.ts` (`DEMO_TODAY`), `demo.ts` (`DEMO_MODE`) |
| `public/brand` | Logo dan favicon resmi (jangan digambar ulang) |
| `docs` | `peran-dan-akses.md` (v2.1), `golden-values.md`, `HANDOFF.md` |
| `.agents/rules` | Aturan desain, komponen, bisnis, dan arsitektur (01–05) |

### Peta PageId ↔ menu sidebar ↔ file halaman

Navigasi memakai state `activePage` di `src/App.tsx` (tanpa router). Menu per peran disaring `canOpen()` dari `src/lib/access.ts`.

| PageId | Menu sidebar | File |
|---|---|---|
| `dashboard` | Dashboard | `src/pages/dashboard.tsx` |
| `recruitment` | Recruitment › Daftar Kandidat | `src/pages/recruitment.tsx` |
| `recruitment-jobs` | Recruitment › Lowongan | `src/pages/recruitment-jobs.tsx` |
| `recruitment-form` | Recruitment › Form DICAP | `src/pages/recruitment-form.tsx` |
| `recruitment-tests` | Recruitment › Menu Tes | `src/pages/recruitment-tests.tsx` |
| `employees` | Data Pegawai › Direktori & Draft | `src/pages/employees.tsx` |
| `employee-draft` | (profil pegawai/draft, dibuka dari Direktori) | `src/pages/employee-draft.tsx` |
| `employee-transactions` | Data Pegawai › Transaksi Kepegawaian | `src/pages/employee-transactions.tsx` |
| `industrial-relations` | Data Pegawai › Hubungan Industrial | `src/pages/industrial-relations.tsx` |
| `master-data` | Data Pegawai › Data Master | `src/pages/master-data.tsx` |
| `attendance` | Kehadiran › Absensi & Rekap | `src/pages/attendance.tsx` |
| `leave` | Kehadiran › Cuti/Izin/Sakit/Dinas | `src/pages/leave.tsx` |
| `shift-swap` | Kehadiran › Tukar Shift | `src/pages/shift-swap.tsx` |
| `overtime` | Kehadiran › Overtime | `src/pages/overtime.tsx` |
| `dev-competency` | People Development › Kompetensi | `src/pages/competency.tsx` |
| `dev-training` | People Development › Training | `src/pages/training.tsx` |
| `dev-kpi` | People Development › KPI | `src/pages/kpi.tsx` |
| `payroll-run` | Payroll › Proses & Closing | `src/pages/payroll-run.tsx` |
| `payroll-components` | Payroll › Komponen & Potongan | `src/pages/payroll-components.tsx` |
| `salary-change` | Payroll › Perubahan Gaji | `src/pages/salary-change.tsx` |
| `payslips` | Payroll › Slip Gaji | `src/pages/payslips.tsx` |
| `payments` | Payroll › Daftar Pembayaran | `src/pages/payments.tsx` |
| `payroll-recon` | Payroll › Rekonsiliasi Potongan | `src/pages/payroll-recon.tsx` |
| `final-pay` | Payroll › Kompensasi & Pesangon | `src/pages/final-pay.tsx` |
| `coop-members` | Koperasi › Anggota & Simpanan | `src/pages/coop-members.tsx` |
| `coop-withdrawals` | Koperasi › Pencairan Sukarela | `src/pages/coop-withdrawals.tsx` |
| `coop-cash-advance` | Koperasi › Kasbon | `src/pages/coop-cash-advance.tsx` |
| `coop-loans` | Koperasi › Pinjaman | `src/pages/coop-loans.tsx` |
| `coop-payroll-deductions` | Koperasi › Potongan Payroll | `src/pages/coop-payroll-deductions.tsx` |
| `coop-budget` | Koperasi › Master Budget | `src/pages/coop-budget.tsx` |
| `coop-trading` | Koperasi › Unit Dagang | `src/pages/coop-trading.tsx` |
| `coop-shu` | Koperasi › SHU | `src/pages/coop-shu.tsx` |
| `coop-settings` | Koperasi › Pengaturan | `src/pages/coop-settings.tsx` |
| `system-settings` | Pengaturan Sistem (menu pengguna) | `src/pages/system-settings.tsx` |

Di luar sidebar: `src/pages/login.tsx` (masuk, panel akun demo), `src/pages/perspective-picker.tsx` (Mode Presentasi), dan portal pelamar/karyawan mobile (`src/components/portal/`, dibuka dari halaman Masuk; uji di 390×844).

## Akun demo

Kata sandi semua akun: **`Demo#2026`**. Peran bertanda OTP meminta kode 6 digit; di prototipe kode tampil di toast `(simulasi)`.

| Nama | Email | Peran | OTP |
|---|---|---|---|
| Presentasi (demo) | presentasi@primaplast.co.id | Mode Presentasi (pilih perspektif akun lain, tanpa OTP) | tidak |
| Benny Tjandra | benny.tjandra@primaplast.co.id | Direksi | ya |
| Okta Maulana | okta.maulana@primaplast.co.id | HR Recruitment | tidak |
| Teddy Syahputra | teddy.syahputra@primaplast.co.id | HR Personalia + HR Development & Industrial | tidak |
| Lestari Wulandari | lestari.wulandari@primaplast.co.id | HR & GA Manager | ya |
| Hendra Gunawan | hendra.gunawan@primaplast.co.id | Atasan (Supervisor Produksi) | tidak |
| Mira Andriani | mira.andriani@primaplast.co.id | Payroll Officer | ya |
| Yohanes Kristanto | yohanes.kristanto@primaplast.co.id | Atasan + Finance | ya |
| Ratna Dewi | ratna.dewi@primaplast.co.id | Sekretaris KSB | tidak |
| Nina Marlina | nina.marlina@primaplast.co.id | Atasan + Bendahara KSB | ya |
| Rudi Hartanto | rudi.hartanto@primaplast.co.id | Atasan + Ketua KSB | ya |
| Taufik Hidayat | taufik.hidayat@primaplast.co.id | Super Admin IT | ya |
| Rizky Pratama | rizky.pratama@primaplast.co.id | Karyawan (tanpa peran web; contoh data profil) | tidak |
| Wawan Kurniawan | wawan.kurniawan@primaplast.co.id | HR Recruitment, wajib ganti sandi saat login pertama | tidak |
| Desi Ratnasari | desi.ratnasari@primaplast.co.id | Karyawan (tanpa peran web) | tidak |

Akun dengan beberapa peran (mis. Teddy) berganti peran aktif lewat menu pengguna di Topbar.

### Mode demo

- **`DEMO_MODE`** (`src/lib/demo.ts`): bila `true`, tampil panel Akun demo di halaman Masuk, Mode Presentasi, menu **Skenario (demo)**, tombol simulasi berlabel `simLabel` (mis. "Pegawai menyetujui di aplikasi"), dan toast kode OTP. Build produksi mengubahnya ke `false`; tombol "Catat persetujuan lisan/konfirmasi" tetap ada.
- **`DEMO_TODAY`** (`src/lib/today.ts`): tanggal hari ini di prototipe = **26 Okt 2026**. Jangan memakai `new Date()` untuk logika bisnis.
- **Mode Presentasi**: masuk sebagai Presentasi (demo), lalu pilih perspektif akun mana pun tanpa OTP. Aksi tercatat di audit log sebagai "Presentasi (sebagai …)".
- **Menu Skenario (demo)** di Topbar: pintasan menutup kehadiran Oktober 2026 dan menyelesaikan payroll Oktober 2026 untuk demo.

## Aturan dan cara kerja

- Aturan ada di [`AGENTS.md`](AGENTS.md) dan `.agents/rules/01–05` (01 produk & shell, 02 visual, 03 komponen & format, 04 aturan bisnis, 05 arsitektur target). `CLAUDE.md` mengimpor semuanya.
- **Satu prompt = satu commit**: baca prompt, periksa kode, kerjakan hanya yang diminta, lulus `pnpm exec tsc -b` dan `pnpm build`, cek di browser (1440 px untuk HR, 390×844 untuk Portal), lalu `git commit -m "prompt {kode}: {ringkasan}"`. Jangan `--force`, jangan commit `.env*`, token, atau dokumen klien asli.
- Larangan utama: jangan menggambar ulang logo (pakai `public/brand/`), jangan menulis hex atau palet Tailwind (pakai token), jangan menghitung ulang payroll Final, jangan menghapus seed demo.

## Dokumen di luar repo (ditambahkan saat pindah ke Antigravity)

- `docs/arsitektur.md`
- `docs/api/openapi.yaml` (API mobile) dan `docs/api/openapi-admin.yaml` (API web)
- `docs/api/README*.md`
- PRD v1.1.35
- `docs/roadmap.md`
