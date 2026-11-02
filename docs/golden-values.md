# KOMPETEN — Golden Values

Angka yang sudah terverifikasi di prototipe Figma Make (tanggal demo **26 Okt 2026**). Setiap angka menjadi kasus uji (golden test) di fase M1 `packages/shared` dan wajib tetap sama setelah setiap migrasi.

Kolom "Sumber" menunjuk nomor prompt Make tempat angka itu ditetapkan.

## A. Angka dari prompt (terverifikasi)

| Kasus | Nilai | Sumber |
|---|---|---|
| Karyawan Aktif per 26 Okt 2026 | 248 (+12% vs tahun lalu) | Dashboard |
| KPI Oktober (Operator Injection) | diinput 14/20, menunggu 4, rata-rata 95,4, Kurang 0 | 11c |
| KPI Rizky Oktober (input uji) | capaian 95 · 80 · 120 · 100 · 94,4 · 102 · 100 → 96,1 Baik | 11c |
| KPI Lukman Agustus | 68,0 Kurang | 11d |
| Kompetensi S2 2026 | dinilai 12/20, pemenuhan 75,8%, menunggu verifikasi 3 | 11a |
| Kompetensi Rizky S1 | 9/10 dinilai, memenuhi 6, 66,7%, gap 3 | 11a |
| Training 2026 | program aktif 3, peserta berjalan 13, kelulusan 16/18 = 88,9%; setelah Wahyu 80: 17/19 = 89,5%, sertifikat SRT/TRN-PPI/017/X/2026 | 11b, 11d |
| Payroll September (Final) | total transfer Rp 1.840.174.194, 248 pegawai, ditunda 0, gagal 0 | 06c |
| Koperasi | anggota aktif 188; dana tersimpan Rp 618.900.000; dana terutang Rp 3.500.000; SHU berjalan Rp 11.240.000 | 07, 09a |
| Pinjaman Siti Nurhaliza (PJK-2026-0072) | plafon tersedia Rp 4.650.000 (di luar pengajuan sendiri) | 12e |
| Kasbon | plafon Rp 1.000.000/bulan kumulatif, admin 5%, jendela 1–23 | 07b |
| Hak akhir Hadi Susanto (Pensiun) | upah dasar Rp 8.000.000; 1,75 UP + 1 UPMK | 09d |

## B. Angka tambahan yang diverifikasi saat serah terima (prompt 13)

Dibaca langsung dari aplikasi (halaman dan modul data) pada 1440 px.

| Kasus | Nilai | Sumber |
|---|---|---|
| Daftar Pembayaran September, per bank | BCA 61 pegawai Rp 461.200.877 · Mandiri 49 Rp 357.573.198 · BRI 74 Rp 526.471.016 · BNI 63 Rp 488.660.387 · di luar file bank 1 Rp 6.268.716 (jumlah 248 pegawai, Rp 1.840.174.194) | 06c |
| Dana tersimpan koperasi | Pokok Rp 18.800.000 + Wajib Rp 592.150.000 + Sukarela Rp 7.950.000 = Rp 618.900.000 (188 anggota aktif) | 07, 09a |
| Dana terutang koperasi | pinjaman koperasi aktif Rp 3.000.000 + kasbon berjalan Rp 500.000 = Rp 3.500.000 | 07, 09a |
| SHU berjalan 2026 | pendapatan Rp 33.065.000 (admin kasbon Rp 4.815.000 + selisih unit dagang Rp 28.250.000) − beban Rp 21.825.000 = Rp 11.240.000 | 09a |
| Plafon pinjaman Siti Nurhaliza | Wajib Rp 1.550.000 × 3 = Rp 4.650.000; dengan pengajuan Rp 2.000.000 ikut dihitung, tersedia Rp 2.650.000 | 12e |
| Dashboard Direktori | 248 karyawan aktif, 5 kontrak berakhir dalam 45 hari; Pelamar 12, Interview 7, Lolos 2 | Dashboard |

## C. Cara memakai

1. Fungsi murni di `packages/shared` menerima tanggal dan nilai master sebagai parameter (tanpa `DEMO_TODAY`); uji dengan tanggal tetap 26 Okt 2026.
2. Data Final (payroll, SHU, kompetensi, KPI) diuji sebagai snapshot: dibaca, tidak dihitung ulang.
3. Bila sebuah angka berubah setelah migrasi, perlakukan sebagai regresi sampai terbukti sebaliknya, lalu catat di laporan fase.
