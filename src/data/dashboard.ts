import { addDays, describe, empByNik, isWeekend, periodStats, type DayRecord } from '@/data/attendance'
import { isWorkday, type LeaveRequest } from '@/data/leave'
import { periodForId, type AttPeriod } from '@/data/master/attendance-rules'
import { seededSickCategory } from '@/data/master/sick-categories'
import { inScope, type CurrentUser } from '@/data/users'
import { DEMO_TODAY } from '@/lib/today'

/** Data Dashboard dihitung dari data hidup (Absensi, Cuti/Izin/Sakit, Koperasi); tidak ada angka dashboard yang di-seed terpisah. */
export const ALL_DEPT = 'all'

/* =============================== Presensi =============================== */
const prevId = (id: string) => {
  const [y, m] = id.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
export const PRES_PERIOD_IDS = ['2026-10', '2026-11']
export const presPeriodLabel = (p: AttPeriod) => `${p.label} · ${p.cutoff}${inRange(DEMO_TODAY, p) ? ' (berjalan)' : ''}`

const inRange = (iso: string, p: { start: string; end: string }) => iso >= p.start && iso <= p.end
const deptOf = (nik: string | null) => empByNik(nik)?.department ?? 'Tanpa department'

function scopeRecords(records: DayRecord[], user: CurrentUser, dept: string) {
  return records.filter((r) => inScope(user, empByNik(r.nik)) && (dept === ALL_DEPT || deptOf(r.nik) === dept))
}

export type SickDay = { nik: string; date: string; kategori: string }
/** Hari sakit = catatan Absensi bertanda Sakit + hari kerja pada pengajuan Sakit yang sudah Disetujui dan diverifikasi HRD. */
export function sickDays(records: DayRecord[], requests: LeaveRequest[], user: CurrentUser, dept: string): SickDay[] {
  const out = new Map<string, SickDay>()
  for (const r of scopeRecords(records, user, dept)) {
    if (r.leave?.type === 'Sakit' && r.nik) out.set(`${r.nik}|${r.date}`, { nik: r.nik, date: r.date, kategori: seededSickCategory(r.id) })
  }
  for (const q of requests) {
    if (q.jenis !== 'Sakit' || q.status !== 'disetujui') continue
    const emp = empByNik(q.nik)
    if (!emp || !inScope(user, emp) || (dept !== ALL_DEPT && emp.department !== dept)) continue
    for (let d = q.start; d <= q.end; d = addDays(d, 1)) {
      if (!isWorkday(d, emp)) continue
      const k = `${q.nik}|${d}`
      if (!out.has(k)) out.set(k, { nik: q.nik, date: d, kategori: q.kategori ?? 'Lainnya' })
    }
  }
  return [...out.values()]
}
const sickIn = (days: SickDay[], p: { start: string; end: string }) => days.filter((s) => inRange(s.date, p))
const uniq = (days: SickDay[]) => new Set(days.map((s) => s.nik)).size

function counts(recs: DayRecord[]) {
  let present = 0, nonDinasLeave = 0, sakit = 0, izin = 0, cuti = 0, alfa = 0
  for (const r of recs) {
    const d = describe(r)
    if (d.present) present++
    if (r.leave && r.leave.type !== 'Dinas') nonDinasLeave++
    if (r.leave?.type === 'Sakit') sakit++
    if (r.leave?.type === 'Izin') izin++
    if (r.leave?.type === 'Cuti') cuti++
    if (d.key === 'alfa') alfa++
  }
  return { present, terjadwal: recs.length - nonDinasLeave, sakit, izin, cuti, alfa }
}

export type DayPoint = { tanggal: string; label: string; cur: number | null; prev: number | null; hadir: number; terjadwal: number; sakit: number; izin: number; cuti: number; alfa: number }
export type DeptBar = { dept: string; value: number }
export type AnomalyRow = { id: string; tanggal: string; nik: string | null; nama: string; department: string; jenis: string }

export type PresensiData = {
  hasData: boolean
  rate: number | null
  rateDelta: number | null
  present: number
  terjadwal: number
  sickPeople: number
  sickDays: number
  telat: number
  telatDelta: number | null
  hasPrev: boolean
  anomali: number
  week: DayPoint[]
  weekEnd: string | null
  monthly: { bulan: string; pegawai: number; hari: number }[]
  sickByDept: DeptBar[]
  kategori: { nama: string; hari: number; pct: number }[]
  telatByDept: DeptBar[]
  anomalyRows: AnomalyRow[]
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const dow = (iso: string) => DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()]

export function presensiData(records: DayRecord[], requests: LeaveRequest[], user: CurrentUser, periodId: string, dept: string): PresensiData {
  const period = periodForId(periodId)
  const prev = periodForId(prevId(periodId))
  const scoped = scopeRecords(records, user, dept)
  const recs = scoped.filter((r) => inRange(r.date, period))
  const prevRecs = scoped.filter((r) => inRange(r.date, prev))
  const st = periodStats(recs)
  const stPrev = periodStats(prevRecs)
  const c = counts(recs)
  const sick = sickDays(records, requests, user, dept)
  const sickP = sickIn(sick, period)
  const hasPrev = prevRecs.length > 0

  // 7 hari kerja terakhir yang punya data Absensi (data absensi belum dimuat setelah tanggal terakhir catatan).
  const datesWithData = [...new Set(scoped.map((r) => r.date))].filter((d) => d <= DEMO_TODAY && !isWeekend(d)).sort()
  const last7 = datesWithData.slice(-7)
  const byDate = new Map<string, DayRecord[]>()
  for (const r of scoped) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r])
  const rateOf = (rs: DayRecord[] | undefined) => {
    if (!rs?.length) return null
    const k = counts(rs)
    return k.terjadwal ? (k.present / k.terjadwal) * 100 : null
  }
  const week: DayPoint[] = last7.map((d) => {
    const rs = byDate.get(d) ?? []
    const k = counts(rs)
    return {
      tanggal: d,
      label: `${dow(d)} ${Number(d.slice(8))}`,
      cur: rateOf(rs),
      prev: rateOf(byDate.get(addDays(d, -7))),
      hadir: k.present, terjadwal: k.terjadwal, sakit: k.sakit, izin: k.izin, cuti: k.cuti, alfa: k.alfa,
    }
  })

  const monthly = Array.from({ length: 10 }, (_, i) => {
    const p = periodForId(`2026-${String(i + 1).padStart(2, '0')}`)
    const s = sickIn(sick, p)
    return { bulan: BULAN[i], pegawai: uniq(s), hari: s.length }
  })

  const tally = (items: string[]): DeptBar[] => {
    const m = new Map<string, number>()
    for (const k of items) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m.entries()].map(([d, value]) => ({ dept: d, value })).sort((a, b) => b.value - a.value || a.dept.localeCompare(b.dept))
  }
  const sickByDept = tally(sickP.map((s) => deptOf(s.nik)))
  const telatByDept = tally(recs.filter((r) => describe(r).telat).map((r) => deptOf(r.nik)))

  const kat = tally(sickP.map((s) => s.kategori)).map((x) => ({ nama: x.dept, hari: x.value }))
  const main = kat.filter((k) => k.nama !== 'Lainnya')
  const top = main.slice(0, 5)
  const rest = main.slice(5).reduce((a, k) => a + k.hari, 0) + (kat.find((k) => k.nama === 'Lainnya')?.hari ?? 0)
  const rows = rest ? [...top, { nama: 'Lainnya', hari: rest }] : top
  const kategori = rows.map((k) => ({ ...k, pct: sickP.length ? (k.hari / sickP.length) * 100 : 0 }))

  const anomalyRows = recs
    .filter((r) => describe(r).anomaly)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((r) => ({
      id: r.id,
      tanggal: r.date,
      nik: r.nik,
      nama: empByNik(r.nik)?.nama ?? `PIN ${r.pin ?? '—'} (belum terpetakan)`,
      department: empByNik(r.nik)?.department ?? '—',
      jenis: describe(r).badges.map((b) => b.text).join(' + '),
    }))

  const rate = recs.length && c.terjadwal ? st.rate : null
  const ratePrev = prevRecs.length && counts(prevRecs).terjadwal ? stPrev.rate : null
  return {
    hasData: recs.length > 0,
    rate,
    rateDelta: rate != null && ratePrev != null ? rate - ratePrev : null,
    present: c.present,
    terjadwal: c.terjadwal,
    sickPeople: uniq(sickP),
    sickDays: sickP.length,
    telat: st.telat,
    telatDelta: hasPrev && recs.length ? st.telat - stPrev.telat : null,
    hasPrev,
    anomali: st.anomali,
    week,
    weekEnd: last7.length ? last7[last7.length - 1] : null,
    monthly,
    sickByDept,
    kategori,
    telatByDept,
    anomalyRows,
  }
}
