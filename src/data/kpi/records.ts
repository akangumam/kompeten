import { can, canOpen } from '@/lib/access'
import { useSyncExternalStore } from 'react'
import { buildInitial, periodStats, type DayRecord } from '@/data/attendance'
import { atasanName } from '@/data/directory'
import { ROSTER, SUPERVISORS, type RosterEmployee } from '@/data/employees'
import { hasLeft } from '@/data/offboarding'
import { periodForId } from '@/data/master/attendance-rules'
import { MAX_CAPAIAN, templateOf, type Indicator } from '@/data/master/kpi'
import { notify } from '@/data/notifications'
import type { CurrentUser, Role } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'

export type KpiStatus = 'belum' | 'draft' | 'diajukan' | 'disetujui' | 'dikembalikan'
export const KPI_STATUS_LABEL: Record<KpiStatus, string> = { belum: 'Belum diinput', draft: 'Draft', diajukan: 'Diajukan', disetujui: 'Disetujui', dikembalikan: 'Dikembalikan' }

export type KpiRecord = {
  id: string
  nik: string
  /** YYYY-MM, mengikuti id periode kehadiran. */
  bulan: string
  posisi: string
  penilai: string
  realisasi: Record<string, number | null>
  bukti: Record<string, { name: string; size: number }>
  status: Exclude<KpiStatus, 'belum'>
  /** Snapshot template dan nilai, disimpan saat Disetujui. */
  tpl?: Indicator[]
  nilai?: number
  diajukan?: { by: string; at: string }
  disetujui?: { by: string; at: string; mewakili?: string }
  dikembalikan?: { by: string; at: string; alasan: string }
}

export const KPI_RECORDS: KpiRecord[] = []
export const recordOf = (nik: string, bulan: string) => KPI_RECORDS.find((r) => r.nik === nik && r.bulan === bulan)

let version = 0
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
export const useKpi = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const monthLabel = (id: string) => `${MONTHS_FULL[Number(id.slice(5, 7)) - 1]} ${id.slice(0, 4)}`
export const monthIds = (tahun: number) => Array.from({ length: 12 }, (_, i) => `${tahun}-${String(i + 1).padStart(2, '0')}`)
export const DEFAULT_MONTH = DEMO_TODAY.slice(0, 7)
/** Bulan bisa diisi setelah periode kehadirannya closing (periode berakhir sebelum hari ini). */
export const monthClosed = (bulan: string) => periodForId(bulan).end < DEMO_TODAY

const stamp = () => { const { hh, mm } = nowTimeWIB(); return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB` }
const r1 = (n: number) => Math.round(n * 10) / 10

// ---------- hitung ----------
export function capaianOf(i: Indicator, real: number | null | undefined): number | null {
  if (real == null || !Number.isFinite(real)) return null
  if (i.arah === 'naik') return i.target > 0 ? Math.min(MAX_CAPAIAN, (real / i.target) * 100) : null
  return real === 0 ? MAX_CAPAIAN : Math.min(MAX_CAPAIAN, (i.target / real) * 100)
}
export type KpiItem = { ind: Indicator; real: number | null; capaian: number | null; skor: number | null }
export type KpiScore = { items: KpiItem[]; filled: number; total: number; nilai: number | null }
export function evalKpi(tpl: Indicator[] | undefined, real: Record<string, number | null | undefined>): KpiScore {
  const items = (tpl ?? []).map((ind) => {
    const v = real[ind.id] ?? null
    const capaian = capaianOf(ind, v)
    return { ind, real: v, capaian, skor: capaian == null ? null : (capaian * ind.bobot) / 100 }
  })
  const filled = items.filter((i) => i.capaian != null).length
  return { items, filled, total: items.length, nilai: items.length && filled === items.length ? items.reduce((a, i) => a + (i.skor ?? 0), 0) : null }
}

/** Realisasi otomatis dari Absensi untuk periode kehadiran bulan itu (null bila belum ada data). */
export function autoFromRecords(records: DayRecord[], nik: string, bulan: string): { hadir: number | null; telat: number | null } {
  const p = periodForId(bulan)
  const recs = records.filter((r) => r.nik === nik && r.date >= p.start && r.date <= p.end)
  if (!recs.length) return { hadir: null, telat: null }
  const st = periodStats(recs)
  return { hadir: r1(st.rate), telat: st.telat }
}

// ---------- baris ----------
export type KpiRow = { emp: RosterEmployee; posisi: string; rec?: KpiRecord }
const activeEmp = (e: RosterEmployee) => e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik)
export function rowsFor(bulan: string, posisi: string, user: CurrentUser): KpiRow[] {
  const inScope = (e: RosterEmployee) => user.role !== 'supervisor' || e.atasanId === user.nik
  const out = new Map<string, KpiRow>()
  for (const e of ROSTER) {
    if (e.posisi !== posisi || !activeEmp(e) || !inScope(e)) continue
    out.set(e.nik, { emp: e, posisi, rec: recordOf(e.nik, bulan) })
  }
  return [...out.values()].sort((a, b) => a.emp.nama.localeCompare(b.emp.nama))
}
export const statusOf = (r: KpiRow): KpiStatus => r.rec?.status ?? 'belum'
export const tahunOf = (bulan: string) => Number(bulan.slice(0, 4))
/** Template yang dipakai: snapshot bila Disetujui, selain itu template tahun berjalan. */
export const tplOfRow = (r: KpiRow, bulan: string): Indicator[] | undefined =>
  r.rec?.status === 'disetujui' && r.rec.tpl ? r.rec.tpl : templateOf(r.posisi, tahunOf(bulan))?.indikator

/** Realisasi yang berlaku: tersimpan untuk Diajukan/Disetujui; Draft memakai Absensi hidup untuk indikator otomatis. */
export function realisasiOf(r: KpiRow, bulan: string, attendance: DayRecord[]): Record<string, number | null> {
  const tpl = tplOfRow(r, bulan) ?? []
  const stored = r.rec?.realisasi ?? {}
  if (r.rec && (r.rec.status === 'diajukan' || r.rec.status === 'disetujui')) return { ...stored }
  const auto = autoFromRecords(attendance, r.emp.nik, bulan)
  const out: Record<string, number | null> = { ...stored }
  for (const i of tpl) {
    if (i.sumber === 'auto-hadir' && auto.hadir != null) out[i.id] = auto.hadir
    if (i.sumber === 'auto-telat' && auto.telat != null) out[i.id] = auto.telat
  }
  return out
}
export function scoreOfRow(r: KpiRow, bulan: string, attendance: DayRecord[]): KpiScore {
  if (r.rec?.status === 'disetujui' && r.rec.nilai != null) return evalKpi(r.rec.tpl, r.rec.realisasi)
  if (!r.rec) return evalKpi(tplOfRow(r, bulan), {})
  return evalKpi(tplOfRow(r, bulan), realisasiOf(r, bulan, attendance))
}

// ---------- penyetuju ----------
/** Penyetuju berikutnya = atasan dari penilai (Matriks Penyetuju: Atasan → atasannya); HR & GA Manager boleh mewakili. */
export function approverFor(emp: RosterEmployee): { id: string; nama: string } {
  const penilai = ROSTER.find((e) => e.nik === emp.atasanId)
  const nextId = penilai?.atasanId ?? 'manager'
  const sup = SUPERVISORS.find((s) => s.id === nextId)
  return { id: sup?.id ?? 'manager', nama: sup?.nama ?? atasanName(nextId) }
}
export const canInput = (user: CurrentUser, r: KpiRow, bulan: string) =>
  user.role === 'supervisor' && r.emp.atasanId === user.nik && monthClosed(bulan) && ['belum', 'draft', 'dikembalikan'].includes(statusOf(r))
export function canApprove(user: CurrentUser, r: KpiRow): boolean {
  if (statusOf(r) !== 'diajukan') return false
  const a = approverFor(r.emp)
  if (user.role === 'manager') return true
  return user.role === 'supervisor' && a.id === user.nik && r.emp.nik !== user.nik
}
export const mewakiliOf = (user: CurrentUser, r: KpiRow) => {
  const a = approverFor(r.emp)
  return user.role === 'manager' && a.id !== 'manager' ? a.nama : undefined
}
export const canAccessKpi = (role: Role) => canOpen(role, 'dev-kpi')

// ---------- aksi ----------
function ensure(r: KpiRow, bulan: string, actor: CurrentUser): KpiRecord {
  if (r.rec) return r.rec
  const rec: KpiRecord = { id: `KPI-${bulan}-${r.emp.nik}`, nik: r.emp.nik, bulan, posisi: r.posisi, penilai: actor.nama, realisasi: {}, bukti: {}, status: 'draft' }
  KPI_RECORDS.push(rec)
  r.rec = rec
  return rec
}
export function saveDraft(r: KpiRow, bulan: string, manual: Record<string, number | null>, bukti: KpiRecord['bukti'], actor: CurrentUser) {
  const rec = ensure(r, bulan, actor)
  if (rec.status === 'diajukan' || rec.status === 'disetujui') return
  rec.realisasi = { ...rec.realisasi, ...manual }
  rec.bukti = { ...bukti }
  rec.penilai = actor.nama
  if (rec.status !== 'dikembalikan') rec.status = 'draft'
  bump()
}
export function submitKpi(r: KpiRow, bulan: string, manual: Record<string, number | null>, bukti: KpiRecord['bukti'], attendance: DayRecord[], actor: CurrentUser): { error?: string } {
  const tpl = tplOfRow(r, bulan)
  if (!tpl) return { error: 'Template KPI belum diatur untuk posisi ini' }
  const real = { ...manual }
  const auto = autoFromRecords(attendance, r.emp.nik, bulan)
  for (const i of tpl) {
    // Tanpa data absensi pada periode, pakai nilai tersimpan sebelumnya (mis. KPI yang dikembalikan)
    const prev = r.rec?.realisasi ?? {}
    if (i.sumber === 'auto-hadir') real[i.id] = auto.hadir ?? prev[i.id] ?? null
    if (i.sumber === 'auto-telat') real[i.id] = auto.telat ?? prev[i.id] ?? null
  }
  if (tpl.some((i) => real[i.id] == null || !Number.isFinite(real[i.id] as number) || (real[i.id] as number) < 0)) return { error: 'Semua indikator wajib terisi dengan angka 0 atau lebih' }
  saveDraft(r, bulan, real, bukti, actor)
  const rec = r.rec!
  if (rec.status === 'diajukan' || rec.status === 'disetujui') return { error: 'KPI ini sudah diajukan' }
  rec.status = 'diajukan'
  rec.diajukan = { by: actor.nama, at: stamp() }
  rec.dikembalikan = undefined
  const ap = approverFor(r.emp)
  notify({ to: 'hr_development', title: 'KPI diajukan', body: `${actor.nama} mengajukan KPI ${r.emp.nama} (${monthLabel(bulan)}).`, page: 'dev-kpi' })
  notify({ to: 'manager', title: 'KPI menunggu persetujuan', body: `${actor.nama} mengajukan KPI ${r.emp.nama} (${monthLabel(bulan)}); penyetuju: ${ap.nama}.`, page: 'dev-kpi' })
  bump()
  return {}
}
export function approveKpi(r: KpiRow, bulan: string, actor: CurrentUser) {
  const rec = r.rec
  const tpl = templateOf(rec?.posisi ?? r.posisi, tahunOf(bulan))?.indikator
  if (!rec || rec.status !== 'diajukan' || !tpl) return
  rec.tpl = tpl.map((i) => ({ ...i }))
  rec.nilai = evalKpi(rec.tpl, rec.realisasi).nilai ?? undefined
  rec.status = 'disetujui'
  rec.disetujui = { by: actor.nama, at: stamp(), mewakili: mewakiliOf(actor, r) }
  bump()
}
export function returnKpi(r: KpiRow, actor: CurrentUser, alasan: string) {
  const rec = r.rec
  if (!rec || rec.status !== 'diajukan') return
  rec.status = 'dikembalikan'
  rec.dikembalikan = { by: actor.nama, at: stamp(), alasan }
  bump()
}

// ---------- seed ----------
const rnd = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13
  return ((h >>> 0) % 10000) / 10000
}
function genReal(nik: string, bulan: string, tpl: Indicator[], auto?: { hadir: number | null; telat: number | null }): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of tpl) {
    const r = rnd(`${nik}|${bulan}|${i.id}`)
    if (i.sumber === 'auto-hadir') out[i.id] = auto?.hadir ?? r1(91 + 9 * r)
    else if (i.sumber === 'auto-telat') out[i.id] = auto?.telat ?? (r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : 3)
    else if (i.arah === 'naik') out[i.id] = r1(Math.min(i.satuan === '%' && i.target >= 90 ? 100 : 130, i.target * (0.84 + 0.26 * r)))
    else out[i.id] = r1(i.target * (0.75 + 0.55 * r))
  }
  return out
}

function seed() {
  const oi = ROSTER.filter((e) => e.posisi === 'Operator Injection' && activeEmp(e))
  const tpl = templateOf('Operator Injection', 2026)!.indikator
  const att = buildInitial().records
  const make = (e: RosterEmployee, bulan: string, status: KpiRecord['status'], auto?: { hadir: number | null; telat: number | null }) => {
    const realisasi = genReal(e.nik, bulan, tpl, auto)
    const rec: KpiRecord = { id: `KPI-${bulan}-${e.nik}`, nik: e.nik, bulan, posisi: e.posisi, penilai: atasanName(e.atasanId), realisasi, bukti: {}, status }
    const nextM = Number(bulan.slice(5, 7)) % 12
    const y = Number(bulan.slice(0, 4)) + (nextM === 0 ? 1 : 0)
    const cur = bulan === DEMO_TODAY.slice(0, 7)
    // Bulan berjalan: diinput dan disetujui di bulan yang sama (periode kehadirannya sudah closing); bulan lalu: awal bulan berikutnya.
    const when = cur ? '24 Okt 2026' : `5 ${MONTHS_SHORT[nextM]} ${y}`
    rec.diajukan = { by: rec.penilai, at: `${cur ? '22 Okt 2026' : `3 ${MONTHS_SHORT[nextM]} ${y}`}, 10.00 WIB` }
    if (status === 'disetujui') {
      rec.tpl = tpl.map((i) => ({ ...i }))
      rec.nilai = evalKpi(rec.tpl, realisasi).nilai ?? undefined
      rec.disetujui = { by: 'Agus Setiadi', at: `${when}, 14.00 WIB` }
    }
    KPI_RECORDS.push(rec)
  }
  for (const y of [2025, 2026]) {
    const last = y === 2025 ? 12 : 9
    for (let m = 1; m <= last; m++) {
      const bulan = `${y}-${String(m).padStart(2, '0')}`
      for (const e of oi) make(e, bulan, 'disetujui')
    }
  }
  // Oktober 2026: 14 dari 20 sudah diinput (10 Disetujui, 4 Diajukan, 6 Belum diinput termasuk Rizky).
  const byNik = (n: string) => oi.find((e) => e.nik === n)!
  const named = ['PPI-2023-0088', 'PPI-2022-0045', 'PPI-2021-0019', 'PPI-2025-0071'].map(byNik)
  const rest = oi.filter((e) => !['PPI-2024-0112', 'PPI-2024-0093', ...named.map((n) => n.nik)].includes(e.nik))
  const disetujui = [...named, ...rest.slice(0, 6)]
  const diajukan = rest.slice(6, 10)
  for (const e of [...disetujui, ...diajukan]) make(e, '2026-10', disetujui.includes(e) ? 'disetujui' : 'diajukan', autoFromRecords(att, e.nik, '2026-10'))
}
seed()

// Lukman Hakim Agustus 2026: nilai 68,0 (predikat Kurang) agar badge danger muncul di Laporan Tahunan.
// Realisasi dipilih supaya Σ capaian × bobot tepat 68,0: 70 → 21 · reject 4 → 10 · downtime 60 → 5 · checksheet 90 → 9 · 5S 72 → 8 · hadir 98 → 10 · telat 2 → 5.
{
  const rec = recordOf('PPI-2025-0071', '2026-08')
  if (rec?.tpl) {
    rec.realisasi = { 'oi-output': 70, 'oi-reject': 4, 'oi-downtime': 60, 'oi-checksheet': 90, 'oi-5s': 72, 'oi-hadir': 98, 'oi-telat': 2 }
    rec.nilai = Math.round((evalKpi(rec.tpl, rec.realisasi).nilai ?? 0) * 10) / 10
  }
}
