import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'
import { DEMO_TODAY } from '@/lib/today'

/** Master Alasan Keluar (kategori Industrial). Alasan yang sudah dipakai hanya dinonaktifkan, tidak dihapus. */
export type ExitReasonDef = { kode: string; nama: string; turnover: boolean; status: 'Aktif' | 'Nonaktif' }
/** Alasan keluar yang hanya terbuka setelah dua Surat Panggilan tanpa tanggapan. */
export const MANGKIR = 'Mangkir (dianggap mengundurkan diri)'
const r = (kode: string, nama: string, turnover = true): ExitReasonDef => ({ kode, nama, turnover, status: 'Aktif' })
export const EXIT_REASONS: ExitReasonDef[] = [
  r('KLR-01', 'Habis Kontrak'),
  r('KLR-02', 'Meninggal Dunia'),
  r('KLR-03', 'PHK Efisiensi'),
  r('KLR-04', 'PHK Kompetensi'),
  r('KLR-05', 'PHK Pelanggaran'),
  r('KLR-06', 'Mengundurkan Diri'),
  r('KLR-07', 'Pensiun'),
  r('KLR-08', MANGKIR),
]

/** Galat validasi form Tambah Alasan; string kosong bila valid. */
export function exitReasonError(nama: string, kode: string, ignore?: ExitReasonDef): { nama?: string; kode?: string } {
  const out: { nama?: string; kode?: string } = {}
  if (!nama.trim()) out.nama = 'Nama alasan wajib diisi'
  else if (EXIT_REASONS.some((x) => x !== ignore && x.nama.toLowerCase() === nama.trim().toLowerCase())) out.nama = 'Nama alasan sudah ada'
  if (!kode.trim()) out.kode = 'Kode wajib diisi'
  else if (EXIT_REASONS.some((x) => x !== ignore && x.kode.toLowerCase() === kode.trim().toLowerCase())) out.kode = 'Kode sudah dipakai'
  return out
}
export const nextExitCode = () => `KLR-${String(EXIT_REASONS.length + 1).padStart(2, '0')}`
export function addExitReason(nama: string, kode: string, turnover: boolean) {
  EXIT_REASONS.push({ kode: kode.trim().toUpperCase(), nama: nama.trim(), turnover, status: 'Aktif' })
  addAudit({ group: 'Industrial', entitas: `Alasan Keluar ${nama.trim()}`, perubahan: `Menambah alasan keluar ${nama.trim()} (${turnover ? 'dihitung turnover' : 'tidak dihitung turnover'})`, berlaku: DEMO_TODAY })
  bump()
}
export function toggleExitReason(x: ExitReasonDef) {
  x.status = x.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
  addAudit({ group: 'Industrial', entitas: `Alasan Keluar ${x.nama}`, perubahan: `Status ${x.nama}: ${x.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
  bump()
}
