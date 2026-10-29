import { upahHarianAt } from '@/data/payroll/components'
import { harianPphAt } from '@/data/payroll/statutory'
import type { Role } from '@/data/users'
import { addDays, SHIFTS, toDot, toMin, type Scan } from '@/data/attendance'
import { DEMO_TODAY } from '@/lib/today'
import { atasanOf, contractEndError, isApprover, ROSTER, type RosterEmployee } from '@/data/employees'
import { rule } from '@/data/master/attendance-rules'
import { isHoliday } from '@/data/master/holidays'
import { polaOfDept } from '@/data/master/shifts'
import { empOf, inPeriod, isPeriodClosed, periodOf, type LeavePeriod, type LeaveRequest } from '@/data/leave'
import { leaveOn, SHIFT_LABEL, weekStart } from '@/data/shift-schedule'
import { formatDate } from '@/lib/format'

export type OtStatus =
  | 'menunggu-approval'
  | 'terjadwal'
  | 'menunggu-validasi'
  | 'menunggu-validasi-manager'
  | 'menunggu-verifikasi'
  | 'tervalidasi'
  | 'tidak-terealisasi'
  | 'ditolak'
  | 'dibatalkan'

export const OT_LABEL: Record<OtStatus, string> = {
  'menunggu-approval': 'Menunggu Approval',
  terjadwal: 'Terjadwal',
  'menunggu-validasi': 'Menunggu Validasi',
  'menunggu-validasi-manager': 'Menunggu Validasi Manager',
  'menunggu-verifikasi': 'Menunggu Verifikasi HRD',
  tervalidasi: 'Tervalidasi',
  'tidak-terealisasi': 'Tidak Terealisasi',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}

export type OtRecord = {
  id: string
  no: string
  nik: string
  date: string
  start: string
  end: string
  pekerjaan: string
  status: OtStatus
  by: string
  byRole: 'admin' | 'supervisor'
  at: string
  dibayar?: number
  kelebihan?: string
  /** Istirahat selama lembur (menit, kelipatan 15) yang dikurangkan dari realisasi. */
  istirahat?: number
  decision?: { by: string; at: string; alasan?: string }
  /** Verifikasi HRD setelah validasi Atasan; data berlaku (Tervalidasi) setelah langkah ini. */
  verif?: { by: string; at: string }
}

export const maxWorkdayDay = () => rule('batasLembur').hari
export const maxWorkdayWeek = () => rule('batasLembur').minggu
export const minRestOt = () => rule('istirahat').jam
export const roundMinutes = () => rule('pembulatan').menit
export const UPAH_DIVISOR = 173

/* ---------- classification & pay ---------- */
export type DayType = 'kerja' | 'istirahat'
export const polaOf = (e: RosterEmployee): 5 | 6 => polaOfDept(e.department)
export function dayTypeOf(e: RosterEmployee, iso: string): DayType {
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay()
  if (dow === 0 || isHoliday(iso)) return 'istirahat'
  if (dow === 6 && polaOf(e) === 5) return 'istirahat'
  return 'kerja'
}
export const dayTypeLabel = (t: DayType) => (t === 'kerja' ? 'Hari kerja' : 'Hari istirahat')
export const maxRestDay = (e: RosterEmployee) => (polaOf(e) === 6 ? 11 : 12)

/** Upah sejam = (Gaji Pokok + Tunjangan) ÷ 173; Group Harian: upah harian × 25 ÷ 173. */
export const upahSejam = (e: RosterEmployee) =>
  e.kelompok === 'Harian' ? Math.round((upahHarianAt(DEMO_TODAY) * harianPphAt(DEMO_TODAY).hariSebulan) / UPAH_DIVISOR) : Math.round((e.gajiPokok + e.tunjanganTetap) / UPAH_DIVISOR)

export const fj = (h: number) => h.toLocaleString('id-ID', { maximumFractionDigits: 1 })
export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

function multiplier(pos: number, type: DayType, pola: 5 | 6) {
  if (type === 'kerja') return pos < 1 ? 1.5 : 2
  const full = pola === 6 ? 7 : 8
  if (pos < full) return 2
  if (pos < full + 1) return 3
  return 4
}

export type Breakdown = { parts: { jam: number; x: number }[]; pengali: number; text: string }
export function breakdownOf(hours: number, type: DayType, pola: 5 | 6): Breakdown {
  const parts: { jam: number; x: number }[] = []
  for (let i = 0; i < Math.round(hours * 2); i++) {
    const x = multiplier(i * 0.5, type, pola)
    const last = parts[parts.length - 1]
    if (last && last.x === x) last.jam += 0.5
    else parts.push({ jam: 0.5, x })
  }
  const pengali = parts.reduce((s, p) => s + p.jam * p.x, 0)
  return { parts, pengali, text: parts.map((p) => `${fj(p.jam)} j × ${fj(p.x)}`).join(' + ') || '—' }
}
export const nominalOf = (e: RosterEmployee, b: Breakdown) => Math.round(b.pengali * upahSejam(e))

/* ---------- duration helpers ---------- */
export const durMin = (start: string, end: string) => (toMin(end) - toMin(start) + 1440) % 1440
export const durJam = (r: Pick<OtRecord, 'start' | 'end'>) => durMin(r.start, r.end) / 60
export const rencanaText = (r: Pick<OtRecord, 'start' | 'end'>) => `${r.start}–${r.end} · ${fj(durJam(r))} j`

/* ---------- realisasi from attendance scans ---------- */
export type Realisasi = {
  masuk: string | null
  pulang: string | null
  hasScan: boolean
  /** Menit setelah dikurangi istirahat (belum dibulatkan). */
  aktualMin: number
  aktual: number
  scanText: string
  /** Rumus: (scan pulang − mulai) − istirahat. */
  mulai: string
  kotorMin: number
  istirahat: number
}
export const ISTIRAHAT_STEP = 15
export const ISTIRAHAT_OPTIONS = Array.from({ length: 13 }, (_, i) => i * ISTIRAHAT_STEP)

export const pinOf = (e: RosterEmployee) => e.pin ?? '1092'
const serial = (iso: string) => Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000)
const fmtAbs = (a: number) => `${toDot(a)}${a >= 1440 ? ' (+1)' : ''}`

export function realisasiOf(r: OtRecord, scans: Scan[], istirahat: number = r.istirahat ?? 0): Realisasi {
  const e = empOf(r.nik)
  const base = serial(r.date)
  const abs = scans
    .filter((s) => s.pin === pinOf(e))
    .map((s) => (serial(s.date) - base) * 1440 + toMin(s.time))
    .filter((a) => a >= 0 && a < 2880)
    .sort((a, b) => a - b)
  const none: Realisasi = { masuk: null, pulang: null, hasScan: false, aktualMin: 0, aktual: 0, scanText: '—', mulai: '', kotorMin: 0, istirahat }
  const round = (m: number) => Math.floor(Math.max(0, m) / roundMinutes()) * (roundMinutes() / 60)

  if (dayTypeOf(e, r.date) === 'kerja') {
    const sh = SHIFTS[e.shift]
    const after = abs.filter((a) => a > sh.end && a <= sh.end + 720)
    if (!after.length) return none
    const pulang = after[after.length - 1]
    const kotor = pulang - sh.end
    const m = Math.max(0, kotor - istirahat)
    const masukA = abs.find((a) => a < sh.end)
    return {
      masuk: masukA === undefined ? null : toDot(masukA),
      pulang: fmtAbs(pulang),
      hasScan: true,
      aktualMin: m,
      aktual: round(m),
      scanText: fmtAbs(pulang),
      mulai: fmtAbs(sh.end),
      kotorMin: kotor,
      istirahat,
    }
  }
  if (abs.length < 2) return none
  const masuk = abs[0]
  const pulang = abs[abs.length - 1]
  const mulaiAbs = Math.max(masuk, toMin(r.start))
  const kotor = pulang - mulaiAbs
  const m = Math.max(0, kotor - istirahat)
  return {
    masuk: toDot(masuk),
    pulang: fmtAbs(pulang),
    hasScan: true,
    aktualMin: m,
    aktual: round(m),
    scanText: `${toDot(masuk)}–${fmtAbs(pulang)}`,
    mulai: fmtAbs(mulaiAbs),
    kotorMin: kotor,
    istirahat,
  }
}

/* ---------- status & approvers ---------- */
export const approverOf = (e: RosterEmployee): 'supervisor' | 'manager' => (e.atasanId === 'manager' || isApprover(e.nik) ? 'manager' : 'supervisor')

export function effStatus(r: OtRecord): OtStatus {
  if (r.status === 'terjadwal' && r.date < DEMO_TODAY) {
    return approverOf(empOf(r.nik)) === 'manager' ? 'menunggu-validasi-manager' : 'menunggu-validasi'
  }
  return r.status
}

export const isAwaitingValidation = (s: OtStatus) => s === 'menunggu-validasi' || s === 'menunggu-validasi-manager'
export const isAwaitingVerification = (s: OtStatus) => s === 'menunggu-verifikasi'
export const isActiveSpl = (s: OtStatus) => !['ditolak', 'dibatalkan', 'tidak-terealisasi'].includes(s)

export type OtUser = { role: Role; nama: string; nik?: string }
export const canDecide = (user: OtUser, e: RosterEmployee, status: OtStatus) => {
  if (user.role === 'manager') return status === 'menunggu-approval' || isAwaitingValidation(status)
  if (user.role === 'supervisor' && e.atasanId === user.nik) return status === 'menunggu-approval' || status === 'menunggu-validasi'
  return false
}
/** Verifikasi HRD: hanya Admin HRD, setelah Atasan memvalidasi realisasi. */
export const canVerify = (user: OtUser, status: OtStatus) => user.role === 'admin' && status === 'menunggu-verifikasi'
export const canCancel = (user: OtUser, e: RosterEmployee, status: OtStatus) =>
  (status === 'terjadwal' || status === 'menunggu-approval') && (user.role === 'admin' || (user.role === 'supervisor' && e.atasanId === user.nik))

export const onBehalfOf = (user: OtUser, e: RosterEmployee) =>
  user.role === 'manager' && e.atasanId !== 'manager' ? atasanOf(e).nama : null

/* ---------- paid hours ---------- */
export type Paid = { jam: number; breakdown: Breakdown; nominal: number; excess: boolean }
export function paidOf(r: OtRecord, real: Realisasi): Paid | null {
  const status = effStatus(r)
  if (!isAwaitingValidation(status) && status !== 'tervalidasi' && status !== 'menunggu-verifikasi') return null
  const e = empOf(r.nik)
  const plan = durJam(r)
  const jam = r.dibayar ?? Math.min(plan, real.aktual)
  const b = breakdownOf(jam, dayTypeOf(e, r.date), polaOf(e))
  return { jam, breakdown: b, nominal: nominalOf(e, b), excess: r.dibayar === undefined && real.aktual > plan }
}

/* ---------- SPL form validation ---------- */
export const weekHours = (nik: string, date: string, recs: OtRecord[]) => {
  const ws = weekStart(date)
  const e = empOf(nik)
  return recs
    .filter((r) => r.nik === nik && isActiveSpl(effStatus(r)) && dayTypeOf(e, r.date) === 'kerja' && weekStart(r.date) === ws)
    .reduce((s, r) => s + durJam(r), 0)
}

export function dateError(date: string, octClosed: boolean) {
  if (!date) return ''
  if (date < DEMO_TODAY) return 'Tanggal tidak boleh sebelum hari ini.'
  const p = periodOf(date)
  return isPeriodClosed(p, octClosed) ? `Periode ${p.label} sudah closing.` : ''
}

export function timeError(start: string, end: string, type: DayType | null, e: RosterEmployee | null) {
  if (start.length < 5 || end.length < 5) return ''
  const m = durMin(start, end)
  if (m === 0) return 'Jam selesai harus berbeda dari jam mulai.'
  if (m % roundMinutes() !== 0) return `Durasi lembur harus kelipatan ${roundMinutes()} menit.`
  if (type === 'kerja' && m / 60 > maxWorkdayDay()) return `Lembur hari kerja maks. ${maxWorkdayDay()} jam per hari (diajukan ${fj(m / 60)} jam).`
  if (type === 'istirahat' && e && m / 60 > maxRestDay(e)) return `Lembur hari istirahat maks. ${maxRestDay(e)} jam (diajukan ${fj(m / 60)} jam).`
  return ''
}

export function employeeCheck(
  e: RosterEmployee,
  date: string,
  start: string,
  end: string,
  recs: OtRecord[],
  leaves: LeaveRequest[],
): { week: number; error: string | null } {
  const type = dayTypeOf(e, date)
  const week = weekHours(e.nik, date, recs)
  const ended = contractEndError(e, date)
  if (ended) return { week, error: ended }
  const lv = leaveOn(e.nik, date, leaves)
  if (lv) return { week, error: `${e.nama} memiliki pengajuan ${lv.jenis} pada ${formatDate(date)} (${lv.no}).` }
  const dup = recs.find((r) => r.nik === e.nik && r.date === date && isActiveSpl(effStatus(r)))
  if (dup) return { week, error: `${e.nama} sudah memiliki SPL pada ${formatDate(date)} (${dup.no}).` }
  if (start.length < 5 || end.length < 5) return { week, error: null }

  const sh = SHIFTS[e.shift]
  const dur = durMin(start, end)
  let startAbs = toMin(start)
  if (type === 'kerja') {
    while (startAbs < sh.start) startAbs += 1440
    if (startAbs < sh.end) return { week, error: `Lembur hari kerja dimulai setelah shift berakhir (${toDot(sh.end % 1440)}).` }
  }
  const endAbs = startAbs + dur
  const shiftName = SHIFT_LABEL[e.shift === 'nonshift' ? 'pagi' : e.shift]
  const label = e.shift === 'nonshift' ? 'Non-shift' : shiftName

  const nextDate = addDays(date, 1)
  if (dayTypeOf(e, nextDate) === 'kerja' && !leaveOn(e.nik, nextDate, leaves)) {
    const gap = (1440 + sh.start - endAbs) / 60
    if (gap < minRestOt()) {
      return {
        week,
        error: `Waktu istirahat ${e.nama} hanya ${fj(Math.max(0, gap))} jam (Lembur ${formatDate(date)} berakhir ${toDot(endAbs)}, ${label} ${formatDate(nextDate)} mulai ${toDot(sh.start)}). Minimal ${minRestOt()} jam.`,
      }
    }
  }
  const prevDate = addDays(date, -1)
  if (type === 'istirahat' && dayTypeOf(e, prevDate) === 'kerja' && !leaveOn(e.nik, prevDate, leaves)) {
    const gap = (startAbs - (sh.end - 1440)) / 60
    if (gap < minRestOt()) {
      return {
        week,
        error: `Waktu istirahat ${e.nama} hanya ${fj(Math.max(0, gap))} jam (${label} ${formatDate(prevDate)} berakhir ${toDot(sh.end)}, Lembur ${formatDate(date)} mulai ${toDot(startAbs)}). Minimal ${minRestOt()} jam.`,
      }
    }
  }
  if (type === 'kerja' && week + dur / 60 > maxWorkdayWeek()) {
    return { week, error: `Lembur hari kerja minggu ini ${fj(week + dur / 60)} jam (maks. ${maxWorkdayWeek()} jam).` }
  }
  return { week, error: null }
}

/* ---------- seed ---------- */
const SPV = 'Hendra Gunawan'
const seed = (
  no: string,
  nik: string,
  date: string,
  start: string,
  end: string,
  pekerjaan: string,
  status: OtStatus,
  extra: Partial<OtRecord> = {},
): OtRecord => ({
  id: `${no}|${nik}`,
  no,
  nik,
  date,
  start,
  end,
  pekerjaan,
  status,
  by: SPV,
  byRole: 'supervisor',
  at: `${formatDate(addDays(date, -2))}, 15.30 WIB`,
  ...extra,
})
const valid = (jam: number, date: string): Partial<OtRecord> => ({
  dibayar: jam,
  decision: { by: SPV, at: `${formatDate(addDays(date, 1))}, 08.15 WIB` },
})

const EKO = 'PPI-2023-0088'
const RIZKY = 'PPI-2024-0112'
const YUSUF = 'PPI-2024-0093'
const WAHYU = 'PPI-2022-0045'
const LUKMAN = 'PPI-2025-0071'
const HENDRA = 'PPI-2019-0007'
const DEDI = 'PPI-2025-0034'

export const SEED_OVERTIME: OtRecord[] = [
  seed('LBR-2026-0371', EKO, '2026-09-07', '15.00', '18.00', 'Kejar target PO-2588 tutup botol 24 mm', 'tervalidasi', valid(3, '2026-09-07')),
  seed('LBR-2026-0372', EKO, '2026-09-09', '15.00', '18.00', 'Kejar target PO-2588 tutup botol 24 mm', 'tervalidasi', valid(3, '2026-09-09')),
  seed('LBR-2026-0373', EKO, '2026-09-15', '15.00', '18.00', 'Penyelesaian order PO-2591', 'tervalidasi', valid(3, '2026-09-15')),

  seed('LBR-2026-0380', RIZKY, '2026-09-28', '15.00', '17.30', 'Kejar target PO-2598 tutup galon', 'tervalidasi', valid(2.5, '2026-09-28')),
  seed('LBR-2026-0380', YUSUF, '2026-09-28', '15.00', '17.30', 'Kejar target PO-2598 tutup galon', 'tervalidasi', valid(2.5, '2026-09-28')),
  seed('LBR-2026-0384', EKO, '2026-09-30', '15.00', '18.00', 'Penyelesaian order akhir bulan', 'tervalidasi', valid(3, '2026-09-30')),
  seed('LBR-2026-0391', YUSUF, '2026-10-04', '07.00', '11.00', 'Perawatan mold line 1', 'tervalidasi', valid(4, '2026-10-04')),
  seed('LBR-2026-0388', RIZKY, '2026-10-06', '15.00', '18.00', 'Changeover mold line 2', 'tervalidasi', valid(3, '2026-10-06')),
  seed('LBR-2026-0388', YUSUF, '2026-10-06', '15.00', '18.00', 'Changeover mold line 2', 'tervalidasi', valid(3, '2026-10-06')),
  seed('LBR-2026-0398', EKO, '2026-10-14', '15.00', '17.00', 'Setting ulang mold M-03', 'tervalidasi', valid(2, '2026-10-14')),
  seed('LBR-2026-0395', WAHYU, '2026-10-15', '23.00', '01.00', 'Kejar target PO-2602', 'tervalidasi', valid(2, '2026-10-15')),

  seed('LBR-2026-0410', EKO, '2026-10-21', '15.00', '18.00', 'Kejar target PO-2611 tutup botol 28 mm', 'tervalidasi', {
    dibayar: 3,
    decision: { by: SPV, at: '22 Okt 2026, 08.10 WIB' },
  }),
  seed('LBR-2026-0411', WAHYU, '2026-10-22', '23.00', '02.00', 'Kejar target PO-2611', 'menunggu-validasi'),
  seed('LBR-2026-0412', YUSUF, '2026-10-23', '15.00', '17.00', 'Setting ulang mold M-07', 'menunggu-validasi'),
  seed('LBR-2026-0413', RIZKY, '2026-10-25', '07.00', '15.00', 'Changeover mold line 2', 'tervalidasi', {
    dibayar: 8,
    decision: { by: SPV, at: '26 Okt 2026, 07.40 WIB' },
  }),
  seed('LBR-2026-0413', LUKMAN, '2026-10-25', '07.00', '15.00', 'Changeover mold line 2', 'tervalidasi', {
    dibayar: 7.5,
    decision: { by: SPV, at: '26 Okt 2026, 07.40 WIB' },
  }),
  seed('LBR-2026-0414', HENDRA, '2026-10-24', '08.00', '12.00', 'Audit 5R line injection', 'menunggu-validasi-manager', {
    by: 'Admin HRD',
    byRole: 'admin',
    at: '22 Okt 2026, 10.05 WIB',
  }),
  seed('LBR-2026-0415', DEDI, '2026-10-27', '15.00', '19.00', 'Stok opname akhir bulan', 'terjadwal', {
    by: 'Bambang Hermawan',
    at: '24 Okt 2026, 13.20 WIB',
  }),
  seed('LBR-2026-0416', EKO, '2026-10-29', '15.00', '18.00', 'Persiapan audit pelanggan', 'menunggu-approval', {
    by: 'Admin HRD',
    byRole: 'admin',
    at: '26 Okt 2026, 08.45 WIB',
  }),
  ...(['0417|2026-10-27', '0418|2026-10-28', '0419|2026-10-29', '0420|2026-10-30'] as const).map((k) => {
    const [n, d] = k.split('|')
    return seed(`LBR-2026-${n}`, LUKMAN, d, '15.00', '19.00', 'Kejar target PO-2615', 'terjadwal', { at: '24 Okt 2026, 16.00 WIB' })
  }),
]

export const nextNo = (recs: OtRecord[]) =>
  `LBR-2026-${String(Math.max(...recs.map((r) => Number(r.no.slice(-4)))) + 1).padStart(4, '0')}`

/* ---------- aggregates for Closing Kehadiran / Payroll ---------- */
export const unvalidatedCount = (recs: OtRecord[], from: string, to: string) =>
  recs.filter((r) => r.date >= from && r.date <= to && isAwaitingValidation(effStatus(r))).length

export type RekapRow = {
  nik: string
  hari: number
  jam: number
  pengali: number
  upah: number
  total: number
  lines: { rec: OtRecord; paid: Paid }[]
}

/** Validated totals per employee for one period; the source Payroll reads later. */
export function rekapFor(recs: OtRecord[], scans: Scan[], period: LeavePeriod): RekapRow[] {
  const map = new Map<string, RekapRow>()
  for (const r of recs) {
    if (r.status !== 'tervalidasi' || !inPeriod(r.date, period)) continue
    const e = empOf(r.nik)
    const paid = paidOf(r, realisasiOf(r, scans))!
    const row = map.get(r.nik) ?? { nik: r.nik, hari: 0, jam: 0, pengali: 0, upah: upahSejam(e), total: 0, lines: [] }
    row.hari += 1
    row.jam += paid.jam
    row.pengali += paid.breakdown.pengali
    row.total += paid.nominal
    row.lines.push({ rec: r, paid })
    map.set(r.nik, row)
  }
  const order = ROSTER.map((e) => e.nik)
  return [...map.values()]
    .map((r) => ({ ...r, lines: r.lines.sort((a, b) => a.rec.date.localeCompare(b.rec.date)) }))
    .sort((a, b) => order.indexOf(a.nik) - order.indexOf(b.nik))
}
