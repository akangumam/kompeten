import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/** Master Jenis Pelanggaran (kategori Industrial). Yang sudah dipakai hanya dinonaktifkan; Hapus hanya bila dipakai 0 catatan. */
export type ViolationDef = { kode: string; nama: string; contoh: string; status: 'Aktif' | 'Nonaktif' }
const v = (kode: string, nama: string, contoh: string): ViolationDef => ({ kode, nama, contoh, status: 'Aktif' })
export const VIOLATIONS: ViolationDef[] = [
  v('PLG-01', 'Terlambat berulang', 'Terlambat 6 kali dalam satu periode kehadiran'),
  v('PLG-02', 'Mangkir', 'Tidak masuk tanpa keterangan (Alfa) beberapa hari berturut-turut'),
  v('PLG-03', 'Tidak memakai APD', 'Tidak memakai sepatu safety atau masker di area produksi'),
  v('PLG-04', 'Merokok di area produksi', 'Merokok di area terlarang'),
  v('PLG-05', 'Merusak aset', 'Merusak mesin, cetakan, atau perlengkapan perusahaan'),
  v('PLG-06', 'Lainnya', 'Pelanggaran lain sesuai PK/PP/PKB'),
]
export const activeViolations = () => VIOLATIONS.filter((x) => x.status === 'Aktif')
export const violationName = (kode: string) => VIOLATIONS.find((x) => x.kode === kode)?.nama ?? kode
export const nextViolationCode = () => `PLG-${String(VIOLATIONS.length + 1).padStart(2, '0')}`

export function violationError(nama: string, kode: string, ignore?: ViolationDef): { nama?: string; kode?: string } {
  const out: { nama?: string; kode?: string } = {}
  if (!nama.trim()) out.nama = 'Nama pelanggaran wajib diisi'
  else if (VIOLATIONS.some((x) => x !== ignore && x.nama.toLowerCase() === nama.trim().toLowerCase())) out.nama = 'Nama pelanggaran sudah ada'
  if (!kode.trim()) out.kode = 'Kode wajib diisi'
  else if (VIOLATIONS.some((x) => x !== ignore && x.kode.toLowerCase() === kode.trim().toLowerCase())) out.kode = 'Kode sudah dipakai'
  return out
}
export function addViolation(nama: string, kode: string, contoh: string) {
  VIOLATIONS.push({ kode: kode.trim().toUpperCase(), nama: nama.trim(), contoh: contoh.trim(), status: 'Aktif' })
  addAudit({ group: 'Industrial', entitas: `Jenis Pelanggaran ${nama.trim()}`, perubahan: `Menambah jenis pelanggaran ${nama.trim()}`, berlaku: DEMO_TODAY })
  bump()
}
export function toggleViolation(x: ViolationDef) {
  x.status = x.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
  addAudit({ group: 'Industrial', entitas: `Jenis Pelanggaran ${x.nama}`, perubahan: `Status ${x.nama}: ${x.status === 'Aktif' ? 'Nonaktif → Aktif' : 'Aktif → Nonaktif'}`, berlaku: DEMO_TODAY })
  bump()
}
export function deleteViolation(x: ViolationDef) {
  const i = VIOLATIONS.indexOf(x)
  if (i >= 0) VIOLATIONS.splice(i, 1)
  addAudit({ group: 'Industrial', entitas: `Jenis Pelanggaran ${x.nama}`, perubahan: `Menghapus jenis pelanggaran ${x.nama}`, berlaku: DEMO_TODAY })
  bump()
}

/** Masa berlaku SP/Teguran Tertulis (bulan), effective-dated. */
export const SP_VALIDITY: Dated<number>[] = [{ berlakuMulai: '2020-01-01', value: 6, oleh: 'Admin HRD', alasan: 'Ketentuan awal perusahaan' }]
export const spValidityMonths = (date: string = DEMO_TODAY) => datedAt(SP_VALIDITY, date).value
export function saveSpValidity(value: number, berlakuMulai: string, alasan: string, oleh = 'Admin HRD') {
  datedPush(SP_VALIDITY, { berlakuMulai, value, oleh, alasan })
}
