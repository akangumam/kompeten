import { CANDIDATES } from '@/data/candidates'
import { levelDefaultOf } from '@/data/employees'
import { gradeList, positionByName } from '@/data/master/positions'
import { DEMO_TODAY } from '@/lib/today'
import { bump } from './store'

export type JobStatus = 'Draft' | 'Menunggu Approval' | 'Dibuka' | 'Ditutup'
export const PENDIDIKAN_MIN = ['SMP', 'SMA/SMK', 'D3', 'S1', 'S2'] as const
export type Syarat = { pendidikan: string; usiaMax: number; pengalaman: string; catatan: string }
export type Job = {
  no: string
  posisi: string
  dept: string
  level: string
  grade: string
  kebutuhan: number
  jenis: string
  statusKerja: string
  /** Durasi kontrak (bulan); 0 bila Tetap. */
  durasi: number
  buka: string
  tutup: string
  syarat: Syarat
  paketIds: string[]
  sumber: string[]
  /** Status tersimpan; "Ditutup" otomatis dihitung dari kuota/tanggal (lihat effJob). */
  status: JobStatus
  dibuat: { by: string; at: string }
  diajukan?: { by: string; at: string }
  disetujui?: { by: string; at: string }
  ditolak?: { by: string; at: string; alasan: string }
  ditutup?: { by: string; at: string; alasan: string }
}

const SRC_ALL = ['Jobstreet', 'Website', 'Indeed', 'Referral', 'WA Group', 'Job Fair']
const seed = (no: string, posisi: string, kebutuhan: number, paketIds: string[], syarat: Partial<Syarat> = {}): Job => {
  const p = positionByName(posisi)!
  return {
    no, posisi, dept: p.department ?? '', level: p.level, grade: gradeList(p.grade)[0], kebutuhan, jenis: 'Organik', statusKerja: 'Kontrak', durasi: 12,
    buka: '2026-09-01', tutup: '2026-11-30', paketIds, sumber: SRC_ALL, status: 'Dibuka',
    syarat: { pendidikan: 'SMA/SMK', usiaMax: 35, pengalaman: 'Fresh graduate diterima', catatan: '', ...syarat },
    dibuat: { by: 'Admin HRD', at: '2026-08-25' }, diajukan: { by: 'Admin HRD', at: '2026-08-25' }, disetujui: { by: 'Lestari Wulandari', at: '2026-08-28' },
  }
}

export const JOBS: Job[] = [
  seed('LWG-2026-018', 'Operator Injection', 4, ['PKT-001', 'PKT-002'], { pengalaman: 'Minimal 1 tahun di mesin injection', catatan: 'Bersedia bekerja shift.' }),
  seed('LWG-2026-019', 'QC Inspector', 2, ['PKT-001', 'PKT-003'], { pendidikan: 'D3', pengalaman: 'Minimal 1 tahun di bidang QC', catatan: 'Memahami ISO 9001 menjadi nilai tambah.' }),
  seed('LWG-2026-020', 'Admin PPIC', 1, ['PKT-001', 'PKT-004'], { pendidikan: 'S1', pengalaman: 'Minimal 2 tahun sebagai admin produksi', catatan: 'Mahir Microsoft Excel.' }),
  seed('LWG-2026-021', 'Staff Gudang', 1, ['PKT-001'], { pengalaman: 'Minimal 1 tahun di gudang', catatan: 'Memiliki sertifikat operator forklift menjadi nilai tambah.' }),
  seed('LWG-2026-022', 'Teknisi Mekanik', 1, ['PKT-001', 'PKT-005'], { pendidikan: 'D3', usiaMax: 40, pengalaman: 'Minimal 3 tahun perawatan mesin produksi', catatan: 'Bersedia on-call.' }),
  seed('LWG-2026-023', 'Staff HR', 1, ['PKT-001', 'PKT-004'], { pendidikan: 'S1', pengalaman: 'Minimal 2 tahun di bidang HR', catatan: 'Memahami administrasi BPJS dan PPh 21.' }),
  seed('LWG-2026-024', 'Operator Blow Molding', 2, ['PKT-001', 'PKT-002'], { pengalaman: 'Minimal 1 tahun di mesin blow molding', catatan: 'Bersedia bekerja shift.' }),
]
export const jobOf = (no: string) => JOBS.find((j) => j.no === no)
export const nextJobNo = () => `LWG-2026-${String(Math.max(...JOBS.map((j) => Number(j.no.slice(-3)))) + 1).padStart(3, '0')}`

export const terisi = (j: Job) => CANDIDATES.filter((c) => c.lowonganId === j.no && c.stage === 'Diterima').length
export const pelamar = (j: Job) => CANDIDATES.filter((c) => c.lowonganId === j.no).length

/** Lowongan Dibuka tertutup otomatis bila kuota terisi atau tanggal tutup terlewati. */
export function closeReason(j: Job): string | undefined {
  if (j.status === 'Ditutup') return j.ditutup?.alasan ?? 'Ditutup manual'
  if (j.status !== 'Dibuka') return undefined
  if (terisi(j) >= j.kebutuhan) return 'Terpenuhi'
  if (j.tutup < DEMO_TODAY) return 'Lewat tanggal tutup'
  return undefined
}
export const effJob = (j: Job): JobStatus => (closeReason(j) ? 'Ditutup' : j.status)
export const openJobs = () => JOBS.filter((j) => effJob(j) === 'Dibuka')

const STAMP = () => DEMO_TODAY
export function saveJob(j: Job) {
  const i = JOBS.findIndex((x) => x.no === j.no)
  if (i >= 0) JOBS[i] = j
  else JOBS.unshift(j)
  bump()
}
export function submitJob(no: string, by: string) {
  const j = jobOf(no)
  if (!j || j.status !== 'Draft') return
  j.status = 'Menunggu Approval'
  j.diajukan = { by, at: STAMP() }
  j.ditolak = undefined
  bump()
}
export function approveJob(no: string, by: string) {
  const j = jobOf(no)
  if (!j || j.status !== 'Menunggu Approval') return
  j.status = 'Dibuka'
  j.disetujui = { by, at: STAMP() }
  bump()
}
export function rejectJob(no: string, by: string, alasan: string) {
  const j = jobOf(no)
  if (!j || j.status !== 'Menunggu Approval') return
  j.status = 'Draft'
  j.ditolak = { by, at: STAMP(), alasan }
  bump()
}
export function closeJob(no: string, by: string, alasan: string) {
  const j = jobOf(no)
  if (!j || effJob(j) !== 'Dibuka') return
  j.status = 'Ditutup'
  j.ditutup = { by, at: STAMP(), alasan }
  bump()
}

export const levelOfPosisi = (posisi: string) => levelDefaultOf(posisi) ?? positionByName(posisi)?.level ?? ''
/** Usia maksimal dan syarat dipakai form DICAP untuk peringatan (bukan blokir). */
export const RANK: Record<string, number> = { SD: 1, SMP: 2, SMA: 3, SMK: 3, 'SMA/SMK': 3, D1: 3.5, D3: 4, D4: 4.5, S1: 5, S2: 6, S3: 7 }
export const rankOf = (jenjang: string) => RANK[jenjang] ?? 0
