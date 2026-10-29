import { addDays } from '@/data/attendance'
import { periodForId } from '@/data/master/attendance-rules'

const NOV = periodForId('2026-11')

/** Periode gaji November 2026 (periode transisi cut-off: 21 Okt – 23 Nov), kasbon November jendela 1–23 Nov, dibayar akhir bulan. */
export const PAYROLL_PERIOD = {
  label: 'November 2026',
  cutoffDari: NOV.start,
  cutoffSampai: NOV.end,
  kasbonDari: '2026-11-01',
  kasbonSampai: '2026-11-23',
  bayar: '2026-11-30',
}
export const periodNext = addDays(PAYROLL_PERIOD.cutoffSampai, 1)
