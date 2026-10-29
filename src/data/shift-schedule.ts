import { addDays, dayName, SHIFTS, toDot } from '@/data/attendance'
import { DEMO_TODAY } from '@/lib/today'
import { effectiveKelompok } from '@/data/master/levels'
import { contractEndError, CORE as ROSTER, SUPERVISORS, type RosterEmployee } from '@/data/employees'
import { rule } from '@/data/master/attendance-rules'
import { isHoliday } from '@/data/master/holidays'
import { isJamKerja, isPending, teamLabel, type LeaveRequest } from '@/data/leave'
import type { ShiftSwap, WorkShift } from '@/data/shift-swaps'
import { formatDate } from '@/lib/format'

export type Cell = WorkShift | 'libur'
export const SHIFT_LABEL: Record<Cell, string> = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam', libur: 'Libur' }
export const minRest = () => rule('istirahat').jam

const BASE_OVERRIDE: Record<string, WorkShift> = { 'PPI-2025-0071': 'siang' }
const SUPERVISOR_NIKS = SUPERVISORS.map((s) => s.id)

export const levelOf = (e: RosterEmployee) => (effectiveKelompok(e.kelompok, e.level) === 'Non Staff' ? 'Operator' : 'Staff')
export const sectionOf = teamLabel
export const baseShiftOf = (e: RosterEmployee): WorkShift | null =>
  BASE_OVERRIDE[e.nik] ?? (e.shift === 'nonshift' ? null : e.shift)

export const SCHEDULED = ROSTER.filter((e) => !SUPERVISOR_NIKS.includes(e.nik) && baseShiftOf(e) !== null)
export const SECTIONS = [...new Set(SCHEDULED.map(sectionOf))].sort()
export const DEFAULT_SECTION = 'Produksi · Injection'

export const isActiveSwap = (s: ShiftSwap) => isPending(s.status) || s.status === 'disetujui'

export type Ctx = { swaps: ShiftSwap[]; leaves: LeaveRequest[] }

export const leaveOn = (nik: string, iso: string, leaves: LeaveRequest[]) =>
  leaves.find((r) => r.nik === nik && !isJamKerja(r.jenis) && (r.status === 'disetujui' || r.status === 'menunggu-hrd' || r.status === 'pembatalan' || isPending(r.status)) && r.start <= iso && r.end >= iso)

export const swapOn = (nik: string, iso: string, swaps: ShiftSwap[], ignoreNo?: string) =>
  swaps.find((s) => s.no !== ignoreNo && s.date === iso && isActiveSwap(s) && (s.nikA === nik || s.nikB === nik))

export function shiftOn(e: RosterEmployee, iso: string, ctx: Ctx, ignoreNo?: string): { shift: Cell; swap?: ShiftSwap } {
  const base = baseShiftOf(e)
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay()
  if (!base || dow === 0 || isHoliday(iso)) return { shift: 'libur' }
  const swap = swapOn(e.nik, iso, ctx.swaps, ignoreNo)
  if (swap) return { shift: swap.nikA === e.nik ? swap.shiftB : swap.shiftA, swap }
  return { shift: base }
}

const workingShiftOn = (e: RosterEmployee, iso: string, ctx: Ctx, ignoreNo?: string): WorkShift | null => {
  const { shift } = shiftOn(e, iso, ctx, ignoreNo)
  return shift === 'libur' || leaveOn(e.nik, iso, ctx.leaves) ? null : shift
}

const dayIdx = (iso: string) => Math.round(new Date(iso + 'T00:00:00Z').getTime() / 86400000)
const abs = (iso: string, min: number) => dayIdx(iso) * 1440 + min

export type Gap = {
  hours: number
  ok: boolean
  text: string
}
export type Rest = { before: Gap | null; after: Gap | null }

const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toLocaleString('id-ID', { maximumFractionDigits: 1 }))

export function restAround(e: RosterEmployee, date: string, newShift: WorkShift, ctx: Ctx, ignoreNo?: string): Rest {
  const sh = SHIFTS[newShift]
  const prevDate = addDays(date, -1)
  const nextDate = addDays(date, 1)
  const prev = workingShiftOn(e, prevDate, ctx, ignoreNo)
  const next = workingShiftOn(e, nextDate, ctx, ignoreNo)
  const mk = (hours: number, aS: WorkShift, aD: string, aEnd: number, bS: WorkShift, bD: string, bStart: number): Gap => {
    const h = Math.max(0, Math.round((hours / 60) * 10) / 10)
    return {
      hours: h,
      ok: h >= minRest(),
      text: `Waktu istirahat ${e.nama} hanya ${fmtHours(h)} jam (${SHIFT_LABEL[aS]} ${formatDate(aD)} berakhir ${toDot(aEnd)}, ${SHIFT_LABEL[bS]} ${formatDate(bD)} mulai ${toDot(bStart)}). Minimal ${minRest()} jam.`,
    }
  }
  const before = prev
    ? mk(abs(date, sh.start) - abs(prevDate, SHIFTS[prev].end), prev, prevDate, SHIFTS[prev].end, newShift, date, sh.start)
    : null
  const after = next
    ? mk(abs(nextDate, SHIFTS[next].start) - abs(date, sh.end), newShift, date, sh.end, next, nextDate, SHIFTS[next].start)
    : null
  return { before, after }
}

export const restError = (r: Rest) => [r.before, r.after].find((g) => g && !g.ok)?.text ?? null

export function restSummary(r: Rest) {
  const b = r.before ? `${fmtHours(r.before.hours)} jam sebelum` : null
  const a = r.after ? `${fmtHours(r.after.hours)} jam sesudah` : null
  if (b && a) return `Istirahat ${b} dan ${a}`
  if (b || a) return `Istirahat ${b ?? a} (tidak ada shift ${b ? 'sesudahnya' : 'sebelumnya'})`
  return 'Tidak ada shift di hari sebelum dan sesudahnya'
}

export const shiftLine = (s: Cell) => (s === 'libur' ? 'Libur' : `Shift ${SHIFT_LABEL[s]} ${SHIFTS[s].range.replace(' (+1)', '')}`)

export type Issue = { nik: string; text: string }

/** Problems with one employee taking part in a swap on `date`, ignoring the rest-hour rule. */
export function personIssues(e: RosterEmployee, date: string, ctx: Ctx, ignoreNo?: string): string[] {
  const out: string[] = []
  const ended = contractEndError(e, date)
  if (ended) out.push(ended)
  if (shiftOn(e, date, ctx, ignoreNo).shift === 'libur') out.push(`${e.nama} libur pada ${formatDate(date)}.`)
  const lv = leaveOn(e.nik, date, ctx.leaves)
  if (lv) out.push(`${e.nama} memiliki pengajuan ${lv.jenis} pada ${formatDate(date)} (${lv.no}).`)
  const sw = swapOn(e.nik, date, ctx.swaps, ignoreNo)
  if (sw) out.push(`${e.nama} sudah memiliki tukar shift pada ${formatDate(date)} (${sw.no}).`)
  return out
}

export const partnersFor = (a: RosterEmployee, date: string, ctx: Ctx) => {
  const mine = shiftOn(a, date, ctx).shift
  if (mine === 'libur') return []
  return SCHEDULED.filter((e) => {
    if (e.nik === a.nik || sectionOf(e) !== sectionOf(a) || levelOf(e) !== levelOf(a)) return false
    const s = shiftOn(e, date, ctx).shift
    return s !== 'libur' && s !== mine
  })
}

export const weekStart = (iso: string) => {
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay()
  return addDays(iso, dow === 0 ? -6 : 1 - dow)
}
export const THIS_WEEK = weekStart(DEMO_TODAY)
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))
export const dayShort = (iso: string) => dayName(iso).slice(0, 3)
