import { canOpen } from '@/lib/access'
import { useSyncExternalStore } from 'react'
import { nowStamp } from '@/data/attendance'
import { addDayIso, contractsOf, kpkHook, monthsBetween, type Contract } from '@/data/contracts'
import { ROSTER } from '@/data/employees'
import { balanceOf as leaveBalance, type LeaveRequest } from '@/data/leave'
import { periodContaining } from '@/data/master/attendance-rules'
import { pembagiOf } from '@/data/master/levels'
import { hakHook, OFFS, personOf, turnoverFlag, type Off } from '@/data/offboarding'
import { pisahOf, reasonRules, ruleKeyFor, rulesAt, tierOf, fmtKali, type ReasonRule } from '@/data/master/final-pay-rules'
import { COMPONENTS, tunjanganAt, upahHarianAt } from '@/data/payroll/components'
import { INS_DEFS, PAY_PERIODS, periodFinalized, RUNS, runKey, type PeriodId } from '@/data/payroll/runs'
import { salaryAt } from '@/data/payroll/salaries'
import { bump as bumpPayroll } from '@/data/payroll/store'
import { EXITED } from '@/data/profiles'
import type { CurrentUser } from '@/data/users'
import { formatDate } from '@/lib/format'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Hak akhir (pesangon, UPMK, UPH, uang pisah) dan Kompensasi PKWT. Dibuat otomatis saat offboarding disetujui atau PKWT berakhir
 * karena diperpanjang. Payroll Officer menghitung, HR & GA Manager menyetujui, pembayaran lewat payroll atau transfer terpisah (Finance).
 */
export type HakKind = 'HAK' | 'KPK'
export type HakStatus = 'hitung' | 'menunggu' | 'disetujui' | 'dibayar'
export const HAK_STATUS_LABEL: Record<HakStatus, string> = { hitung: 'Perlu dihitung', menunggu: 'Menunggu Approval', disetujui: 'Disetujui', dibayar: 'Dibayar' }

export type LineKode = 'UP' | 'UPMK' | 'UPH-CUTI' | 'UPH-PULANG' | 'UPH-LAIN' | 'PISAH' | 'PKWT' | 'POT-KOP' | 'POT-LAIN' | 'INFO'
export type Line = { kode: LineKode; label: string; rumus: string; nominal: number; kena: 'final' | 'ter' | 'none'; potongan?: boolean }
export type Base = {
  nama: string
  statusKerja: string
  jenis: string
  kelompok: string
  masuk: string
  keluar: string
  masaBulan: number
  masaText: string
  upah: number
  komponen: { label: string; nominal: number }[]
  harianNote?: string
  pembagi: number
  sisaCuti: number
}
export type BracketRow = { label: string; dasar: number; tarif: number; pajak: number }
export type Calc = {
  base: Base
  ruleKey: string
  ruleLabel: string
  lines: Line[]
  brackets: BracketRow[]
  finalBase: number
  pphFinal: number
  /** Penghasilan yang pajaknya dihitung di payroll (TER), tidak masuk PPh final. */
  terBase: number
  bruto: number
  potongan: number
  neto: number
  notes: string[]
}
export type CalcInput = {
  nik: string
  ruleKey: string
  /** Tanggal keluar, atau akhir kontrak untuk KPK. */
  tanggal: string
  kontrak?: { ke: number; mulai: string; akhir: string; bulan: number }
  /** KPK: kontrak berakhir karena diperpanjang (pajak mengikuti pengaturan). */
  diperpanjang?: boolean
  sisaCuti?: number
  ongkosPulang?: number
  lain?: { label: string; nominal: number }[]
  potLain?: { label: string; nominal: number; alasan: string }[]
  koperasi?: number
}

export type Pembayaran = { mode: 'payroll' | 'transfer'; periodeId?: string; transfer?: { tanggal: string; ref: string; bukti: string; oleh: string } }
export type FinalPay = {
  no: string
  kind: HakKind
  nik: string
  offNo?: string
  ruleKey: string
  kontrak?: { ke: number; mulai: string; akhir: string; bulan: number }
  tanggal: string
  status: HakStatus
  input?: CalcInput
  calc?: Calc
  pembayaran: Pembayaran
  dibuat: string
  dihitung?: { by: string; at: string }
  diajukan?: { by: string; at: string }
  keputusan?: { by: string; at: string }
  dikembalikan?: { by: string; at: string; alasan: string }
  buktiNo: string
  terpasang?: boolean
}

/* ---------- store ---------- */
let version = 0
const subs = new Set<() => void>()
export const bump = () => {
  version++
  subs.forEach((f) => f())
}
export const useFinalPay = () =>
  useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => version)
export const RECORDS: FinalPay[] = []
const SEQ = { HAK: 3, KPK: 0, bukti: 3 }
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const buktiNumber = (n: number, tanggal: string, kind: HakKind = 'HAK') => `${kind}/HRD-PPI/${String(n).padStart(3, '0')}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tanggal.slice(0, 4)}`
export const nextBuktiNo = (kind: HakKind) => buktiNumber(SEQ.bukti + 1, DEMO_TODAY, kind)
export const recordOf = (no: string) => RECORDS.find((r) => r.no === no)
export const recordOfOff = (offNo: string) => RECORDS.find((r) => r.offNo === offNo)

/** Dibayar bila pembayaran lewat payroll dan periodenya sudah Final; selain itu mengikuti status tersimpan. */
export function statusOf(r: FinalPay): HakStatus {
  if (r.status === 'disetujui' && r.pembayaran.mode === 'payroll' && r.pembayaran.periodeId && PAY_PERIODS.some((p) => p.id === r.pembayaran.periodeId) && periodFinalized(r.pembayaran.periodeId as PeriodId)) return 'dibayar'
  return r.status
}

/* ---------- hak akses ---------- */
export const canCalc = (u: CurrentUser) => u.role === 'payroll'
export const canApprove = (r: FinalPay, u: CurrentUser) => u.role === 'manager' && r.status === 'menunggu'
export const canPay = (r: FinalPay, u: CurrentUser) => u.role === 'finance' && r.status === 'disetujui' && r.pembayaran.mode === 'transfer' && !r.pembayaran.transfer
export const canSeeFinalPay = (u: CurrentUser) => canOpen(u.role, 'final-pay')

/* ---------- data dasar ---------- */
const MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
void MON_NAMES
export function tenureBetween(masuk: string, sampai: string) {
  const [y1, m1, d1] = masuk.split('-').map(Number)
  const [y2, m2, d2] = sampai.split('-').map(Number)
  const months = Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0))
  return { months, text: `${Math.floor(months / 12)} th ${months % 12} bln` }
}
/** Sisa cuti pegawai yang sudah keluar (data historis). */
const SISA_CUTI_EXITED: Record<string, number> = { 'PPI-2001-0004': 4, 'PPI-2022-0047': 3, 'PPI-2025-0019': 2 }
export function sisaCutiOf(nik: string, leaves?: LeaveRequest[]): number {
  const e = ROSTER.find((x) => x.nik === nik)
  if (!e) return SISA_CUTI_EXITED[nik] ?? 0
  const b = leaves ? leaveBalance(e, leaves) : null
  return Math.max(0, b?.sisa ?? 0)
}
/** Tidak berhak pesangon/kompensasi: Magang (pemagangan) dan Outsourcing (dibayar vendor). */
export function notEligible(nik: string): string | null {
  const jenis = personOf(nik)?.jenis
  if (jenis === 'Magang') return 'Magang (pemagangan) tidak mendapat pesangon atau kompensasi PKWT.'
  if (jenis === 'Outsourcing') return 'Pegawai Outsourcing dibayar oleh vendor; hak akhir diurus vendor.'
  return null
}

export function baseOf(nik: string, keluar: string, sisaCuti?: number): Base {
  const roster = ROSTER.find((e) => e.nik === nik)
  const ex = EXITED.find((e) => e.nik === nik)
  const e = roster ?? ex
  if (!e) throw new Error(`Pegawai ${nik} tidak ditemukan`)
  const rs = rulesAt(keluar)
  const tenure = tenureBetween(e.tanggalMasuk, keluar)
  const komponen: { label: string; nominal: number }[] = []
  let harianNote: string | undefined
  let upah = 0
  if (e.kelompok === 'Harian') {
    // Group Harian: rata-rata upah per bulan 12 bulan terakhir (estimasi 25 hari kerja × upah harian).
    upah = upahHarianAt(keluar) * 25
    komponen.push({ label: 'Upah Harian × 25 hari (rata-rata 12 bulan)', nominal: upah })
    harianNote = 'Rata-rata upah per bulan 12 bulan terakhir (estimasi 25 hari kerja).'
  } else {
    for (const id of rs.upahDasar) {
      const comp = COMPONENTS.find((c) => c.id === id)
      if (!comp) continue
      const nominal = id === 'gaji-pokok' ? (roster ? salaryAt(roster, keluar).gajiPokok : ex!.gajiPokok) : id === 'tunj-jabatan' ? (roster ? tunjanganAt(roster.level, keluar) : ex!.tunjanganTetap) : 0
      komponen.push({ label: comp.nama, nominal })
      upah += nominal
    }
  }
  return {
    nama: e.nama, statusKerja: e.statusKerja, jenis: e.jenis ?? 'Organik', kelompok: e.kelompok, masuk: e.tanggalMasuk, keluar,
    masaBulan: tenure.months, masaText: tenure.text, upah, komponen, harianNote, pembagi: pembagiOf(e.kelompok, e.level), sisaCuti: sisaCuti ?? sisaCutiOf(nik),
  }
}

/* ---------- perhitungan ---------- */
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export function calcFinalPay(i: CalcInput): Calc {
  const rs = rulesAt(i.tanggal)
  const rule = (reasonRules(i.tanggal).find((r) => r.key === i.ruleKey) ?? reasonRules(i.tanggal)[0]) as ReasonRule
  const base = baseOf(i.nik, i.tanggal, i.sisaCuti)
  const lines: Line[] = []
  const notes: string[] = []
  const tahun = base.masaBulan / 12
  const kontrak = base.statusKerja === 'Kontrak'
  if (!i.kontrak || !i.diperpanjang || i.ruleKey !== 'kpk') {
    if (!kontrak) {
      const t = tierOf(rs.up, tahun)
      const tm = tierOf(rs.upmk, tahun)
      lines.push({ kode: 'UP', label: 'Uang Pesangon (UP)', rumus: `${t?.bulan ?? 0} bulan × ${fmtKali(rule.up)} × ${rp(base.upah)}`, nominal: Math.round((t?.bulan ?? 0) * rule.up * base.upah), kena: 'final' })
      lines.push({ kode: 'UPMK', label: 'Uang Penghargaan Masa Kerja (UPMK)', rumus: `${tm?.bulan ?? 0} bulan × ${fmtKali(rule.upmk)} × ${rp(base.upah)}`, nominal: Math.round((tm?.bulan ?? 0) * rule.upmk * base.upah), kena: 'final' })
    } else notes.push('Pegawai Kontrak tidak mendapat pesangon; hak berupa Kompensasi PKWT.')
    if (rule.uph) {
      lines.push({ kode: 'UPH-CUTI', label: 'Uang Penggantian Hak: sisa cuti tahunan', rumus: `${base.sisaCuti} hari × ${rp(base.upah)} ÷ ${base.pembagi}`, nominal: Math.round((base.sisaCuti * base.upah) / base.pembagi), kena: 'final' })
      if (i.ongkosPulang) lines.push({ kode: 'UPH-PULANG', label: 'Uang Penggantian Hak: ongkos pulang', rumus: 'Input manual', nominal: i.ongkosPulang, kena: 'final' })
      for (const l of i.lain ?? []) if (l.nominal) lines.push({ kode: 'UPH-LAIN', label: `Uang Penggantian Hak: ${l.label}`, rumus: 'Sesuai PK/PP/PKB (manual)', nominal: l.nominal, kena: 'final' })
    }
    if (rule.uangPisah) {
      const pt = pisahOf(rs.uangPisah, tahun)
      lines.push({ kode: 'PISAH', label: 'Uang pisah', rumus: `${fmtKali(pt?.kali ?? 0)} × ${rp(base.upah)} (masa kerja ${base.masaText})`, nominal: Math.round((pt?.kali ?? 0) * base.upah), kena: 'final' })
    }
  }
  if (kontrak && i.kontrak && (rule.pkwt || i.diperpanjang)) {
    const mode = rs.pkwtMode
    const kena: Line['kena'] = mode === 'selalu-final' ? 'final' : mode === 'selalu-tidak-final' ? 'ter' : i.diperpanjang ? 'ter' : 'final'
    lines.push({ kode: 'PKWT', label: `Kompensasi PKWT (Kontrak ke-${i.kontrak.ke})`, rumus: `${i.kontrak.bulan} bulan ÷ 12 × ${rp(base.upah)}`, nominal: Math.round((i.kontrak.bulan / 12) * base.upah), kena })
  }
  lines.push({ kode: 'INFO', label: 'Gaji prorata periode terakhir', rumus: 'Dihitung di payroll periode terakhir; tidak ditambahkan dua kali di sini', nominal: 0, kena: 'none' })
  if (i.koperasi) lines.push({ kode: 'POT-KOP', label: 'Potongan Koperasi (clearance)', rumus: 'Dari konfirmasi Bendahara Koperasi', nominal: i.koperasi, kena: 'none', potongan: true })
  for (const l of i.potLain ?? []) if (l.nominal) lines.push({ kode: 'POT-LAIN', label: `Potongan lain: ${l.label}`, rumus: l.alasan, nominal: l.nominal, kena: 'none', potongan: true })

  const earn = lines.filter((l) => !l.potongan)
  const finalBase = earn.filter((l) => l.kena === 'final').reduce((a, l) => a + l.nominal, 0)
  const terBase = earn.filter((l) => l.kena === 'ter').reduce((a, l) => a + l.nominal, 0)
  const brackets: BracketRow[] = []
  let lower = 0
  let raw = 0
  for (const b of rs.pajak) {
    const upper = b.sampai ?? Number.POSITIVE_INFINITY
    const part = Math.max(0, Math.min(finalBase, upper) - lower)
    if (part > 0 || brackets.length === 0) {
      const pajak = (part * b.tarif) / 100
      raw += pajak
      brackets.push({ label: b.sampai === null ? `> ${(lower / 1_000_000).toLocaleString('id-ID')} jt` : lower === 0 ? `≤ ${(b.sampai / 1_000_000).toLocaleString('id-ID')} jt` : `> ${(lower / 1_000_000).toLocaleString('id-ID')} – ${(b.sampai / 1_000_000).toLocaleString('id-ID')} jt`, dasar: part, tarif: b.tarif, pajak: Math.floor(pajak) })
    }
    lower = b.sampai ?? lower
    if (finalBase <= upper) break
  }
  const pphFinal = Math.floor(raw)
  const bruto = earn.reduce((a, l) => a + l.nominal, 0)
  const potongan = lines.filter((l) => l.potongan).reduce((a, l) => a + l.nominal, 0)
  return { base, ruleKey: i.ruleKey, ruleLabel: i.ruleKey === 'kpk' ? 'Kompensasi PKWT (kontrak diperpanjang)' : rule.label, lines, brackets, finalBase, pphFinal, terBase, bruto, potongan, neto: bruto - pphFinal - potongan, notes }
}

/* ---------- pembuatan ---------- */
const periodDefault = (tanggal: string) => periodContaining(tanggal).id
function make(kind: HakKind, nik: string, ruleKey: string, tanggal: string, extra: Partial<FinalPay> = {}): FinalPay {
  SEQ[kind] += 1
  const r: FinalPay = {
    no: `${kind}-2026-${String(SEQ[kind]).padStart(4, '0')}`, kind, nik, ruleKey, tanggal, status: 'hitung',
    pembayaran: { mode: 'payroll', periodeId: periodDefault(tanggal) }, dibuat: DEMO_TODAY, buktiNo: '', ...extra,
  }
  RECORDS.unshift(r)
  return r
}
hakHook.statusOf = (offNo) => {
  const r = recordOfOff(offNo)
  return r ? statusOf(r) : undefined
}
hakHook.onApproved = (o: Off) => {
  if (recordOfOff(o.no) || notEligible(o.nik)) return
  const key = ruleKeyFor(o.reason, { kondisi: o.kondisi, mendesak: o.mendesak })
  const contract = personOf(o.nik)?.statusKerja === 'Kontrak' ? contractsOf(o.nik).at(-1) : undefined
  make('HAK', o.nik, key, o.tanggalKeluar, { offNo: o.no, kontrak: contract && o.reason === 'Habis Kontrak' ? { ke: contract.ke, mulai: contract.mulai, akhir: contract.akhir, bulan: contract.bulan } : undefined })
  bump()
}
kpkHook.onExtended = (nik: string, ending: Contract) => {
  if (notEligible(nik) || RECORDS.some((r) => r.kind === 'KPK' && r.nik === nik && r.kontrak?.ke === ending.ke)) return
  if (ending.bulan < 1) return
  const kontrak = { ke: ending.ke, mulai: ending.mulai, akhir: ending.akhir, bulan: ending.bulan }
  const input: CalcInput = { nik, ruleKey: 'kpk', tanggal: ending.akhir, kontrak, diperpanjang: true }
  // KPK dihitung otomatis (rumus tunggal), tetap berstatus Perlu dihitung sampai Payroll Officer mengajukan.
  const r = make('KPK', nik, 'kpk', ending.akhir, { kontrak, input, calc: calcFinalPay(input) })
  void r
  bump()
}

export function submitCalc(no: string, input: CalcInput, pembayaran: Pembayaran, actor: CurrentUser, ajukan = true): string {
  const r = recordOf(no)
  if (!r || r.status !== 'hitung' || !canCalc(actor)) return 'Tidak dapat menghitung catatan ini'
  r.input = input
  r.calc = calcFinalPay(input)
  r.pembayaran = pembayaran
  r.dihitung = { by: actor.nama, at: nowStamp() }
  r.dikembalikan = undefined
  if (ajukan) {
    r.status = 'menunggu'
    r.diajukan = { by: actor.nama, at: nowStamp() }
  }
  bump()
  return ''
}
export function approveFinalPay(no: string, actor: CurrentUser) {
  const r = recordOf(no)
  if (!r || !canApprove(r, actor)) return
  r.status = 'disetujui'
  r.keputusan = { by: actor.nama, at: nowStamp() }
  SEQ.bukti += 1
  r.buktiNo = buktiNumber(SEQ.bukti, DEMO_TODAY, r.kind)
  if (r.pembayaran.mode === 'payroll') attachToPayroll(r)
  bump()
}
export function returnFinalPay(no: string, actor: CurrentUser, alasan: string) {
  const r = recordOf(no)
  if (!r || !canApprove(r, actor)) return
  r.status = 'hitung'
  r.dikembalikan = { by: actor.nama, at: nowStamp(), alasan }
  bump()
}
export function recordTransfer(no: string, t: { tanggal: string; ref: string; bukti: string }, actor: CurrentUser): string {
  const r = recordOf(no)
  if (!r || !canPay(r, actor)) return 'Tidak dapat mencatat pembayaran'
  if (!t.tanggal) return 'Tanggal transfer wajib diisi'
  if (!t.ref.trim()) return 'Nomor referensi wajib diisi'
  r.pembayaran.transfer = { tanggal: t.tanggal, ref: t.ref.trim(), bukti: t.bukti, oleh: actor.nama }
  r.status = 'dibayar'
  bump()
  return ''
}

/** Hak Akhir lewat payroll: baris insidental "tidak berulang" pada run periode dan Group pegawai (slip menampilkannya sebagai bagian Hak Akhir). */
function attachToPayroll(r: FinalPay) {
  if (r.terpasang || !r.calc || !r.pembayaran.periodeId || !PAY_PERIODS.some((p) => p.id === r.pembayaran.periodeId)) return
  const kel = r.calc.base.kelompok as never
  const run = RUNS[runKey(r.pembayaran.periodeId as PeriodId, kel)]
  if (!run || periodFinalized(r.pembayaran.periodeId as PeriodId)) return
  const push = (komponen: string, nominal: number, ket: string) => nominal > 0 && run.insidentals.push({ id: `ins-hak-${r.no}-${komponen}`, nik: r.nik, komponen, nominal, ket })
  const finalIn = r.calc.lines.filter((l) => !l.potongan && l.kena === 'final').reduce((a, l) => a + l.nominal, 0)
  const ter = r.calc.lines.filter((l) => !l.potongan && l.kena === 'ter').reduce((a, l) => a + l.nominal, 0)
  push('Hak Akhir', finalIn, r.no)
  push('Kompensasi PKWT', ter, r.no)
  push('PPh 21 Final Hak Akhir', r.calc.pphFinal, r.no)
  push('Potongan Hak Akhir', r.calc.potongan, r.no)
  r.terpasang = true
  if (run.draft) run.draft.stale = true
  bumpPayroll()
}

/* ---------- ringkasan ---------- */
export const inYear = (r: FinalPay, year: number) => r.tanggal.slice(0, 4) === String(year)
export function kpi(list: FinalPay[], year: number) {
  const cur = periodContaining(DEMO_TODAY).id
  const pkwt = (r: FinalPay) => r.calc?.lines.filter((l) => l.kode === 'PKWT').reduce((a, l) => a + l.nominal, 0) ?? 0
  return {
    hitung: list.filter((r) => statusOf(r) === 'hitung').length,
    menunggu: list.filter((r) => statusOf(r) === 'menunggu').length,
    dibayar: list.filter((r) => statusOf(r) === 'dibayar' && inYear(r, year)).reduce((a, r) => a + (r.calc?.neto ?? 0), 0),
    pkwtBulanIni: list.filter((r) => r.pembayaran.periodeId === cur && statusOf(r) !== 'dibayar').reduce((a, r) => a + pkwt(r), 0),
  }
}
export { turnoverFlag, addDayIso, monthsBetween, formatDate }

/* ---------- seed (historis) ---------- */
function seedHistoric() {
  const hist = (kind: HakKind, no: number, nik: string, ruleKey: string, tanggal: string, input: Partial<CalcInput>, dibayar: string, ref: string, offNo: string, kontrak?: FinalPay['kontrak']) => {
    const ci: CalcInput = { nik, ruleKey, tanggal, kontrak, ...input }
    const r: FinalPay = {
      no: `${kind}-2026-${String(no).padStart(4, '0')}`, kind, nik, offNo, ruleKey, kontrak, tanggal, status: 'dibayar', input: ci, calc: calcFinalPay(ci),
      pembayaran: { mode: 'transfer', transfer: { tanggal: dibayar, ref, bukti: `bukti-transfer-${ref.toLowerCase()}.pdf`, oleh: 'Yohanes Kristanto' } },
      dibuat: tanggal, dihitung: { by: 'Mira Andriani', at: `${formatDate(addDayIso(tanggal, -3))}, 10.00 WIB` }, diajukan: { by: 'Mira Andriani', at: `${formatDate(addDayIso(tanggal, -3))}, 10.30 WIB` },
      keputusan: { by: 'Lestari Wulandari', at: `${formatDate(addDayIso(tanggal, -2))}, 09.15 WIB` }, buktiNo: buktiNumber(no, addDayIso(tanggal, -2)),
    }
    RECORDS.push(r)
  }
  hist('HAK', 3, 'PPI-2001-0004', 'pensiun', '2026-08-31', { sisaCuti: 4 }, '2026-09-07', 'TRF-2026-0907', 'OFF-2026-0003')
  hist('HAK', 2, 'PPI-2025-0019', 'habis-kontrak', '2026-09-30', { sisaCuti: 2, kontrak: { ke: 1, mulai: '2025-10-01', akhir: '2026-09-30', bulan: 12 } }, '2026-10-05', 'TRF-2026-1005', 'OFF-2026-0002', { ke: 1, mulai: '2025-10-01', akhir: '2026-09-30', bulan: 12 })
  hist('HAK', 1, 'PPI-2022-0047', 'mengundurkan', '2026-09-15', { sisaCuti: 3 }, '2026-09-22', 'TRF-2026-0922', 'OFF-2026-0001')
  // Fitri Handayani (offboarding berjalan): catatan otomatis dari persetujuan, Perlu dihitung.
  const fitri = OFFS.find((o) => o.no === 'OFF-2026-0004')
  if (fitri) make('HAK', fitri.nik, 'mengundurkan', fitri.tanggalKeluar, { offNo: fitri.no })
  RECORDS.sort((a, b) => b.no.localeCompare(a.no))
  void INS_DEFS
}
seedHistoric()
