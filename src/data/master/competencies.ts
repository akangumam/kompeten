import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'
import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'
import { formatDate } from '@/lib/format'

export type CompCategory = 'Basic' | 'Jobskill' | 'Supporting'
export const CATEGORIES: CompCategory[] = ['Basic', 'Jobskill', 'Supporting']
export const LEVELS = [1, 2, 3, 4] as const
export const LEVEL_NAMES: Record<number, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' }
export const DEFAULT_DESKRIPTOR: [string, string, string, string] = [
  'Memahami dasar, masih perlu bimbingan',
  'Mandiri pada tugas rutin',
  'Menangani masalah dan membimbing rekan',
  'Menjadi rujukan dan mengembangkan standar',
]

export type Competency = {
  kode: string
  nama: string
  kategori: CompCategory
  deskripsi: string
  /** Deskriptor level 1–4. */
  deskriptor: [string, string, string, string]
  /** Paket uji (Menu Tes) yang menjadi bukti kompetensi; opsional. */
  paketId?: string
  status: 'Aktif' | 'Nonaktif'
}

const c = (kode: string, nama: string, kategori: CompCategory, deskripsi: string, paketId?: string): Competency => ({
  kode, nama, kategori, deskripsi, deskriptor: [...DEFAULT_DESKRIPTOR], paketId, status: 'Aktif',
})

export const COMPETENCIES: Competency[] = [
  c('BSC-01', 'K3 & Keselamatan Kerja', 'Basic', 'Menerapkan aturan K3, APD, dan tanggap darurat di area kerja.'),
  c('BSC-02', '5S & Kebersihan Area', 'Basic', 'Menjaga area kerja tetap rapi, bersih, dan teratur sesuai standar 5S.'),
  c('BSC-03', 'Komunikasi Kerja', 'Basic', 'Menyampaikan informasi kerja dengan jelas kepada rekan dan atasan.'),
  c('BSC-04', 'Disiplin & Kepatuhan SOP', 'Basic', 'Mengikuti jam kerja, aturan perusahaan, dan SOP yang berlaku.'),
  c('JOB-INJ-01', 'Setting Mesin Injection', 'Jobskill', 'Mengatur parameter mesin injection sesuai spesifikasi produk.', 'PKT-005'),
  c('JOB-INJ-02', 'Kontrol Kualitas Visual', 'Jobskill', 'Memeriksa tampilan produk dan menandai cacat visual.', 'PKT-002'),
  c('JOB-INJ-03', 'Penggantian Mold', 'Jobskill', 'Mengganti mold dengan aman dan cepat sesuai prosedur.'),
  c('JOB-INJ-04', 'Membaca Work Instruction', 'Jobskill', 'Membaca dan menjalankan work instruction produksi.', 'PKT-002'),
  c('JOB-QC-01', 'Pengukuran Dimensi', 'Jobskill', 'Mengukur dimensi produk dengan alat ukur terkalibrasi.', 'PKT-003'),
  c('JOB-QC-02', 'Sampling AQL', 'Jobskill', 'Menentukan ukuran sampel dan keputusan lot berdasarkan AQL.', 'PKT-003'),
  c('JOB-QC-03', 'Analisa Defect', 'Jobskill', 'Mengklasifikasi dan menganalisa penyebab defect produk.'),
  c('JOB-MTC-01', 'Perawatan Preventif', 'Jobskill', 'Menjalankan jadwal perawatan preventif mesin produksi.'),
  c('JOB-MTC-02', 'Troubleshooting Mesin', 'Jobskill', 'Mendiagnosa dan memperbaiki gangguan mesin secara sistematis.'),
  c('JOB-PPIC-01', 'Perencanaan Produksi', 'Jobskill', 'Menyusun jadwal produksi sesuai kapasitas dan permintaan.'),
  c('JOB-PPIC-02', 'Pengendalian Stok', 'Jobskill', 'Memantau stok bahan dan barang jadi agar sesuai kebutuhan.'),
  c('SUP-01', 'Microsoft Excel', 'Supporting', 'Mengolah data kerja dengan rumus dan tabel di Excel.'),
  c('SUP-02', 'Problem Solving (5 Why)', 'Supporting', 'Menelusuri akar masalah dengan metode 5 Why.'),
  c('SUP-03', 'Kepemimpinan Tim', 'Supporting', 'Mengarahkan dan membina anggota tim dalam satu shift.'),
  c('SUP-04', 'Pelaporan Kerja', 'Supporting', 'Menyusun laporan kerja harian atau mingguan secara akurat.'),
]
export const competencyOf = (kode: string) => COMPETENCIES.find((x) => x.kode === kode)

export type StandardVersion = {
  berlakuMulai: string
  jobdesk: string
  /** Kode kompetensi → target level 1–4. */
  targets: Record<string, number>
  at: string
  by: string
}
export type PositionStandard = { posisi: string; versions: StandardVersion[] }

const BASIC = { 'BSC-01': 3, 'BSC-02': 3, 'BSC-03': 2, 'BSC-04': 3 }
const OPERATOR_INJ = { ...BASIC, 'JOB-INJ-01': 3, 'JOB-INJ-02': 3, 'JOB-INJ-03': 2, 'JOB-INJ-04': 3, 'SUP-01': 1, 'SUP-02': 2 }
const LEADER_INJ = { ...OPERATOR_INJ, 'JOB-INJ-01': 4, 'JOB-INJ-02': 4, 'JOB-INJ-03': 4, 'JOB-INJ-04': 4, 'SUP-02': 3, 'SUP-03': 3 }

const ver = (jobdesk: string, targets: Record<string, number>): StandardVersion[] => [
  { berlakuMulai: '2026-01-01', jobdesk, targets, at: '5 Jan 2026, 09.00 WIB', by: 'Admin HRD' },
]

export const POSITION_STANDARDS: PositionStandard[] = [
  { posisi: 'Operator Injection', versions: ver('Mengoperasikan mesin injection sesuai work instruction, menjaga kualitas dan kebersihan area, serta melaporkan kendala produksi kepada Leader.', OPERATOR_INJ) },
  { posisi: 'Leader Injection', versions: ver('Memimpin satu shift Injection, mengatur penggantian mold dan setting mesin, membimbing operator, serta melaporkan hasil produksi.', LEADER_INJ) },
  { posisi: 'QC Inspector', versions: ver('Memeriksa produk jadi dan setengah jadi, mengukur dimensi, melakukan sampling AQL, dan mencatat temuan defect.', { ...BASIC, 'JOB-QC-01': 3, 'JOB-QC-02': 3, 'JOB-QC-03': 2, 'SUP-01': 2, 'SUP-04': 2 }) },
  { posisi: 'Teknisi Mekanik', versions: ver('Merawat dan memperbaiki mesin produksi, menjalankan perawatan preventif, dan mencatat riwayat perbaikan.', { ...BASIC, 'JOB-MTC-01': 3, 'JOB-MTC-02': 3, 'SUP-01': 2, 'SUP-04': 2 }) },
  { posisi: 'Admin PPIC', versions: ver('Menyusun jadwal produksi harian, memantau stok bahan dan barang jadi, serta menyiapkan laporan PPIC.', { 'BSC-01': 2, 'BSC-02': 2, 'BSC-03': 3, 'BSC-04': 3, 'JOB-PPIC-01': 3, 'JOB-PPIC-02': 3, 'SUP-01': 2, 'SUP-04': 2 }) },
]

export const standardOf = (posisi: string) => POSITION_STANDARDS.find((s) => s.posisi === posisi)
/** Versi standar posisi yang berlaku pada tanggal tertentu (berlaku efektif). */
export function standardAt(posisi: string, date: string): StandardVersion | undefined {
  const s = standardOf(posisi)
  if (!s) return undefined
  return [...s.versions].filter((v) => v.berlakuMulai <= date).sort((a, b) => b.berlakuMulai.localeCompare(a.berlakuMulai))[0]
}
/** Daftar (kode, target) terurut per kategori lalu urutan katalog. */
export function targetsList(targets: Record<string, number>): { kode: string; target: number; comp: Competency }[] {
  return Object.entries(targets)
    .flatMap(([kode, target]) => { const comp = competencyOf(kode); return comp ? [{ kode, target, comp }] : [] })
    .sort((a, b) => CATEGORIES.indexOf(a.comp.kategori) - CATEGORIES.indexOf(b.comp.kategori) || COMPETENCIES.indexOf(a.comp) - COMPETENCIES.indexOf(b.comp))
}

const stamp = () => {
  const { hh, mm } = nowTimeWIB()
  return `${formatDate(DEMO_TODAY)}, ${hh}.${mm} WIB`
}

export function saveCompetency(next: Competency, isNew: boolean) {
  const i = COMPETENCIES.findIndex((x) => x.kode === next.kode)
  if (i >= 0) COMPETENCIES[i] = next
  else COMPETENCIES.push(next)
  addAudit({ group: 'Kompetensi', entitas: `Kompetensi ${next.kode}`, perubahan: isNew ? `Kompetensi baru: ${next.nama} (${next.kategori})` : `Katalog ${next.nama} diperbarui`, berlaku: DEMO_TODAY })
  bump()
}
export function toggleCompetency(kode: string) {
  const x = competencyOf(kode)
  if (!x) return
  x.status = x.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
  addAudit({ group: 'Kompetensi', entitas: `Kompetensi ${x.kode}`, perubahan: `Status ${x.nama}: ${x.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
  bump()
}

/** Simpan versi standar baru (atau ganti versi dengan tanggal berlaku yang sama). Penilaian Final tidak terpengaruh karena menyimpan snapshot. */
export function saveStandard(posisi: string, input: { berlakuMulai: string; jobdesk: string; targets: Record<string, number> }, by = 'Admin HRD') {
  let s = standardOf(posisi)
  if (!s) { s = { posisi, versions: [] }; POSITION_STANDARDS.push(s) }
  const before = standardAt(posisi, input.berlakuMulai)
  const v: StandardVersion = { ...input, at: stamp(), by }
  const i = s.versions.findIndex((x) => x.berlakuMulai === input.berlakuMulai)
  if (i >= 0) s.versions[i] = v
  else s.versions.push(v)
  s.versions.sort((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai))
  const diffs: string[] = []
  for (const [kode, t] of Object.entries(input.targets)) {
    const old = before?.targets[kode]
    if (old == null) diffs.push(`${kode} ditambah (target ${t})`)
    else if (old !== t) diffs.push(`${kode} ${old} → ${t}`)
  }
  for (const kode of Object.keys(before?.targets ?? {})) if (!(kode in input.targets)) diffs.push(`${kode} dihapus`)
  if (before && before.jobdesk !== input.jobdesk) diffs.push('Jobdesk diperbarui')
  addAudit({ group: 'Kompetensi', entitas: `Standar ${posisi}`, perubahan: diffs.length ? diffs.join('; ') : 'Standar disimpan tanpa perubahan', berlaku: input.berlakuMulai, by })
  bump()
}
