import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'

/* ---------- BPJS ---------- */
export type RiskLevel = 'Sangat rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat tinggi'
export const JKK_RATES: Record<RiskLevel, number> = {
  'Sangat rendah': 0.1,
  Rendah: 0.4,
  Sedang: 0.75,
  Tinggi: 1.13,
  'Sangat tinggi': 1.6,
}
export const RISK_LEVELS = Object.keys(JKK_RATES) as RiskLevel[]

/** Persen (mis. 4 = 4%); batas upah dalam Rupiah. */
export type BpjsKes = { perusahaan: number; pegawai: number; batas: number }
export type BpjsTk = {
  jhtPerusahaan: number
  jhtPegawai: number
  jpPerusahaan: number
  jpPegawai: number
  jpBatas: number
  jkk: RiskLevel
  jkm: number
}

export const KES: Dated<BpjsKes>[] = [{ berlakuMulai: '2020-05-01', value: { perusahaan: 4, pegawai: 1, batas: 12_000_000 }, oleh: 'Payroll Officer' }]
export const TK: Dated<BpjsTk>[] = [
  {
    berlakuMulai: '2025-03-01',
    value: { jhtPerusahaan: 3.7, jhtPegawai: 2, jpPerusahaan: 2, jpPegawai: 1, jpBatas: 10_547_400, jkk: 'Sedang', jkm: 0.3 },
    oleh: 'Payroll Officer',
  },
  {
    berlakuMulai: '2026-03-01',
    value: { jhtPerusahaan: 3.7, jhtPegawai: 2, jpPerusahaan: 2, jpPegawai: 1, jpBatas: 11_086_300, jkk: 'Sedang', jkm: 0.3 },
    oleh: 'Payroll Officer',
    alasan: 'Penyesuaian batas upah JP Maret 2026',
  },
]
export const kesAt = (date: string) => datedAt(KES, date).value
export const tkAt = (date: string) => datedAt(TK, date).value
export const saveKes = (e: Dated<BpjsKes>) => datedPush(KES, e)
export const saveTk = (e: Dated<BpjsTk>) => datedPush(TK, e)

export const pct = (n: number) => `${String(n).replace('.', ',')}%`

/* ---------- PPh 21 TER bulanan (PP 58/2023, PMK 168/2023) ---------- */
export type TerCategory = 'A' | 'B' | 'C'
export const TER_OF_PTKP: Record<string, TerCategory> = {
  'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
  'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
  'K/3': 'C',
}
export const PTKP_LIST = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']
export const terCategory = (ptkp: string): TerCategory => TER_OF_PTKP[ptkp] ?? 'A'

/** [batas atas penghasilan bruto bulanan, tarif %]; batas bawah = batas atas sebelumnya + 1. */
export const TER: Record<TerCategory, [number, number][]> = {
  A: [
    [5_400_000, 0], [5_650_000, 0.25], [5_950_000, 0.5], [6_300_000, 0.75], [6_750_000, 1], [7_500_000, 1.25], [8_550_000, 1.5],
    [9_650_000, 1.75], [10_050_000, 2], [10_350_000, 2.25], [10_700_000, 2.5], [11_050_000, 3], [11_600_000, 3.5], [12_500_000, 4],
    [13_750_000, 5], [15_100_000, 6], [16_950_000, 7],
  ],
  B: [
    [6_200_000, 0], [6_500_000, 0.25], [6_850_000, 0.5], [7_300_000, 0.75], [9_200_000, 1], [10_750_000, 1.5], [11_250_000, 2],
    [11_600_000, 2.5], [12_600_000, 3], [13_600_000, 4], [14_950_000, 5], [16_400_000, 6],
  ],
  C: [
    [6_600_000, 0], [6_950_000, 0.25], [7_350_000, 0.5], [7_800_000, 0.75], [8_850_000, 1], [9_800_000, 1.25], [10_950_000, 1.5],
    [11_200_000, 1.75], [12_050_000, 2], [12_950_000, 3], [14_150_000, 4], [15_550_000, 5], [17_050_000, 6],
  ],
}

/** Tarif TER untuk penghasilan bruto. `beyond` = di atas batas tabel yang dimuat (tarif bracket terakhir dipakai). */
export function terRate(cat: TerCategory, bruto: number): { rate: number; beyond: boolean } {
  const rows = TER[cat]
  const hit = rows.find(([upTo]) => bruto <= upTo)
  return hit ? { rate: hit[1], beyond: false } : { rate: rows[rows.length - 1][1], beyond: true }
}

/** Ringkasan perubahan antara dua versi nilai, untuk riwayat. */
export function diffKes(a: BpjsKes | undefined, b: BpjsKes): string {
  if (!a) return 'Parameter awal'
  const out: string[] = []
  if (a.perusahaan !== b.perusahaan) out.push(`Perusahaan ${pct(a.perusahaan)} → ${pct(b.perusahaan)}`)
  if (a.pegawai !== b.pegawai) out.push(`Pegawai ${pct(a.pegawai)} → ${pct(b.pegawai)}`)
  if (a.batas !== b.batas) out.push(`Batas upah Rp ${a.batas.toLocaleString('id-ID')} → Rp ${b.batas.toLocaleString('id-ID')}`)
  return out.join(' · ') || 'Tanpa perubahan nilai'
}
export function diffTk(a: BpjsTk | undefined, b: BpjsTk): string {
  if (!a) return 'Parameter awal'
  const out: string[] = []
  const r = (k: string, x: number, y: number) => x !== y && out.push(`${k} ${pct(x)} → ${pct(y)}`)
  r('JHT perusahaan', a.jhtPerusahaan, b.jhtPerusahaan)
  r('JHT pegawai', a.jhtPegawai, b.jhtPegawai)
  r('JP perusahaan', a.jpPerusahaan, b.jpPerusahaan)
  r('JP pegawai', a.jpPegawai, b.jpPegawai)
  r('JKM', a.jkm, b.jkm)
  if (a.jpBatas !== b.jpBatas) out.push(`Batas upah JP Rp ${a.jpBatas.toLocaleString('id-ID')} → Rp ${b.jpBatas.toLocaleString('id-ID')}`)
  if (a.jkk !== b.jkk) out.push(`JKK ${a.jkk} ${pct(JKK_RATES[a.jkk])} → ${b.jkk} ${pct(JKK_RATES[b.jkk])}`)
  return out.join(' · ') || 'Tanpa perubahan nilai'
}

/* ---------- Pegawai Harian (bukan pegawai tetap) ---------- */
/** Batas PPh 21 pegawai tidak tetap: penghasilan harian ≤ batasHarian bebas PPh; bila total sebulan > batasBulanan dipakai TER bulanan. */
export type HarianPph = { batasHarian: number; batasBulanan: number; /** Pengali upah harian → upah sebulan untuk tarif lembur. */ hariSebulan: number }
export const HARIAN_PPH: Dated<HarianPph>[] = [
  { berlakuMulai: '2025-01-01', value: { batasHarian: 450_000, batasBulanan: 2_500_000, hariSebulan: 25 }, oleh: 'Payroll Officer' },
]
export const harianPphAt = (date: string) => datedAt(HARIAN_PPH, date).value
