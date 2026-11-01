import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/** Usia pensiun (tahun), effective-dated. Pegawai pensiun pada ulang tahun ke-N. */
export const RETIREMENT_AGE: Dated<number>[] = [{ berlakuMulai: '2020-01-01', value: 55, oleh: 'Teddy Syahputra', alasan: 'Ketentuan awal perusahaan' }]
export const retirementAge = (date: string = DEMO_TODAY) => datedAt(RETIREMENT_AGE, date).value
export function saveRetirementAge(value: number, berlakuMulai: string, alasan: string, oleh = 'Teddy Syahputra') {
  datedPush(RETIREMENT_AGE, { berlakuMulai, value, oleh, alasan })
}

const addYears = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`
/** Tanggal pensiun = tanggal lahir + usia pensiun. */
export const retirementDate = (lahir: string, date: string = DEMO_TODAY) => (lahir ? addYears(lahir, retirementAge(date)) : '')
const addMonths = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}
export const NEAR_RETIREMENT_MONTHS = 6
/** Pensiun jatuh dalam 6 bulan ke depan (sejak hari ini). */
export function nearRetirement(lahir: string, today: string = DEMO_TODAY) {
  const r = retirementDate(lahir, today)
  return !!r && r >= today && r <= addMonths(today, NEAR_RETIREMENT_MONTHS)
}
