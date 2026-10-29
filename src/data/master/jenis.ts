import { LEVEL_DEFS, kelompokAt, type Kelompok } from '@/data/master/levels'
import { positionByName } from '@/data/master/positions'
import { DEMO_TODAY } from '@/lib/today'

/** Jenis Karyawan: kategori hubungan kerja. Status Kerja dan Group Kerja diturunkan darinya. */
export type Jenis = 'Organik' | 'Harian' | 'Outsourcing' | 'Magang'
export const JENIS_LIST: Jenis[] = ['Organik', 'Harian', 'Outsourcing', 'Magang']
export type JenisDef = { nama: Jenis; statusKerja: ('Tetap' | 'Kontrak')[]; groupText: string; keterangan: string }
export const JENIS_DEFS: JenisDef[] = [
  { nama: 'Organik', statusKerja: ['Tetap', 'Kontrak'], groupText: 'Staff atau Non Staff (mengikuti posisi dan level)', keterangan: 'Karyawan langsung Primaplast, Tetap atau Kontrak.' },
  { nama: 'Harian', statusKerja: ['Kontrak'], groupText: 'Harian', keterangan: 'Dibayar per hari hadir; selalu Kontrak.' },
  { nama: 'Outsourcing', statusKerja: ['Kontrak'], groupText: 'Outsourcing', keterangan: 'Karyawan vendor; gaji dibayarkan ke vendor; selalu Kontrak.' },
  { nama: 'Magang', statusKerja: ['Kontrak'], groupText: 'Magang', keterangan: 'Peserta magang; selalu Kontrak.' },
]

/** Tanpa nilai tersimpan, pegawai dianggap Organik. */
export const jenisOf = (e: { jenis?: string }): Jenis => (e.jenis as Jenis) || 'Organik'
export const statusOptionsOf = (jenis: string): string[] => (jenis === 'Organik' || !jenis ? ['Tetap', 'Kontrak'] : ['Kontrak'])
export const STATUS_KERJA = ['Tetap', 'Kontrak']

/**
 * Group Kerja otomatis: Organik mengikuti default posisi (bila ada) lalu default Level;
 * Harian, Magang, dan Outsourcing masuk group-nya sendiri.
 */
export function kelompokFor(jenis: string, level: string, posisi = '', date: string = DEMO_TODAY): Kelompok {
  if (jenis === 'Harian' || jenis === 'Magang' || jenis === 'Outsourcing') return jenis
  const byPos = posisi ? positionByName(posisi)?.kelompok : undefined
  if (byPos) return byPos
  const def = LEVEL_DEFS.find((l) => l.nama === level)
  return def ? kelompokAt(def, date) : 'Staff'
}
