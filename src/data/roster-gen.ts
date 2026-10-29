import type { RosterEmployee, ShiftId } from '@/data/employees'
import { DEMO_TODAY } from '@/lib/today'
import { tunjanganAt } from '@/data/payroll/components'
import { GRADES } from '@/data/master/grades'
import { kelompokAt, LEVEL_DEFS } from '@/data/master/levels'
import { kelompokFor } from '@/data/master/jenis'
import { NIK, ORG, SECTION_TARGET, orgById } from '@/data/master/organization'
import { gradeList, positionByName } from '@/data/master/positions'

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ['Ahmad', 'Budi', 'Cahyo', 'Danu', 'Eka', 'Fajar', 'Gilang', 'Hadi', 'Irfan', 'Jaya', 'Kurnia', 'Lutfi', 'Muhamad', 'Nanda', 'Oki', 'Putra', 'Qodir', 'Rendi', 'Surya', 'Teddy', 'Umar', 'Vino', 'Wawan', 'Yoga', 'Zainal', 'Andi', 'Bagas', 'Candra', 'Deni', 'Erwin', 'Dewi', 'Endang', 'Fitria', 'Gita', 'Hesti', 'Indah', 'Jumiati', 'Kartika', 'Laila', 'Mega', 'Novi', 'Okta', 'Putri', 'Rina', 'Sinta', 'Tuti', 'Umi', 'Vina', 'Wulan', 'Yuni']
const LAST = ['Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Pratama', 'Nugroho', 'Hidayat', 'Setiawan', 'Rahman', 'Permana', 'Susanto', 'Firmansyah', 'Maulana', 'Ramadhan', 'Purnomo', 'Wibowo', 'Syahputra', 'Aditya', 'Gunawan', 'Hartono', 'Lestari', 'Wulandari', 'Handayani', 'Puspita', 'Rahayu', 'Anggraini', 'Safitri', 'Utami', 'Fauzi', 'Hakim', 'Kurniawan', 'Prasetyo', 'Suryadi', 'Budiman', 'Siregar', 'Nasution', 'Simanjuntak', 'Lubis', 'Hutapea', 'Siahaan']

const FILL: Record<string, string[]> = {
  'SEC-INJ': ['Operator Injection', 'Operator Injection', 'Operator Injection', 'Operator Injection', 'Operator Injection', 'Operator Injection', 'Leader Injection'],
  'SEC-BLW': ['Operator Blow Molding'],
  'SEC-EXT': ['Operator Extrusion'],
  'SEC-PRT': ['Operator Printing'],
  'SEC-IQC': ['QC Inspector', 'QC Inspector', 'QC Inspector', 'QC Inspector', 'Leader QC'],
  'SEC-IPQC': ['QC Inspector', 'QC Inspector', 'QC Inspector', 'QC Inspector', 'Leader QC'],
  'SEC-FQC': ['QC Inspector', 'QC Inspector', 'QC Inspector', 'QC Inspector', 'Leader QC'],
  'SEC-GBB': ['Staff Gudang'],
  'SEC-GBJ': ['Staff Gudang'],
  'SEC-MEK': ['Teknisi Mekanik'],
  'SEC-ELK': ['Teknisi Elektrik'],
  'SEC-PPIC': ['Admin PPIC'],
  'SEC-ENG': ['Engineer Proses'],
  'SEC-HRGA': ['Staff HR'],
  'SEC-FIN': ['Staff Finance'],
  'SEC-IT': ['IT Support'],
  'SEC-PUR': ['Staff Purchasing'],
}

type Head = { nik: string; nama: string; sec: string; posisi: string; atasan: string; masuk: string; gaji: number }
const HEADS: Head[] = [
  { nik: NIK.wahyudi, nama: 'Wahyudi Santoso', sec: 'SEC-ENG', posisi: 'Plant Manager', atasan: 'direksi', masuk: '2015-03-02', gaji: 17000000 },
  { nik: NIK.agus, nama: 'Agus Setiadi', sec: 'SEC-INJ', posisi: 'Manager Produksi', atasan: NIK.wahyudi, masuk: '2016-02-01', gaji: 14000000 },
  { nik: NIK.lestari, nama: 'Lestari Wulandari', sec: 'SEC-HRGA', posisi: 'Manager HR & GA', atasan: 'direksi', masuk: '2016-04-04', gaji: 14500000 },
  { nik: NIK.ratih, nama: 'Ratih Kusuma', sec: 'SEC-IPQC', posisi: 'Kepala Departemen', atasan: NIK.wahyudi, masuk: '2018-01-15', gaji: 9500000 },
  { nik: NIK.bambang, nama: 'Bambang Hermawan', sec: 'SEC-GBB', posisi: 'Kepala Departemen', atasan: NIK.wahyudi, masuk: '2017-06-12', gaji: 9000000 },
  { nik: NIK.teguh, nama: 'Teguh Santoso', sec: 'SEC-MEK', posisi: 'Kepala Departemen', atasan: NIK.wahyudi, masuk: '2019-02-18', gaji: 9500000 },
  { nik: NIK.dian, nama: 'Dian Puspitasari', sec: 'SEC-PPIC', posisi: 'Kepala Departemen', atasan: NIK.wahyudi, masuk: '2018-05-07', gaji: 9500000 },
  { nik: NIK.rudi, nama: 'Rudi Hartanto', sec: 'SEC-ENG', posisi: 'Kepala Departemen', atasan: NIK.wahyudi, masuk: '2018-03-12', gaji: 10000000 },
  { nik: NIK.yohanes, nama: 'Yohanes Kristanto', sec: 'SEC-FIN', posisi: 'Kepala Departemen', atasan: 'manager', masuk: '2017-02-06', gaji: 10000000 },
  { nik: NIK.fajar, nama: 'Fajar Ramadhan', sec: 'SEC-IT', posisi: 'Kepala Departemen', atasan: 'manager', masuk: '2018-08-20', gaji: 9000000 },
  { nik: NIK.nina, nama: 'Nina Marlina', sec: 'SEC-PUR', posisi: 'Kepala Departemen', atasan: 'manager', masuk: '2017-09-04', gaji: 9000000 },
  { nik: NIK.dimas, nama: 'Dimas Prakoso', sec: 'SEC-BLW', posisi: 'Supervisor Produksi', atasan: NIK.agus, masuk: '2019-04-01', gaji: 8500000 },
  { nik: NIK.slamet, nama: 'Slamet Riyadi', sec: 'SEC-EXT', posisi: 'Supervisor Produksi', atasan: NIK.agus, masuk: '2018-10-08', gaji: 8500000 },
  { nik: NIK.yanti, nama: 'Yanti Lestari', sec: 'SEC-PRT', posisi: 'Supervisor Produksi', atasan: NIK.agus, masuk: '2020-01-13', gaji: 8300000 },
]

export const NAMED_META: Record<string, { sec: string; posisi: string }> = {
  'PPI-2024-0112': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2024-0093': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2023-0088': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2022-0045': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2021-0019': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2025-0071': { sec: 'SEC-INJ', posisi: 'Operator Injection' },
  'PPI-2019-0007': { sec: 'SEC-INJ', posisi: 'Supervisor Produksi' },
  'PPI-2025-0034': { sec: 'SEC-GBB', posisi: 'Staff Gudang' },
  'PPI-2023-0110': { sec: 'SEC-GBJ', posisi: 'Staff Gudang' },
  'PPI-2023-0102': { sec: 'SEC-IPQC', posisi: 'Leader QC' },
  'PPI-2024-0127': { sec: 'SEC-FQC', posisi: 'QC Inspector' },
  'PPI-2022-0033': { sec: 'SEC-MEK', posisi: 'Teknisi Mekanik' },
  'PPI-2025-0068': { sec: 'SEC-ELK', posisi: 'Teknisi Elektrik' },
  'PPI-2025-0051': { sec: 'SEC-PPIC', posisi: 'Admin PPIC' },
  'PPI-2024-0076': { sec: 'SEC-FIN', posisi: 'Staff Finance' },
  'PPI-2025-0079': { sec: 'SEC-FIN', posisi: 'Staff Finance' },
  'PPI-2022-0061': { sec: 'SEC-ENG', posisi: 'Engineer Proses' },
  'PPI-2024-0058': { sec: 'SEC-IT', posisi: 'IT Support' },
  'PPI-2023-0091': { sec: 'SEC-HRGA', posisi: 'Staff HR' },
}

/** Kontrak pegawai bernama; selain ini semua pegawai bernama berstatus Tetap. */
export const NAMED_CONTRACT: Record<string, { statusKerja: string; tanggalAkhir?: string }> = {
  'PPI-2024-0112': { statusKerja: 'Kontrak', tanggalAkhir: '2026-11-04' },
  'PPI-2024-0127': { statusKerja: 'Kontrak', tanggalAkhir: '2026-11-12' },
  'PPI-2025-0034': { statusKerja: 'Kontrak', tanggalAkhir: '2026-11-20' },
  'PPI-2025-0051': { statusKerja: 'Kontrak', tanggalAkhir: '2026-11-28' },
  'PPI-2025-0068': { statusKerja: 'Kontrak', tanggalAkhir: '2026-12-07' },
  'PPI-2025-0071': { statusKerja: 'Kontrak', tanggalAkhir: '2027-02-09' },
}

/** Data payroll pegawai bernama (PTKP, bank, 4 digit terakhir rekening). */
const NAMED_PAY: Record<string, { ptkp: string; bank: string; rek4: string }> = {
  'PPI-2024-0112': { ptkp: 'TK/0', bank: 'BCA', rek4: '4521' },
  'PPI-2024-0093': { ptkp: 'K/0', bank: 'BRI', rek4: '7710' },
  'PPI-2023-0088': { ptkp: 'K/1', bank: 'Mandiri', rek4: '3308' },
  'PPI-2022-0045': { ptkp: 'K/2', bank: 'BCA', rek4: '9012' },
  'PPI-2021-0019': { ptkp: 'K/3', bank: 'BRI', rek4: '6645' },
  'PPI-2025-0071': { ptkp: 'TK/0', bank: 'BNI', rek4: '2287' },
  'PPI-2024-0127': { ptkp: 'TK/0', bank: 'BCA', rek4: '1190' },
  'PPI-2025-0034': { ptkp: 'K/1', bank: 'Mandiri', rek4: '5532' },
  'PPI-2019-0007': { ptkp: 'K/2', bank: 'BCA', rek4: '8876' },
  'PPI-2020-0031': { ptkp: 'TK/0', bank: 'BCA', rek4: '3021' },
}

const hashNik = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return x >>> 0
}

/** Tunjangan Jabatan mengikuti Level (Data Master); PTKP, bank, dan rekening deterministik per NIP. */
export function applyPay<T extends RosterEmployee>(e: T): T {
  const r = rng(hashNik(e.nik + '#pay'))
  const named = NAMED_PAY[e.nik]
  const p = r()
  const ptkp = named?.ptkp ?? (p < 0.38 ? 'TK/0' : p < 0.46 ? 'TK/1' : p < 0.5 ? 'TK/2' : p < 0.52 ? 'TK/3' : p < 0.62 ? 'K/0' : p < 0.8 ? 'K/1' : p < 0.92 ? 'K/2' : 'K/3')
  const bank = named?.bank ?? ['BCA', 'Mandiri', 'BNI', 'BRI'][Math.floor(r() * 4)]
  const head = String(Math.floor(r() * 900_000) + 100_000)
  const tail = named?.rek4 ?? String(Math.floor(r() * 9000) + 1000)
  e.tunjanganTetap = tunjanganAt(e.level, DEMO_TODAY)
  e.ptkp = ptkp
  e.bank = bank
  e.nomorRekening = head + tail
  return e
}

export const gradeOfPay = (gaji: number) => (gaji >= 8_000_000 ? 'G5' : gaji >= 6_200_000 ? 'G3' : 'G1')

export const atasanKey = (nik: string) => (nik === NIK.lestari ? 'manager' : nik)

export function withMeta(e: RosterEmployee): RosterEmployee {
  const m = NAMED_META[e.nik]
  const p = positionByName(m.posisi)!
  const c = NAMED_CONTRACT[e.nik] ?? { statusKerja: 'Tetap' }
  return applyPay({ ...e, sec: m.sec, posisi: m.posisi, level: p.level, grade: gradeOfPay(e.gajiPokok), ptkp: '', bank: '', nomorRekening: '', ...c })
}

export function generateRoster(named: RosterEmployee[]): RosterEmployee[] {
  const rand = rng(20261026)
  const used = new Set(named.map((e) => e.nik))
  const names = new Set(named.map((e) => e.nama))
  const out: RosterEmployee[] = []
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]
  const levelKelompok = (level: string) => kelompokAt(LEVEL_DEFS.find((l) => l.nama === level)!, DEMO_TODAY)

  const shiftFor = (dept: string): ShiftId => {
    if (['Produksi', 'Quality Assurance', 'Maintenance'].includes(dept)) {
      const r = rand()
      return r < 0.5 ? 'pagi' : r < 0.8 ? 'siang' : 'malam'
    }
    if (dept === 'Warehouse') return rand() < 0.7 ? 'pagi' : 'siang'
    return 'nonshift'
  }
  const deptOfSec = (sec: string) => orgById(orgById(sec)!.parentId)!.nama
  const multi = (sec: string) => ORG.filter((o) => o.parentId === orgById(sec)!.parentId).length > 1
  const base = (nik: string, nama: string, sec: string, posisi: string, atasanId: string, masuk: string, gaji: number, shift: ShiftId, grade: string): RosterEmployee => {
    const p = positionByName(posisi)!
    const kelompok = levelKelompok(p.level)
    return {
      nik,
      nama,
      department: deptOfSec(sec),
      shift,
      kelompok,
      section: undefined,
      tanggalMasuk: masuk,
      atasanId,
      gajiPokok: gaji,
      tunjanganTetap: kelompok === 'Staff' ? 1_000_000 : 0,
      sec,
      posisi,
      level: p.level,
      grade,
      statusKerja: 'Tetap',
      ptkp: '',
      bank: '',
      nomorRekening: '',
      gen: true,
    }
  }

  for (const h of HEADS) {
    const e = base(h.nik, h.nama, h.sec, h.posisi, h.atasan, h.masuk, h.gaji, 'nonshift', positionByName(h.posisi)!.grade)
    if (multi(h.sec)) e.section = orgById(h.sec)!.nama
    e.tunjanganTetap = 1_500_000
    out.push(e)
    used.add(h.nik)
    names.add(h.nama)
  }

  const present = [...named, ...out]
  let counter = 140
  for (const sec of Object.keys(SECTION_TARGET)) {
    const have = present.filter((e) => e.sec === sec).length
    const kepala = orgById(sec)!.kepalaNik
    const pattern = FILL[sec]
    for (let i = 0; i < SECTION_TARGET[sec] - have; i++) {
      const posisi = pattern[i % pattern.length]
      const p = positionByName(posisi)!
      const grades = gradeList(p.grade)
      const gr = GRADES.find((g) => g.kode === grades[i % grades.length])!
      const gaji = Math.round((gr.min + rand() * (gr.max - gr.min) * 0.6) / 50_000) * 50_000
      let nama = ''
      do nama = `${pick(FIRST)} ${pick(LAST)}`
      while (names.has(nama))
      names.add(nama)
      let nik = ''
      do nik = `PPI-${2015 + Math.floor(rand() * 11)}-${String(counter++).padStart(4, '0')}`
      while (used.has(nik))
      used.add(nik)
      const yr = Number(nik.slice(4, 8))
      const masuk = `${yr}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
      const dept = deptOfSec(sec)
      const e = base(nik, nama, sec, posisi, atasanKey(kepala), masuk, gaji, shiftFor(dept), gr.kode)
      if (multi(sec)) e.section = orgById(sec)!.nama
      out.push(e)
    }
  }
  // Mira Andriani (Payroll Officer): menggantikan satu pegawai Staff HR hasil generator, sehingga total tetap 248.
  const mira = out.find((e) => e.department === 'HR & GA' && !HEADS.some((h) => h.nik === e.nik))!
  Object.assign(mira, { nik: 'PPI-2020-0031', nama: 'Mira Andriani', atasanId: 'manager', tanggalMasuk: '2020-08-17', gajiPokok: 6_800_000, grade: 'G3', shift: 'nonshift' })
  assignContracts(out, new Set([...HEADS.map((h) => h.nik), mira.nik]))
  out.forEach(applyPay)
  // Group Kerja mengikuti Status Kerja Harian/Magang (aturan gaji kedua group menunggu konfirmasi; payroll tetap seperti sebelumnya).
  for (const e of out) if (e.statusKerja === 'Harian' || e.statusKerja === 'Magang') e.kelompok = e.statusKerja
  // Nadia Putri: salah satu dari 4 Magang (Engineering). Identitas diganti setelah data gaji dibuat agar hasil payroll tidak bergeser.
  const nadia = out.filter((e) => e.statusKerja === 'Magang' && e.department === 'Engineering').sort((a, b) => a.nik.localeCompare(b.nik))[0]
  if (nadia) Object.assign(nadia, { nik: 'PPI-2026-0230', nama: 'Nadia Putri', tanggalMasuk: '2026-09-01' })
  // Budi Lestari (PPI-2025-0152) belum punya rekening: dibayar tetapi ditandai di Proses Payroll.
  const budi = out.find((e) => e.nik === 'PPI-2025-0152')
  if (budi) Object.assign(budi, { bank: '', nomorRekening: '' })
  return out
}

const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Sebaran Status Kerja 248 pegawai aktif: Tetap 156, Kontrak 80 (72 + 8 bekas Outsourcing HR & GA), Harian 8 (Warehouse),
 * Magang 4 (Engineering 2, Quality Assurance 2). Pegawai bernama sudah tetap (NAMED_CONTRACT); sisanya dipilih
 * deterministik dari yang paling baru masuk. Tidak ada Kontrak lain yang berakhir dalam 45 hari.
 */
/** 8 pegawai HR & GA yang dulu berstatus Outsourcing; sekarang Kontrak dan belum didaftarkan sebagai anggota koperasi. */
export const FORMER_OUTSOURCING = new Set<string>()

function assignContracts(gen: RosterEmployee[], heads: Set<string>) {
  const recent = (list: RosterEmployee[]) =>
    [...list].sort((a, b) => b.tanggalMasuk.localeCompare(a.tanggalMasuk) || a.nik.localeCompare(b.nik))
  const pool = gen.filter((e) => !heads.has(e.nik))
  const taken = new Set<string>()
  const mark = (list: RosterEmployee[], n: number, statusKerja: string) => {
    for (const e of recent(list.filter((x) => !taken.has(x.nik))).slice(0, n)) {
      e.statusKerja = statusKerja
      taken.add(e.nik)
    }
  }
  mark(pool.filter((e) => e.department === 'Warehouse'), 8, 'Harian')
  mark(pool.filter((e) => e.department === 'HR & GA'), 8, 'Kontrak')
  pool.filter((e) => e.statusKerja === 'Kontrak').forEach((e) => FORMER_OUTSOURCING.add(e.nik))
  mark(pool.filter((e) => e.department === 'Quality Assurance'), 2, 'Magang')
  mark(pool.filter((e) => e.department === 'Engineering'), 2, 'Magang')
  mark(pool, 66, 'Kontrak')
  const rand = rng(20261027)
  // Berakhir paling cepat 5 Jan 2027 (di luar jendela 45 hari), selalu setelah tanggal masuk.
  // Urutan undian: kontrak lama dulu agar tanggal berakhirnya tidak bergeser, lalu bekas Outsourcing.
  for (const e of pool.filter((x) => x.statusKerja === 'Kontrak' && !FORMER_OUTSOURCING.has(x.nik))) e.tanggalAkhir = addDaysIso('2027-01-05', Math.floor(rand() * 350))
  for (const e of pool.filter((x) => FORMER_OUTSOURCING.has(x.nik))) e.tanggalAkhir = addDaysIso('2027-01-05', Math.floor(rand() * 350))
}

/**
 * Klasifikasi Jenis Karyawan, Status Kerja, dan Group Kerja untuk 248 pegawai aktif (dipanggil sekali setelah roster dibuat):
 * Organik 228 (Tetap 156, Kontrak 72), Outsourcing 8 (HR & GA), Harian 8 (Warehouse), Magang 4. Harian, Magang, dan
 * Outsourcing selalu Kontrak. Group Organik mengikuti default posisi/level (lihat `kelompokFor`). Nilai lama disimpan
 * di `legacy` agar payroll periode yang sudah tersimpan tidak bergeser.
 */
export function applyJenis(list: RosterEmployee[]) {
  const outs = list.filter((e) => FORMER_OUTSOURCING.has(e.nik)).sort((a, b) => (a.nama === 'Andi Utami' ? -1 : b.nama === 'Andi Utami' ? 1 : a.nik.localeCompare(b.nik)))
  outs.forEach((e, i) => {
    e.legacy = { posisi: e.posisi, level: e.level, kelompok: e.kelompok, gajiPokok: e.gajiPokok }
    const cleaning = i < 4
    Object.assign(e, { jenis: 'Outsourcing', posisi: cleaning ? 'Cleaning Service' : 'Security', level: 'Operator', grade: 'G1', gajiPokok: cleaning ? 5_100_000 : 5_300_000 })
    e.tunjanganTetap = tunjanganAt('Operator', DEMO_TODAY)
  })
  for (const e of list) {
    if (e.jenis === 'Outsourcing') {
      e.kelompok = 'Outsourcing'
      e.statusKerja = 'Kontrak'
      continue
    }
    const nonOrganik = e.statusKerja === 'Harian' || e.statusKerja === 'Magang'
    e.jenis = nonOrganik ? (e.statusKerja as 'Harian' | 'Magang') : 'Organik'
    if (nonOrganik) {
      e.statusKerja = 'Kontrak'
      e.tanggalAkhir = addDaysIso('2027-01-05', hashNik(e.nik + '#kontrak') % 350)
    }
    const before = e.kelompok
    e.kelompok = kelompokFor(e.jenis, e.level, e.posisi)
    if (before !== e.kelompok) e.legacy = { posisi: e.posisi, level: e.level, kelompok: before, gajiPokok: e.gajiPokok }
  }
  for (const e of outs) e.tanggalAkhir = e.tanggalAkhir ?? addDaysIso('2027-01-05', hashNik(e.nik + '#kontrak') % 350)
}
