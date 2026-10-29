import { digitsOnly, formatError, type FormatKey } from '@/lib/validators'
import { DEMO_TODAY } from '@/lib/today'
import { formatDate } from '@/lib/format'
import { PTKP_LIST } from '@/data/payroll/statutory'
import { type Candidate } from '@/data/candidates'
import type { Offer } from '@/data/recruitment/offers'
import { LEVEL_DEFS, KELOMPOK_LIST, type Kelompok } from '@/data/master/levels'
import { kelompokFor, STATUS_KERJA as STATUS_LIST, type Jenis } from '@/data/master/jenis'
import { departmentNodes, sectionNodesOf } from '@/data/master/organization'
import { POSITIONS } from '@/data/master/positions'
import { applyJenis, generateRoster, withMeta } from '@/data/roster-gen'

export type Education = { jenjang: string; institusi: string; jurusan: string; tahun: string }

export type DraftForm = {
  nama: string
  ktp: string
  tempatLahir: string
  tanggalLahir: string
  gender: string
  pernikahan: string
  hp: string
  email: string
  alamatKtp: string
  alamatDomisili: string
  daruratNama: string
  daruratHubungan: string
  daruratHp: string
  pendidikan: Education[]
  department: string
  section: string
  posisi: string
  level: string
  jenis: string
  statusKerja: string
  kelompok: string
  tanggalMasuk: string
  tanggalAkhir: string
  npwp: string
  ptkp: string
  bpjsKes: string
  bpjsTk: string
  bank: string
  rekening: string
  rekeningNama: string
  /** Disalin dari penawaran yang disetujui saat Generate Data Pegawai (hanya HR yang melihat nominalnya). */
  penawaran?: { olNo: string; grade: string; durasi: number; gajiPokok: number; tunjangan: number; makan: number; transport: number }
}

export type DraftRecord = {
  form: DraftForm
  status: 'draft' | 'aktif'
  nik?: string
  activatedAt?: string
  /** 'langsung' = dibuat dari Direktori tanpa rekrutmen (outsourcing, magang, pindahan). */
  source?: 'langsung'
  createdAt?: string
}

export const ANDI_ID = 'LMR-2026-0143'

export const departments = () => departmentNodes().filter((d) => d.status === 'Aktif').map((d) => d.nama)
export const sectionNames = (dept: string) => sectionNodesOf(dept).filter((x) => x.status === 'Aktif').map((x) => x.nama)

export function posisiOptions(dept: string, section: string): string[] {
  return POSITIONS.filter(
    (p) => p.status === 'Aktif' && (!p.department || p.department === dept) && (!section || !p.section || p.section === section),
  ).map((p) => p.nama)
}

export const levels = () => LEVEL_DEFS.filter((l) => l.status === 'Aktif').map((l) => l.nama)
export const STATUS_KERJA = STATUS_LIST
export const KELOMPOK = KELOMPOK_LIST
export const PTKP = PTKP_LIST
export const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata']

export type RequiredKey =
  | 'department'
  | 'section'
  | 'posisi'
  | 'level'
  | 'jenis'
  | 'statusKerja'
  | 'kelompok'
  | 'tanggalMasuk'
  | 'tanggalAkhir'

export const REQUIRED_ORDER: RequiredKey[] = [
  'department',
  'section',
  'posisi',
  'level',
  'jenis',
  'statusKerja',
  'kelompok',
  'tanggalMasuk',
  'tanggalAkhir',
]

const REQUIRED_MESSAGES: Record<RequiredKey, string> = {
  department: 'Department wajib dipilih',
  section: 'Section wajib dipilih',
  posisi: 'Posisi wajib dipilih',
  level: 'Level wajib dipilih',
  jenis: 'Jenis Karyawan wajib dipilih',
  statusKerja: 'Status Kerja wajib dipilih',
  kelompok: 'Group Kerja wajib dipilih',
  tanggalMasuk: 'Tanggal Masuk wajib diisi',
  tanggalAkhir: 'Tanggal Berakhir Kontrak wajib diisi',
}

export function emptyRequired(f: DraftForm): RequiredKey[] {
  return REQUIRED_ORDER.filter((k) => {
    if (k === 'tanggalAkhir' && f.statusKerja !== 'Kontrak') return false
    return !f[k]
  })
}

/** Field Personal yang wajib untuk draft "Input langsung" (tidak ada lamaran yang disalin). */
export const PERSONAL_REQUIRED = [
  'nama', 'ktp', 'tempatLahir', 'tanggalLahir', 'gender', 'pernikahan', 'hp', 'alamatKtp', 'daruratNama', 'daruratHubungan', 'daruratHp',
] as const
export type PersonalKey = (typeof PERSONAL_REQUIRED)[number]
export const PERSONAL_MESSAGES: Record<PersonalKey, string> = {
  nama: 'Nama lengkap wajib diisi',
  ktp: 'NIK (KTP) wajib diisi',
  tempatLahir: 'Tempat lahir wajib diisi',
  tanggalLahir: 'Tanggal lahir wajib diisi',
  gender: 'Jenis kelamin wajib dipilih',
  pernikahan: 'Status pernikahan wajib dipilih',
  hp: 'Nomor HP wajib diisi',
  alamatKtp: 'Alamat sesuai KTP wajib diisi',
  daruratNama: 'Nama kontak darurat wajib diisi',
  daruratHubungan: 'Hubungan kontak darurat wajib diisi',
  daruratHp: 'Nomor HP kontak darurat wajib diisi',
}
export const emptyPersonal = (f: DraftForm): PersonalKey[] => PERSONAL_REQUIRED.filter((k) => !String(f[k]).trim())

export function validate(f: DraftForm): Partial<Record<RequiredKey, string>> {
  const errors: Partial<Record<RequiredKey, string>> = {}
  for (const k of emptyRequired(f)) errors[k] = REQUIRED_MESSAGES[k]
  if (f.statusKerja === 'Kontrak' && f.tanggalAkhir) {
    if (f.tanggalAkhir <= DEMO_TODAY) errors.tanggalAkhir = 'Tanggal berakhir kontrak harus setelah hari ini'
    else if (f.tanggalMasuk && f.tanggalAkhir <= f.tanggalMasuk)
      errors.tanggalAkhir = 'Tanggal berakhir kontrak harus setelah Tanggal Masuk'
  }
  return errors
}

/** Group Kerja default dari Jenis Karyawan, Level, dan Posisi (lihat `kelompokFor`). */
export const defaultKelompok = (level: string, jenis = 'Organik', posisi = '', date: string = DEMO_TODAY): Kelompok => kelompokFor(jenis, level, posisi, date)
export const levelDefaultOf = (posisi: string) => POSITIONS.find((p) => p.nama === posisi)?.level ?? ''

/**
 * Keadaan kontrak dari Transaksi Kepegawaian yang sudah Disetujui tetapi belum berlaku (diisi `data/transactions.ts`):
 * `ext` = tanggal berakhir kontrak baru (Perpanjangan), `tetapFrom` = tanggal efektif Pengangkatan Tetap,
 * `handled` = pegawai sudah ditangani sehingga keluar dari daftar "Kontrak ≤ 45 hari", `pending` = ada pengajuan menunggu approval.
 */
export type ContractFlag = { ext?: string; tetapFrom?: string; handled?: boolean; pending?: 'Perpanjangan diajukan' | 'Pengangkatan diajukan' }
export const CONTRACT_FLAGS: Record<string, ContractFlag> = {}
export const contractHandled = (nik: string) => !!CONTRACT_FLAGS[nik]?.handled
export const contractPending = (nik: string) => CONTRACT_FLAGS[nik]?.pending

/** Pegawai Kontrak yang pengakhiran kontraknya sedang diproses (Pegawai Keluar › Habis Kontrak): 'diajukan' = menunggu approval, 'diproses' = disetujui. */
export const CONTRACT_ENDING: Record<string, 'diajukan' | 'diproses'> = {}
export const contractEnding = (nik: string) => CONTRACT_ENDING[nik]

/**
 * Permintaan yang memengaruhi jadwal (cuti/izin/sakit/dinas, tukar shift, SPL) untuk pegawai Kontrak tidak boleh
 * melewati Tanggal Berakhir Kontrak. Mengembalikan pesan galat atau string kosong.
 * Perpanjangan yang sudah Disetujui langsung memperpanjang batas; Pengangkatan Tetap menghapus batas sejak tanggal efektifnya.
 */
export function contractEndError(e: { nik?: string; nama: string; statusKerja: string; tanggalAkhir?: string }, date: string): string {
  if (e.statusKerja !== 'Kontrak' || !e.tanggalAkhir || !date) return ''
  const flag = e.nik ? CONTRACT_FLAGS[e.nik] : undefined
  if (flag?.tetapFrom && date >= flag.tetapFrom) return ''
  const end = flag?.ext && flag.ext > e.tanggalAkhir ? flag.ext : e.tanggalAkhir
  return date > end ? `Melewati tanggal berakhir kontrak ${e.nama} (${formatDate(end)}).` : ''
}

export function daysFromToday(iso: string): number {
  const ms = (s: string) => Date.parse(`${s}T00:00:00Z`)
  return Math.round((ms(iso) - ms(DEMO_TODAY)) / 86_400_000)
}

export const CONTRACT_WARN_DAYS = 45

const blankTax = { npwp: '', ptkp: '', bpjsKes: '', bpjsTk: '', bank: '', rekening: '', rekeningNama: '' }
const blankWork = { section: '', level: '', jenis: '', statusKerja: '', kelompok: '', tanggalMasuk: '', tanggalAkhir: '' }

/** Isi Level dari Posisi (lalu Kelompok Kerja dari Level) hanya bila masih kosong; isian manual HRD tidak ditimpa. */
export function fillLevelDefaults(f: DraftForm): DraftForm {
  if (!f.posisi || f.level) return f
  const level = levelDefaultOf(f.posisi)
  if (!level) return f
  return { ...f, level, kelompok: f.kelompok || defaultKelompok(level, f.jenis || 'Organik', f.posisi) }
}

/** Draft kosong untuk pegawai yang masuk tanpa rekrutmen. */
export function makeBlankRecord(createdAt: string): DraftRecord {
  return {
    status: 'draft',
    source: 'langsung',
    createdAt,
    form: {
      nama: '', ktp: '', tempatLahir: '', tanggalLahir: '', gender: '', pernikahan: '', hp: '', email: '',
      alamatKtp: '', alamatDomisili: '', daruratNama: '', daruratHubungan: '', daruratHp: '', pendidikan: [],
      department: '', posisi: '', ...blankWork, ...blankTax,
    },
  }
}

/** Hari terakhir kontrak yang dimulai `mulai` selama `bulan` bulan (sama dengan contractEnd di contracts.ts; dihitung lokal agar tidak ada impor melingkar). */
function contractEndOf(mulai: string, bulan: number) {
  const [y, m, d] = mulai.split('-').map(Number)
  const first = Date.UTC(y, m - 1 + bulan, 1)
  const last = new Date(Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth() + 1, 0)).getUTCDate()
  const start = Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth(), Math.min(d, last))
  return new Date(start - 86_400_000).toISOString().slice(0, 10)
}

/** Draft dari lamaran: biodata kandidat disalin; data penawaran yang disetujui ikut disalin bila Generate Data Pegawai sudah dijalankan. */
export function makeRecord(c: Candidate, offer?: Offer): DraftRecord {
  const copy = !!c.salinPenawaran && !!offer
  const work = copy
    ? {
        department: c.dept,
        posisi: offer.posisi,
        level: offer.level,
        jenis: offer.jenis,
        statusKerja: offer.statusKerja,
        kelompok: defaultKelompok(offer.level, offer.jenis, offer.posisi),
        tanggalMasuk: offer.tanggalMulai,
        tanggalAkhir: offer.statusKerja === 'Kontrak' && offer.durasi > 0 ? contractEndOf(offer.tanggalMulai, offer.durasi) : '',
        penawaran: { olNo: offer.olNo, grade: offer.grade, durasi: offer.durasi, gajiPokok: offer.gajiPokok, tunjangan: offer.tunjangan, makan: offer.makan, transport: offer.transport },
      }
    : {}
  const rec: DraftRecord = {
    status: 'draft',
    form: {
      nama: c.nama,
      ktp: c.ktp,
      tempatLahir: c.tempatLahir,
      tanggalLahir: c.tanggalLahir,
      gender: c.gender,
      pernikahan: c.pernikahan,
      hp: digitsOnly(c.phone),
      email: c.email,
      alamatKtp: c.alamatKtp,
      alamatDomisili: c.alamatDomisili,
      daruratNama: c.darurat.nama,
      daruratHubungan: c.darurat.hubungan,
      daruratHp: c.darurat.hp,
      pendidikan: c.pendidikan.map(({ jenjang, institusi, jurusan, tahun }) => ({ jenjang, institusi, jurusan, tahun })),
      department: c.dept,
      posisi: c.posisi,
      ...blankWork,
      ...blankTax,
      ...work,
    },
  }
  return { ...rec, form: fillLevelDefaults(rec.form) }
}

const NIK_BY_ID: Record<string, string> = {
  'LMR-2026-0143': 'PPI-2026-0042',
  'LMR-2026-0144': 'PPI-2026-0043',
}

export function nikFor(id: string, taken: string[]): string {
  if (NIK_BY_ID[id]) return NIK_BY_ID[id]
  const used = new Set([...taken, ...Object.values(NIK_BY_ID)])
  let n = 44
  while (used.has(`PPI-2026-${String(n).padStart(4, '0')}`)) n++
  return `PPI-2026-${String(n).padStart(4, '0')}`
}

export function acceptedDate(c: Candidate): string {
  return c.history.find((h) => h.label === 'Diterima')?.date ?? c.applyDate
}

export const FORMAT_FIELDS = ['ktp', 'hp', 'email', 'daruratHp', 'npwp', 'bpjsKes', 'bpjsTk', 'rekening'] as const
export type FormatField = (typeof FORMAT_FIELDS)[number]

export const FORMAT_RULE: Record<FormatField, FormatKey> = {
  ktp: 'ktp',
  hp: 'hp',
  email: 'email',
  daruratHp: 'hp',
  npwp: 'npwp',
  bpjsKes: 'bpjsKes',
  bpjsTk: 'bpjsTk',
  rekening: 'rekening',
}

export const FORMAT_TAB: Record<FormatField, 'personal' | 'tax'> = {
  ktp: 'personal',
  hp: 'personal',
  email: 'personal',
  daruratHp: 'personal',
  npwp: 'tax',
  bpjsKes: 'tax',
  bpjsTk: 'tax',
  rekening: 'tax',
}

export function formatErrors(f: DraftForm): Partial<Record<FormatField, string>> {
  const out: Partial<Record<FormatField, string>> = {}
  for (const k of FORMAT_FIELDS) {
    const e = formatError(FORMAT_RULE[k], f[k])
    if (e) out[k] = e
  }
  return out
}

export type ShiftId = 'pagi' | 'siang' | 'malam' | 'nonshift'

export type RosterEmployee = {
  nik: string
  nama: string
  department: string
  shift: ShiftId
  kelompok: Kelompok
  pin?: string
  section?: string
  tanggalMasuk: string
  atasanId: string
  gajiPokok: number
  tunjanganTetap: number
  sec: string
  posisi: string
  level: string
  grade: string
  /** Jenis Karyawan; kosong dianggap Organik. */
  jenis?: Jenis
  statusKerja: string
  tanggalAkhir?: string
  /** Nilai sebelum klasifikasi Jenis/Group (dipakai periode payroll lama yang sudah tersimpan). */
  legacy?: { posisi: string; level: string; kelompok: Kelompok; gajiPokok: number }
  /** Status PTKP per 1 Januari tahun berjalan (TK/0 … K/3). */
  ptkp: string
  bank: string
  /** Nomor rekening lengkap; di layar payroll hanya 4 digit terakhir yang ditampilkan. */
  nomorRekening: string
  gen?: boolean
}

type NamedRow = Omit<RosterEmployee, 'sec' | 'posisi' | 'level' | 'grade' | 'statusKerja' | 'tanggalAkhir' | 'ptkp' | 'bank' | 'nomorRekening'>
const NAMED_ROWS: NamedRow[] = [
  { nik: 'PPI-2024-0112', nama: 'Rizky Pratama', department: 'Produksi', shift: 'pagi', kelompok: 'Non Staff', pin: '1012', section: 'Injection', tanggalMasuk: '2024-03-15', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2024-0093', nama: 'Yusuf Maulana', department: 'Produksi', shift: 'pagi', kelompok: 'Non Staff', pin: '1019', section: 'Injection', tanggalMasuk: '2024-02-02', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2025-0034', nama: 'Dedi Kurniawan', department: 'Warehouse', shift: 'pagi', kelompok: 'Staff', pin: '1027', tanggalMasuk: '2025-05-20', atasanId: 'PPI-2017-0004', gajiPokok: 6300000, tunjanganTetap: 500000 },
  { nik: 'PPI-2023-0102', nama: 'Fitri Handayani', department: 'Quality Assurance', shift: 'pagi', kelompok: 'Staff', pin: '1033', tanggalMasuk: '2023-08-14', atasanId: 'PPI-2018-0011', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2022-0033', nama: 'Agung Wibowo', department: 'Maintenance', shift: 'pagi', kelompok: 'Staff', pin: '1038', tanggalMasuk: '2022-05-09', atasanId: 'PPI-2019-0015', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2023-0088', nama: 'Eko Prasetyo', department: 'Produksi', shift: 'pagi', kelompok: 'Non Staff', pin: '1041', section: 'Injection', tanggalMasuk: '2023-04-10', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2024-0127', nama: 'Siti Nurhaliza', department: 'Quality Assurance', shift: 'siang', kelompok: 'Non Staff', pin: '1051', section: 'Final QC', tanggalMasuk: '2024-02-12', atasanId: 'PPI-2018-0011', gajiPokok: 5300000, tunjanganTetap: 0 },
  { nik: 'PPI-2022-0045', nama: 'Wahyu Hidayat', department: 'Produksi', shift: 'siang', kelompok: 'Non Staff', pin: '1056', section: 'Injection', tanggalMasuk: '2022-03-21', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2023-0110', nama: 'Sri Mulyani', department: 'Warehouse', shift: 'siang', kelompok: 'Staff', pin: '1062', tanggalMasuk: '2023-06-05', atasanId: 'PPI-2017-0004', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2025-0068', nama: 'Bayu Setiawan', department: 'Maintenance', shift: 'malam', kelompok: 'Non Staff', pin: '1045', tanggalMasuk: '2025-12-08', atasanId: 'PPI-2019-0015', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2021-0019', nama: 'Joko Susilo', department: 'Produksi', shift: 'malam', kelompok: 'Non Staff', pin: '1068', section: 'Injection', tanggalMasuk: '2021-11-01', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2025-0051', nama: 'Anisa Rahmawati', department: 'PPIC', shift: 'nonshift', kelompok: 'Staff', pin: '1074', tanggalMasuk: '2025-07-02', atasanId: 'PPI-2018-0022', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2024-0076', nama: 'Ratna Dewi', department: 'Finance', shift: 'nonshift', kelompok: 'Staff', pin: '1079', tanggalMasuk: '2024-06-17', atasanId: 'PPI-2017-0009', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2022-0061', nama: 'Arif Rahman', department: 'Engineering', shift: 'nonshift', kelompok: 'Staff', pin: '1085', tanggalMasuk: '2022-03-14', atasanId: 'PPI-2018-0013', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2025-0071', nama: 'Lukman Hakim', department: 'Produksi', shift: 'pagi', kelompok: 'Non Staff', section: 'Injection', tanggalMasuk: '2025-02-10', atasanId: 'PPI-2019-0007', gajiPokok: 5200000, tunjanganTetap: 0 },
  { nik: 'PPI-2025-0079', nama: 'Maya Kusuma', department: 'Finance', shift: 'nonshift', kelompok: 'Staff', tanggalMasuk: '2025-04-07', atasanId: 'PPI-2017-0009', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2024-0058', nama: 'Taufik Hidayat', department: 'IT', shift: 'nonshift', kelompok: 'Staff', tanggalMasuk: '2024-01-15', atasanId: 'manager', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2023-0091', nama: 'Dewi Lestari', department: 'HR & GA', shift: 'nonshift', kelompok: 'Staff', tanggalMasuk: '2023-09-04', atasanId: 'manager', gajiPokok: 6500000, tunjanganTetap: 1000000 },
  { nik: 'PPI-2019-0007', nama: 'Hendra Gunawan', department: 'Produksi', shift: 'pagi', kelompok: 'Staff', pin: '1001', section: 'Injection', tanggalMasuk: '2019-01-07', atasanId: 'PPI-2016-0002', gajiPokok: 8500000, tunjanganTetap: 1500000 },
]

const NAMED = (NAMED_ROWS as RosterEmployee[]).map(withMeta)
export const ROSTER: RosterEmployee[] = [...NAMED, ...generateRoster(NAMED)]
applyJenis(ROSTER)
export const CORE = ROSTER.filter((e) => !e.gen)

export type Supervisor = { id: string; nama: string; jabatan: string }
export const SUPERVISORS: Supervisor[] = [
  { id: 'PPI-2019-0007', nama: 'Hendra Gunawan', jabatan: 'Supervisor Produksi' },
  { id: 'PPI-2018-0011', nama: 'Ratih Kusuma', jabatan: 'Supervisor QA' },
  { id: 'PPI-2017-0004', nama: 'Bambang Hermawan', jabatan: 'Supervisor Warehouse' },
  { id: 'PPI-2019-0015', nama: 'Teguh Santoso', jabatan: 'Supervisor Maintenance' },
  { id: 'PPI-2018-0022', nama: 'Dian Puspitasari', jabatan: 'Kepala PPIC' },
  { id: 'PPI-2017-0009', nama: 'Yohanes Kristanto', jabatan: 'Kepala Finance' },
  { id: 'PPI-2018-0013', nama: 'Rudi Hartanto', jabatan: 'Kepala Engineering' },
  { id: 'PPI-2018-0017', nama: 'Fajar Ramadhan', jabatan: 'Kepala IT' },
  { id: 'PPI-2017-0012', nama: 'Nina Marlina', jabatan: 'Kepala Purchasing' },
  { id: 'PPI-2019-0009', nama: 'Dimas Prakoso', jabatan: 'Supervisor Blow Molding' },
  { id: 'PPI-2018-0008', nama: 'Slamet Riyadi', jabatan: 'Supervisor Extrusion' },
  { id: 'PPI-2020-0014', nama: 'Yanti Lestari', jabatan: 'Supervisor Printing' },
  { id: 'PPI-2016-0002', nama: 'Agus Setiadi', jabatan: 'Manager Produksi' },
  { id: 'PPI-2015-0001', nama: 'Wahyudi Santoso', jabatan: 'Plant Manager' },
  { id: 'manager', nama: 'Lestari Wulandari', jabatan: 'Manager HR & GA' },
  { id: 'direksi', nama: 'Direksi', jabatan: 'Direksi' },
]
export const atasanOf = (e: RosterEmployee) => SUPERVISORS.find((x) => x.id === e.atasanId)!
/** Pegawai yang sendiri menjadi atasan/approver: pengajuannya naik satu tingkat ke atasannya. */
export const isApprover = (nik: string) => SUPERVISORS.some((s) => s.id === nik)
/** "Agus Setiadi (Manager Produksi)": selalu nama orang, jabatan di dalam kurung. */
export const supervisorLabel = (s: Supervisor | undefined) => (s ? `${s.nama} (${s.jabatan.replace(/^Manager HR & GA$/, 'HR & GA Manager')})` : '—')

export function ensureSupervisor(nik: string, jabatan: string) {
  if (nik === 'manager' || SUPERVISORS.some((s) => s.id === nik)) return
  const e = ROSTER.find((x) => x.nik === nik)
  if (e) SUPERVISORS.push({ id: nik, nama: e.nama, jabatan })
}
