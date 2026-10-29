export type Stage = 'Seleksi Administrasi' | 'Tes' | 'Interview' | 'Penawaran' | 'Diterima' | 'Ditolak' | 'Batal'
/** Tahap maju (urut). Ditolak/Batal bisa terjadi di tahap mana pun. */
export const FLOW: Stage[] = ['Seleksi Administrasi', 'Tes', 'Interview', 'Penawaran', 'Diterima']
export const STAGES: Stage[] = [...FLOW, 'Ditolak', 'Batal']
export const isFinalStage = (s: Stage) => s === 'Diterima' || s === 'Ditolak' || s === 'Batal'
export type Sumber = string

export type DocKey = 'cv' | 'ktp' | 'ijazah' | 'transkrip' | 'foto' | 'skck' | 'sehat'
export const DOC_DEFS: { key: DocKey; label: string; wajib: boolean }[] = [
  { key: 'cv', label: 'CV', wajib: true },
  { key: 'ktp', label: 'KTP', wajib: true },
  { key: 'ijazah', label: 'Ijazah terakhir', wajib: true },
  { key: 'transkrip', label: 'Transkrip', wajib: false },
  { key: 'foto', label: 'Pas foto', wajib: true },
  { key: 'skck', label: 'SKCK', wajib: false },
  { key: 'sehat', label: 'Surat keterangan sehat', wajib: false },
]
export type DocStatus = 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak'
export type DocState = { key: DocKey; file: string; size: number; status: DocStatus; alasan?: string; oleh?: string; at?: string }

export type CandEdu = { jenjang: string; institusi: string; jurusan: string; tahun: string; nilai: string }
export type Pengalaman = { perusahaan: string; posisi: string; mulai: string; selesai: string; alasan: string }
export type InterviewInfo = { tanggal: string; jam: string; lokasi: string; userNik: string; userNama: string; hrNama: string }
export type HistoryItem = { date: string; label: string; by: string; stage?: Stage }

export type Candidate = {
  /** Nomor lamaran LMR-2026-NNNN. */
  id: string
  nama: string
  posisi: string
  dept: string
  lowonganId: string
  sumber: Sumber
  applyDate: string
  stage: Stage
  phone: string
  email: string
  ktp: string
  tempatLahir: string
  tanggalLahir: string
  gender: string
  pernikahan: string
  tanggungan: number
  alamatKtp: string
  alamatDomisili: string
  darurat: { nama: string; hubungan: string; hp: string }
  pendidikan: CandEdu[]
  pengalaman: Pengalaman[]
  belumBekerja?: boolean
  skills: string[]
  docs: DocState[]
  interview?: InterviewInfo
  userScore?: number
  hrScore?: number
  userCatatan?: string
  /** Catatan Internal HRD: tidak pernah tampil untuk Atasan. */
  notes?: string
  /** Catatan HR bila melanjutkan meski nilai interview di bawah ambang. */
  lanjutCatatan?: string
  rejectReason?: string
  batalReason?: string
  /** Tahap saat ditolak/dibatalkan. */
  stageSebelum?: Stage
  history: HistoryItem[]
  offerId?: string
  draftCreatedAt?: string
  /** Terisi saat Generate Data Pegawai: nomor surat penawaran yang disalin ke Draft Pegawai. */
  salinPenawaran?: string
  /** Permintaan penghapusan data dari pelamar (UU PDP). */
  deleteRequest?: { tanggal: string }
}

/* ---------- seed ---------- */
const LWG: Record<string, string> = {
  'Operator Injection': 'LWG-2026-018', 'QC Inspector': 'LWG-2026-019', 'Admin PPIC': 'LWG-2026-020', 'Staff Gudang': 'LWG-2026-021',
  'Teknisi Mekanik': 'LWG-2026-022', 'Staff HR': 'LWG-2026-023', 'Operator Blow Molding': 'LWG-2026-024',
}
const ADM = 'Admin HRD'
const h = (date: string, label: string, by = ADM, stage?: Stage): HistoryItem => ({ date, label, by, stage })
const slug = (n: string) => n.replace(/ /g, '_')
type DS = [DocKey, DocStatus?, string?]
const docs = (nama: string, spec: DS[], at = '2026-10-12'): DocState[] =>
  spec.map(([key, status = 'Terverifikasi', alasan]) => ({
    key, file: `${DOC_DEFS.find((d) => d.key === key)!.label.split(' ')[0]}_${slug(nama)}.${key === 'ktp' || key === 'foto' ? 'jpg' : 'pdf'}`, size: key === 'foto' ? 380_000 : 920_000, status, alasan,
    oleh: status === 'Menunggu Verifikasi' ? undefined : ADM, at: status === 'Menunggu Verifikasi' ? undefined : at,
  }))
const ALL_DOCS: DS[] = [['cv'], ['ktp'], ['ijazah'], ['transkrip'], ['foto'], ['skck']]
const edu = (jenjang: string, institusi: string, jurusan: string, tahun: string, nilai: string): CandEdu => ({ jenjang, institusi, jurusan, tahun, nilai })
const exp = (perusahaan: string, posisi: string, mulai: string, selesai: string, alasan: string): Pengalaman => ({ perusahaan, posisi, mulai, selesai, alasan })

type Seed = Omit<Candidate, 'lowonganId' | 'alamatDomisili' | 'skills'> & { skills?: string[]; alamatDomisili?: string }
const mk = (s: Seed): Candidate => ({ ...s, lowonganId: LWG[s.posisi], alamatDomisili: s.alamatDomisili ?? s.alamatKtp, skills: s.skills ?? [] })

export const CANDIDATES: Candidate[] = [
  mk({
    id: 'LMR-2026-0152', nama: 'Nur Aini', posisi: 'Operator Blow Molding', dept: 'Produksi', sumber: 'Indeed', applyDate: '2026-10-15', stage: 'Seleksi Administrasi',
    phone: '0812-3401-5521', email: 'nur.aini@email.com', ktp: '3671044506020002', tempatLahir: 'Tangerang', tanggalLahir: '2002-06-05', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Imam Bonjol No. 18, Karawaci, Kota Tangerang', darurat: { nama: 'Siti Rohmah', hubungan: 'Ibu', hp: '081234550192' },
    pendidikan: [edu('SMA', 'SMA Negeri 3 Tangerang', 'IPA', '2020', '82,5')], pengalaman: [], belumBekerja: true, skills: ['K3 dasar', 'Microsoft Excel'],
    docs: docs('Nur Aini', [['cv'], ['ktp'], ['ijazah', 'Menunggu Verifikasi'], ['foto', 'Menunggu Verifikasi']]),
    history: [h('2026-10-15', 'Lamaran diterima (Indeed)', 'Pelamar', 'Seleksi Administrasi')],
  }),
  mk({
    id: 'LMR-2026-0151', nama: 'Yoga Pratama', posisi: 'Staff Gudang', dept: 'Warehouse', sumber: 'Referral', applyDate: '2026-10-12', stage: 'Seleksi Administrasi',
    phone: '0813-5522-8734', email: 'yoga.pratama@email.com', ktp: '3603152307010004', tempatLahir: 'Tangerang', tanggalLahir: '2001-07-23', gender: 'Laki-laki', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Kisamaun No. 7, Cimone, Kota Tangerang', darurat: { nama: 'Hartono', hubungan: 'Ayah', hp: '081355228800' },
    pendidikan: [edu('SMK', 'SMK Pelita 2 Tangerang', 'Teknik Logistik', '2019', '84,0')], pengalaman: [exp('PT Mitra Logistik Banten', 'Helper Gudang', '2020-01-06', '2022-12-30', 'Kontrak berakhir')], skills: ['Forklift', 'Stock opname'],
    docs: docs('Yoga Pratama', [['cv'], ['ktp', 'Menunggu Verifikasi'], ['ijazah', 'Menunggu Verifikasi'], ['foto', 'Menunggu Verifikasi']]),
    history: [h('2026-10-12', 'Lamaran diterima (Referral)', 'Pelamar', 'Seleksi Administrasi')],
  }),
  mk({
    id: 'LMR-2026-0150', nama: 'Maya Sari', posisi: 'QC Inspector', dept: 'Quality Assurance', sumber: 'Website', applyDate: '2026-10-10', stage: 'Tes',
    phone: '0821-7710-3346', email: 'maya.sari@email.com', ktp: '3275084108000006', tempatLahir: 'Bekasi', tanggalLahir: '2000-08-01', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Raya Kalimalang No. 44, Bekasi Barat', darurat: { nama: 'Ratna Sari', hubungan: 'Ibu', hp: '082177103300' },
    pendidikan: [edu('D3', 'Politeknik Negeri Jakarta', 'Teknik Kimia', '2022', '3,41')], pengalaman: [exp('PT Kemasan Prima', 'Staff Lab', '2022-08-01', '2025-09-30', 'Kontrak berakhir')], skills: ['Pengukuran dimensi', 'ISO 9001 dasar'],
    docs: docs('Maya Sari', ALL_DOCS, '2026-10-21'),
    history: [h('2026-10-10', 'Lamaran diterima (Website)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-21', 'Dokumen terverifikasi lengkap'), h('2026-10-23', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Teknis QC (28 Okt 2026)', ADM, 'Tes')],
  }),
  mk({
    id: 'LMR-2026-0149', nama: 'Agus Salim', posisi: 'Operator Injection', dept: 'Produksi', sumber: 'WA Group', applyDate: '2026-10-08', stage: 'Tes',
    phone: '0857-2288-1904', email: 'agus.salim@email.com', ktp: '3671020309990001', tempatLahir: 'Tangerang', tanggalLahir: '1999-09-03', gender: 'Laki-laki', pernikahan: 'Menikah', tanggungan: 1,
    alamatKtp: 'Jl. Raya Cikupa No. 31, Cikupa, Kab. Tangerang', darurat: { nama: 'Dewi Anjani', hubungan: 'Istri', hp: '085722881955' },
    pendidikan: [edu('SMK', 'SMK Negeri 1 Cikupa', 'Teknik Pemesinan', '2017', '81,2')], pengalaman: [exp('PT Plastik Nusantara', 'Operator Injection', '2018-02-05', '2024-06-28', 'Mencari tempat kerja yang lebih dekat')], skills: ['Mesin injection 150T', 'Setting cetakan dasar'],
    docs: docs('Agus Salim', ALL_DOCS, '2026-10-19'),
    history: [h('2026-10-08', 'Lamaran diterima (WA Group)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-19', 'Dokumen terverifikasi lengkap'), h('2026-10-20', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Teknis Operator', ADM, 'Tes'), h('2026-10-22', 'Hasil tes diinput: semua paket lulus')],
  }),
  mk({
    id: 'LMR-2026-0148', nama: 'Lina Puspita', posisi: 'Staff HR', dept: 'HR & GA', sumber: 'Jobstreet', applyDate: '2026-10-06', stage: 'Interview',
    phone: '0856-9012-4478', email: 'lina.puspita@email.com', ktp: '3674066205970003', tempatLahir: 'Tangerang Selatan', tanggalLahir: '1997-05-22', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Pondok Aren Raya No. 9, Tangerang Selatan', darurat: { nama: 'Andri Puspita', hubungan: 'Kakak', hp: '085690124400' },
    pendidikan: [edu('S1', 'Universitas Pamulang', 'Psikologi', '2019', '3,52')], pengalaman: [exp('PT Mitra Sejahtera', 'HR Staff', '2019-09-02', '2025-12-31', 'Efisiensi perusahaan')], skills: ['Rekrutmen', 'Administrasi BPJS'],
    docs: docs('Lina Puspita', ALL_DOCS, '2026-10-07'),
    interview: { tanggal: '2026-10-28', jam: '10.00', lokasi: 'Ruang Meeting HR, Lantai 2', userNik: 'PPI-2016-0003', userNama: 'Lestari Wulandari', hrNama: 'Admin HRD' },
    history: [h('2026-10-06', 'Lamaran diterima (Jobstreet)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-07', 'Dokumen terverifikasi lengkap'), h('2026-10-08', 'Undangan tes dikirim: Tes Pengetahuan Umum, Psikotes', ADM, 'Tes'), h('2026-10-14', 'Lanjut interview: jadwal 28 Okt 2026, 10.00', ADM, 'Interview')],
  }),
  mk({
    id: 'LMR-2026-0147', nama: 'Hendra Wijaya', posisi: 'Operator Blow Molding', dept: 'Produksi', sumber: 'WA Group', applyDate: '2026-10-05', stage: 'Interview',
    phone: '0838-4410-6692', email: 'hendra.wijaya@email.com', ktp: '3603081510960005', tempatLahir: 'Tangerang', tanggalLahir: '1996-10-15', gender: 'Laki-laki', pernikahan: 'Menikah', tanggungan: 2,
    alamatKtp: 'Jl. Raya Mauk No. 66, Kab. Tangerang', darurat: { nama: 'Sulastri', hubungan: 'Istri', hp: '083844106000' },
    pendidikan: [edu('SMK', 'SMK Muhammadiyah 1 Tangerang', 'Teknik Mesin', '2014', '79,8')], pengalaman: [exp('PT Plastindo Jaya', 'Operator Blow Molding', '2022-03-07', '2024-12-27', 'Kontrak tidak diperpanjang')], skills: ['Blow molding', 'Shift malam'],
    docs: docs('Hendra Wijaya', ALL_DOCS, '2026-10-06'),
    interview: { tanggal: '2026-10-22', jam: '09.00', lokasi: 'Ruang Meeting Produksi', userNik: 'PPI-2019-0007', userNama: 'Hendra Gunawan', hrNama: 'Admin HRD' },
    userScore: 72, hrScore: 76, userCatatan: 'Terampil mengoperasikan blow molding, perlu pembekalan SOP K3.',
    notes: 'Pengalaman 2 tahun di mesin blow molding. Siap shift malam, perlu pembekalan SOP K3.',
    history: [h('2026-10-05', 'Lamaran diterima (WA Group)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-06', 'Dokumen terverifikasi lengkap'), h('2026-10-07', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Teknis Operator', ADM, 'Tes'), h('2026-10-12', 'Lanjut interview: jadwal 22 Okt 2026, 09.00', ADM, 'Interview'), h('2026-10-22', 'Nilai User 72 diinput', 'Hendra Gunawan'), h('2026-10-22', 'Nilai HR 76 diinput')],
  }),
  mk({
    id: 'LMR-2026-0146', nama: 'Dewi Lestari', posisi: 'Admin PPIC', dept: 'PPIC', sumber: 'Indeed', applyDate: '2026-10-03', stage: 'Penawaran',
    phone: '0819-6633-2051', email: 'dewi.lestari@email.com', ktp: '3671156701980002', tempatLahir: 'Tangerang', tanggalLahir: '1998-01-27', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Hasyim Ashari No. 12, Cipondoh, Kota Tangerang', darurat: { nama: 'Mulyadi', hubungan: 'Ayah', hp: '081966332000' },
    pendidikan: [edu('S1', 'Universitas Muhammadiyah Tangerang', 'Manajemen', '2020', '3,38')], pengalaman: [exp('PT Sinar Packaging', 'Admin Produksi', '2020-10-05', '2026-08-31', 'Mencari pengembangan karier')], skills: ['Microsoft Excel lanjutan', 'Perencanaan produksi'],
    docs: docs('Dewi Lestari', ALL_DOCS, '2026-10-04'),
    interview: { tanggal: '2026-10-09', jam: '13.00', lokasi: 'Ruang Meeting PPIC', userNik: 'PPI-2018-0022', userNama: 'Dian Puspitasari', hrNama: 'Admin HRD' },
    userScore: 78, hrScore: 80, userCatatan: 'Paham alur perencanaan produksi dan komunikasi baik.',
    notes: 'Menguasai Excel lanjutan dan paham alur perencanaan produksi. Komunikasi baik.',
    history: [h('2026-10-03', 'Lamaran diterima (Indeed)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-04', 'Dokumen terverifikasi lengkap'), h('2026-10-05', 'Undangan tes dikirim: Tes Pengetahuan Umum, Psikotes', ADM, 'Tes'), h('2026-10-08', 'Lanjut interview: jadwal 9 Okt 2026, 13.00', ADM, 'Interview'), h('2026-10-09', 'Nilai User 78 diinput', 'Dian Puspitasari'), h('2026-10-09', 'Nilai HR 80 diinput'), h('2026-10-26', 'Penawaran dibuat dan diajukan ke HR & GA Manager', ADM, 'Penawaran')],
    offerId: 'OFR-3',
  }),
  mk({
    id: 'LMR-2026-0145', nama: 'Fajar Nugroho', posisi: 'Teknisi Mekanik', dept: 'Maintenance', sumber: 'Referral', applyDate: '2026-10-02', stage: 'Interview',
    phone: '0877-1209-8835', email: 'fajar.nugroho@email.com', ktp: '3216011103950007', tempatLahir: 'Bekasi', tanggalLahir: '1995-03-11', gender: 'Laki-laki', pernikahan: 'Menikah', tanggungan: 1,
    alamatKtp: 'Jl. Cut Meutia No. 27, Bekasi Timur', darurat: { nama: 'Yuni Astuti', hubungan: 'Istri', hp: '087712098000' },
    pendidikan: [edu('D3', 'Politeknik Manufaktur Bandung', 'Teknik Mesin', '2016', '3,20')], pengalaman: [exp('PT Inti Mekatronika', 'Teknisi Mekanik', '2017-01-09', '2026-06-30', 'Perusahaan menutup lini produksi')], skills: ['Perawatan preventif', 'Hidrolik & pneumatik'],
    docs: docs('Fajar Nugroho', ALL_DOCS, '2026-10-03'),
    interview: { tanggal: '2026-10-29', jam: '09.00', lokasi: 'Ruang Meeting Maintenance', userNik: 'PPI-2019-0015', userNama: 'Teguh Santoso', hrNama: 'Admin HRD' },
    history: [h('2026-10-02', 'Lamaran diterima (Referral)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-03', 'Dokumen terverifikasi lengkap'), h('2026-10-04', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Praktik Mesin', ADM, 'Tes'), h('2026-10-07', 'Lanjut interview: jadwal 29 Okt 2026, 09.00', ADM, 'Interview')],
  }),
  mk({
    id: 'LMR-2026-0144', nama: 'Rina Marlina', posisi: 'QC Inspector', dept: 'Quality Assurance', sumber: 'Website', applyDate: '2026-09-30', stage: 'Diterima',
    phone: '0812-8845-7716', email: 'rina.marlina@email.com', ktp: '3216014302990005', tempatLahir: 'Bekasi', tanggalLahir: '1999-02-03', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Pahlawan No. 21, Tambun Selatan, Kab. Bekasi', darurat: { nama: 'Budi Santoso', hubungan: 'Ayah', hp: '082144102290' },
    pendidikan: [edu('S1', 'Universitas Bhayangkara Jakarta Raya', 'Teknik Industri', '2021', '3,55')], pengalaman: [exp('PT Delta Kemasan', 'QC Inspector', '2021-09-01', '2026-08-31', 'Kontrak berakhir')], skills: ['ISO 9001', 'Inspeksi AQL', 'Pengukuran dimensi'],
    docs: docs('Rina Marlina', ALL_DOCS, '2026-10-01'),
    interview: { tanggal: '2026-10-05', jam: '10.00', lokasi: 'Ruang Meeting QA', userNik: 'PPI-2018-0011', userNama: 'Ratih Kusuma', hrNama: 'Admin HRD' },
    userScore: 84, hrScore: 86, userCatatan: 'Teliti dan memahami standar inspeksi.',
    notes: 'Teliti, memahami standar inspeksi ISO 9001. Direkomendasikan oleh user dan HR.',
    history: [h('2026-09-30', 'Lamaran diterima (Website)', 'Pelamar', 'Seleksi Administrasi'), h('2026-10-01', 'Dokumen terverifikasi lengkap'), h('2026-10-01', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Teknis QC', ADM, 'Tes'), h('2026-10-03', 'Lanjut interview: jadwal 5 Okt 2026, 10.00', ADM, 'Interview'), h('2026-10-05', 'Nilai User 84 diinput', 'Ratih Kusuma'), h('2026-10-05', 'Nilai HR 86 diinput'), h('2026-10-08', 'Penawaran dibuat dan diajukan', ADM, 'Penawaran'), h('2026-10-08', 'Penawaran disetujui', 'Lestari Wulandari'), h('2026-10-09', 'Penawaran dikirim ke kandidat'), h('2026-10-15', 'Kandidat menerima penawaran', ADM, 'Diterima')],
    offerId: 'OFR-2',
  }),
  mk({
    id: 'LMR-2026-0143', nama: 'Andi Saputra', posisi: 'Operator Injection', dept: 'Produksi', sumber: 'Jobstreet', applyDate: '2026-09-28', stage: 'Diterima',
    phone: '0852-3370-1189', email: 'andi.saputra@email.com', ktp: '3603121205980003', tempatLahir: 'Tangerang', tanggalLahir: '1998-05-12', gender: 'Laki-laki', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Raya Serang KM 12, Cikupa, Kab. Tangerang', darurat: { nama: 'Sri Wahyuni', hubungan: 'Ibu', hp: '081277314410' },
    pendidikan: [edu('SMK', 'SMK Negeri 2 Tangerang', 'Teknik Pemesinan', '2016', '80,5')], pengalaman: [exp('PT Cipta Plastik', 'Operator Injection', '2017-03-01', '2026-08-15', 'Pindah domisili')], skills: ['Injection 150T', 'Penanganan reject'],
    docs: docs('Andi Saputra', ALL_DOCS, '2026-09-29'),
    interview: { tanggal: '2026-10-01', jam: '09.00', lokasi: 'Ruang Meeting Produksi', userNik: 'PPI-2019-0007', userNama: 'Hendra Gunawan', hrNama: 'Admin HRD' },
    userScore: 80, hrScore: 84, userCatatan: 'Berpengalaman di mesin injection dan siap ditempatkan segera.',
    notes: 'Berpengalaman di mesin injection 150T. Disiplin dan siap ditempatkan segera.',
    draftCreatedAt: '2026-10-20',
    history: [h('2026-09-28', 'Lamaran diterima (Jobstreet)', 'Pelamar', 'Seleksi Administrasi'), h('2026-09-29', 'Dokumen terverifikasi lengkap'), h('2026-09-29', 'Undangan tes dikirim: Tes Pengetahuan Umum, Tes Teknis Operator', ADM, 'Tes'), h('2026-09-30', 'Lanjut interview: jadwal 1 Okt 2026, 09.00', ADM, 'Interview'), h('2026-10-01', 'Nilai User 80 diinput', 'Hendra Gunawan'), h('2026-10-01', 'Nilai HR 84 diinput'), h('2026-10-02', 'Penawaran dibuat dan diajukan', ADM, 'Penawaran'), h('2026-10-02', 'Penawaran disetujui', 'Lestari Wulandari'), h('2026-10-03', 'Penawaran dikirim ke kandidat'), h('2026-10-06', 'Kandidat menerima penawaran', ADM, 'Diterima'), h('2026-10-20', 'Draft Pegawai dibuat')],
    offerId: 'OFR-1',
  }),
  mk({
    id: 'LMR-2026-0142', nama: 'Sari Wulandari', posisi: 'Admin PPIC', dept: 'PPIC', sumber: 'Website', applyDate: '2026-09-22', stage: 'Ditolak',
    phone: '0896-5521-4403', email: 'sari.wulandari@email.com', ktp: '3671085208980004', tempatLahir: 'Tangerang', tanggalLahir: '1998-08-12', gender: 'Perempuan', pernikahan: 'Belum Menikah', tanggungan: 0,
    alamatKtp: 'Jl. Gatot Subroto No. 88, Kota Tangerang', darurat: { nama: 'Wulan', hubungan: 'Kakak', hp: '089655214000' },
    pendidikan: [edu('S1', 'Universitas Pamulang', 'Teknik Industri', '2021', '3,10')], pengalaman: [], belumBekerja: true, skills: ['Microsoft Office'],
    docs: docs('Sari Wulandari', ALL_DOCS, '2026-09-23'),
    interview: { tanggal: '2026-09-29', jam: '10.00', lokasi: 'Ruang Meeting PPIC', userNik: 'PPI-2018-0022', userNama: 'Dian Puspitasari', hrNama: 'Admin HRD' },
    userScore: 56, hrScore: 60, userCatatan: 'Pemahaman proses PPIC masih dasar.', notes: 'Pemahaman proses PPIC masih dasar.',
    rejectReason: 'Nilai interview di bawah ambang 65', stageSebelum: 'Interview',
    history: [h('2026-09-22', 'Lamaran diterima (Website)', 'Pelamar', 'Seleksi Administrasi'), h('2026-09-23', 'Dokumen terverifikasi lengkap'), h('2026-09-24', 'Undangan tes dikirim: Tes Pengetahuan Umum, Psikotes', ADM, 'Tes'), h('2026-09-28', 'Lanjut interview: jadwal 29 Sep 2026, 10.00', ADM, 'Interview'), h('2026-09-29', 'Nilai User 56 diinput', 'Dian Puspitasari'), h('2026-09-29', 'Nilai HR 60 diinput'), h('2026-10-01', 'Ditolak: Nilai interview di bawah ambang 65', ADM, 'Ditolak')],
  }),
  mk({
    id: 'LMR-2026-0141', nama: 'Budi Hartono', posisi: 'Teknisi Mekanik', dept: 'Maintenance', sumber: 'Jobstreet', applyDate: '2026-09-20', stage: 'Ditolak',
    phone: '0831-7742-9960', email: 'budi.hartono@email.com', ktp: '3603140112920001', tempatLahir: 'Tangerang', tanggalLahir: '1992-12-01', gender: 'Laki-laki', pernikahan: 'Menikah', tanggungan: 2,
    alamatKtp: 'Jl. Raya Curug No. 15, Kab. Tangerang', darurat: { nama: 'Sumiati', hubungan: 'Istri', hp: '083177429000' },
    pendidikan: [edu('SMK', 'SMK Teknik Listrik Tangerang', 'Teknik Listrik', '2010', '75,0')], pengalaman: [exp('Bengkel Jaya Motor', 'Mekanik', '2011-02-01', '2026-07-31', 'Bengkel tutup')], skills: ['Perawatan mesin'],
    docs: docs('Budi Hartono', [['cv'], ['ktp'], ['ijazah', 'Ditolak', 'Dokumen ijazah tidak sesuai persyaratan'], ['foto']], '2026-09-23'),
    rejectReason: 'Dokumen ijazah tidak sesuai persyaratan', stageSebelum: 'Seleksi Administrasi',
    history: [h('2026-09-20', 'Lamaran diterima (Jobstreet)', 'Pelamar', 'Seleksi Administrasi'), h('2026-09-23', 'Ijazah ditolak: Dokumen ijazah tidak sesuai persyaratan'), h('2026-09-23', 'Ditolak: Dokumen ijazah tidak sesuai persyaratan', ADM, 'Ditolak')],
  }),
]
export const candidateOf = (id: string) => CANDIDATES.find((c) => c.id === id)

/* ---------- turunan ---------- */
export const avg = (c: Candidate) => (c.userScore != null && c.hrScore != null ? Math.round((c.userScore + c.hrScore) / 2) : null)
export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

/** Tahap terjauh yang pernah dicapai (kumulatif): dipakai funnel, tidak menyusut saat kandidat ditolak atau maju. */
export function reachedIndex(c: Candidate): number {
  let m = FLOW.indexOf(c.stage)
  for (const x of c.history) if (x.stage) m = Math.max(m, FLOW.indexOf(x.stage))
  return m
}
export const reachedStage = (c: Candidate, s: Stage) => reachedIndex(c) >= FLOW.indexOf(s)
/** Cacah funnel kumulatif: kandidat yang pernah mencapai tiap tahap. */
export function funnel(list: Candidate[] = CANDIDATES): Record<(typeof FLOW)[number], number> {
  return Object.fromEntries(FLOW.map((s) => [s, list.filter((c) => reachedStage(c, s)).length])) as Record<(typeof FLOW)[number], number>
}

export function ageOn(tanggalLahir: string, onIso: string) {
  if (!tanggalLahir) return 0
  const [by, bm, bd] = tanggalLahir.split('-').map(Number)
  const [y, m, d] = onIso.split('-').map(Number)
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}
