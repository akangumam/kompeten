import { useSyncExternalStore } from 'react'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { atasanName } from '@/data/directory'
import { hasLeft } from '@/data/offboarding'
import { standardAt, targetsList, type StandardVersion } from '@/data/master/competencies'
import { TRX } from '@/data/transactions'
import type { CurrentUser, Role } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'

export type CompPeriod = { id: string; label: string; start: string; end: string; status: 'Berjalan' | 'Final'; refDate: string }
export const PERIODS: CompPeriod[] = [
  { id: '2026-S2', label: 'S2 2026', start: '2026-07-01', end: '2026-12-31', status: 'Berjalan', refDate: DEMO_TODAY },
  { id: '2026-S1', label: 'S1 2026', start: '2026-01-01', end: '2026-06-30', status: 'Final', refDate: '2026-07-15' },
]
export const DEFAULT_PERIOD = '2026-S2'
export const periodOf = (id: string) => PERIODS.find((p) => p.id === id) ?? PERIODS[0]
/** Tanggal penilaian: periode berjalan memakai hari ini; periode Final memakai tanggal verifikasinya. */
/** Bukti training dihitung sejak awal periode sebelumnya (atau periode ini bila belum ada) sampai tanggal penilaian. */
export function evidenceRange(periodId: string): { since: string; until: string } {
  const i = PERIODS.findIndex((p) => p.id === periodId)
  const cur = PERIODS[i] ?? PERIODS[0]
  const prev = PERIODS[i + 1]
  return { since: (prev ?? cur).start, until: assessDate(cur) }
}
export const assessDate = (p: CompPeriod) => (p.status === 'Final' ? p.refDate : DEMO_TODAY)

export type AssessStatus = 'belum' | 'draft' | 'diajukan' | 'final'
export const STATUS_LABEL: Record<AssessStatus, string> = { belum: 'Belum dinilai', draft: 'Draft', diajukan: 'Diajukan', final: 'Final' }

export type Assessment = {
  id: string
  periodId: string
  nik: string
  /** Posisi pada saat penilaian; menentukan standar yang dipakai. */
  posisi: string
  penilai: string
  levels: Record<string, number | null>
  catatan: Record<string, string>
  status: Exclude<AssessStatus, 'belum'>
  /** Snapshot standar (jobdesk + target per kompetensi) yang disimpan saat Final; penilaian Final tidak ikut berubah bila master berubah. */
  std?: StandardVersion
  diajukan?: { by: string; at: string }
  diverifikasi?: { by: string; at: string }
  dikembalikan?: { by: string; at: string; alasan: string }
}

/** Akses modul: Admin HRD, HR & GA Manager (baca), Atasan (tim sendiri). Payroll, Finance, dan KSB tidak punya akses. */
export const canAccessCompetency = (role: Role) => role === 'admin' || role === 'manager' || role === 'supervisor'

// ---------- store ----------
let version = 0
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
export const useCompetency = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)

export const ASSESSMENTS: Assessment[] = []
export const assessmentOf = (periodId: string, nik: string) => ASSESSMENTS.find((a) => a.periodId === periodId && a.nik === nik)

const stamp = () => { const { hh, mm } = nowTimeWIB(); return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB` }

// ---------- gap ----------
export type GapKind = 'belum' | 'melebihi' | 'sesuai' | 'gap1' | 'gap2'
export const gapKind = (target: number, level: number | null | undefined): GapKind => {
  if (level == null) return 'belum'
  const g = target - level
  return g < 0 ? 'melebihi' : g === 0 ? 'sesuai' : g === 1 ? 'gap1' : 'gap2'
}
export const gapLabel = (target: number, level: number | null | undefined) => {
  if (level == null) return 'Belum Dinilai'
  const g = target - level
  return g < 0 ? 'Melebihi' : g === 0 ? 'Sesuai' : `Gap ${g}`
}

// ---------- rows ----------
export type CompRow = { emp: RosterEmployee; posisi: string; a?: Assessment }
const activeEmp = (e: RosterEmployee) => e.tanggalMasuk <= DEMO_TODAY && !hasLeft(e.nik)
const empByNik = (nik: string) => ROSTER.find((e) => e.nik === nik)

/** Pegawai yang dinilai untuk satu posisi pada satu periode. Atasan hanya melihat timnya. */
export function rowsFor(periodId: string, posisi: string, user: CurrentUser): CompRow[] {
  const inScope = (e: RosterEmployee) => user.role !== 'supervisor' || e.atasanId === user.nik
  const out = new Map<string, CompRow>()
  for (const a of ASSESSMENTS) {
    if (a.periodId !== periodId || a.posisi !== posisi) continue
    const emp = empByNik(a.nik)
    if (emp && inScope(emp)) out.set(a.nik, { emp, posisi, a })
  }
  for (const emp of ROSTER) {
    if (emp.posisi !== posisi || !activeEmp(emp) || out.has(emp.nik) || !inScope(emp)) continue
    const a = assessmentOf(periodId, emp.nik)
    if (a && a.posisi !== posisi) continue
    out.set(emp.nik, { emp, posisi, a })
  }
  return [...out.values()].sort((x, y) => x.emp.nama.localeCompare(y.emp.nama))
}
export const statusOf = (r: CompRow): AssessStatus => r.a?.status ?? 'belum'

/** Standar yang berlaku untuk baris ini pada tanggal penilaian periode tersebut. */
export const standardFor = (posisi: string, periodId: string, a?: Assessment): StandardVersion | undefined =>
  a?.status === 'final' && a.std ? a.std : standardAt(posisi, assessDate(periodOf(periodId)))
const snapshotOf = (v: StandardVersion | undefined): StandardVersion | undefined => (v ? { ...v, targets: { ...v.targets } } : undefined)

export type Item = { kode: string; target: number; level: number | null; gap: number | null; kind: GapKind }
export type Score = { items: Item[]; total: number; rated: number; memenuhi: number; totalGap: number; pct: number | null }
export function scoreOf(std: StandardVersion | undefined, levels: Record<string, number | null | undefined> | undefined): Score {
  const items: Item[] = targetsList(std?.targets ?? {}).map(({ kode, target }) => {
    const level = levels?.[kode] ?? null
    return { kode, target, level, gap: level == null ? null : target - level, kind: gapKind(target, level) }
  })
  const rated = items.filter((i) => i.level != null)
  const memenuhi = rated.filter((i) => (i.gap ?? 0) <= 0).length
  const totalGap = rated.reduce((a, i) => a + Math.max(0, i.gap ?? 0), 0)
  return { items, total: items.length, rated: rated.length, memenuhi, totalGap, pct: rated.length ? (memenuhi / rated.length) * 100 : null }
}
export const scoreOfRow = (r: CompRow, periodId: string) => scoreOf(standardFor(r.posisi, periodId, r.a), r.a?.levels)

/** Transaksi terjadwal yang mengubah posisi pegawai (Promosi/Demosi/Rotasi/Mutasi yang belum berlaku). */
export function pendingPositionChange(nik: string) {
  const t = TRX.find((x) => x.nik === nik && (x.status === 'menunggu' || x.status === 'disetujui') && !x.applied && x.sesudah.posisi !== x.sebelum.posisi)
  return t ? { posisi: t.sesudah.posisi, efektif: t.efektif, status: t.status, no: t.no } : undefined
}

// ---------- izin ----------
export const canAssess = (user: CurrentUser, r: CompRow, periodId: string) =>
  user.role === 'supervisor' && periodOf(periodId).status === 'Berjalan' && r.emp.atasanId === user.nik && (statusOf(r) === 'belum' || statusOf(r) === 'draft')
export const canReview = (user: CurrentUser, r: CompRow, periodId: string) => user.role === 'admin' && periodOf(periodId).status === 'Berjalan' && statusOf(r) === 'diajukan'

// ---------- aksi ----------
export function saveDraft(periodId: string, r: CompRow, levels: Record<string, number | null>, catatan: Record<string, string>, actor: CurrentUser) {
  let a = r.a ?? assessmentOf(periodId, r.emp.nik)
  if (!a) {
    a = { id: `ASM-${periodId.replace('-', '')}-${r.emp.nik}`, periodId, nik: r.emp.nik, posisi: r.posisi, penilai: actor.nama, levels: {}, catatan: {}, status: 'draft' }
    ASSESSMENTS.push(a)
  }
  if (a.status === 'diajukan' || a.status === 'final') return a
  a.levels = { ...levels }
  a.catatan = { ...catatan }
  a.status = 'draft'
  a.penilai = actor.nama
  bump()
  return a
}

export function submitAssessment(periodId: string, r: CompRow, levels: Record<string, number | null>, catatan: Record<string, string>, actor: CurrentUser): { error?: string } {
  const std = standardFor(r.posisi, periodId)
  if (!std) return { error: 'Standar belum diatur' }
  const sc = scoreOf(std, levels)
  if (sc.rated < sc.total) return { error: 'Semua kompetensi wajib dinilai' }
  const a = saveDraft(periodId, r, levels, catatan, actor)
  if (a.status !== 'draft') return { error: 'Penilaian ini sudah diajukan' }
  a.status = 'diajukan'
  a.diajukan = { by: actor.nama, at: stamp() }
  a.dikembalikan = undefined
  bump()
  return {}
}

export function verifyAssessment(periodId: string, nik: string, actor: CurrentUser) {
  const a = assessmentOf(periodId, nik)
  if (!a || a.status !== 'diajukan') return
  a.std = snapshotOf(standardFor(a.posisi, periodId, a))
  a.status = 'final'
  a.diverifikasi = { by: actor.nama, at: stamp() }
  bump()
}

export function returnAssessment(periodId: string, nik: string, actor: CurrentUser, alasan: string) {
  const a = assessmentOf(periodId, nik)
  if (!a || a.status !== 'diajukan') return
  a.status = 'draft'
  a.dikembalikan = { by: actor.nama, at: stamp(), alasan }
  bump()
}

// ---------- seed ----------
const rnd = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13
  return ((h >>> 0) % 10000) / 10000
}
const clamp = (n: number) => Math.max(1, Math.min(4, n))
const levelFor = (nik: string, kode: string, target: number, salt: string) => {
  const r = rnd(`${salt}|${nik}|${kode}`)
  const d = r < 0.06 ? -2 : r < 0.3 ? -1 : r < 0.78 ? 0 : r < 0.95 ? 1 : 2
  return clamp(target + d)
}
const seedLevels = (nik: string, std: StandardVersion, salt: string) => Object.fromEntries(Object.entries(std.targets).map(([k, t]) => [k, levelFor(nik, k, t, salt)]))

const RIZKY_S1: Record<string, number | null> = {
  'BSC-01': 3, 'BSC-02': 2, 'BSC-03': 2, 'BSC-04': 3, 'JOB-INJ-01': 2, 'JOB-INJ-02': 3, 'JOB-INJ-03': 1, 'JOB-INJ-04': 3, 'SUP-01': 2, 'SUP-02': null,
}

function seed() {
  const oi = ROSTER.filter((e) => e.posisi === 'Operator Injection' && activeEmp(e))
  const qc = ROSTER.filter((e) => e.posisi === 'QC Inspector' && activeEmp(e))
  const base = (periodId: string, e: RosterEmployee, levels: Record<string, number | null>, status: Assessment['status']): Assessment => ({
    id: `ASM-${periodId.replace('-', '')}-${e.nik}`, periodId, nik: e.nik, posisi: e.posisi, penilai: atasanName(e.atasanId), levels, catatan: {}, status,
  })

  // S1 2026 Final (diverifikasi Admin HRD 15 Jul 2026): semua Operator Injection dan QC Inspector.
  const s1 = periodOf('2026-S1')
  for (const e of [...oi, ...qc]) {
    const std = standardAt(e.posisi, s1.refDate)!
    const levels = e.nik === 'PPI-2024-0112' ? RIZKY_S1 : seedLevels(e.nik, std, 'S1')
    const a = base('2026-S1', e, levels, 'final')
    a.std = snapshotOf(std)
    a.diajukan = { by: a.penilai, at: '10 Jul 2026, 10.00 WIB' }
    a.diverifikasi = { by: 'Admin HRD', at: '15 Jul 2026, 09.30 WIB' }
    ASSESSMENTS.push(a)
  }

  // S2 2026 berjalan: Hendra menilai 12 dari 20 Operator Injection (9 Final, 3 Diajukan, 8 Belum dinilai).
  const byNik = (nik: string) => oi.find((e) => e.nik === nik)!
  const named = (n: string) => byNik(n)
  const rest = oi.filter((e) => !['PPI-2024-0112', 'PPI-2024-0093', 'PPI-2023-0088', 'PPI-2022-0045', 'PPI-2021-0019', 'PPI-2025-0071'].includes(e.nik))
  const finals = [named('PPI-2023-0088'), named('PPI-2022-0045'), named('PPI-2021-0019'), named('PPI-2025-0071'), ...rest.slice(0, 5)]
  const diajukan = [named('PPI-2024-0093'), ...rest.slice(5, 7)]
  const std2 = standardAt('Operator Injection', DEMO_TODAY)!
  for (const e of finals) {
    const a = base('2026-S2', e, seedLevels(e.nik, std2, 'S2'), 'final')
    a.std = snapshotOf(std2)
    a.diajukan = { by: a.penilai, at: '19 Okt 2026, 14.00 WIB' }
    a.diverifikasi = { by: 'Admin HRD', at: '22 Okt 2026, 10.15 WIB' }
    ASSESSMENTS.push(a)
  }
  for (const e of diajukan) {
    const a = base('2026-S2', e, seedLevels(e.nik, std2, 'S2'), 'diajukan')
    a.diajukan = { by: a.penilai, at: '23 Okt 2026, 15.20 WIB' }
    ASSESSMENTS.push(a)
  }
}
seed()
