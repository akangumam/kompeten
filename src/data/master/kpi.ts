import { addAudit } from '@/data/master/audit-log'
import { bump, useMaster } from '@/data/master/store'
import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'
import { formatDate } from '@/lib/format'

export type Aspek = 'Sasaran Kinerja Utama' | 'Sasaran Mutu Perusahaan' | 'Sikap Kerja'
export const ASPEK: Aspek[] = ['Sasaran Kinerja Utama', 'Sasaran Mutu Perusahaan', 'Sikap Kerja']
export type Arah = 'naik' | 'turun'
/** Manual = diinput Atasan; auto-hadir / auto-telat = dihitung dari Absensi periode bulan itu. */
export type Sumber = 'manual' | 'auto-hadir' | 'auto-telat'
export const SUMBER_LABEL: Record<Sumber, string> = { manual: 'Manual', 'auto-hadir': 'Otomatis · Tingkat kehadiran', 'auto-telat': 'Otomatis · Keterlambatan' }

export type Indicator = { id: string; aspek: Aspek; nama: string; satuan: string; target: number; arah: Arah; bobot: number; sumber: Sumber }
export type KpiTemplate = { posisi: string; tahun: number; indikator: Indicator[]; history: { at: string; by: string; perubahan: string }[] }

export const MAX_CAPAIAN = 120
export const totalBobot = (ind: Indicator[]) => Math.round(ind.reduce((a, i) => a + (Number(i.bobot) || 0), 0) * 100) / 100

let seq = 0
export const newIndicatorId = () => `IND-${Date.now().toString(36)}${++seq}`

const ind = (id: string, aspek: Aspek, nama: string, satuan: string, target: number, arah: Arah, bobot: number, sumber: Sumber = 'manual'): Indicator => ({ id, aspek, nama, satuan, target, arah, bobot, sumber })
const SKU: Aspek = 'Sasaran Kinerja Utama'
const MUTU: Aspek = 'Sasaran Mutu Perusahaan'
const SIKAP: Aspek = 'Sikap Kerja'
const first = (txt: string) => [{ at: '5 Jan 2026, 09.00 WIB', by: 'Teddy Syahputra', perubahan: txt }]

export const KPI_TEMPLATES: KpiTemplate[] = [
  {
    posisi: 'Operator Injection', tahun: 2026, history: first('Template awal'),
    indikator: [
      ind('oi-output', SKU, 'Pencapaian output produksi', '%', 100, 'naik', 30),
      ind('oi-reject', SKU, 'Reject rate', '%', 2, 'turun', 20),
      ind('oi-downtime', SKU, 'Downtime karena operator', 'menit/bulan', 30, 'turun', 10),
      ind('oi-checksheet', MUTU, 'Kepatuhan checksheet mutu', '%', 100, 'naik', 10),
      ind('oi-5s', MUTU, 'Skor audit 5S', 'skor', 90, 'naik', 10),
      ind('oi-hadir', SIKAP, 'Tingkat kehadiran', '%', 98, 'naik', 10, 'auto-hadir'),
      ind('oi-telat', SIKAP, 'Keterlambatan', 'kali', 1, 'turun', 10, 'auto-telat'),
    ],
  },
  {
    posisi: 'QC Inspector', tahun: 2026, history: first('Template awal'),
    indikator: [
      ind('qc-akurasi', SKU, 'Akurasi hasil inspeksi', '%', 98, 'naik', 30),
      ind('qc-lolos', SKU, 'Defect lolos ke pelanggan', 'kasus/bulan', 1, 'turun', 20),
      ind('qc-laporan', SKU, 'Ketepatan waktu laporan inspeksi', '%', 100, 'naik', 10),
      ind('qc-checksheet', MUTU, 'Kepatuhan checksheet mutu', '%', 100, 'naik', 10),
      ind('qc-5s', MUTU, 'Skor audit 5S', 'skor', 90, 'naik', 10),
      ind('qc-hadir', SIKAP, 'Tingkat kehadiran', '%', 98, 'naik', 10, 'auto-hadir'),
      ind('qc-telat', SIKAP, 'Keterlambatan', 'kali', 1, 'turun', 10, 'auto-telat'),
    ],
  },
]
export const templateOf = (posisi: string, tahun: number) => KPI_TEMPLATES.find((t) => t.posisi === posisi && t.tahun === tahun)

const stamp = () => { const { hh, mm } = nowTimeWIB(); return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB` }

export function saveTemplate(posisi: string, tahun: number, indikator: Indicator[], by = 'Teddy Syahputra'): { error?: string } {
  const total = totalBobot(indikator)
  if (total !== 100) return { error: `Total bobot ${total.toLocaleString('id-ID')}% (harus 100%)` }
  if (!indikator.length) return { error: 'Minimal satu indikator' }
  const old = templateOf(posisi, tahun)
  const diffs: string[] = []
  for (const i of indikator) {
    const o = old?.indikator.find((x) => x.id === i.id)
    if (!o) diffs.push(`${i.nama} ditambah`)
    else {
      if (o.target !== i.target) diffs.push(`${i.nama}: target ${o.target} → ${i.target}`)
      if (o.bobot !== i.bobot) diffs.push(`${i.nama}: bobot ${o.bobot}% → ${i.bobot}%`)
      if (o.arah !== i.arah || o.sumber !== i.sumber || o.nama !== i.nama || o.satuan !== i.satuan || o.aspek !== i.aspek) diffs.push(`${i.nama} diperbarui`)
    }
  }
  for (const o of old?.indikator ?? []) if (!indikator.some((i) => i.id === o.id)) diffs.push(`${o.nama} dihapus`)
  const perubahan = diffs.length ? diffs.join('; ') : old ? 'Disimpan tanpa perubahan' : 'Template dibuat'
  const t = old ?? { posisi, tahun, indikator: [], history: [] }
  t.indikator = indikator.map((i) => ({ ...i, target: Number(i.target), bobot: Number(i.bobot) }))
  t.history.unshift({ at: stamp(), by, perubahan })
  if (!old) KPI_TEMPLATES.push(t)
  addAudit({ group: 'KPI', entitas: `Template KPI ${posisi} ${tahun}`, perubahan, berlaku: DEMO_TODAY, by })
  bump()
  return {}
}

/* ---------- predikat ---------- */
export type PredikatKey = 'kurang' | 'cukup' | 'baik' | 'sangat'
export type Predikat = { key: PredikatKey; label: string; variant: 'danger' | 'warning' | 'info' | 'success' }
export const PREDIKAT: Predikat[] = [
  { key: 'kurang', label: 'Kurang', variant: 'danger' },
  { key: 'cukup', label: 'Cukup', variant: 'warning' },
  { key: 'baik', label: 'Baik', variant: 'info' },
  { key: 'sangat', label: 'Sangat Baik', variant: 'success' },
]
/** Batas bawah predikat Cukup, Baik, dan Sangat Baik (Kurang = di bawah batas Cukup). */
export const PREDIKAT_BATAS = { cukup: 70, baik: 85, sangat: 100 }
export function predikatOf(nilai: number): Predikat {
  const b = PREDIKAT_BATAS
  return PREDIKAT[nilai >= b.sangat ? 3 : nilai >= b.baik ? 2 : nilai >= b.cukup ? 1 : 0]
}
const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
export type PredikatRanges = { kurangMax: number; cukupMin: number; cukupMax: number; baikMin: number; baikMax: number; sangatMin: number }
export const predikatRanges = (): PredikatRanges => {
  const b = PREDIKAT_BATAS
  return { kurangMax: round1(b.cukup - 0.1), cukupMin: b.cukup, cukupMax: round1(b.baik - 0.1), baikMin: b.baik, baikMax: round1(b.sangat - 0.1), sangatMin: b.sangat }
}
const round1 = (n: number) => Math.round(n * 10) / 10

/** Simpan rentang predikat. Rentang tidak boleh tumpang tindih dan tidak boleh ada celah (selisih antar rentang = 0,1). */
export function savePredikat(r: PredikatRanges, by = 'Teddy Syahputra'): { error?: string } {
  const vals = Object.values(r)
  if (!vals.every((n) => Number.isFinite(n) && n >= 0)) return { error: 'Semua batas harus berupa angka 0 atau lebih' }
  if (r.cukupMin > r.cukupMax) return { error: `Rentang Cukup tidak valid: dari ${fmt(r.cukupMin)} sampai ${fmt(r.cukupMax)}` }
  if (r.baikMin > r.baikMax) return { error: `Rentang Baik tidak valid: dari ${fmt(r.baikMin)} sampai ${fmt(r.baikMax)}` }
  const pairs: [string, number, string, number][] = [['Kurang', r.kurangMax, 'Cukup', r.cukupMin], ['Cukup', r.cukupMax, 'Baik', r.baikMin], ['Baik', r.baikMax, 'Sangat Baik', r.sangatMin]]
  const name = (k: string) => (k === 'Kurang' ? `< ${fmt(r.kurangMax + 0.1)}` : k === 'Cukup' ? `${fmt(r.cukupMin)} – ${fmt(r.cukupMax)}` : k === 'Baik' ? `${fmt(r.baikMin)} – ${fmt(r.baikMax)}` : `≥ ${fmt(r.sangatMin)}`)
  for (const [a, aMax, b, bMin] of pairs) {
    if (bMin <= aMax) return { error: `Rentang ${a} (${name(a)}) tumpang tindih dengan ${b} (${name(b)}). Batas atas ${a} harus lebih kecil dari batas bawah ${b}.` }
    if (round1(bMin - aMax) > 0.1) return { error: `Ada celah antara ${a} (${name(a)}) dan ${b} (${name(b)}): nilai di antaranya tidak punya predikat.` }
  }
  const old = { ...PREDIKAT_BATAS }
  Object.assign(PREDIKAT_BATAS, { cukup: r.cukupMin, baik: r.baikMin, sangat: r.sangatMin })
  addAudit({ group: 'KPI', entitas: 'Predikat KPI', perubahan: `Batas bawah Cukup/Baik/Sangat Baik: ${fmt(old.cukup)}/${fmt(old.baik)}/${fmt(old.sangat)} → ${fmt(r.cukupMin)}/${fmt(r.baikMin)}/${fmt(r.sangatMin)}`, berlaku: DEMO_TODAY, by })
  bump()
  return {}
}

/** Berlangganan perubahan master KPI (template & predikat). */
export const useKpiMaster = useMaster
