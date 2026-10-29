import { addAudit } from '@/data/master/audit-log'
import { EXIT_REASONS } from '@/data/master/exit-reasons'
import { bump } from '@/data/master/store'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Aturan Hak Akhir (Data Master › Industrial). Semua pengali, tabel, dan tarif ada di sini dan diedit HR;
 * default mengikuti PP 35/2021. Tidak ada angka yang ditulis langsung di halaman Kompensasi & Pesangon.
 */
export type Tier = { dari: number; sampai: number | null; bulan: number }
export type PisahTier = { dari: number; sampai: number | null; kali: number }
export type TaxBracket = { sampai: number | null; tarif: number }
export type PkwtMode = 'final-keluar' | 'selalu-final' | 'selalu-tidak-final'
export const PKWT_MODE_LABEL: Record<PkwtMode, string> = {
  'final-keluar': 'Final saat keluar · Tidak final (TER) saat diperpanjang (default)',
  'selalu-final': 'Selalu final',
  'selalu-tidak-final': 'Selalu tidak final',
}

export type ReasonRule = {
  key: string
  /** Nama alasan keluar (master Alasan Keluar) yang memakai baris ini. */
  alasan: string
  label: string
  up: number
  upmk: number
  uph: boolean
  uangPisah: boolean
  pkwt: boolean
  /** Batas minimum menurut PP 35/2021; null bila tidak diatur (kebijakan perusahaan). */
  minUp: number | null
  minUpmk: number | null
  dasar: string
  kebijakan?: boolean
  catatan?: string
}
export type RuleSet = {
  /** Id Komponen Gaji berjenis Tetap yang membentuk upah dasar. */
  upahDasar: string[]
  up: Tier[]
  upmk: Tier[]
  pengali: ReasonRule[]
  uangPisah: PisahTier[]
  pajak: TaxBracket[]
  pkwtMode: PkwtMode
}

const rr = (key: string, alasan: string, label: string, up: number, upmk: number, uph: boolean, uangPisah: boolean, pkwt: boolean, dasar: string, extra: Partial<ReasonRule> = {}): ReasonRule => ({
  key, alasan, label, up, upmk, uph, uangPisah, pkwt, minUp: up, minUpmk: upmk, dasar, ...extra,
})

export const DEFAULT_RULESET: RuleSet = {
  upahDasar: ['gaji-pokok', 'tunj-jabatan'],
  up: [
    { dari: 0, sampai: 1, bulan: 1 }, { dari: 1, sampai: 2, bulan: 2 }, { dari: 2, sampai: 3, bulan: 3 }, { dari: 3, sampai: 4, bulan: 4 },
    { dari: 4, sampai: 5, bulan: 5 }, { dari: 5, sampai: 6, bulan: 6 }, { dari: 6, sampai: 7, bulan: 7 }, { dari: 7, sampai: 8, bulan: 8 }, { dari: 8, sampai: null, bulan: 9 },
  ],
  upmk: [
    { dari: 0, sampai: 3, bulan: 0 }, { dari: 3, sampai: 6, bulan: 2 }, { dari: 6, sampai: 9, bulan: 3 }, { dari: 9, sampai: 12, bulan: 4 }, { dari: 12, sampai: 15, bulan: 5 },
    { dari: 15, sampai: 18, bulan: 6 }, { dari: 18, sampai: 21, bulan: 7 }, { dari: 21, sampai: 24, bulan: 8 }, { dari: 24, sampai: null, bulan: 10 },
  ],
  pengali: [
    rr('efisiensi-rugi', 'PHK Efisiensi', 'PHK Efisiensi — perusahaan merugi', 0.5, 1, true, false, false, 'PP 35/2021'),
    rr('efisiensi-cegah', 'PHK Efisiensi', 'PHK Efisiensi — mencegah kerugian', 1, 1, true, false, false, 'PP 35/2021'),
    rr('pelanggaran-sp', 'PHK Pelanggaran', 'PHK Pelanggaran (setelah SP)', 0.5, 1, true, false, false, 'PP 35/2021'),
    rr('pelanggaran-mendesak', 'PHK Pelanggaran', 'PHK Pelanggaran mendesak', 0, 0, true, true, false, 'PP 35/2021'),
    rr('kompetensi', 'PHK Kompetensi', 'PHK Kompetensi', 1, 1, true, false, false, 'Tidak diatur khusus; sesuaikan PK/PP/PKB', { minUp: null, minUpmk: null, kebijakan: true }),
    rr('pensiun', 'Pensiun', 'Pensiun', 1.75, 1, true, false, false, 'PP 35/2021'),
    rr('meninggal', 'Meninggal Dunia', 'Meninggal Dunia', 2, 1, true, false, false, 'PP 35/2021', { catatan: 'Dibayarkan kepada ahli waris' }),
    rr('mengundurkan', 'Mengundurkan Diri', 'Mengundurkan Diri', 0, 0, true, true, false, 'PP 35/2021'),
    rr('mangkir', 'Mangkir (dianggap mengundurkan diri)', 'Mangkir', 0, 0, true, true, false, 'PP 35/2021'),
    rr('habis-kontrak', 'Habis Kontrak', 'Habis Kontrak', 0, 0, true, false, true, 'PP 35/2021', { catatan: 'Kompensasi PKWT' }),
  ],
  uangPisah: [
    { dari: 3, sampai: null, kali: 1 }, { dari: 1, sampai: 3, kali: 0.5 }, { dari: 0, sampai: 1, kali: 0 },
  ],
  pajak: [{ sampai: 50_000_000, tarif: 0 }, { sampai: 100_000_000, tarif: 5 }, { sampai: 500_000_000, tarif: 15 }, { sampai: null, tarif: 25 }],
  pkwtMode: 'final-keluar',
}

export const RULESETS: Dated<RuleSet>[] = [{ berlakuMulai: '2021-02-02', value: DEFAULT_RULESET, oleh: 'Data awal', alasan: 'Default mengikuti PP 35/2021' }]
export const rulesAt = (date: string = DEMO_TODAY): RuleSet => datedAt(RULESETS, date).value
export const rulesEntryAt = (date: string = DEMO_TODAY) => datedAt(RULESETS, date)

/** Baris pengali untuk sebuah kunci; alasan baru di master Alasan Keluar tanpa baris mendapat baris nol dengan peringatan. */
export function reasonRules(date: string = DEMO_TODAY): (ReasonRule & { baru?: boolean })[] {
  const rs = rulesAt(date)
  const missing = EXIT_REASONS.filter((x) => !rs.pengali.some((p) => p.alasan === x.nama)).map((x) => ({
    key: `baru:${x.nama}`, alasan: x.nama, label: x.nama, up: 0, upmk: 0, uph: false, uangPisah: false, pkwt: false, minUp: null, minUpmk: null, dasar: '—', baru: true as const,
  }))
  return [...rs.pengali, ...missing]
}
export const ruleByKey = (key: string, date: string = DEMO_TODAY) => reasonRules(date).find((r) => r.key === key)
/** Kunci aturan untuk alasan keluar (dengan kondisi: Efisiensi rugi/cegah, Pelanggaran mendesak). */
export function ruleKeyFor(alasan: string, opt: { kondisi?: 'rugi' | 'cegah'; mendesak?: boolean } = {}): string {
  if (alasan === 'PHK Efisiensi') return opt.kondisi === 'cegah' ? 'efisiensi-cegah' : 'efisiensi-rugi'
  if (alasan === 'PHK Pelanggaran') return opt.mendesak ? 'pelanggaran-mendesak' : 'pelanggaran-sp'
  return reasonRules().find((r) => r.alasan === alasan)?.key ?? `baru:${alasan}`
}

export const tierOf = (tiers: Tier[], tahun: number) => [...tiers].sort((a, b) => b.dari - a.dari).find((t) => tahun >= t.dari)
export const pisahOf = (tiers: PisahTier[], tahun: number) => [...tiers].sort((a, b) => b.dari - a.dari).find((t) => tahun >= t.dari)

export const fmtKali = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
export const tierLabel = (t: { dari: number; sampai: number | null }) => (t.sampai === null ? `≥ ${t.dari} th` : t.dari === 0 ? `< ${t.sampai} th` : `${t.dari} – < ${t.sampai} th`)

/** Di bawah minimum PP 35/2021? */
export function belowMinimum(r: Pick<ReasonRule, 'up' | 'upmk' | 'minUp' | 'minUpmk'>) {
  return (r.minUp !== null && r.up < r.minUp) || (r.minUpmk !== null && r.upmk < r.minUpmk)
}

/** Simpan perubahan sebagai versi baru (berlaku mulai + alasan); versi lama tetap di riwayat. */
export function saveRuleSet(mutate: (rs: RuleSet) => void, berlakuMulai: string, alasan: string, perubahan: string, oleh = 'Admin HRD') {
  const next: RuleSet = JSON.parse(JSON.stringify(rulesAt(berlakuMulai)))
  mutate(next)
  datedPush(RULESETS, { berlakuMulai, value: next, oleh, alasan })
  addAudit({ group: 'Industrial', entitas: 'Aturan Hak Akhir', perubahan, berlaku: berlakuMulai })
  bump()
}
