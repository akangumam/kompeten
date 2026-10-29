import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/** Parameter rekrutmen (Data Master › Rekrutmen), effective-dated. Halaman Recruitment hanya membaca dari sini. */
const SEED = { oleh: 'Admin HRD', alasan: 'Kebijakan rekrutmen PT Primaplast' }

export const AMBANG_INTERVIEW: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 65, ...SEED }]
export const MASA_PENAWARAN: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 3, ...SEED }]
export const SUMBER_LAMARAN: Dated<string[]>[] = [{ berlakuMulai: '2025-01-01', value: ['Jobstreet', 'Website', 'Indeed', 'Referral', 'WA Group', 'Job Fair', 'Portal KOMPETEN'], ...SEED }]
export const MASA_SIMPAN_PELAMAR: Dated<number>[] = [{ berlakuMulai: '2025-01-01', value: 12, ...SEED }]
export const TAMPILKAN_NILAI_TES: Dated<string>[] = [{ berlakuMulai: '2025-01-01', value: 'Tidak', ...SEED }]

export const ambangInterview = (date: string = DEMO_TODAY) => datedAt(AMBANG_INTERVIEW, date).value
export const masaPenawaran = (date: string = DEMO_TODAY) => datedAt(MASA_PENAWARAN, date).value
export const sumberLamaran = (date: string = DEMO_TODAY) => datedAt(SUMBER_LAMARAN, date).value
export const masaSimpanPelamar = (date: string = DEMO_TODAY) => datedAt(MASA_SIMPAN_PELAMAR, date).value
export const tampilkanNilaiTes = (date: string = DEMO_TODAY) => datedAt(TAMPILKAN_NILAI_TES, date).value as 'Ya' | 'Tidak'

export type RekrutKey = 'ambang' | 'masa' | 'sumber' | 'simpan' | 'nilai'
export function historyOf(key: RekrutKey): Dated<number | string | string[]>[] {
  if (key === 'ambang') return AMBANG_INTERVIEW as Dated<number | string | string[]>[]
  if (key === 'masa') return MASA_PENAWARAN as Dated<number | string | string[]>[]
  if (key === 'sumber') return SUMBER_LAMARAN as Dated<number | string | string[]>[]
  if (key === 'simpan') return MASA_SIMPAN_PELAMAR as Dated<number | string | string[]>[]
  return TAMPILKAN_NILAI_TES as Dated<number | string | string[]>[]
}
export function saveRekrut(key: 'ambang' | 'masa' | 'simpan', value: number, berlakuMulai: string, alasan: string): void
export function saveRekrut(key: 'sumber', value: string[], berlakuMulai: string, alasan: string): void
export function saveRekrut(key: 'nilai', value: string, berlakuMulai: string, alasan: string): void
export function saveRekrut(key: RekrutKey, value: number | string | string[], berlakuMulai: string, alasan: string) {
  const entry = { berlakuMulai, value, oleh: 'Admin HRD', alasan }
  if (key === 'ambang') datedPush(AMBANG_INTERVIEW, entry as Dated<number>)
  else if (key === 'masa') datedPush(MASA_PENAWARAN, entry as Dated<number>)
  else if (key === 'simpan') datedPush(MASA_SIMPAN_PELAMAR, entry as Dated<number>)
  else if (key === 'nilai') datedPush(TAMPILKAN_NILAI_TES, entry as Dated<string>)
  else datedPush(SUMBER_LAMARAN, entry as Dated<string[]>)
}
