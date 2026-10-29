import { nowStamp } from '@/data/attendance'
import { LEDGER, MIG_PKO, monthName, postLedger, SEED_PKO } from '@/data/koperasi/finance'
import { POS_ANGGARAN, posOf, settingAt } from '@/data/koperasi/settings'
import { bump } from '@/data/koperasi/store'
import { DEMO_TODAY } from '@/lib/today'

/** Master Budget bulanan dan pengeluaran per pos anggaran. Pengeluaran Tercatat masuk buku keuangan Koperasi. */
export type BudgetStatus = 'draft' | 'diajukan' | 'disahkan' | 'ditolak'
export type Budget = {
  bulan: string
  status: BudgetStatus
  items: Record<string, number>
  diajukan?: { oleh: string; tanggal: string }
  sah?: { oleh: string; tanggal: string }
  tolak?: { oleh: string; tanggal: string; alasan: string }
}
const ITEMS_2026 = { 'OPS-001': 500_000, 'OPS-002': 200_000, 'OPS-003': 1_000_000, 'KPG-001': 1_500_000 }
const prevMonth = (ym: string) => {
  const t = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 2
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
export const BUDGETS: Record<string, Budget> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => {
    const bulan = `2026-${String(i + 1).padStart(2, '0')}`
    const sah = bulan === '2026-10' ? '2026-09-30' : `${prevMonth(bulan)}-28`
    return [bulan, { bulan, status: 'disahkan' as BudgetStatus, items: { ...ITEMS_2026 }, diajukan: { oleh: 'Nina Marlina', tanggal: sah }, sah: { oleh: 'Rudi Hartanto', tanggal: sah } }]
  }),
)
export const budgetOf = (bulan: string) => BUDGETS[bulan]
export const budgetTotal = (b?: Budget) => (b ? Object.values(b.items).reduce((a, n) => a + n, 0) : 0)
export const editable = (b?: Budget) => !!b && (b.status === 'draft' || b.status === 'ditolak')

export function copyBudget(bulan: string, by: string): string {
  if (BUDGETS[bulan]) return 'Budget bulan ini sudah ada'
  const prev = BUDGETS[prevMonth(bulan)]
  if (!prev) return 'Budget bulan sebelumnya belum ada'
  const items: Record<string, number> = {}
  for (const p of POS_ANGGARAN.filter((x) => x.aktif)) items[p.kode] = prev.items[p.kode] ?? 0
  BUDGETS[bulan] = { bulan, status: 'draft', items }
  void by
  bump()
  return ''
}
export function createManual(bulan: string) {
  if (BUDGETS[bulan]) return
  BUDGETS[bulan] = { bulan, status: 'draft', items: Object.fromEntries(POS_ANGGARAN.filter((p) => p.aktif).map((p) => [p.kode, 0])) }
  bump()
}
export function setItem(bulan: string, pos: string, nominal: number) {
  const b = BUDGETS[bulan]
  if (!editable(b)) return
  b.items[pos] = nominal
  bump()
}
export const budgetStep = 10_000
export function submitBudget(bulan: string, by: string) {
  const b = BUDGETS[bulan]
  if (!editable(b)) return
  b.status = 'diajukan'
  b.diajukan = { oleh: by, tanggal: DEMO_TODAY }
  b.tolak = undefined
  bump()
}
export function decideBudget(bulan: string, approve: boolean, alasan: string, by: string) {
  const b = BUDGETS[bulan]
  if (!b || b.status !== 'diajukan') return
  if (approve) {
    b.status = 'disahkan'
    b.sah = { oleh: by, tanggal: DEMO_TODAY }
  } else {
    b.status = 'ditolak'
    b.tolak = { oleh: by, tanggal: DEMO_TODAY, alasan }
  }
  bump()
}

/* ============================ Pengeluaran ============================ */
export type PkoStatus = 'tercatat' | 'menunggu-ketua' | 'ditolak' | 'dibatalkan'
export type Pengeluaran = {
  id: string
  tanggal: string
  pos: string
  keterangan: string
  penerima: string
  metode: 'Tunai' | 'Transfer'
  nominal: number
  bukti: string
  oleh: string
  status: PkoStatus
  disetujui?: { oleh: string; tanggal: string }
  tolak?: { oleh: string; tanggal: string; alasan: string }
  batal?: { oleh: string; tanggal: string; alasan: string }
}
export const PENGELUARAN: Pengeluaran[] = [...SEED_PKO].reverse().map((p) => ({ ...p, oleh: 'Nina Marlina', status: 'tercatat' as PkoStatus }))
let pkoSeq = 124

const inMonth = (bulan: string) => PENGELUARAN.filter((p) => p.tanggal.startsWith(bulan))
/** Realisasi pos = pengeluaran Tercatat (bulan sebelum Oktober memakai ringkasan migrasi di buku keuangan). */
export function realisasi(bulan: string, pos: string): number {
  if (bulan < '2026-10') return LEDGER.filter((r) => r.tipe === 'pengeluaran' && r.migrasi && r.pos === pos && r.tanggal.startsWith(bulan)).reduce((a, r) => a + r.nominal, 0)
  return inMonth(bulan).filter((p) => p.pos === pos && p.status === 'tercatat').reduce((a, p) => a + p.nominal, 0)
}
export const menunggu = (bulan: string, pos: string) => inMonth(bulan).filter((p) => p.pos === pos && p.status === 'menunggu-ketua').reduce((a, p) => a + p.nominal, 0)
export const sisa = (bulan: string, pos: string) => (BUDGETS[bulan]?.items[pos] ?? 0) - realisasi(bulan, pos) - menunggu(bulan, pos)
export const serapan = (bulan: string, pos: string) => {
  const b = BUDGETS[bulan]?.items[pos] ?? 0
  return b > 0 ? (realisasi(bulan, pos) / b) * 100 : 0
}
export const batasPengeluaran = () => settingAt('batasPengeluaran')
export const pkoMonths = () => MIG_PKO

export type PkoInput = { tanggal: string; pos: string; nominal: number; keterangan: string; penerima: string; metode: 'Tunai' | 'Transfer'; bukti: string }
export function pkoError(i: Partial<PkoInput>): string {
  const bulan = (i.tanggal ?? DEMO_TODAY).slice(0, 7)
  if (BUDGETS[bulan]?.status !== 'disahkan') return `Budget ${monthName(bulan)} belum disahkan Ketua.`
  if (!i.pos || !i.nominal) return ''
  const s = sisa(bulan, i.pos)
  return i.nominal > s ? `Melebihi sisa anggaran ${i.pos} ${monthName(bulan).split(' ')[0]} Rp ${Math.max(0, s).toLocaleString('id-ID')}` : ''
}
function ledgerPost(p: Pengeluaran) {
  postLedger({ tanggal: p.tanggal, tipe: 'pengeluaran', nominal: p.nominal, ref: p.id, label: p.keterangan, pos: p.pos })
}
export function createPengeluaran(i: PkoInput, by: string): { id?: string; error?: string; status?: PkoStatus } {
  const err = pkoError(i)
  if (err) return { error: err }
  if (!posOf(i.pos)?.aktif) return { error: 'Pos anggaran tidak aktif' }
  const id = `PKO-2026-${String(pkoSeq++).padStart(4, '0')}`
  const status: PkoStatus = i.nominal <= batasPengeluaran() ? 'tercatat' : 'menunggu-ketua'
  const p: Pengeluaran = { id, ...i, keterangan: i.keterangan.trim(), oleh: by, status }
  PENGELUARAN.unshift(p)
  if (status === 'tercatat') ledgerPost(p)
  bump()
  return { id, status }
}
export function decidePengeluaran(id: string, approve: boolean, alasan: string, by: string) {
  const p = PENGELUARAN.find((x) => x.id === id)
  if (!p || p.status !== 'menunggu-ketua') return
  if (approve) {
    p.status = 'tercatat'
    p.disetujui = { oleh: by, tanggal: DEMO_TODAY }
    ledgerPost(p)
  } else {
    p.status = 'ditolak'
    p.tolak = { oleh: by, tanggal: DEMO_TODAY, alasan }
  }
  bump()
}
export function cancelPengeluaran(id: string, alasan: string, by: string) {
  const p = PENGELUARAN.find((x) => x.id === id)
  if (!p || p.status !== 'menunggu-ketua') return
  p.status = 'dibatalkan'
  p.batal = { oleh: by, tanggal: DEMO_TODAY, alasan }
  bump()
}
export const stamp = nowStamp
