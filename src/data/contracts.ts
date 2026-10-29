import { ROSTER, type RosterEmployee } from '@/data/employees'
import { contractLimitMonths } from '@/data/master/contract-limit'

/** Riwayat kontrak (PKWT) per pegawai: Kontrak ke-1, ke-2, … tanpa celah dan tanpa tumpang tindih. */
export type Contract = {
  ke: number
  mulai: string
  akhir: string
  bulan: number
  /** Nomor Transaksi Kepegawaian yang membuat kontrak ini (Perpanjangan atau Pindah Kategori). */
  trxNo?: string
  /** Kontrak diakhiri lebih awal oleh Pengangkatan Tetap pada tanggal ini; akhir semula tersimpan di `semula`. */
  diakhiri?: { tanggal: string; semula: string; trxNo: string }
}

const pad = (n: number) => String(n).padStart(2, '0')
export const addDayIso = (iso: string, n = 1) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

export function addMonthsIso(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = m - 1 + n
  const yy = y + Math.floor(t / 12)
  const mm = ((t % 12) + 12) % 12
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate()
  return `${yy}-${pad(mm + 1)}-${pad(Math.min(d, last))}`
}

/** Hari terakhir kontrak yang dimulai pada `mulai` selama `bulan` bulan: 5 Nov + 12 bln → 4 Nov tahun berikutnya. */
export const contractEnd = (mulai: string, bulan: number) => addDayIso(addMonthsIso(mulai, bulan), -1)

/** Jumlah bulan (dibulatkan ke atas) dari `mulai` sampai `akhir` inklusif. */
export function monthsBetween(mulai: string, akhir: string) {
  const [y1, m1, d1] = mulai.split('-').map(Number)
  const [y2, m2, d2] = addDayIso(akhir).split('-').map(Number)
  let n = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
  if (addMonthsIso(mulai, n) < addDayIso(akhir)) n += 1
  return Math.max(n, 0)
}

const c = (ke: number, mulai: string, akhir: string, extra: Partial<Contract> = {}): Contract => ({ ke, mulai, akhir, bulan: monthsBetween(mulai, akhir), ...extra })

/** Riwayat yang ditentukan eksplisit (data contoh dari prompt) dan hasil transaksi seed. */
const SEED: Record<string, Contract[]> = {
  'PPI-2024-0112': [c(1, '2024-02-05', '2025-02-04'), c(2, '2025-02-05', '2026-11-04')],
  'PPI-2024-0127': [c(1, '2024-02-13', '2025-02-12'), c(2, '2025-02-13', '2026-11-12')],
  // Arif Rahman: diangkat Tetap 1 Jun 2026 (TRX-2026-0033); kontrak ke-2 diakhiri lebih awal.
  'PPI-2022-0061': [
    c(1, '2022-03-14', '2024-03-13'),
    c(2, '2024-03-14', '2026-05-31', { diakhiri: { tanggal: '2026-06-01', semula: '2026-09-13', trxNo: 'TRX-2026-0033' } }),
  ],
}
export function setSeedContracts(nik: string, list: Contract[]) {
  SEED[nik] = list
}
export const seedContract = c

/** Kontrak tambahan dari transaksi yang Disetujui (Perpanjangan, Pindah Kategori) dan pemotongan oleh Pengangkatan Tetap. */
const EXTRA: Record<string, Contract[]> = {}
const CUTS: Record<string, { tanggal: string; trxNo: string }> = {}
export function setContractOverlay(extra: Record<string, Contract[]>, cuts: Record<string, { tanggal: string; trxNo: string }>) {
  for (const k of Object.keys(EXTRA)) delete EXTRA[k]
  for (const k of Object.keys(CUTS)) delete CUTS[k]
  Object.assign(EXTRA, extra)
  Object.assign(CUTS, cuts)
}

/** Riwayat dasar untuk pegawai Kontrak: dibagi per ±12 bulan sejak Tanggal Masuk, kontrak terakhir berakhir pada Tanggal Berakhir saat ini. */
const BASE_CACHE = new Map<string, Contract[]>()
function generate(e: RosterEmployee): Contract[] {
  if (e.statusKerja !== 'Kontrak' || !e.tanggalAkhir) return []
  const limit = contractLimitMonths('2026-01-01')
  let start = e.tanggalMasuk
  if (monthsBetween(start, e.tanggalAkhir) > limit) start = addMonthsIso(addDayIso(e.tanggalAkhir), -limit)
  const total = monthsBetween(start, e.tanggalAkhir)
  const n = Math.max(1, Math.floor(total / 12))
  const out: Contract[] = []
  let mulai = start
  for (let i = 1; i <= n; i++) {
    const akhir = i === n ? e.tanggalAkhir : contractEnd(mulai, 12)
    out.push(c(i, mulai, akhir))
    mulai = addDayIso(akhir)
  }
  return out
}
/** Dipanggil sekali per pegawai sebelum ada perubahan roster (nilai awal tanggalAkhir). */
export function baseContracts(e: RosterEmployee): Contract[] {
  const seeded = SEED[e.nik]
  if (seeded) return seeded
  let b = BASE_CACHE.get(e.nik)
  if (!b) BASE_CACHE.set(e.nik, (b = generate(e)))
  return b
}
// Bekukan riwayat dasar dari data awal roster sebelum transaksi mengubah Tanggal Berakhir.
for (const e of ROSTER) baseContracts(e)

export function contractsOf(nik: string): Contract[] {
  const base = (SEED[nik] ?? BASE_CACHE.get(nik) ?? []).map((x) => ({ ...x }))
  const cut = CUTS[nik]
  const last = base.at(-1)
  // Pengangkatan Tetap sebelum kontrak berakhir mengakhiri kontrak yang sedang berjalan lebih awal.
  if (cut && last && !last.diakhiri && cut.tanggal <= last.akhir) {
    const semula = last.akhir
    last.akhir = addDayIso(cut.tanggal, -1)
    last.bulan = monthsBetween(last.mulai, last.akhir)
    last.diakhiri = { tanggal: cut.tanggal, semula, trxNo: cut.trxNo }
  }
  return [...base, ...(cut ? [] : (EXTRA[nik] ?? []).map((x) => ({ ...x })))].map((x, i) => ({ ...x, ke: i + 1 }))
}
export const lastContract = (nik: string) => contractsOf(nik).at(-1)
export const totalContractMonths = (nik: string) => contractsOf(nik).reduce((a, x) => a + x.bulan, 0)
export const maxExtensionMonths = (nik: string) => Math.max(0, contractLimitMonths() - totalContractMonths(nik))

/** Dipasang modul Hak Akhir: dipanggil saat sebuah PKWT berakhir karena diperpanjang (kompensasi PKWT untuk kontrak yang berakhir). */
export const kpkHook: { onExtended: (nik: string, ending: Contract) => void } = { onExtended: () => {} }
