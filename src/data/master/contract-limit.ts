import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/** Batas total masa kontrak (bulan, seluruh kontrak sejak yang pertama), effective-dated. Sumber: PP 35/2021. */
export const CONTRACT_LIMIT: Dated<number>[] = [{ berlakuMulai: '2021-02-02', value: 60, oleh: 'Teddy Syahputra', alasan: 'PP 35/2021: PKWT maksimal 5 tahun' }]
export const CONTRACT_LIMIT_SOURCE = 'PP 35/2021'
export const contractLimitMonths = (date: string = DEMO_TODAY) => datedAt(CONTRACT_LIMIT, date).value
export function saveContractLimit(value: number, berlakuMulai: string, alasan: string, oleh = 'Teddy Syahputra') {
  datedPush(CONTRACT_LIMIT, { berlakuMulai, value, oleh, alasan })
}

/** 45 → "3 tahun 9 bulan"; 60 → "5 tahun". */
export function monthsText(months: number) {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y > 0 ? `${y} tahun` : '', m > 0 ? `${m} bulan` : ''].filter(Boolean).join(' ') || '0 bulan'
}
