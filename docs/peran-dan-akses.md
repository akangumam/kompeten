# KOMPETEN — Jenis Akun, Peran & Hak Akses (v2.1 · 1 Nov 2026)

Disusun dari PRD v1.1.34 dan perilaku prototipe sampai prompt 11d. Dokumen ini menjadi dasar untuk halaman Login (12a), Pengaturan Sistem (12b), spesifikasi API (12c), dan aplikasi Flutter.

## 0. Keputusan yang dikunci (1 Nov 2026)

| # | Topik | Keputusan |
|---|---|---|
| 1 | Identitas login | Email kantor saja (+ kata sandi). Konsekuensinya, setiap pegawai aktif, termasuk operator yang hanya memakai Flutter, wajib punya email kantor. Email menjadi field wajib dan unik saat "Verifikasi & Aktifkan" Draft Pegawai, dengan domain sesuai master "Domain email perusahaan" |
| 2 | Admin HRD | Dipecah 3 peran sesuai PRD: HR Recruitment · HR Personalia · HR Development & Industrial. Satu akun boleh merangkap lebih dari satu |
| 3 | Karyawan di web | Hanya Flutter. Akun yang tidak punya peran kerja web ditolak di web dengan pesan untuk memakai aplikasi KOMPETEN Mobile |

## 1. Jenis akun

| Jenis akun | Siapa | Login | Kanal |
|---|---|---|---|
| Pegawai | Semua pegawai aktif (satu akun per NIP) | Email kantor + kata sandi (+ OTP untuk peran sensitif) | Web, bila punya peran kerja; Flutter untuk self-service |
| Pelamar | Calon pegawai | Email pribadi + OTP (sudah ada di Portal Pelamar) | Portal Pelamar (web mobile) |
| Super Admin IT | Tim IT Primaplast | Email kantor + kata sandi + OTP | Web: Pengaturan Sistem |

Satu akun pegawai bisa punya lebih dari satu peran. Contoh: Ratna Dewi adalah Karyawan sekaligus Sekretaris KSB, dan Hendra Gunawan adalah Karyawan sekaligus Atasan. Bila akun punya lebih dari satu peran web, Topbar menampilkan pemilih peran aktif. Pemilih ini menggantikan "Masuk sebagai (demo)" dan isinya terbatas pada peran milik akun itu sendiri. Peran Karyawan tidak muncul di web.

## 2. Peran

| Peran | Cara didapat | Catatan |
|---|---|---|
| Karyawan | Otomatis untuk setiap pegawai aktif | Hanya Flutter |
| Atasan | Otomatis dari struktur organisasi & Matriks Penyetuju (punya bawahan langsung) | Tidak pernah diberikan manual; hilang saat tidak lagi punya bawahan |
| HR Recruitment | Ditetapkan Super Admin | Lowongan, kandidat, DICAP, tes rekrutmen, penawaran, Generate Data Pegawai |
| HR Personalia | Ditetapkan Super Admin | Draft Pegawai (aktivasi), Direktori, Transaksi Kepegawaian, Kehadiran, Data Master organisasi |
| HR Development & Industrial | Ditetapkan Super Admin | Kompetensi, Training, KPI, Hubungan Industrial, master terkait |
| HR & GA Manager | Ditetapkan Super Admin | Penyetuju akhir HR; boleh menyetujui mewakili atasan |
| Payroll Officer | Ditetapkan Super Admin | |
| Finance | Ditetapkan Super Admin | |
| KSB Sekretaris / Bendahara / Ketua | Ditetapkan Ketua KSB atau Super Admin, berlaku per masa jabatan pengurus | Koperasi entitas terpisah |
| Super Admin IT | Ditetapkan Super Admin lain | Tidak melihat data gaji, kesehatan, KTP, hasil tes, atau saldo koperasi; hanya akun, peran, kebijakan keamanan, dan audit. Tidak bisa mengubah perannya sendiri |

## 3. Matriks akses menu (web)

Kode: P = penuh · S = setujui · B = baca · T = hanya tim sendiri · — = tidak ada akses

| Menu | HR Rekrut. | HR Personalia | HR Dev & Ind. | HR & GA Mgr | Atasan | Payroll | Finance | KSB | Super Admin |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard Umum & Rekrutmen | P | P | B | P | T | B | B | — | — |
| Dashboard Produksi | B | P | B | P | T (section sendiri) | — | — | — | — |
| Dashboard Presensi (kategori sakit hanya agregat) | — | P | — | P | T | — | — | — | — |
| Dashboard Koperasi | — | — | — | — | — | — | — | P | — |
| Recruitment: lowongan, kandidat, DICAP, penawaran | P | — | — | S (lowongan, penawaran) | T (interview dept sendiri, tanpa gaji) | — | — | — | — |
| Recruitment: Menu Tes (bank soal) | P | — | P (paket sumber Training) | B | — | — | — | — | — |
| Direktori Pegawai | B (tanpa KTP/bank/pajak) | P | B (tanpa KTP/bank/pajak) | B | T (baca, tanpa KTP/bank/pajak) | B (termasuk KTP/bank/pajak/BPJS untuk penggajian; tanpa catatan disiplin & exit interview) | — | — | — |
| Draft Pegawai | B (hasil generate) | P (verifikasi & aktifkan) | — | B | — | — | — | — | — |
| Transaksi Kepegawaian | — | P | B | S (akhir) | S (langkah 1, tim) | B (yang disetujui) | — | — | — |
| Hubungan Industrial | — | B (Pegawai Keluar) | P | S | T (draf SP tim; tanpa exit interview) | B (Pegawai Keluar) | — | konfirmasi clearance koperasi | — |
| Kehadiran (absensi, cuti, tukar shift, lembur) + kategori sakit | — | P | — | S (eskalasi) | S (tim, tanpa kategori sakit) | B (rekap) | — | — | — |
| People Development (kompetensi, training, KPI) | — | — | P (verifikasi, template) | S (mewakili) / B | T (menilai, input KPI, usul peserta) | — | — | — | — |
| Payroll: proses, komponen, slip, perubahan gaji | — | — | — | S (baca + approval) | — | P | — | — | — |
| Payroll: Daftar Pembayaran & Rekonsiliasi | — | — | — | B | — | P | P (pembayaran) | — | — |
| Kompensasi & Pesangon | — | — | B | S | — | P | P (pembayaran) | — | — |
| Koperasi (semua halaman) | — | — | — | — | — | — | — | P sesuai jabatan | — |
| Data Master: organisasi, posisi, grade, shift, cuti, libur, Matriks Penyetuju, standar tenaga kerja, tier | — | P | B | B | — | B (grade, komponen) | — | — | — |
| Data Master: rekrutmen (sumber lowongan, ambang interview, masa simpan data pelamar, nilai tes ke pelamar) | P | B | — | B | — | — | — | — | — |
| Data Master: kompetensi, standar posisi, template & predikat KPI, parameter HI (SP, pelanggaran, alasan keluar, uang pisah, pengali) | — | B | P | B | — | B (pengali & uang pisah) | — | — | — |
| Pengaturan Koperasi | — | — | — | — | — | — | — | P (Ketua) | — |
| Pengaturan Sistem: pengguna, peran, kebijakan keamanan | — | — | — | — | — | — | — | — | P |
| Pengaturan Sistem: audit log | — | — | — | B | — | — | — | — | P |

Aturan lintas peran yang tetap berlaku:

- Atasan tidak pernah melihat Rupiah.
- HR dan Payroll tidak pernah melihat saldo koperasi.
- Kategori sakit hanya untuk HR Personalia dan HR & GA Manager.
- Tidak ada self-approval; pengajuan dieskalasi.
- Notifikasi yang dulu ditujukan ke "Admin HRD" kini diarahkan ke peran HR pemilik prosesnya. Contoh: DICAP masuk → HR Recruitment; verifikasi Sakit/Dinas/lembur → HR Personalia; usulan peserta training dan KPI → HR Development & Industrial.

Catatan v2.1: Payroll membaca Direktori karena butuh data identitas, rekening, NPWP/PTKP, dan BPJS untuk penggajian. Master rekrutmen dipegang HR Recruitment.

## 4. Keamanan login

Semua nilai di bawah adalah master Kebijakan Keamanan yang diatur Super Admin.

- Kata sandi minimal 8 karakter, mengandung huruf dan angka. Akun terkunci 15 menit setelah 5 kali gagal berturut-turut. Wajib ganti kata sandi saat login pertama dan setelah direset.
- Sesi web berakhir setelah 30 menit tidak aktif, dengan peringatan 2 menit sebelumnya ("Perpanjang sesi").
- OTP email 6 digit (berlaku 5 menit) wajib untuk HR & GA Manager, Payroll, Finance, KSB Bendahara/Ketua, dan Super Admin.
- Lupa kata sandi: pesan selalu sama, apa pun emailnya ("Jika email terdaftar, tautan reset telah dikirim"), supaya tidak membocorkan email mana yang terdaftar. Tautan berlaku 30 menit dan sekali pakai.
- Semua login (berhasil maupun gagal), penguncian, ganti peran aktif, perubahan peran, reset kata sandi, dan logout tercatat di audit log.
- Pegawai nonaktif (offboarding selesai) tidak bisa login mulai H+1 tanggal keluar, di web maupun Flutter.
- Akun KSB kehilangan peran koperasi otomatis saat masa jabatan pengurus berakhir.

## 5. Keputusan terbuka

- Domain email kantor resmi (prototipe memakai contoh @primaplast.co.id, diatur di master).
- Apakah Primaplast memakai Google Workspace atau Microsoft 365, sehingga login SSO bisa ditambahkan di samping email + kata sandi.
- Operator yang belum punya email kantor: dibuatkan email sungguhan atau alias yang diteruskan (mis. ke email atasan)? Prototipe menganggap semua pegawai sudah punya email kantor.
