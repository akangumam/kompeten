import { bump } from '@/data/koperasi/store'

/**
 * Buku besar keuangan Koperasi (satu sumber data untuk Kasbon, Master Budget, Unit Dagang, dan SHU).
 * Pendapatan: biaya admin kasbon (saat Lunas) dan selisih Unit Dagang. Beban: pengeluaran berstatus Tercatat per pos anggaran.
 * Bulan sebelum Oktober 2026 adalah ringkasan bulanan "Data migrasi".
 */
export type LedgerTipe = 'admin' | 'ud-masuk' | 'ud-keluar' | 'pengeluaran'
export type LedgerRow = { id: string; tanggal: string; tipe: LedgerTipe; nominal: number; ref: string; label: string; pos?: string; migrasi?: boolean }
export const LEDGER: LedgerRow[] = []
let seq = 1
export function postLedger(row: Omit<LedgerRow, 'id'>) {
  LEDGER.push({ ...row, id: `FIN-${String(seq++).padStart(5, '0')}` })
  bump()
}
const lastDay = (ym: string) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`
const MONTH = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const monthName = (ym: string) => `${MONTH[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const m2026 = (n: number) => `2026-${String(n).padStart(2, '0')}`

/* ------------------------- data awal (satu-satunya tempat angka seed) ------------------------- */
/** Biaya admin kasbon Jan–Agu 2026 (migrasi) per bulan. */
export const MIG_ADMIN = Array.from({ length: 8 }, (_, i) => ({ bulan: m2026(i + 1), nominal: 600_000 }))
/** Unit Dagang Jan–Sep 2026 (migrasi): [masuk, keluar]. */
export const MIG_UD: Record<string, [number, number]> = {
  '2026-01': [12_800_000, 10_100_000], '2026-02': [12_200_000, 9_700_000], '2026-03': [14_900_000, 11_400_000],
  '2026-04': [13_100_000, 10_300_000], '2026-05': [13_600_000, 10_500_000], '2026-06': [13_300_000, 10_400_000],
  '2026-07': [13_900_000, 10_700_000], '2026-08': [13_700_000, 10_600_000], '2026-09': [14_000_000, 10_800_000],
}
/** Pengeluaran Jan–Sep 2026 (migrasi) per pos, per bulan. */
export const MIG_PKO: Record<string, number[]> = {
  'OPS-001': Array(9).fill(350_000),
  'OPS-002': Array(9).fill(100_000),
  'OPS-003': [250_000, 300_000, 250_000, 250_000, 300_000, 250_000, 250_000, 300_000, 250_000],
  'KPG-001': Array(9).fill(1_500_000),
}
export type SeedPko = { id: string; tanggal: string; pos: string; keterangan: string; penerima: string; metode: 'Tunai' | 'Transfer'; nominal: number; bukti: string; disetujui?: { oleh: string; tanggal: string } }
export const SEED_PKO: SeedPko[] = [
  { id: 'PKO-2026-0121', tanggal: '2026-10-05', pos: 'OPS-001', keterangan: 'Kertas HVS dan tinta printer', penerima: 'Toko Sinar Jaya', metode: 'Tunai', nominal: 285_000, bukti: 'nota-sinar-jaya.pdf' },
  { id: 'PKO-2026-0122', tanggal: '2026-10-20', pos: 'OPS-002', keterangan: 'Biaya transfer pencairan dan admin bank', penerima: 'Bank BRI', metode: 'Transfer', nominal: 90_000, bukti: 'rekening-koran-bri.pdf' },
  { id: 'PKO-2026-0123', tanggal: '2026-10-24', pos: 'KPG-001', keterangan: 'Honor pengurus Oktober 2026', penerima: 'Pengurus KSB', metode: 'Transfer', nominal: 1_500_000, bukti: 'bukti-honor-okt.pdf', disetujui: { oleh: 'Rudi Hartanto', tanggal: '2026-10-24' } },
]
export type SeedUdg = { id: string; tanggal: string; jenis: 'Masuk' | 'Keluar'; kategori: string; keterangan: string; nominal: number; bukti: string }
export const SEED_UDG: SeedUdg[] = [
  { id: 'UDG-2026-1001', tanggal: '2026-10-02', jenis: 'Keluar', kategori: 'Pembelian barang dagang', keterangan: 'Belanja stok minuman dan makanan ringan', nominal: 4_250_000, bukti: 'nota-stok-1.pdf' },
  { id: 'UDG-2026-1002', tanggal: '2026-10-09', jenis: 'Masuk', kategori: 'Penjualan tunai', keterangan: 'Rekap penjualan minggu 1', nominal: 3_150_000, bukti: 'rekap-minggu-1.pdf' },
  { id: 'UDG-2026-1003', tanggal: '2026-10-16', jenis: 'Masuk', kategori: 'Penjualan tunai', keterangan: 'Rekap penjualan minggu 2', nominal: 2_980_000, bukti: 'rekap-minggu-2.pdf' },
  { id: 'UDG-2026-1004', tanggal: '2026-10-16', jenis: 'Keluar', kategori: 'Pembelian barang dagang', keterangan: 'Belanja stok minggu 3', nominal: 3_600_000, bukti: 'nota-stok-2.pdf' },
  { id: 'UDG-2026-1005', tanggal: '2026-10-23', jenis: 'Masuk', kategori: 'Penjualan tunai', keterangan: 'Rekap penjualan minggu 3', nominal: 3_320_000, bukti: 'rekap-minggu-3.pdf' },
  { id: 'UDG-2026-1006', tanggal: '2026-10-24', jenis: 'Keluar', kategori: 'Biaya operasional unit', keterangan: 'Gas dan plastik kemasan', nominal: 350_000, bukti: 'nota-gas.pdf' },
]

function seedLedger() {
  for (const a of MIG_ADMIN) LEDGER.push({ id: `FIN-M${seq++}`, tanggal: lastDay(a.bulan), tipe: 'admin', nominal: a.nominal, ref: 'Data migrasi', label: `Biaya admin kasbon ${monthName(a.bulan)} (data migrasi)`, migrasi: true })
  // KSB-2026-0095 (Rizky): Lunas tunai 28 Sep 2026, biaya admin Rp 15.000.
  LEDGER.push({ id: `FIN-M${seq++}`, tanggal: '2026-09-28', tipe: 'admin', nominal: 15_000, ref: 'KSB-2026-0095', label: 'Biaya admin KSB-2026-0095 (Lunas tunai)' })
  for (const [bulan, [masuk, keluar]] of Object.entries(MIG_UD)) {
    LEDGER.push({ id: `FIN-M${seq++}`, tanggal: lastDay(bulan), tipe: 'ud-masuk', nominal: masuk, ref: 'Data migrasi', label: `Ringkasan ${monthName(bulan)} (data migrasi)`, migrasi: true })
    LEDGER.push({ id: `FIN-M${seq++}`, tanggal: lastDay(bulan), tipe: 'ud-keluar', nominal: keluar, ref: 'Data migrasi', label: `Ringkasan ${monthName(bulan)} (data migrasi)`, migrasi: true })
  }
  for (const [pos, list] of Object.entries(MIG_PKO)) list.forEach((nominal, i) => LEDGER.push({ id: `FIN-M${seq++}`, tanggal: lastDay(m2026(i + 1)), tipe: 'pengeluaran', nominal, ref: 'Data migrasi', label: `${pos} ${monthName(m2026(i + 1))} (data migrasi)`, pos, migrasi: true }))
  for (const p of SEED_PKO) LEDGER.push({ id: `FIN-M${seq++}`, tanggal: p.tanggal, tipe: 'pengeluaran', nominal: p.nominal, ref: p.id, label: p.keterangan, pos: p.pos })
  for (const u of SEED_UDG) LEDGER.push({ id: `FIN-M${seq++}`, tanggal: u.tanggal, tipe: u.jenis === 'Masuk' ? 'ud-masuk' : 'ud-keluar', nominal: u.nominal, ref: u.id, label: u.keterangan })
}
seedLedger()

export type FinanceSummary = { year: number; pendapatanAdmin: number; udMasuk: number; udKeluar: number; udSelisih: number; pendapatan: number; beban: number; selisih: number }
const sum = (year: number, tipe: LedgerTipe) => LEDGER.filter((r) => r.tipe === tipe && r.tanggal.startsWith(String(year))).reduce((a, r) => a + r.nominal, 0)
/** Ringkasan pendapatan dan beban Koperasi per tahun (dibaca SHU). */
export function getCoopFinanceSummary(year: number): FinanceSummary {
  const pendapatanAdmin = sum(year, 'admin')
  const udMasuk = sum(year, 'ud-masuk')
  const udKeluar = sum(year, 'ud-keluar')
  const udSelisih = udMasuk - udKeluar
  const pendapatan = pendapatanAdmin + udSelisih
  const beban = sum(year, 'pengeluaran')
  return { year, pendapatanAdmin, udMasuk, udKeluar, udSelisih, pendapatan, beban, selisih: pendapatan - beban }
}
export const adminIncome = (year: number) => sum(year, 'admin')

/** Beban per pos anggaran pada tahun buku (dibaca SHU). */
export function expenseByPos(year: number): { pos: string; nominal: number }[] {
  const m = new Map<string, number>()
  for (const r of LEDGER) if (r.tipe === 'pengeluaran' && r.tanggal.startsWith(String(year)) && r.pos) m.set(r.pos, (m.get(r.pos) ?? 0) + r.nominal)
  return [...m.entries()].map(([pos, nominal]) => ({ pos, nominal }))
}
