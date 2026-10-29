import { BUDGETS, PENGELUARAN, realisasi } from '@/data/koperasi/budget'
import { balanceOf } from '@/data/koperasi/ledger'
import { BILL_PERIOD_IDS, KASBON, LOANS, periodLabel, sisaOf, type KasbonStatus, type LoanStatus } from '@/data/koperasi/loans'
import { activeMembers, LEDGER_END } from '@/data/koperasi/members'
import { isConfirmed } from '@/data/koperasi/realisasi'
import { CHANGES, REGISTRATIONS, WITHDRAWALS, type WdStatus } from '@/data/koperasi/requests'
import { POS_ANGGARAN } from '@/data/koperasi/settings'
import { finalOf, reportOf } from '@/data/koperasi/shu'
import { selisih } from '@/data/koperasi/trading'
import { DEMO_TODAY } from '@/lib/today'
import type { PageId } from '@/App'

/** Dashboard Koperasi: seluruh angka dibaca dari data hidup modul Koperasi (tidak ada angka dashboard yang di-seed terpisah). */
const YEAR = Number(DEMO_TODAY.slice(0, 4))
export const COOP_MONTHS = Array.from({ length: 10 }, (_, i) => `${YEAR}-${String(10 - i).padStart(2, '0')}`)
export const DEFAULT_COOP_MONTH = DEMO_TODAY.slice(0, 7)

export function lastConfirmedPeriod() {
  const done = BILL_PERIOD_IDS.filter(isConfirmed)
  return done.length ? done[done.length - 1] : LEDGER_END
}

export function coopKpi() {
  const members = activeMembers()
  let pokok = 0, wajib = 0, sukarela = 0
  for (const m of members) {
    const b = balanceOf(m.nik)
    pokok += b.Pokok; wajib += b.Wajib; sukarela += b.Sukarela
  }
  const pinjaman = LOANS.filter((l) => l.jenis === 'koperasi' && l.status === 'aktif').reduce((a, l) => a + sisaOf(l), 0)
  const kasbon = KASBON.filter((k) => ['dicairkan', 'ditagihkan', 'tertahan'].includes(k.status)).reduce((a, k) => a + k.nominal, 0)
  const shu = reportOf(YEAR)
  return {
    anggota: members.length,
    pokok, wajib, sukarela, tersimpan: pokok + wajib + sukarela,
    pinjaman, kasbon, terutang: pinjaman + kasbon,
    shu: shu.shu, shuFinal: !!finalOf(YEAR),
    pendapatan: shu.pendapatan.total, beban: shu.bebanTotal,
    adminKasbon: shu.pendapatan.admin, udSelisih: shu.pendapatan.udSelisih,
  }
}

export type BudgetBar = { kode: string; nama: string; budget: number; realisasi: number }
/** Mode "bulan": satu bulan; mode "tahun": akumulasi Januari s/d bulan terpilih. */
export function budgetVsRealisasi(bulan: string, mode: 'bulan' | 'tahun'): BudgetBar[] {
  const months = mode === 'bulan' ? [bulan] : COOP_MONTHS.filter((m) => m <= bulan).sort()
  return POS_ANGGARAN.filter((p) => p.aktif || months.some((m) => (BUDGETS[m]?.items[p.kode] ?? 0) > 0 || realisasi(m, p.kode) > 0)).map((p) => ({
    kode: p.kode,
    nama: p.nama,
    budget: months.reduce((a, m) => a + (BUDGETS[m]?.items[p.kode] ?? 0), 0),
    realisasi: months.reduce((a, m) => a + realisasi(m, p.kode), 0),
  }))
}
export const udMonthly = () => [...COOP_MONTHS].sort().map((m) => ({ bulan: m, selisih: selisih(m) }))

/* ----------------------------- Sirkulasi transaksi ----------------------------- */
export type Cell = { n: number; rp: number | null }
export type CircRow = { jenis: string; diajukan: Cell; disetujui: Cell; dicairkan: Cell | null; ditolak: Cell }
type Item = { diajukan: string; cair?: string; ok: boolean; no: boolean; nominal: number | null }
const cell = (xs: Item[]): Cell => ({ n: xs.length, rp: xs.some((x) => x.nominal == null) ? null : xs.reduce((a, x) => a + (x.nominal ?? 0), 0) })
function row(jenis: string, items: Item[], bulan: string, withCair = true): CircRow {
  const aju = items.filter((x) => x.diajukan.startsWith(bulan))
  return {
    jenis,
    diajukan: cell(aju),
    disetujui: cell(aju.filter((x) => x.ok)),
    dicairkan: withCair ? cell(items.filter((x) => x.cair?.startsWith(bulan))) : null,
    ditolak: cell(aju.filter((x) => x.no)),
  }
}
const KB_OK: KasbonStatus[] = ['disetujui', 'dicairkan', 'ditagihkan', 'lunas', 'tertahan']
const LN_OK: LoanStatus[] = ['disetujui', 'aktif', 'lunas']
const WD_OK: WdStatus[] = ['disetujui', 'dicairkan']
export function circulation(bulan: string) {
  const rows: CircRow[] = [
    row('Kasbon', KASBON.map((k) => ({ diajukan: k.diajukan, cair: k.cair?.tanggal ?? k.tunai?.tanggal, ok: KB_OK.includes(k.status), no: k.status === 'ditolak' || k.status === 'dibatalkan', nominal: k.nominal })), bulan),
    row('Pinjaman Koperasi', LOANS.filter((l) => l.jenis === 'koperasi').map((l) => ({ diajukan: l.diajukan, cair: l.cair?.tanggal, ok: LN_OK.includes(l.status), no: l.status === 'ditolak' || l.status === 'dibatalkan', nominal: l.pokok })), bulan),
    row('Pencairan Sukarela', WITHDRAWALS.map((w) => ({ diajukan: w.diajukan, cair: w.cair?.tanggal, ok: WD_OK.includes(w.status), no: w.status === 'ditolak' || w.status === 'dibatalkan', nominal: w.nominal })), bulan),
    row('Pendaftaran Anggota', REGISTRATIONS.map((r) => ({ diajukan: r.diajukan, ok: r.status === 'disetujui', no: r.status === 'ditolak', nominal: null })), bulan, false),
  ]
  const non = LOANS.filter((l) => l.jenis === 'non' && l.status === 'aktif')
  return { rows, nonCount: non.length, nonSisa: non.reduce((a, l) => a + sisaOf(l), 0) }
}

/* ----------------------------- Menunggu tindakan ----------------------------- */
export type Todo = { key: string; no: string; jenis: string; anggota: string; nominal: number | null; menunggu: 'Ketua' | 'Bendahara'; page: PageId }
const nameOf = (nik: string) => activeMembers().find((m) => m.nik === nik)?.nama ?? LOANS.find((l) => l.nik === nik)?.nik ?? nik
/** Urutan tampil: pinjaman, pencairan, pendaftaran, kasbon, lalu perubahan setoran dan pengajuan Budget/Pengeluaran. */
export function todos(): Todo[] {
  const out: Todo[] = []
  for (const l of LOANS) {
    if (l.status === 'menunggu-ketua') out.push({ key: l.id, no: l.id, jenis: l.jenis === 'koperasi' ? 'Pinjaman Koperasi' : 'Pinjaman Non-Koperasi', anggota: nameOf(l.nik), nominal: l.pokok, menunggu: 'Ketua', page: 'coop-loans' })
    if (l.status === 'disetujui') out.push({ key: l.id, no: l.id, jenis: 'Pinjaman Koperasi', anggota: nameOf(l.nik), nominal: l.pokok, menunggu: 'Bendahara', page: 'coop-loans' })
  }
  for (const w of WITHDRAWALS) {
    if (w.status === 'menunggu-ketua') out.push({ key: w.id, no: w.id, jenis: 'Pencairan Sukarela', anggota: nameOf(w.nik), nominal: w.nominal, menunggu: 'Ketua', page: 'coop-withdrawals' })
    if (w.status === 'disetujui') out.push({ key: w.id, no: w.id, jenis: 'Pencairan Sukarela', anggota: nameOf(w.nik), nominal: w.nominal, menunggu: 'Bendahara', page: 'coop-withdrawals' })
  }
  for (const r of REGISTRATIONS) if (r.status === 'menunggu') out.push({ key: r.id, no: r.id, jenis: 'Pendaftaran Anggota', anggota: r.nama, nominal: null, menunggu: 'Ketua', page: 'coop-members' })
  for (const k of KASBON) {
    if (k.status === 'menunggu-ketua') out.push({ key: k.id, no: k.id, jenis: 'Kasbon', anggota: nameOf(k.nik), nominal: k.nominal, menunggu: 'Ketua', page: 'coop-cash-advance' })
    if (k.status === 'disetujui') out.push({ key: k.id, no: k.id, jenis: 'Kasbon', anggota: nameOf(k.nik), nominal: k.nominal, menunggu: 'Bendahara', page: 'coop-cash-advance' })
  }
  for (const c of CHANGES) if (c.status === 'menunggu') out.push({ key: c.id, no: c.id, jenis: `Ubah Setoran ${c.jenis}`, anggota: nameOf(c.nik), nominal: c.baru, menunggu: 'Ketua', page: 'coop-members' })
  for (const p of PENGELUARAN) if (p.status === 'menunggu-ketua') out.push({ key: p.id, no: p.id, jenis: 'Pengeluaran', anggota: '—', nominal: p.nominal, menunggu: 'Ketua', page: 'coop-budget' })
  for (const b of Object.values(BUDGETS)) if (b.status === 'diajukan') out.push({ key: `budget-${b.bulan}`, no: `Budget ${periodLabel(b.bulan)}`, jenis: 'Master Budget', anggota: '—', nominal: null, menunggu: 'Ketua', page: 'coop-budget' })
  return out
}
