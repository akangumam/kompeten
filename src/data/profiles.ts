import { jenisOf } from '@/data/master/jenis'
import { ROSTER, type DraftForm, type DraftRecord, type Education, type RosterEmployee } from '@/data/employees'
import { orgById } from '@/data/master/organization'
import { applyPay } from '@/data/roster-gen'

/** Profil lengkap (personal, kontak, pendidikan, kepegawaian, pajak) untuk setiap pegawai roster. Deterministik per NIP. */

const hash = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return x >>> 0
}
const stream = (seed: string) => {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FEMALE = new Set([
  'Dewi', 'Endang', 'Fitria', 'Gita', 'Hesti', 'Indah', 'Jumiati', 'Kartika', 'Laila', 'Mega', 'Novi', 'Okta', 'Putri', 'Rina', 'Sinta',
  'Tuti', 'Umi', 'Vina', 'Wulan', 'Yuni', 'Siti', 'Sri', 'Fitri', 'Anisa', 'Ratna', 'Maya', 'Ratih', 'Lestari', 'Dian', 'Nina', 'Yanti',
  'Desi',
])
const CITIES = ['Tangerang', 'Bekasi', 'Bogor', 'Serang', 'Jakarta', 'Bandung', 'Karawang', 'Cirebon', 'Garut', 'Purwakarta', 'Cilegon', 'Depok', 'Subang', 'Sukabumi']
const STREETS = ['Jl. Raya Serang', 'Jl. Pahlawan', 'Jl. Merdeka', 'Jl. Kenanga', 'Jl. Melati', 'Jl. Cendrawasih', 'Jl. Dr. Soetomo', 'Jl. Imam Bonjol', 'Jl. Veteran', 'Jl. Mawar']
const DISTRICTS = ['Cikupa', 'Balaraja', 'Cikarang Barat', 'Tambun Selatan', 'Jatiuwung', 'Cibitung', 'Citeureup', 'Kosambi', 'Curug', 'Pasar Kemis']
const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI']
const HP_PREFIX = ['12', '13', '21', '52', '57', '78', '56', '38']
const KINS: [string, boolean][] = [['Ayah', false], ['Ibu', true], ['Suami', false], ['Istri', true], ['Kakak', true], ['Adik', false]]
const SMA_MAJORS = ['Teknik Pemesinan', 'Teknik Otomotif', 'Teknik Elektro', 'IPA', 'IPS', 'Teknik Kimia Industri', 'Akuntansi']
const UNI_MAJORS: Record<string, string[]> = {
  Finance: ['Akuntansi', 'Manajemen'],
  'HR & GA': ['Psikologi', 'Manajemen'],
  IT: ['Teknik Informatika', 'Sistem Informasi'],
  Engineering: ['Teknik Industri', 'Teknik Mesin'],
  PPIC: ['Teknik Industri', 'Manajemen'],
  Purchasing: ['Manajemen', 'Administrasi Bisnis'],
}
const UNIS = ['Universitas Bhayangkara Jakarta Raya', 'Universitas Pamulang', 'Universitas Islam 45 Bekasi', 'Universitas Pelita Bangsa', 'Politeknik Negeri Jakarta', 'Universitas Buana Perjuangan Karawang', 'Universitas Mercu Buana']

const pad = (n: number, w: number) => String(n).padStart(w, '0')
const slug = (n: string) => n.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')

export type ProfileOverrides = Partial<Pick<DraftForm, 'tanggalLahir'>>

/** Tanggal lahir pegawai yang didekatkan ke usia pensiun (Bambang Hermawan, Slamet Riyadi). */
const BIRTH_SEED: Record<string, string> = { 'PPI-2017-0004': '1972-02-12', 'PPI-2018-0008': '1972-04-03' }
export const birthOf = (e: RosterEmployee) => rosterForm(e).tanggalLahir

export function rosterForm(e: RosterEmployee, over: ProfileOverrides = {}): DraftForm {
  const r = stream(e.nik)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const female = FEMALE.has(e.nama.split(' ')[0])
  const masukY = Number(e.tanggalMasuk.slice(0, 4))

  const ageAtMasuk = (e.level === 'Manager' ? 34 : e.level === 'Supervisor' ? 29 : e.level === 'Operator' ? 20 : 22) + Math.floor(r() * 8)
  const birthY = masukY - ageAtMasuk
  const bm = 1 + Math.floor(r() * 12)
  const bd = 1 + Math.floor(r() * 28)
  const tanggalLahir = over.tanggalLahir ?? BIRTH_SEED[e.nik] ?? `${birthY}-${pad(bm, 2)}-${pad(bd, 2)}`
  const [by, bmo, bda] = tanggalLahir.split('-').map(Number)
  const age = 2026 - by

  const ktp = `32${pad(Math.floor(r() * 90) + 1, 2)}${pad(Math.floor(r() * 30) + 1, 2)}${pad(bda + (female ? 40 : 0), 2)}${pad(bmo, 2)}${pad(by % 100, 2)}${pad(Math.floor(r() * 9000) + 1, 4)}`
  // Status pernikahan mengikuti PTKP (satu sumber: data payroll pegawai).
  const pernikahan = e.ptkp.startsWith('K/') ? 'Menikah' : e.ptkp === 'TK/0' ? 'Belum Menikah' : 'Cerai'

  const city = pick(CITIES)
  const alamatKtp = `${pick(STREETS)} No. ${1 + Math.floor(r() * 120)}, ${pick(DISTRICTS)}, ${city}`
  const alamatDomisili = r() < 0.6 ? alamatKtp : `${pick(STREETS)} No. ${1 + Math.floor(r() * 120)}, ${pick(DISTRICTS)}, Kab. Tangerang`

  const kins = KINS.filter(([k]) => (pernikahan === 'Menikah' ? k !== (female ? 'Istri' : 'Suami') : k !== 'Suami' && k !== 'Istri'))
  const [kin, kinFemale] = pick(kins)
  const kinName = `${pick(kinFemale ? ['Siti', 'Sri', 'Endang', 'Rahma', 'Nurul', 'Wati'] : ['Budi', 'Slamet', 'Agus', 'Hendra', 'Joko', 'Suryadi'])} ${e.nama.split(' ').slice(-1)[0]}`
  const hp = () => `08${pick(HP_PREFIX)}${pad(Math.floor(r() * 1e8), 8)}`

  const dept = e.department
  const major = pick(UNI_MAJORS[dept] ?? ['Teknik Industri'])
  const pendidikan: Education[] = []
  const gradY = Math.min(by + 18, masukY - 1)
  const smk = e.level === 'Operator' || e.level === 'Leader'
  pendidikan.push({
    jenjang: smk ? (r() < 0.7 ? 'SMK' : 'SMA') : 'SMA',
    institusi: `${smk && r() < 0.7 ? 'SMK' : 'SMA'} Negeri ${1 + Math.floor(r() * 5)} ${city}`,
    jurusan: pick(SMA_MAJORS),
    tahun: String(gradY),
  })
  if (e.level === 'Staff' || e.level === 'Supervisor' || e.level === 'Manager') {
    const d3 = e.level === 'Staff' && r() < 0.3
    pendidikan.push({ jenjang: d3 ? 'D3' : 'S1', institusi: pick(UNIS), jurusan: major, tahun: String(Math.min(gradY + (d3 ? 3 : 4), masukY - 1)) })
  }
  if (e.level === 'Manager') {
    pendidikan.push({ jenjang: 'S2', institusi: 'Universitas Indonesia', jurusan: 'Manajemen', tahun: String(Math.min(gradY + 7, masukY - 1)) })
  }

  const npwp = `${pad(Math.floor(r() * 1e8), 8)}${pad(Math.floor(r() * 1e7), 7)}`
  const sec = orgById(e.sec)?.nama ?? ''

  return {
    nama: e.nama,
    ktp,
    tempatLahir: city,
    tanggalLahir,
    gender: female ? 'Perempuan' : 'Laki-laki',
    pernikahan,
    hp: hp(),
    email: `${slug(e.nama)}@email.com`,
    alamatKtp,
    alamatDomisili,
    daruratNama: kinName,
    daruratHubungan: kin,
    daruratHp: hp(),
    pendidikan,
    department: e.department,
    section: sec,
    posisi: e.posisi,
    level: e.level,
    jenis: jenisOf(e),
    statusKerja: e.statusKerja,
    kelompok: e.kelompok,
    tanggalMasuk: e.tanggalMasuk,
    tanggalAkhir: e.tanggalAkhir ?? '',
    npwp,
    ptkp: e.ptkp,
    bpjsKes: `000${pad(Math.floor(r() * 1e10), 10)}`,
    bpjsTk: pad(Math.floor(r() * 1e11), 11),
    bank: e.bank,
    rekening: e.nomorRekening,
    rekeningNama: e.nama.toUpperCase(),
  }
}

export type ExitReason = string
export type ExitedEmployee = RosterEmployee & { keluar: { tanggal: string; alasan: ExitReason; keterangan?: string }; lahir?: string }

const exited = (e: Omit<RosterEmployee, 'shift' | 'gajiPokok' | 'tunjanganTetap' | 'kelompok' | 'ptkp' | 'bank' | 'nomorRekening'> & { kelompok: 'Staff' | 'Non Staff'; keluar: ExitedEmployee['keluar']; lahir?: string }): ExitedEmployee =>
  applyPay({ shift: 'pagi', gajiPokok: 5_200_000, tunjanganTetap: 0, ptkp: '', bank: '', nomorRekening: '', ...e })

/** Pegawai yang sudah keluar; tidak termasuk 248 pegawai aktif. */
export const EXITED: ExitedEmployee[] = [
  exited({ nik: 'PPI-2022-0047', nama: 'Ahmad Fauzi', department: 'Produksi', sec: 'SEC-BLW', section: 'Blow Molding', posisi: 'Operator Blow Molding', level: 'Operator', grade: 'G1', kelompok: 'Non Staff', statusKerja: 'Tetap', tanggalMasuk: '2022-03-07', atasanId: 'PPI-2019-0009', keluar: { tanggal: '2026-09-15', alasan: 'Mengundurkan Diri' } }),
  exited({ nik: 'PPI-2025-0019', nama: 'Desi Ratnasari', department: 'Quality Assurance', sec: 'SEC-FQC', section: 'Final QC', posisi: 'QC Inspector', level: 'Operator', grade: 'G1', kelompok: 'Non Staff', statusKerja: 'Kontrak', tanggalMasuk: '2025-10-01', tanggalAkhir: '2026-09-30', atasanId: 'PPI-2018-0011', keluar: { tanggal: '2026-09-30', alasan: 'Habis Kontrak' } }),
  exited({ nik: 'PPI-2001-0004', nama: 'Hadi Susanto', department: 'Maintenance', sec: 'SEC-ELK', section: 'Elektrik', posisi: 'Teknisi Elektrik', level: 'Operator', grade: 'G2', kelompok: 'Staff', statusKerja: 'Tetap', tanggalMasuk: '2001-09-03', atasanId: 'PPI-2019-0015', keluar: { tanggal: '2026-08-31', alasan: 'Pensiun' }, lahir: '1971-08-31' }),
]

// Data Hak Akhir Hadi Susanto (09d): upah dasar Rp 8.000.000 = Gaji Pokok 7.250.000 + Tunjangan Jabatan 750.000; Group Staff (pembagi 21).
Object.assign(EXITED.find((x) => x.nik === 'PPI-2001-0004')!, { gajiPokok: 7_250_000, tunjanganTetap: 750_000 })

/** Rekaman profil pegawai aktif (roster) siap dibuka di halaman Data Pegawai. */
export function rosterRecord(nik: string): DraftRecord | undefined {
  const e = ROSTER.find((x) => x.nik === nik)
  return e ? { status: 'aktif', nik, activatedAt: e.tanggalMasuk, form: rosterForm(e) } : undefined
}

export function exitedRecord(nik: string): { record: DraftRecord; exited: ExitedEmployee } | undefined {
  const e = EXITED.find((x) => x.nik === nik)
  return e ? { exited: e, record: { status: 'aktif', nik, activatedAt: e.tanggalMasuk, form: rosterForm(e, { tanggalLahir: e.lahir }) } } : undefined
}
