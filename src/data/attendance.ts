import type { Role } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'
import { atasanOf, CORE as ROSTER, supervisorLabel, SUPERVISORS, type RosterEmployee, type ShiftId } from '@/data/employees'
import { periodForId, rule } from '@/data/master/attendance-rules'
import { SHIFT_DEFS, shiftDuration, toMinutes } from '@/data/master/shifts'

/** Periode absensi yang datanya dimuat (Oktober 2026). */
const OKT = periodForId('2026-10')
export const PERIOD = {
  label: OKT.label,
  start: OKT.start,
  end: OKT.end,
  cutoff: `${OKT.cutoff} ${OKT.end.slice(0, 4)}`,
}
export const DEFAULT_DATE = '2026-10-20'

export type Shift = { id: ShiftId; label: string; range: string; start: number; end: number }
export const SHIFTS = Object.fromEntries(
  SHIFT_DEFS.map((d) => {
    const start = toMinutes(d.mulai)
    return [
      d.id,
      {
        id: d.id,
        label: d.nama,
        range: `${d.mulai}–${d.selesai}${d.lintasHari ? ' (+1)' : ''}`,
        start,
        end: start + shiftDuration(d) * 60,
      },
    ]
  }),
) as Record<ShiftId, Shift>

export type Scan = { pin: string; date: string; time: string }
export type Audit = { at: string; by: string; action: string; before: string; after: string }
export type Correction = {
  by: string
  role: Role | 'employee'
  alasan: string
  masuk: string
  pulang: string
  lampiran?: string
  at: string
}
export const approverOf = (c: Correction): 'supervisor' | 'manager' => (c.role === 'supervisor' ? 'manager' : 'supervisor')
/** Koreksi dari atasan diteruskan ke atasan si pengaju (mis. Hendra Gunawan → Agus Setiadi). */
export const escalationOf = (c: Pick<Correction, 'by'>) => {
  const e = ROSTER.find((x) => x.nama === c.by)
  return e ? atasanOf(e) : SUPERVISORS.find((s) => s.id === 'manager')
}
export const escalationLabel = (c: Pick<Correction, 'by'>) => supervisorLabel(escalationOf(c))
export type LeaveType = 'Sakit' | 'Izin' | 'Cuti' | 'Dinas'
export type DayRecord = {
  id: string
  date: string
  pin: string | null
  nik: string | null
  shift: ShiftId | null
  masuk: string | null
  pulang: string | null
  pulangNext: boolean
  leave?: { type: LeaveType; note: string }
  alfaConfirmed?: { by: string; at: string }
  pending?: Correction
  corrected?: boolean
  audit: Audit[]
}
export type AttendanceState = {
  scans: Scan[]
  records: DayRecord[]
  pinMap: Record<string, string>
  closed: { at: string; by: string } | null
}

/* ---------- date & time helpers ---------- */
const serial = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}
export const addDays = (iso: string, n: number) => new Date((serial(iso) + n) * 86400000).toISOString().slice(0, 10)
export const isWeekend = (iso: string) => [0, 6].includes(new Date(serial(iso) * 86400000).getUTCDay())
export const toMin = (t: string) => {
  const [h, m] = t.split(/[.:]/).map(Number)
  return h * 60 + m
}
export const toDot = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}.${String(min % 60).padStart(2, '0')}`
export const validTime = (t: string) => /^([01]\d|2[0-3])\.[0-5]\d$/.test(t)
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const dayName = (iso: string) => dayNames[new Date(serial(iso) * 86400000).getUTCDay()]

export function nowStamp() {
  const { hh, mm } = nowTimeWIB()
  return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB`
}

export const workdays = () => {
  const out: string[] = []
  for (let d = PERIOD.start; d <= PERIOD.end; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d)
  return out
}
export const periodDays = () => {
  const out: string[] = []
  for (let d = PERIOD.start; d <= PERIOD.end; d = addDays(d, 1)) out.push(d)
  return out
}

export const empByNik = (nik: string | null) => ROSTER.find((e) => e.nik === nik)

/* ---------- pairing ---------- */
export function pairScans(scans: Scan[], pin: string, date: string, shift: ShiftId | null) {
  const base = serial(date)
  const abs = (s: Scan) => (serial(s.date) - base) * 1440 + toMin(s.time)
  const [lo, hi] = shift === 'malam' ? [1260, 1440 + 540] : [0, 1440]
  const inWindow = scans
    .filter((s) => s.pin === pin)
    .map((s) => ({ s, a: abs(s) }))
    .filter((x) => x.a >= lo && x.a < hi)
    .sort((x, y) => x.a - y.a)
  const kept: { s: Scan; a: number }[] = []
  const ignored: Scan[] = []
  for (const x of inWindow) {
    const last = kept[kept.length - 1]
    if (last && x.a - last.a <= 5) ignored.push(x.s)
    else kept.push(x)
  }
  let masuk: number | null = null
  let pulang: number | null = null
  if (kept.length >= 2) {
    masuk = kept[0].a
    pulang = kept[kept.length - 1].a
  } else if (kept.length === 1) {
    const a = kept[0].a
    if (!shift) masuk = a
    else {
      const sh = SHIFTS[shift]
      if (a < (sh.start + sh.end) / 2) masuk = a
      else pulang = a
    }
  }
  return {
    kept: kept.map((k) => k.s),
    ignored,
    masuk: masuk === null ? null : toDot(masuk),
    pulang: pulang === null ? null : toDot(pulang),
    pulangNext: pulang !== null && pulang >= 1440,
  }
}

/* ---------- tautan pengajuan (Cuti/Izin/Sakit/Dinas) ke status harian ---------- */
/** Diisi dari modul Cuti/Izin lewat `syncDayLinks` (leave.ts); dibaca `describe` sehingga Absensi dan Rekap memakai aturan yang sama. */
export type DayLink = { nik: string; date: string; kind: 'izin-terlambat' | 'izin-cepat' | 'dinas' | 'verif' }
let LINKS = new Map<string, DayLink['kind'][]>()
export function setDayLinks(links: DayLink[]) {
  const m = new Map<string, DayLink['kind'][]>()
  for (const l of links) m.set(`${l.nik}|${l.date}`, [...(m.get(`${l.nik}|${l.date}`) ?? []), l.kind])
  LINKS = m
}
const linksOf = (r: DayRecord) => (r.nik ? LINKS.get(`${r.nik}|${r.date}`) ?? [] : [])

/* ---------- status ---------- */
export type BadgeIcon = 'ok' | 'clock' | 'alert' | 'hourglass' | 'leave' | 'off' | 'pin'
export type Badge = {
  text: string
  variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral'
  icon: BadgeIcon
}
export type Desc = {
  key: 'hadir' | 'telat' | 'cepat' | 'telatcepat' | 'noMasuk' | 'noPulang' | 'alfa' | 'unmapped' | 'leave' | 'pending' | 'verif'
  badges: Badge[]
  anomaly: boolean
  pending: boolean
  telat: number
  cepat: number
  present: boolean
  keterangan: string
}

export function describe(r: DayRecord): Desc {
  const base = { anomaly: false, pending: false, telat: 0, cepat: 0, present: false }
  const links = linksOf(r)
  // Sakit/Dinas yang sudah disetujui Atasan tetapi belum diverifikasi HRD.
  if (links.includes('verif')) {
    return { ...base, key: 'verif', badges: [{ text: 'Menunggu Verifikasi HRD', variant: 'warning', icon: 'hourglass' }], keterangan: 'Sakit/Dinas disetujui Atasan, menunggu verifikasi HRD' }
  }
  // Dinas = Hadir (Dinas): tidak pernah Alfa, scan opsional dan tidak membuat Telat/Pulang Cepat/anomali.
  if (links.includes('dinas') || r.leave?.type === 'Dinas') {
    return { ...base, key: 'leave', badges: [{ text: 'Hadir (Dinas)', variant: 'success', icon: 'ok' }], present: true, keterangan: r.leave?.note ?? 'Dinas disetujui dan terverifikasi' }
  }
  if (r.leave) {
    return { ...base, key: 'leave', badges: [{ text: r.leave.type, variant: 'info', icon: 'leave' }], present: false, keterangan: r.leave.note }
  }
  if (r.pending) {
    const toManager = approverOf(r.pending) === 'manager'
    return {
      ...base,
      key: 'pending',
      pending: true,
      badges: [{ text: toManager ? 'Menunggu Approval Manager' : 'Menunggu Approval', variant: 'info', icon: 'hourglass' }],
      keterangan: toManager ? `Diteruskan ke ${escalationLabel(r.pending)}` : `Koreksi oleh ${r.pending.by}: ${r.pending.alasan}`,
    }
  }
  if (!r.nik) {
    return {
      ...base,
      key: 'unmapped',
      anomaly: true,
      badges: [{ text: 'PIN Tidak Terdaftar', variant: 'danger', icon: 'pin' }],
      keterangan: `PIN ${r.pin} belum dipetakan ke pegawai`,
    }
  }
  if (!r.masuk && !r.pulang) {
    const ok = !!r.alfaConfirmed
    return {
      ...base,
      key: 'alfa',
      anomaly: !ok,
      badges: [{ text: 'Alfa', variant: 'danger', icon: 'alert' }],
      keterangan: ok ? `Alfa dikonfirmasi oleh ${r.alfaConfirmed!.by}` : 'Tidak ada scan dan tidak ada pengajuan',
    }
  }
  if (!r.masuk)
    return { ...base, key: 'noMasuk', anomaly: true, badges: [{ text: 'Tidak Scan Masuk', variant: 'danger', icon: 'alert' }], keterangan: 'Scan masuk tidak ditemukan' }
  if (!r.pulang)
    return { ...base, key: 'noPulang', anomaly: true, badges: [{ text: 'Tidak Scan Pulang', variant: 'danger', icon: 'alert' }], keterangan: 'Scan pulang tidak ditemukan' }

  const sh = SHIFTS[r.shift!]
  const rawTelat = Math.max(0, toMin(r.masuk) - sh.start)
  const telatRaw = rawTelat <= rule('toleransi').menit ? 0 : rawTelat
  const pulangAbs = toMin(r.pulang) + (r.pulangNext ? 1440 : 0)
  const cepatRaw = Math.max(0, sh.end - pulangAbs)
  // Izin Terlambat/Pulang Cepat yang disetujui mengubah status hari itu: tidak masuk KPI Telat dan tanpa dampak gaji.
  const izinT = telatRaw > 0 && links.includes('izin-terlambat')
  const izinC = cepatRaw > 0 && links.includes('izin-cepat')
  const telat = izinT ? 0 : telatRaw
  const cepat = izinC ? 0 : cepatRaw
  const badges: Badge[] = []
  const notes: string[] = []
  if (izinT) {
    badges.push({ text: 'Izin Terlambat', variant: 'info', icon: 'leave' })
    notes.push(`Izin Terlambat disetujui (datang ${telatRaw} menit setelah shift)`)
  }
  if (telat) {
    badges.push({ text: 'Telat', variant: 'warning', icon: 'clock' })
    notes.push(`Telat ${telat} menit`)
  }
  if (izinC) {
    badges.push({ text: 'Izin Pulang Cepat', variant: 'info', icon: 'leave' })
    notes.push(`Izin Pulang Cepat disetujui (pulang ${cepatRaw} menit lebih awal)`)
  }
  if (cepat) {
    badges.push({ text: 'Pulang Cepat', variant: 'warning', icon: 'clock' })
    notes.push(`Pulang ${cepat} menit lebih awal`)
  }
  if (!badges.length) badges.push({ text: 'Hadir', variant: 'success', icon: 'ok' })
  return {
    ...base,
    key: telat && cepat ? 'telatcepat' : telat ? 'telat' : cepat ? 'cepat' : 'hadir',
    telat,
    cepat,
    present: true,
    badges,
    keterangan: notes.join(' · '),
  }
}

export function durasi(r: DayRecord) {
  if (!r.masuk || !r.pulang) return null
  const m = toMin(r.pulang) + (r.pulangNext ? 1440 : 0) - toMin(r.masuk)
  if (m <= 0) return null
  return `${Math.floor(m / 60)}j ${String(m % 60).padStart(2, '0')}m`
}

export function periodStats(records: DayRecord[]) {
  let anomali = 0
  let pending = 0
  let telat = 0
  let present = 0
  let leave = 0
  for (const r of records) {
    const d = describe(r)
    if (d.anomaly) anomali++
    if (d.pending) pending++
    if (d.telat) telat++
    if (d.present) present++
    if (r.leave && r.leave.type !== 'Dinas') leave++
  }
  const denom = records.length - leave
  return { anomali, pending, telat, rate: denom ? (present / denom) * 100 : 0 }
}

export type RecapRow = {
  emp: RosterEmployee
  hariKerja: number
  hadir: number
  telat: number
  telatMenit: number
  cepat: number
  sakit: number
  izin: number
  cuti: number
  dinas: number
  alfa: number
}
export function buildRecap(records: DayRecord[]): RecapRow[] {
  const rows: RecapRow[] = []
  for (const emp of ROSTER) {
    const mine = records.filter((r) => r.nik === emp.nik || (!r.nik && r.pin && r.pin === emp.pin))
    if (!mine.length) continue
    const row: RecapRow = { emp, hariKerja: mine.length, hadir: 0, telat: 0, telatMenit: 0, cepat: 0, sakit: 0, izin: 0, cuti: 0, dinas: 0, alfa: 0 }
    for (const r of mine) {
      const d = describe(r)
      if (r.leave && r.leave.type !== 'Dinas') row[r.leave.type.toLowerCase() as 'sakit' | 'izin' | 'cuti']++
      else if (d.key === 'leave' && d.present) {
        // Hadir (Dinas): dihitung hari hadir dan tetap tampil di kolom Dinas.
        row.hadir++
        row.dinas++
      } else if (d.key === 'verif') row.dinas++
      else if (d.key === 'alfa' && r.alfaConfirmed) row.alfa++
      else if (d.present) {
        row.hadir++
        if (d.telat) {
          row.telat++
          row.telatMenit += d.telat
        }
        if (d.cepat) row.cepat++
      }
    }
    rows.push(row)
  }
  return rows
}

/* ---------- seed data ---------- */
type Kind = 'telat' | 'cepat' | 'alfa' | 'sakit' | 'izin' | 'cuti' | 'dinas'
const PLANS: Record<string, Partial<Record<Kind, number>>> = {
  'PPI-2024-0112': { telat: 1, cuti: 1 },
  'PPI-2024-0093': { telat: 4, cepat: 1, cuti: 1 },
  'PPI-2025-0034': { telat: 5, cepat: 1, alfa: 1 },
  'PPI-2023-0102': { telat: 1, cepat: 1, sakit: 1 },
  'PPI-2022-0033': { telat: 1, cuti: 2, dinas: 1 },
  'PPI-2023-0088': { telat: 3, alfa: 1 },
  'PPI-2024-0127': { telat: 2, cepat: 1, izin: 2 },
  'PPI-2022-0045': { telat: 4, alfa: 1 },
  'PPI-2023-0110': { telat: 4 },
  'PPI-2025-0068': { telat: 2 },
  'PPI-2021-0019': { telat: 2, alfa: 2 },
  'PPI-2025-0051': { telat: 2, cepat: 1, izin: 1 },
  'PPI-2024-0076': { sakit: 2 },
  'PPI-2022-0061': { izin: 1, dinas: 3 },
  'PPI-2025-0071': { telat: 1, alfa: 2 },
}
const FORCED_TELAT: Record<string, string[]> = { 'PPI-2024-0093': ['2026-10-01', '2026-10-06', '2026-10-13'] }
const LEAVE_NOTE: Record<string, string> = {
  sakit: 'Surat dokter, disetujui',
  izin: 'Izin keperluan keluarga, disetujui',
  cuti: 'Cuti tahunan, disetujui',
  dinas: 'Dinas luar kota',
}
const TELAT_MIN = [4, 9, 15, 6, 22, 3, 11, 18, 7, 13, 5, 27, 2, 10]
const CEPAT_MIN = [25, 45, 70, 35, 55]

const DAY20: Record<string, [string, string][]> = {
  '1012': [['2026-10-20', '06:52'], ['2026-10-20', '06:53'], ['2026-10-20', '15:04']],
  '1019': [['2026-10-20', '07:01'], ['2026-10-20', '15:00']],
  '1027': [['2026-10-20', '07:12'], ['2026-10-20', '15:01']],
  '1033': [['2026-10-20', '06:58'], ['2026-10-20', '13:40']],
  '1038': [['2026-10-20', '06:50'], ['2026-10-20', '15:10']],
  '1041': [['2026-10-20', '07:00']],
  '1051': [['2026-10-20', '14:55'], ['2026-10-20', '23:06']],
  '1056': [['2026-10-20', '23:02']],
  '1062': [['2026-10-20', '15:20'], ['2026-10-20', '23:00']],
  '1045': [['2026-10-20', '22:50'], ['2026-10-21', '07:05']],
  '1074': [['2026-10-20', '07:58'], ['2026-10-20', '17:02']],
  '1092': [['2026-10-20', '07:03'], ['2026-10-20', '15:02']],
}

const fmtMin = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/* Scans around overtime (SPL) days; Lembur realisasi is read from these, never typed twice. */
const OT_SCANS: [string, string, string][] = [
  ['1041', '2026-09-07', '06:52'], ['1041', '2026-09-07', '18:04'],
  ['1041', '2026-09-09', '06:55'], ['1041', '2026-09-09', '18:07'],
  ['1041', '2026-09-15', '06:58'], ['1041', '2026-09-15', '18:02'],
  ['1012', '2026-09-28', '17:34'], ['1019', '2026-09-28', '17:31'],
  ['1041', '2026-09-30', '18:10'],
  ['1019', '2026-10-04', '06:58'], ['1019', '2026-10-04', '11:05'],
  ['1012', '2026-10-06', '18:06'], ['1019', '2026-10-06', '18:11'],
  ['1041', '2026-10-14', '17:08'],
  ['1056', '2026-10-16', '01:04'],
  ['1041', '2026-10-21', '06:52'], ['1041', '2026-10-21', '18:12'],
  ['1056', '2026-10-22', '14:55'], ['1056', '2026-10-23', '01:40'],
  ['1019', '2026-10-23', '06:58'], ['1019', '2026-10-23', '18:05'],
  ['1001', '2026-10-24', '08:02'], ['1001', '2026-10-24', '12:10'],
  ['1012', '2026-10-25', '06:55'], ['1012', '2026-10-25', '15:05'],
  ['1092', '2026-10-25', '07:10'], ['1092', '2026-10-25', '15:02'],
]

export function buildInitial(): AttendanceState {
  const scans: Scan[] = OT_SCANS.map(([pin, date, time]) => ({ pin, date, time }))
  const records: DayRecord[] = []
  const days = workdays()
  const hist = days.slice(0, -1)
  const last = days[days.length - 1]
  const pinMap: Record<string, string> = {}
  const mk = (emp: RosterEmployee | null, pin: string, date: string, extra: Partial<DayRecord> = {}) => {
    const p = pairScans(scans, pin, date, emp ? emp.shift : null)
    records.push({
      id: `${emp ? emp.nik : `pin:${pin}`}|${date}`,
      date,
      pin,
      nik: emp ? emp.nik : null,
      shift: emp ? emp.shift : null,
      masuk: p.masuk,
      pulang: p.pulang,
      pulangNext: p.pulangNext,
      audit: [],
      ...extra,
    })
  }

  ROSTER.forEach((emp, ei) => {
    if (!PLANS[emp.nik]) return
    if (emp.pin) pinMap[emp.pin] = emp.nik
    planFor(emp, ei)
  })

  function planFor(emp: RosterEmployee, ei: number) {
    const plan = PLANS[emp.nik]
    const pin = emp.pin ?? '1092'
    const sh = SHIFTS[emp.shift]
    const slots = new Map<number, Kind>()
    // Hari telat yang dipaksa (skenario Izin Terlambat Yusuf Maulana); sisa rencana dibagi seperti biasa.
    const forcedDates = FORCED_TELAT[emp.nik] ?? []
    const left: Partial<Record<Kind, number>> = { ...plan }
    for (const d of forcedDates) {
      const idx = hist.indexOf(d)
      if (idx >= 0) {
        slots.set(idx, 'telat')
        left.telat = Math.max(0, (left.telat ?? 0) - 1)
      }
    }
    let k = 0
    for (const kind of Object.keys(left) as Kind[]) {
      for (let c = 0; c < (left[kind] ?? 0); c++, k++) {
        let idx = (ei * 3 + k * 5 + 2) % hist.length
        while (slots.has(idx)) idx = (idx + 1) % hist.length
        slots.set(idx, kind)
      }
    }
    hist.forEach((date, i) => {
      const kind = slots.get(i)
      if (kind === 'alfa') {
        mk(emp, pin, date, { alfaConfirmed: { by: 'Teddy Syahputra', at: date }, audit: [{ at: `${formatDate(addDays(date, 1))}, 09.00 WIB`, by: 'Teddy Syahputra', action: 'Konfirmasi Alfa', before: 'Alfa (belum dikonfirmasi)', after: 'Alfa (dikonfirmasi)' }] })
        return
      }
      if (kind && kind !== 'telat' && kind !== 'cepat') {
        mk(emp, pin, date, { leave: { type: (kind[0].toUpperCase() + kind.slice(1)) as LeaveType, note: LEAVE_NOTE[kind] } })
        return
      }
      const j = (i * 7 + ei * 3) % 14
      let masuk = sh.start - 1 - (j % 12)
      let pulang = sh.end + (j % 9)
      if (kind === 'telat') masuk = sh.start + (forcedDates.includes(date) ? 12 + (i % 4) * 4 : TELAT_MIN[(i + ei) % TELAT_MIN.length])
      if (kind === 'cepat') pulang = sh.end - CEPAT_MIN[(i + ei) % CEPAT_MIN.length]
      const pDate = pulang >= 1440 ? addDays(date, 1) : date
      scans.push({ pin, date, time: fmtMin(masuk) })
      if (j % 5 === 0) scans.push({ pin, date, time: fmtMin(masuk + 2) })
      scans.push({ pin, date: pDate, time: fmtMin(pulang) })
      mk(emp, pin, date)
    })
    // 20 Okt
    const p20 = DAY20[pin]
    if (p20) p20.forEach(([date, time]) => scans.push({ pin, date, time }))
    if (emp.nik === 'PPI-2025-0071') {
      mk(null, '1092', last)
      return
    }
    if (emp.nik === 'PPI-2024-0076') return mk(emp, pin, last, { leave: { type: 'Sakit', note: 'Surat dokter, disetujui' } })
    if (emp.nik === 'PPI-2022-0061') return mk(emp, pin, last, { leave: { type: 'Dinas', note: 'Dinas ke Cikarang' } })
    if (emp.nik === 'PPI-2023-0088')
      return mk(emp, pin, last, {
        pending: { by: 'Teddy Syahputra', role: 'hr_personalia', alasan: 'Lupa scan pulang, pulang 15.05 (konfirmasi leader line 2)', lampiran: 'konfirmasi-leader-line-2.pdf', masuk: '07.00', pulang: '15.05', at: '20 Okt 2026, 16.10 WIB' },
        audit: [{ at: '20 Okt 2026, 16.10 WIB', by: 'Teddy Syahputra', action: 'Mengajukan koreksi', before: 'Tidak Scan Pulang', after: 'Menunggu Approval' }],
      })
    if (emp.nik === 'PPI-2023-0110')
      return mk(emp, pin, last, {
        pending: { by: 'Sri Mulyani', role: 'employee', alasan: 'Mesin absen gate 2 error, masuk 14.55', masuk: '14.55', pulang: '23.00', at: '21 Okt 2026, 00.05 WIB' },
        audit: [{ at: '21 Okt 2026, 00.05 WIB', by: 'Sri Mulyani (self-service)', action: 'Mengajukan koreksi', before: 'Telat 20 menit', after: 'Menunggu Approval' }],
      })
    mk(emp, pin, last)
  }

  return { scans, records, pinMap, closed: null }
}

/* ---------- CSV import ---------- */
export type ParsedCsv = { error?: string; rows: Scan[]; invalid: number }
export function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { error: 'File kosong.', rows: [], invalid: 0 }
  const head = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase())
  const ix = { pin: head.indexOf('pin'), tgl: head.indexOf('tanggal'), jam: head.indexOf('jam') }
  if (ix.pin < 0 || ix.tgl < 0 || ix.jam < 0)
    return { error: 'Kolom tidak lengkap. Kolom wajib: PIN, Tanggal (YYYY-MM-DD), Jam (HH:MM).', rows: [], invalid: 0 }
  const rows: Scan[] = []
  let invalid = 0
  for (const line of lines.slice(1)) {
    const c = line.split(/[,;]/).map((x) => x.trim())
    const pin = c[ix.pin]
    const date = c[ix.tgl]
    const jam = c[ix.jam]
    const okDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && !Number.isNaN(Date.parse(date))
    const okTime = /^([01]?\d|2[0-3]):[0-5]\d$/.test(jam ?? '')
    if (!/^\d+$/.test(pin ?? '') || !okDate || !okTime) {
      invalid++
      continue
    }
    rows.push({ pin, date, time: jam.padStart(5, '0') })
  }
  if (!rows.length) return { error: 'Tidak ada baris valid pada file.', rows, invalid }
  return { rows, invalid }
}

export const scanKey = (s: Scan) => `${s.pin}|${s.date}|${s.time}`

export function previewImport(rows: Scan[], store: AttendanceState) {
  const abs = (s: Scan) => serial(s.date) * 1440 + toMin(s.time)
  const byPin = new Map<string, Scan[]>()
  rows.forEach((r) => byPin.set(r.pin, [...(byPin.get(r.pin) ?? []), r]))
  const dupKeys = new Set<string>()
  byPin.forEach((list) => {
    const sorted = [...list].sort((a, b) => abs(a) - abs(b))
    let lastA = -Infinity
    for (const s of sorted) {
      if (abs(s) - lastA <= 5) dupKeys.add(scanKey(s) + '#' + abs(s))
      else lastA = abs(s)
    }
  })
  const dates = rows.map((r) => r.date).sort()
  const have = new Set(store.scans.map(scanKey))
  const unregistered = [...byPin.keys()].filter((p) => !store.pinMap[p])
  return {
    total: rows.length,
    pins: byPin.size,
    from: dates[0],
    to: dates[dates.length - 1],
    dupes: dupKeys.size,
    unregistered: unregistered.length,
    existing: rows.filter((r) => have.has(scanKey(r))).length,
    isDupe: (s: Scan) => dupKeys.has(scanKey(s) + '#' + abs(s)),
    isUnregistered: (s: Scan) => !store.pinMap[s.pin],
    isExisting: (s: Scan) => have.has(scanKey(s)),
  }
}

const reparable = (r: DayRecord) => !r.leave && !r.pending && !r.corrected && !r.alfaConfirmed

export function repairRecord(r: DayRecord, scans: Scan[]): DayRecord {
  const p = pairScans(scans, r.pin!, r.date, r.shift)
  return { ...r, masuk: p.masuk, pulang: p.pulang, pulangNext: p.pulangNext }
}

export function ingest(state: AttendanceState, rows: Scan[]) {
  const have = new Set(state.scans.map(scanKey))
  const fresh: Scan[] = []
  rows.forEach((r) => {
    if (!have.has(scanKey(r))) {
      have.add(scanKey(r))
      fresh.push(r)
    }
  })
  const scans = [...state.scans, ...fresh]
  let records = state.records
  const touched = new Set<string>()
  for (const s of fresh) {
    const nik = state.pinMap[s.pin]
    const emp = empByNik(nik ?? null)
    const date = emp?.shift === 'malam' && toMin(s.time) < 540 ? addDays(s.date, -1) : s.date
    touched.add(`${s.pin}|${date}`)
  }
  touched.forEach((k) => {
    const [pin, date] = k.split('|')
    if (date < PERIOD.start || date > PERIOD.end) return
    const idx = records.findIndex((r) => r.pin === pin && r.date === date)
    if (idx >= 0) {
      if (reparable(records[idx])) records = records.map((r, i) => (i === idx ? repairRecord(r, scans) : r))
    } else if (!isWeekend(date)) {
      const emp = empByNik(state.pinMap[pin] ?? null)
      const p = pairScans(scans, pin, date, emp?.shift ?? null)
      records = [
        ...records,
        { id: `${emp ? emp.nik : `pin:${pin}`}|${date}`, date, pin, nik: emp?.nik ?? null, shift: emp?.shift ?? null, masuk: p.masuk, pulang: p.pulang, pulangNext: p.pulangNext, audit: [] },
      ]
    }
  })
  return { scans, records, fresh: fresh.length, existing: rows.length - fresh.length }
}

export function statusLabel(r: DayRecord) {
  return describe(r).badges.map((b) => b.text).join(' + ')
}
