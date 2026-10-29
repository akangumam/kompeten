import { addDays, dayName, PERIOD, setDayLinks, type DayLink } from '@/data/attendance'
import { DEMO_TODAY } from '@/lib/today'
import { atasanOf, isApprover, ROSTER, type RosterEmployee } from '@/data/employees'
import { formatDate } from '@/lib/format'
import { chainFor } from '@/data/master/approvers'
import { attPeriods, periodContaining, rule, type AttPeriod } from '@/data/master/attendance-rules'
import { cutiBersamaIn, isHoliday } from '@/data/master/holidays'
import { LEAVE_RULES } from '@/data/master/leave-rules'
import { polaOfDept } from '@/data/master/shifts'

export type Jenis = 'Cuti Tahunan' | 'Cuti Khusus' | 'Izin' | 'Izin Terlambat' | 'Izin Pulang Cepat' | 'Sakit' | 'Dinas'
export const JENIS: Jenis[] = ['Cuti Tahunan', 'Cuti Khusus', 'Izin', 'Izin Terlambat', 'Izin Pulang Cepat', 'Sakit', 'Dinas']
/** "Izin Jam Kerja": izin beberapa jam, berbeda dari Izin sehari penuh (memotong gaji). */
export const JAM_KERJA: Jenis[] = ['Izin Terlambat', 'Izin Pulang Cepat']
export const isJamKerja = (j: Jenis) => JAM_KERJA.includes(j)
/** Sakit dan Dinas butuh verifikasi HRD setelah Atasan menyetujui. */
export const NEEDS_HRD: Jenis[] = ['Sakit', 'Dinas']
export const QUOTA_JAM_KERJA = 4

export type LeaveStatus = 'menunggu' | 'menunggu-manager' | 'menunggu-hrd' | 'pembatalan' | 'disetujui' | 'ditolak' | 'dibatalkan'
export const STATUS_LABEL: Record<LeaveStatus, string> = {
  menunggu: 'Menunggu Approval',
  'menunggu-manager': 'Menunggu Approval Manager',
  'menunggu-hrd': 'Menunggu Verifikasi HRD',
  pembatalan: 'Pembatalan Diajukan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}
/** Menunggu keputusan Atasan atas pengajuan (bukan pembatalan, bukan verifikasi HRD). */
export const isPending = (s: LeaveStatus) => s === 'menunggu' || s === 'menunggu-manager'
export const isVerif = (s: LeaveStatus) => s === 'menunggu-hrd'
export const isCancelReq = (s: LeaveStatus) => s === 'pembatalan'
/** Masih menunggu keputusan siapa pun (Atasan, HRD, atau persetujuan pembatalan). */
export const isOpen = (s: LeaveStatus) => isPending(s) || isVerif(s) || isCancelReq(s)

export const KHUSUS = LEAVE_RULES.khusus

export type LeaveRequest = {
  no: string
  nik: string
  jenis: Jenis
  sub?: string
  start: string
  end: string
  hari: number
  alasan: string
  tujuan?: string
  lampiran?: string
  /** Izin Terlambat: perkiraan jam datang; Izin Pulang Cepat: jam pulang (format HH.MM). */
  jam?: string
  status: LeaveStatus
  by: string
  at: string
  decision?: { by: string; at: string; alasan?: string }
  /** Penyetuju yang sudah menyetujui (Matriks Penyetuju), berurutan: Penyetuju 1, lalu Penyetuju 2. */
  approvals?: { step: number; by: string; at: string }[]
  /** Kategori sakit dari surat dokter, diisi saat verifikasi HRD (hanya terlihat Admin HRD dan HR & GA Manager). */
  kategori?: string
  /** Verifikasi HRD (Sakit, Dinas): dikembalikan = Ditolak. */
  verif?: { by: string; at: string; hasil: 'disetujui' | 'dikembalikan'; alasan?: string }
  /** Permohonan pembatalan cuti yang sudah disetujui; keputusan Atasan menyusul. */
  pembatalan?: { by: string; at: string; alasan: string; keputusan?: { by: string; at: string; hasil: 'disetujui' | 'ditolak'; alasan?: string } }
  riwayat?: { at: string; by: string; action: string }[]
}

/* ---------- calendar ---------- */
const dow = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay()

export const isWorkday = (iso: string, emp: RosterEmployee) => {
  const d = dow(iso)
  if (d === 0 || isHoliday(iso)) return false
  if (d === 6) return polaOfDept(emp.department) === 6
  return true
}

export function workdaysBetween(start: string, end: string, emp: RosterEmployee) {
  let n = 0
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkday(d, emp)) n++
  return n
}

export function endAfterWorkdays(start: string, hari: number, emp: RosterEmployee) {
  let d = start
  let n = isWorkday(d, emp) ? 1 : 0
  while (n < hari) {
    d = addDays(d, 1)
    if (isWorkday(d, emp)) n++
  }
  return d
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number]

export function rangeLabel(start: string, end: string, withYear = true) {
  const [y1, m1, d1] = parts(start)
  const [y2, m2, d2] = parts(end)
  const yr = withYear ? ` ${y2}` : ''
  if (start === end) return `${d1} ${MON[m1 - 1]}${yr}`
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MON[m1 - 1]}${yr}`
  return `${d1} ${MON[m1 - 1]}${y1 === y2 ? '' : ` ${y1}`} – ${d2} ${MON[m2 - 1]}${yr}`
}

/* ---------- attendance periods (dibangkitkan dari aturan cut-off, lihat attendance-rules.ts) ---------- */
export type LeavePeriod = AttPeriod
export const LEAVE_PERIODS: LeavePeriod[] = attPeriods()
export const periodOf = (iso: string): LeavePeriod => periodContaining(iso)
/** Periode berjalan menurut tanggal demo (default semua pemilih periode). */
export const CURRENT_PERIOD_ID = periodContaining(DEMO_TODAY).id
export const inPeriod = (iso: string, p: LeavePeriod) => iso >= p.start && iso <= p.end

/** September 2026 is closed in the seed; October follows the in-memory attendance closing. */
export const isPeriodClosed = (p: LeavePeriod, octClosed: boolean) =>
  p.end < PERIOD.start || (p.end === PERIOD.end && octClosed)
export const firstOpenDate = (octClosed: boolean) => (octClosed ? addDays(PERIOD.end, 1) : PERIOD.start)

/* ---------- balance ---------- */
export const hakTahunan = () => LEAVE_RULES.tahunan.hak
export type BalanceSeed = { terpakai: number }
export const BALANCE_SEED: Record<string, BalanceSeed> = {
  'PPI-2024-0112': { terpakai: 3 },
  'PPI-2024-0093': { terpakai: 5 },
  'PPI-2024-0127': { terpakai: 4 },
  'PPI-2025-0034': { terpakai: 0 },
  'PPI-2025-0051': { terpakai: 0 },
  'PPI-2023-0088': { terpakai: 2 },
  'PPI-2023-0110': { terpakai: 5 },
  'PPI-2022-0061': { terpakai: 1 },
  'PPI-2019-0007': { terpakai: 7 },
}

const addMonths = (iso: string, n: number) => {
  const [y, m, d] = parts(iso)
  const t = m - 1 + n
  const yy = y + Math.floor(t / 12)
  const mm = ((t % 12) + 12) % 12
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate()
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}
export const eligibleFrom = (emp: RosterEmployee) => addMonths(emp.tanggalMasuk, LEAVE_RULES.tahunan.syaratBulan)
export const isEligible = (emp: RosterEmployee) => eligibleFrom(emp) <= DEMO_TODAY

export function hakPeriode(emp: RosterEmployee) {
  if (!isEligible(emp)) return null
  let start = eligibleFrom(emp)
  while (addMonths(start, 12) <= DEMO_TODAY) start = addMonths(start, 12)
  return { start, end: addDays(addMonths(start, 12), -1) }
}

export function masaKerja(emp: RosterEmployee) {
  const [y1, m1, d1] = parts(emp.tanggalMasuk)
  const [y2, m2, d2] = parts(DEMO_TODAY)
  let months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
  months = Math.max(0, months)
  const y = Math.floor(months / 12)
  const m = months % 12
  return y === 0 ? `${m} bln` : m === 0 ? `${y} thn` : `${y} thn ${m} bln`
}

export type Balance = { hak: number; cb: number; terpakai: number; dipesan: number; sisa: number }
export function balanceOf(emp: RosterEmployee, requests: LeaveRequest[]): Balance | null {
  if (!isEligible(emp)) return null
  const seed = BALANCE_SEED[emp.nik] ?? { terpakai: 0 }
  const mine = requests.filter((r) => r.nik === emp.nik && r.jenis === 'Cuti Tahunan')
  // Pembatalan Diajukan masih Terpakai sampai Atasan menyetujui pembatalan; setelah itu hari kembali ke Sisa (tepat sekali).
  const terpakai = seed.terpakai + mine.filter((r) => r.status === 'disetujui' || r.status === 'pembatalan').reduce((a, r) => a + r.hari, 0)
  const dipesan = mine.filter((r) => isPending(r.status)).reduce((a, r) => a + r.hari, 0)
  const hak = hakTahunan()
  const hp = hakPeriode(emp)!
  const cb = cutiBersamaIn(hp.start, hp.end)
  return { hak, cb, terpakai, dipesan, sisa: hak - cb - terpakai - dipesan }
}

/* ---------- routing ---------- */
// Pengajuan atasan sendiri naik satu tingkat: ke atasannya (mis. Hendra Gunawan → Agus Setiadi), ditinjau Manager mewakili.
export const approverOf = (r: Pick<LeaveRequest, 'nik'>): 'supervisor' | 'manager' =>
  ROSTER.find((e) => e.nik === r.nik)?.atasanId === 'manager' || isApprover(r.nik) ? 'manager' : 'supervisor'
export const pendingStatusFor = (nik: string): LeaveStatus => (approverOf({ nik }) === 'manager' ? 'menunggu-manager' : 'menunggu')
/** Penyetuju 1 menurut Matriks Penyetuju. */
export const approverLabel = (nik: string) => chainFor(empOf(nik))[0]?.person.nama ?? atasanOf(empOf(nik)).nama

export const empOf = (nik: string) => ROSTER.find((e) => e.nik === nik)!

/* ---------- Izin Jam Kerja: kuota bulanan ---------- */
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1]
const nextMonthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) % 12]
/** Terpakai = Menunggu Approval + Disetujui di bulan kalender yang sama (Ditolak/Dibatalkan tidak dihitung). */
export const quotaUsed = (nik: string, iso: string, requests: LeaveRequest[]) =>
  requests.filter((r) => r.nik === nik && isJamKerja(r.jenis) && (r.status === 'menunggu' || r.status === 'menunggu-manager' || r.status === 'disetujui') && r.start.slice(0, 7) === iso.slice(0, 7)).length
export const quotaText = (nik: string, iso: string, requests: LeaveRequest[]) => `Kuota ${monthName(iso)}: terpakai ${quotaUsed(nik, iso, requests)} dari ${QUOTA_JAM_KERJA}`
export function quotaError(nik: string, iso: string, requests: LeaveRequest[]) {
  const used = quotaUsed(nik, iso, requests)
  return used >= QUOTA_JAM_KERJA
    ? `Kuota izin terlambat/pulang cepat ${monthName(iso)} sudah terpakai ${used} dari ${QUOTA_JAM_KERJA}. Pengajuan berikutnya mulai 1 ${nextMonthName(iso)}.`
    : ''
}
/** Boleh diajukan hari ini atau setelahnya, atau mundur sampai 1 hari kerja (keterlambatan yang sudah terjadi). */
export function jamKerjaMinDate(emp: RosterEmployee) {
  let d = addDays(DEMO_TODAY, -1)
  while (!isWorkday(d, emp)) d = addDays(d, -1)
  return d
}
export const canRequestCancel = (r: LeaveRequest) => (r.jenis === 'Cuti Tahunan' || r.jenis === 'Cuti Khusus') && r.status === 'disetujui' && r.start > DEMO_TODAY

/** Menghubungkan pengajuan ke status harian di Absensi (Izin Terlambat/Pulang Cepat, Hadir (Dinas), Menunggu Verifikasi HRD). */
export function syncDayLinks(requests: LeaveRequest[]) {
  const links: DayLink[] = []
  for (const r of requests) {
    if (r.jenis === 'Izin Terlambat' && r.status === 'disetujui') links.push({ nik: r.nik, date: r.start, kind: 'izin-terlambat' })
    else if (r.jenis === 'Izin Pulang Cepat' && r.status === 'disetujui') links.push({ nik: r.nik, date: r.start, kind: 'izin-cepat' })
    else if (r.jenis === 'Dinas' || r.jenis === 'Sakit') {
      const kind = r.status === 'menunggu-hrd' ? 'verif' : r.jenis === 'Dinas' && r.status === 'disetujui' ? 'dinas' : null
      if (kind) for (let d = r.start; d <= r.end; d = addDays(d, 1)) links.push({ nik: r.nik, date: d, kind })
    }
  }
  setDayLinks(links)
}

export function coverage(r: LeaveRequest, all: LeaveRequest[]) {
  const emp = empOf(r.nik)
  return all
    .filter((o) => o.nik !== r.nik && (o.status === 'disetujui' || isPending(o.status)) && o.start <= r.end && o.end >= r.start)
    .map((o) => ({ o, e: empOf(o.nik) }))
    .filter(({ e }) => e.department === emp.department && e.section === emp.section)
    .map(({ o, e }) => `${e.nama} (${rangeLabel(o.start < r.start ? r.start : o.start, o.end > r.end ? r.end : o.end, false)})`)
}

export const teamLabel = (e: RosterEmployee) => (e.section ? `${e.department} · ${e.section}` : e.department)
export const longDate = (iso: string) => `${dayName(iso)}, ${formatDate(iso)}`

/* ---------- seed ---------- */
const ADM = 'Admin HRD'
export const SEED_REQUESTS: LeaveRequest[] = [
  { no: 'CTI-2026-0243', nik: 'PPI-2024-0093', jenis: 'Izin Pulang Cepat', start: '2026-10-27', end: '2026-10-27', hari: 0, jam: '14.00', alasan: 'Mengantar orang tua kontrol ke rumah sakit', status: 'menunggu', by: ADM, at: '26 Okt 2026, 09.10 WIB' },
  { no: 'CTI-2026-0212', nik: 'PPI-2024-0093', jenis: 'Izin Terlambat', start: '2026-10-13', end: '2026-10-13', hari: 0, jam: '07.40', alasan: 'Antar anak ke sekolah, ban motor bocor', status: 'disetujui', by: ADM, at: '12 Okt 2026, 16.00 WIB', decision: { by: 'Hendra Gunawan', at: '12 Okt 2026, 16.30 WIB' } },
  { no: 'CTI-2026-0208', nik: 'PPI-2024-0093', jenis: 'Izin Terlambat', start: '2026-10-06', end: '2026-10-06', hari: 0, jam: '07.30', alasan: 'Mengurus dokumen kendaraan di Samsat', status: 'disetujui', by: ADM, at: '5 Okt 2026, 15.20 WIB', decision: { by: 'Hendra Gunawan', at: '5 Okt 2026, 16.00 WIB' } },
  { no: 'CTI-2026-0203', nik: 'PPI-2024-0093', jenis: 'Izin Terlambat', start: '2026-10-01', end: '2026-10-01', hari: 0, jam: '07.45', alasan: 'Antar keluarga ke stasiun pagi hari', status: 'disetujui', by: ADM, at: '30 Sep 2026, 14.40 WIB', decision: { by: 'Hendra Gunawan', at: '30 Sep 2026, 15.10 WIB' } },
  { no: 'CTI-2026-0238', nik: 'PPI-2019-0007', jenis: 'Cuti Tahunan', start: '2026-11-13', end: '2026-11-13', hari: 1, alasan: 'Urusan keluarga', status: 'menunggu-manager', by: 'Hendra Gunawan', at: '26 Okt 2026, 08.40 WIB' },
  { no: 'CTI-2026-0237', nik: 'PPI-2025-0051', jenis: 'Cuti Tahunan', start: '2026-11-16', end: '2026-11-17', hari: 2, alasan: 'Jadwal acara berubah', status: 'dibatalkan', by: ADM, at: '22 Okt 2026, 13.05 WIB', decision: { by: ADM, at: '24 Okt 2026, 09.10 WIB', alasan: 'Jadwal acara berubah' } },
  { no: 'CTI-2026-0236', nik: 'PPI-2023-0110', jenis: 'Cuti Tahunan', start: '2026-10-30', end: '2026-10-30', hari: 1, alasan: 'Keperluan pribadi di luar kota', status: 'ditolak', by: ADM, at: '21 Okt 2026, 10.20 WIB', decision: { by: 'Bambang Hermawan', at: '22 Okt 2026, 08.15 WIB', alasan: 'Stok opname gudang akhir bulan' } },
  { no: 'CTI-2026-0235', nik: 'PPI-2022-0061', jenis: 'Dinas', start: '2026-11-03', end: '2026-11-05', hari: 3, alasan: 'Pengecekan dan trial mold baru bersama vendor', tujuan: 'Vendor mold, Cikarang', lampiran: 'surat-tugas-trial-mold.pdf', status: 'disetujui', by: ADM, at: '20 Okt 2026, 15.30 WIB', decision: { by: 'Rudi Hartanto', at: '21 Okt 2026, 09.00 WIB' } },
  { no: 'CTI-2026-0234', nik: 'PPI-2023-0088', jenis: 'Izin', start: '2026-10-28', end: '2026-10-28', hari: 1, alasan: 'Mengurus perpanjangan SIM di Polres', status: 'disetujui', by: ADM, at: '20 Okt 2026, 11.10 WIB', decision: { by: 'Hendra Gunawan', at: '20 Okt 2026, 14.00 WIB' } },
  { no: 'CTI-2026-0233', nik: 'PPI-2025-0034', jenis: 'Sakit', start: '2026-10-22', end: '2026-10-23', hari: 2, alasan: 'Demam dan radang tenggorokan', lampiran: 'surat-dokter-dedi.jpg', status: 'menunggu', by: ADM, at: '24 Okt 2026, 08.20 WIB' },
  { no: 'CTI-2026-0232', nik: 'PPI-2024-0127', jenis: 'Cuti Khusus', sub: 'Menikah', start: '2026-11-09', end: '2026-11-11', hari: 3, alasan: 'Pernikahan pegawai yang bersangkutan', lampiran: 'undangan-pernikahan.pdf', status: 'menunggu', by: ADM, at: '23 Okt 2026, 10.45 WIB' },
  { no: 'CTI-2026-0231', nik: 'PPI-2024-0112', jenis: 'Cuti Tahunan', start: '2026-11-02', end: '2026-11-04', hari: 3, alasan: 'Acara keluarga di Garut', status: 'menunggu', by: ADM, at: '23 Okt 2026, 09.30 WIB' },
  { no: 'CTI-2026-0230', nik: 'PPI-2024-0093', jenis: 'Cuti Tahunan', start: '2026-11-03', end: '2026-11-03', hari: 1, alasan: 'Mengantar orang tua kontrol ke rumah sakit', status: 'disetujui', by: ADM, at: '19 Okt 2026, 14.00 WIB', decision: { by: 'Hendra Gunawan', at: '20 Okt 2026, 08.30 WIB' } },
]
