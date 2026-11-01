import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Master Kategori Sakit (Data Master › Kehadiran). Diisi HR Personalia saat verifikasi Sakit berdasarkan surat dokter.
 * Kategori hanya terlihat oleh HR Personalia dan HR & GA Manager; dashboard menampilkannya sebagai agregat tanpa nama.
 */
export type SickCategory = { nama: string; aktif: boolean }
export const SICK_CATEGORIES: SickCategory[] = [
  'ISPA/Flu', 'Demam', 'Gangguan Pencernaan', 'Nyeri Otot & Sendi', 'Sakit Kepala/Migrain', 'Kecelakaan Kerja', 'Lainnya',
].map((nama) => ({ nama, aktif: true }))
export const activeSickCategories = () => SICK_CATEGORIES.filter((c) => c.aktif).map((c) => c.nama)

/** Bobot sebaran data awal: ISPA/Flu dan Demam paling umum. */
const WEIGHTS: Record<string, number> = { 'ISPA/Flu': 30, Demam: 25, 'Gangguan Pencernaan': 15, 'Nyeri Otot & Sendi': 12, 'Sakit Kepala/Migrain': 10, 'Kecelakaan Kerja': 3, Lainnya: 5 }
const hash = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) }
  return x >>> 0
}
/** Kategori data awal untuk hari sakit yang sudah ada di Absensi (deterministik per catatan). */
export function seededSickCategory(key: string): string {
  let r = hash(key + '#sakit') % 100
  for (const [nama, w] of Object.entries(WEIGHTS)) {
    if (r < w) return nama
    r -= w
  }
  return 'Lainnya'
}

export function addSickCategory(nama: string): string {
  const n = nama.trim()
  if (n.length < 3) return 'Nama kategori minimal 3 karakter'
  if (SICK_CATEGORIES.some((c) => c.nama.toLowerCase() === n.toLowerCase())) return 'Kategori sudah ada'
  SICK_CATEGORIES.push({ nama: n, aktif: true })
  addAudit({ group: 'Aturan Cuti', entitas: `Kategori Sakit ${n}`, perubahan: `Menambah kategori sakit ${n}`, berlaku: DEMO_TODAY })
  bump()
  return ''
}
export function toggleSickCategory(c: SickCategory) {
  c.aktif = !c.aktif
  addAudit({ group: 'Aturan Cuti', entitas: `Kategori Sakit ${c.nama}`, perubahan: c.aktif ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif', berlaku: DEMO_TODAY })
  bump()
}
