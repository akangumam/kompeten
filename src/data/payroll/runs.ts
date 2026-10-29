import { buildRecap, nowStamp, type DayRecord, type Scan } from '@/data/attendance'
import { ROSTER, type RosterEmployee } from '@/data/employees'
import { KASBON_ADMIN_PCT } from '@/data/koperasi/settings'
import { billsFor, billTotal, KOPERASI_LABEL, type BillPeriod } from '@/data/koperasi-deductions'
import { LEAVE_PERIODS, rangeLabel, workdaysBetween, type LeavePeriod } from '@/data/leave'
import { KELOMPOK_LIST, pembagiOf, type Kelompok } from '@/data/master/levels'
import { rekapFor, type OtRecord } from '@/data/overtime'
import { applyMembership, membershipAt } from '@/data/payroll/bpjs-membership'
import { bpjsOf, pphHarian, pphOf, type BpjsParts } from '@/data/payroll/calc'
import { COMPONENTS, makanAt, transportAt, tunjanganAt, upahHarianAt } from '@/data/payroll/components'
import { salaryAt } from '@/data/payroll/salaries'
import { bump } from '@/data/payroll/store'

/* ---------- periode ---------- */
export type PeriodId = '2026-09' | '2026-10' | '2026-11' | '2026-12'
export type PayPeriod = {
  id: PeriodId
  label: string
  dari: string
  sampai: string
  bayar: string
  leave: LeavePeriod
  prev?: PeriodId
  /** Periode transisi cut-off. */
  transisi: boolean
  /** Periode lama yang sudah tersimpan: dihitung dengan aturan saat itu dan tidak dihitung ulang. */
  legacy: boolean
}

const lp = (id: string) => LEAVE_PERIODS.find((p) => p.id === id)!
const mk = (id: PeriodId, bayar: string, prev?: PeriodId): PayPeriod => ({
  id, label: lp(id).label, dari: lp(id).start, sampai: lp(id).end, bayar, leave: lp(id), prev, transisi: lp(id).transisi, legacy: id === '2026-09',
})
export const PAY_PERIODS: PayPeriod[] = [
  mk('2026-09', '2026-09-30'),
  mk('2026-10', '2026-10-31', '2026-09'),
  mk('2026-11', '2026-11-30', '2026-10'),
  mk('2026-12', '2026-12-31', '2026-11'),
]
export const periodById = (id: PeriodId) => PAY_PERIODS.find((p) => p.id === id)!
export const cutoffText = (p: PayPeriod) => rangeLabel(p.dari, p.sampai)
/** Periode terkunci sampai cut-off kehadiran berakhir. */
export const isLocked = (p: PayPeriod) => p.id === '2026-11' || p.id === '2026-12'

/* ---------- komponen insidental ---------- */
export type InsDef = { nama: string; tipe: 'pendapatan' | 'potongan'; bruto: boolean; /** Komponen sistem dari Hak Akhir: tidak masuk dasar PPh 21 TER dan tidak tampil di pilihan manual. */ final?: boolean }
export const INS_DEFS: InsDef[] = [
  { nama: 'Bonus Produksi', tipe: 'pendapatan', bruto: true },
  { nama: 'Rapel', tipe: 'pendapatan', bruto: true },
  { nama: 'Potongan Lain', tipe: 'potongan', bruto: false },
  { nama: 'Kompensasi PKWT', tipe: 'pendapatan', bruto: true },
  { nama: 'Hak Akhir', tipe: 'pendapatan', bruto: false, final: true },
  { nama: 'PPh 21 Final Hak Akhir', tipe: 'potongan', bruto: false, final: true },
  { nama: 'Potongan Hak Akhir', tipe: 'potongan', bruto: false, final: true },
]
export type Insidental = { id: string; nik: string; komponen: string; nominal: number; ket: string }

/* ---------- baris gaji ---------- */
export type PayRow = {
  nik: string
  nama: string
  /** Group Kerja pegawai pada saat baris dibuat; menentukan run (Periode + Group). */
  kelompok: Kelompok
  /** Dibayar ke vendor (Outsourcing): tanpa BPJS, PPh 21, dan potongan Koperasi dari perusahaan. */
  vendor: boolean
  /** Upah per hari (hanya Group Harian). */
  upahHarian?: number
  department: string
  section: string
  posisi: string
  hariKerja: number
  hadir: number
  alfa: number
  izin: number
  cuti: number
  sakit: number
  gaji: number
  tunjangan: number
  potHadir: number
  makan: number
  transport: number
  lembur: number
  /** Jam lembur tervalidasi (hanya untuk ringkasan slip). */
  lemburJam: number
  insPend: number
  potLain: number
  ins: Insidental[]
  pendapatan: number
  kesCo: number
  jhtCo: number
  jpCo: number
  jkk: number
  jkkLabel: string
  jkm: number
  bebanCo: number
  bruto: number
  kategori: 'A' | 'B' | 'C'
  tarif: number
  beyond: boolean
  pph: number
  kesP: number
  jhtP: number
  jpP: number
  bpjsPegawai: number
  koperasi: { label: string; jumlah: number }[]
  koperasiTotal: number
  potongan: number
  neto: number
  rekeningAda: boolean
  ptkp: string
  // pembanding periode lalu
  prevNeto?: number
  deltaPct?: number
  flagged: boolean
  reasons: string[]
}

export type RunCtx = { records: DayRecord[]; scans: Scan[]; otRecords: OtRecord[] }

/**
 * Data Oktober 2026 pegawai bernama (menimpa nilai bawaan): hari hadir, Alfa/Izin, dan lembur.
 * Catatan: seed modul Overtime memuat lembur tervalidasi Oktober untuk Rizky dan Eko; payroll memakai "none" sesuai spesifikasi.
 */
const OCT_OVERRIDES: Record<string, { hadir: number; alfa: number; izin: number }> = {
  'PPI-2024-0112': { hadir: 26, alfa: 0, izin: 0 }, // Rizky Pratama
  'PPI-2021-0019': { hadir: 25, alfa: 1, izin: 0 }, // Joko Susilo (Alfa 20 Okt)
  'PPI-2023-0088': { hadir: 26, alfa: 0, izin: 0 }, // Eko Prasetyo
}

const active = (id: string) => COMPONENTS.find((c) => c.id === id)?.status !== 'Nonaktif'

const legacyView = (e: RosterEmployee): RosterEmployee => (e.legacy ? { ...e, ...e.legacy } : e)
const ZERO_BPJS = (upah: number): BpjsParts => ({
  upah, kesCo: 0, jhtCo: 0, jpCo: 0, jkk: 0, jkkRate: 0, jkkLabel: '—', jkm: 0, kesP: 0, jhtP: 0, jpP: 0, bpjsPegawai: 0, bebanCo: 0, bebanBruto: 0,
})

function buildRow(real: RosterEmployee, p: PayPeriod, ins: Insidental[], ctx: RunCtx, recap: Map<string, ReturnType<typeof buildRecap>[number]>, lemburMap: Map<string, { total: number; jam: number }>): PayRow {
  // Periode lama dihitung dengan klasifikasi dan gaji saat periode itu disimpan.
  const emp = p.legacy ? legacyView(real) : real
  const sal = salaryAt(real, p.bayar)
  const hariKerja = workdaysBetween(p.dari, p.sampai, emp)
  const rc = p.id === '2026-10' ? recap.get(emp.nik) : undefined
  const ov = p.id === '2026-10' ? OCT_OVERRIDES[emp.nik] : undefined
  const alfa = ov?.alfa ?? rc?.alfa ?? 0
  const izin = ov?.izin ?? rc?.izin ?? 0
  const cuti = ov ? 0 : rc?.cuti ?? 0
  const sakit = ov ? 0 : rc?.sakit ?? 0
  const hadir = ov?.hadir ?? Math.max(0, hariKerja - alfa - izin - cuti - sakit)
  const lembur = ov ? 0 : lemburMap.get(emp.nik)?.total ?? 0
  const lemburJam = ov ? 0 : lemburMap.get(emp.nik)?.jam ?? 0

  const harian = !p.legacy && real.kelompok === 'Harian'
  const vendor = !p.legacy && real.kelompok === 'Outsourcing'
  const upahHarian = harian ? upahHarianAt(p.bayar) : undefined
  // Harian: upah = upah harian × hari hadir, tanpa tunjangan, uang makan/transport, atau potongan kehadiran.
  const gaji = harian ? upahHarian! * hadir : p.legacy && real.legacy ? real.legacy.gajiPokok : sal.gajiPokok
  const tunjangan = harian ? 0 : tunjanganAt(emp.level, p.bayar)
  const upah = gaji + tunjangan
  const potHadir = harian ? 0 : Math.round((upah * (alfa + izin)) / pembagiOf(emp.kelompok, emp.level))
  const makan = !harian && active('makan') ? makanAt(p.bayar) * hadir : 0
  const transport = !harian && active('transport') ? transportAt(p.bayar) * hadir : 0
  const mine = ins.filter((i) => i.nik === emp.nik)
  const def = (n: string) => INS_DEFS.find((d) => d.nama === n)
  const insPend = mine.filter((i) => !def(i.komponen)?.final && (def(i.komponen)?.tipe ?? 'pendapatan') === 'pendapatan').reduce((a, i) => a + i.nominal, 0)
  const potLain = mine.filter((i) => !def(i.komponen)?.final && def(i.komponen)?.tipe === 'potongan').reduce((a, i) => a + i.nominal, 0)
  // Hak Akhir (pesangon dll.) dibayar lewat payroll sebagai bagian tidak berulang: PPh final sudah dihitung sendiri, jadi tidak masuk dasar TER.
  const hakIn = mine.filter((i) => def(i.komponen)?.final && def(i.komponen)?.tipe === 'pendapatan').reduce((a, i) => a + i.nominal, 0)
  const hakOut = mine.filter((i) => def(i.komponen)?.final && def(i.komponen)?.tipe === 'potongan').reduce((a, i) => a + i.nominal, 0)
  const pendapatan = gaji + tunjangan - potHadir + makan + transport + lembur + insPend

  // Iuran hanya untuk program yang berstatus Aktif pada periode (kepesertaan BPJS); Outsourcing diurus vendor.
  const b = vendor ? ZERO_BPJS(upah) : applyMembership(bpjsOf(upah, p.bayar), membershipAt(emp.nik, p.bayar))
  const bruto = pendapatan + b.bebanBruto
  const t = vendor ? { kategori: pphOf(0, sal.ptkp).kategori, tarif: 0, beyond: false, pph: 0 } : harian ? pphHarian(bruto, upahHarian!, sal.ptkp, p.bayar) : pphOf(bruto, sal.ptkp)

  const bills = vendor ? [] : billsFor(p.id as BillPeriod).filter((x) => x.nik === emp.nik)
  const koperasi = bills.map((x) => ({ label: x.admin ? `${KOPERASI_LABEL[x.kind]} (+ admin ${KASBON_ADMIN_PCT}%)` : KOPERASI_LABEL[x.kind], jumlah: billTotal(x) }))
  const koperasiTotal = koperasi.reduce((a, x) => a + x.jumlah, 0)
  const potongan = b.bpjsPegawai + t.pph + koperasiTotal + potLain
  return {
    nik: emp.nik, nama: emp.nama, kelompok: real.kelompok, vendor, upahHarian, department: emp.department, section: emp.section ?? '', posisi: emp.posisi,
    hariKerja, hadir, alfa, izin, cuti, sakit, gaji, tunjangan, potHadir, makan, transport, lembur, lemburJam, insPend, potLain, ins: mine, pendapatan,
    kesCo: b.kesCo, jhtCo: b.jhtCo, jpCo: b.jpCo, jkk: b.jkk, jkkLabel: b.jkkLabel, jkm: b.jkm, bebanCo: b.bebanCo, bruto,
    kategori: t.kategori, tarif: t.tarif, beyond: t.beyond, pph: t.pph,
    kesP: b.kesP, jhtP: b.jhtP, jpP: b.jpP, bpjsPegawai: b.bpjsPegawai,
    koperasi, koperasiTotal, potongan, neto: pendapatan - potongan + hakIn - hakOut,
    rekeningAda: !!sal.nomorRekening, ptkp: sal.ptkp, flagged: false, reasons: [],
  }
}

/** Baris periode lama (September) dibekukan pada hitungan pertama dan tidak dihitung ulang. */
const frozen = new Map<PeriodId, PayRow[]>()
function rowsOf(p: PayPeriod, ins: Insidental[], ctx: RunCtx, group?: Kelompok): PayRow[] {
  if (p.legacy) {
    let all = frozen.get(p.id)
    if (!all) {
      all = build(p, [], ctx)
      frozen.set(p.id, all)
    }
    return group ? all.filter((r) => r.kelompok === group) : all
  }
  return build(p, ins, ctx, group)
}
function build(p: PayPeriod, ins: Insidental[], ctx: RunCtx, group?: Kelompok): PayRow[] {
  const recap = new Map(buildRecap(ctx.records).map((r) => [r.emp.nik, r]))
  const lemburMap = new Map(rekapFor(ctx.otRecords, ctx.scans, p.leave).map((r) => [r.nik, { total: r.total, jam: r.jam }]))
  return ROSTER.filter((e) => !group || e.kelompok === group)
    .map((e) => buildRow(e, p, ins, ctx, recap, lemburMap))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}

/**
 * Hitung seluruh baris periode beserta pembanding periode sebelumnya. Baris ditandai bila |Δ neto| > 10%
 * atau komponen variabel (lembur, Alfa, Izin) berubah ≥ 5% dari neto bulan lalu.
 */
export function computeRows(p: PayPeriod, ins: Insidental[], ctx: RunCtx, group?: Kelompok): PayRow[] {
  const rows = rowsOf(p, ins, ctx, group)
  if (!p.prev) return rows
  const prev = new Map(rowsOf(periodById(p.prev), [], ctx, group).map((r) => [r.nik, r]))
  for (const r of rows) {
    const q = prev.get(r.nik)
    if (!q || q.neto <= 0) continue
    r.prevNeto = q.neto
    r.deltaPct = ((r.neto - q.neto) / q.neto) * 100
    const variable = Math.abs(r.lembur - q.lembur) + Math.abs(r.potHadir - q.potHadir)
    r.flagged = Math.abs(r.deltaPct) > 10 || variable >= q.neto * 0.05
    if (r.lembur !== q.lembur) r.reasons.push(r.lembur < q.lembur ? 'Lembur turun' : 'Lembur naik')
    if (r.alfa > q.alfa) r.reasons.push(`Alfa ${r.alfa} hari`)
    if (r.izin > q.izin) r.reasons.push(`Izin ${r.izin} hari`)
    if (r.cuti + r.sakit > q.cuti + q.sakit) r.reasons.push('Cuti/Sakit')
    if (r.insPend > 0) r.reasons.push('Bonus')
    if (r.potLain > 0) r.reasons.push('Potongan lain')
    if (r.koperasi.some((k) => k.label.startsWith('Kasbon')) && !q.koperasi.some((k) => k.label.startsWith('Kasbon'))) r.reasons.push('Kasbon')
    if (r.koperasiTotal !== q.koperasiTotal && !r.reasons.includes('Kasbon')) r.reasons.push('Koperasi')
    if (r.flagged && r.reasons.length === 0) r.reasons.push(r.deltaPct! > 0 ? 'Neto naik' : 'Neto turun')
  }
  return rows
}

export type Totals = { pegawai: number; pendapatan: number; potongan: number; neto: number; bebanBpjs: number }
export const totalsOf = (rows: PayRow[]): Totals => ({
  pegawai: rows.length,
  pendapatan: rows.reduce((a, r) => a + r.pendapatan, 0),
  potongan: rows.reduce((a, r) => a + r.potongan, 0),
  neto: rows.reduce((a, r) => a + r.neto, 0),
  bebanBpjs: rows.reduce((a, r) => a + r.bebanCo, 0),
})

/* ---------- state run ---------- */
export type RunStatus = 'belum' | 'draft' | 'menunggu' | 'disetujui' | 'final' | 'closed'
type Who = { by: string; at: string }
/** Identitas run = Periode + Group Kerja, mis. "2026-10|Non Staff". */
export type RunId = string & { readonly __run: true }
export const runKey = (period: PeriodId, group: Kelompok) => `${period}|${group}` as RunId
export const RUN_GROUPS: Kelompok[] = KELOMPOK_LIST

export type Run = {
  id: RunId
  period: PeriodId
  group: Kelompok
  status: RunStatus
  /** Langkah tertinggi yang sudah terbuka (1–7). */
  reached: number
  insidentals: Insidental[]
  draft?: { at: string; rows: PayRow[]; stale: boolean; prev?: Totals }
  checks: Record<string, { checked: boolean; note: string }>
  submitted?: Who
  rejected?: Who & { alasan: string }
  approved?: Who
  final?: Who
  /** Closing periode setelah gaji dibayar dan potongan Koperasi dikirim. */
  closed?: Who
  audit: (Who & { action: string })[]
}

const fresh = (period: PeriodId, group: Kelompok): Run => ({ id: runKey(period, group), period, group, status: 'belum', reached: 1, insidentals: [], checks: {}, audit: [] })
const septemberRun = (group: Kelompok): Run => ({
  ...fresh('2026-09', group),
  status: 'closed',
  reached: 7,
  closed: { by: 'Mira Andriani', at: '30 Sep 2026, 16.00 WIB' },
  submitted: { by: 'Mira Andriani', at: '28 Sep 2026, 14.20 WIB' },
  approved: { by: 'Lestari Wulandari', at: '29 Sep 2026, 09.10 WIB' },
  final: { by: 'Mira Andriani', at: '29 Sep 2026, 10.05 WIB' },
  audit: [
    { at: '28 Sep 2026, 14.20 WIB', by: 'Mira Andriani', action: 'Mengajukan approval' },
    { at: '29 Sep 2026, 09.10 WIB', by: 'Lestari Wulandari', action: 'Menyetujui payroll' },
    { at: '29 Sep 2026, 10.05 WIB', by: 'Mira Andriani', action: 'Finalisasi & kunci' },
    { at: '30 Sep 2026, 16.00 WIB', by: 'Mira Andriani', action: 'Closing periode' },
  ],
})
export const RUNS = Object.fromEntries(
  PAY_PERIODS.flatMap((p) => RUN_GROUPS.map((g) => [runKey(p.id, g), p.id === '2026-09' ? septemberRun(g) : fresh(p.id, g)] as const)),
) as Record<RunId, Run>
export const runOf = (id: RunId) => RUNS[id]
export const runsOf = (period: PeriodId) => RUN_GROUPS.map((g) => RUNS[runKey(period, g)])
/** Perhitungan sudah dikunci (Final) atau periode sudah ditutup (Closed). */
export const isFinalized = (r: Run) => r.status === 'final' || r.status === 'closed'
export const isEditable = (r: Run) => r.status === 'belum' || r.status === 'draft'
/** Semua run periode (lima group) sudah Final/Closed. */
export const periodFinalized = (period: PeriodId) => runsOf(period).every(isFinalized)

/** Ringkasan status seluruh group sebuah periode untuk pemilih periode. */
export function periodStatusText(period: PeriodId): string {
  const rs = runsOf(period)
  if (rs.every((r) => r.status === 'closed')) return STATUS_LABEL.closed
  if (rs.every(isFinalized)) return STATUS_LABEL.final
  if (rs.every((r) => r.status === 'belum')) return STATUS_LABEL.belum
  return `${rs.filter(isFinalized).length}/${rs.length} Final`
}

/**
 * Baris sebuah run: draft yang ditarik, atau (untuk periode lama yang sudah final tanpa draft) baris yang dibekukan.
 * Run yang sudah Final tidak pernah dihitung ulang.
 */
export function runRows(id: RunId, ctx: RunCtx): PayRow[] {
  const r = RUNS[id]
  if (r.draft) return r.draft.rows
  if (!isFinalized(r)) return []
  return computeRows(periodById(r.period), r.insidentals, ctx, r.group)
}
/** Gabungan baris semua run periode yang sudah punya baris. */
export const periodRowsOf = (period: PeriodId, ctx: RunCtx) => runsOf(period).flatMap((r) => runRows(r.id, ctx))

const log = (r: Run, by: string, action: string) => r.audit.unshift({ at: nowStamp(), by, action })
const touch = (r: Run) => {
  if (r.draft) r.draft.stale = true
}

/* ---- insidental ---- */
export const dupError = (r: Run, nik: string, komponen: string, ignoreId?: string) => {
  const hit = r.insidentals.find((i) => i.nik === nik && i.komponen === komponen && i.id !== ignoreId)
  return hit ? `${ROSTER.find((e) => e.nik === nik)?.nama ?? nik} sudah memiliki ${komponen} periode ini.` : ''
}
let insSeq = 1
export function saveInsidental(id: RunId, input: Omit<Insidental, 'id'> & { id?: string }, by: string) {
  const r = RUNS[id]
  const e = dupError(r, input.nik, input.komponen, input.id)
  if (e) return e
  if (input.id) r.insidentals = r.insidentals.map((i) => (i.id === input.id ? { ...i, ...input, id: input.id! } : i))
  else r.insidentals.push({ ...input, id: `ins-${insSeq++}` })
  log(r, by, `${input.id ? 'Mengubah' : 'Menambah'} ${input.komponen} untuk ${ROSTER.find((x) => x.nik === input.nik)?.nama}`)
  touch(r)
  bump()
  return ''
}
export function saveInsidentalBulk(id: RunId, niks: string[], komponen: string, nominal: number, ket: string, by: string) {
  const r = RUNS[id]
  const dup = niks.map((n) => dupError(r, n, komponen)).filter(Boolean)
  if (dup.length) return dup.length > 1 ? `${dup[0]} (dan ${dup.length - 1} pegawai lain)` : dup[0]
  for (const nik of niks) r.insidentals.push({ id: `ins-${insSeq++}`, nik, komponen, nominal, ket })
  log(r, by, `Menambah ${komponen} massal untuk ${niks.length} pegawai`)
  touch(r)
  bump()
  return ''
}
export function removeInsidental(id: RunId, insId: string, by: string) {
  const r = RUNS[id]
  r.insidentals = r.insidentals.filter((i) => i.id !== insId)
  log(r, by, 'Menghapus komponen insidental')
  touch(r)
  bump()
}

/* ---- langkah ---- */
export function advance(id: RunId, toStep: number) {
  const r = RUNS[id]
  if (toStep > r.reached) {
    r.reached = toStep
    bump()
  }
}

export function pullDraft(id: RunId, ctx: RunCtx, by: string) {
  const r = RUNS[id]
  const p = periodById(r.period)
  const rows = computeRows(p, r.insidentals, ctx, r.group)
  const keep = r.checks
  r.draft = { at: nowStamp(), rows, stale: false, prev: p.prev ? totalsOf(rowsOf(periodById(p.prev), [], ctx, r.group)) : undefined }
  // Centang lama dipertahankan hanya untuk baris yang masih ditandai.
  r.checks = Object.fromEntries(rows.filter((x) => x.flagged && keep[x.nik]).map((x) => [x.nik, keep[x.nik]]))
  r.status = 'draft'
  r.reached = Math.max(r.reached, 4)
  log(r, by, `Tarik gaji ${r.group}: ${rows.length} pegawai dihitung`)
  bump()
}

export function setCheck(id: RunId, nik: string, checked: boolean, note?: string) {
  const r = RUNS[id]
  const cur = r.checks[nik] ?? { checked: false, note: '' }
  r.checks[nik] = { checked: checked ?? cur.checked, note: note ?? cur.note }
  bump()
}
export const flaggedOf = (r: Run) => (r.draft?.rows ?? []).filter((x) => x.flagged)
export const uncheckedCount = (r: Run) => flaggedOf(r).filter((x) => !r.checks[x.nik]?.checked).length

export function submitRun(id: RunId, by: string, note = '') {
  const r = RUNS[id]
  r.status = 'menunggu'
  r.submitted = { by, at: nowStamp() }
  r.rejected = undefined
  r.reached = Math.max(r.reached, 5)
  log(r, by, `Mengajukan approval ke Lestari Wulandari${note}`)
  bump()
}
export function rejectRun(id: RunId, by: string, alasan: string) {
  const r = RUNS[id]
  r.status = 'draft'
  r.rejected = { by, at: nowStamp(), alasan }
  r.submitted = undefined
  r.reached = 4
  log(r, by, `Menolak payroll: ${alasan}`)
  bump()
}
export function approveRun(id: RunId, by: string, note = '') {
  const r = RUNS[id]
  r.status = 'disetujui'
  r.approved = { by, at: nowStamp() }
  r.reached = 6
  log(r, by, `Menyetujui payroll${note}`)
  bump()
}
export function finalizeRun(id: RunId, by: string, note = '') {
  const r = RUNS[id]
  r.status = 'final'
  r.final = { by, at: nowStamp() }
  r.reached = 7
  log(r, by, `Finalisasi & kunci${note}`)
  bump()
}
export function closePeriod(id: RunId, by: string) {
  const r = RUNS[id]
  if (r.status !== 'final') return
  r.status = 'closed'
  r.closed = { by, at: nowStamp() }
  log(r, by, 'Closing periode')
  bump()
}

export const STATUS_LABEL: Record<RunStatus, string> = {
  belum: 'Belum diproses',
  draft: 'Draft',
  menunggu: 'Menunggu Approval',
  disetujui: 'Disetujui',
  final: 'Final',
  closed: 'Closed',
}

/* ---------- skenario demo ---------- */
const SCENARIO_NOTE = ' (oleh skenario demo)'
/** Bonus Produksi Rp 250.000 untuk seluruh pegawai Section Injection pada skenario. */
export const SCENARIO_BONUS = { komponen: 'Bonus Produksi', nominal: 250_000, ket: 'Skenario demo: bonus Section Injection' }

/**
 * Menyelesaikan payroll sebuah periode (kelima group) sampai Final: tambah bonus Section Injection, tarik gaji, cek baris
 * ditandai, diajukan, disetujui sebagai Lestari Wulandari, lalu difinalisasi sebagai Mira Andriani. Dipanggil setelah closing kehadiran.
 */
export function completeScenario(period: PeriodId, ctx: RunCtx) {
  const demo = 'Skenario (demo)'
  for (const group of RUN_GROUPS) {
    const id = runKey(period, group)
    const r = RUNS[id]
    if (isFinalized(r)) continue
    if (r.status === 'belum' || r.status === 'draft') {
      const have = new Set(r.insidentals.filter((i) => i.komponen === SCENARIO_BONUS.komponen).map((i) => i.nik))
      const niks = ROSTER.filter((e) => e.section === 'Injection' && e.kelompok === group && !have.has(e.nik)).map((e) => e.nik)
      if (niks.length) saveInsidentalBulk(id, niks, SCENARIO_BONUS.komponen, SCENARIO_BONUS.nominal, SCENARIO_BONUS.ket, demo)
      advance(id, 3)
      pullDraft(id, ctx, demo)
      for (const x of flaggedOf(r)) setCheck(id, x.nik, true, r.checks[x.nik]?.note || 'Dicek oleh skenario demo')
      submitRun(id, 'Mira Andriani', SCENARIO_NOTE)
    }
    if (r.status === 'menunggu') approveRun(id, 'Lestari Wulandari', SCENARIO_NOTE)
    if (r.status === 'disetujui') finalizeRun(id, 'Mira Andriani', SCENARIO_NOTE)
  }
}
