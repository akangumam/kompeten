import { DEMO_TODAY } from '@/lib/today'
import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'

export type TierItem = {
  id: string
  label: string
  min: number // inclusive
  max: number | null // inclusive, null means no upper limit (e.g. >= 17, > 60)
}

export type TierRangeType = 'tenure' | 'age'

export const DEFAULT_TENURE_TIERS: TierItem[] = [
  { id: 'tenure-1', label: '< 1 tahun', min: 0, max: 0 },
  { id: 'tenure-2', label: '1–3 tahun', min: 1, max: 3 },
  { id: 'tenure-3', label: '4–6 tahun', min: 4, max: 6 },
  { id: 'tenure-4', label: '7–10 tahun', min: 7, max: 10 },
  { id: 'tenure-5', label: '11–13 tahun', min: 11, max: 13 },
  { id: 'tenure-6', label: '14–16 tahun', min: 14, max: 16 },
  { id: 'tenure-7', label: '≥ 17 tahun', min: 17, max: null },
]

export const DEFAULT_AGE_TIERS: TierItem[] = [
  { id: 'age-1', label: '< 18 tahun', min: 0, max: 17 },
  { id: 'age-2', label: '18–20 tahun', min: 18, max: 20 },
  { id: 'age-3', label: '21–25 tahun', min: 21, max: 25 },
  { id: 'age-4', label: '26–35 tahun', min: 26, max: 35 },
  { id: 'age-5', label: '36–45 tahun', min: 36, max: 45 },
  { id: 'age-6', label: '46–50 tahun', min: 46, max: 50 },
  { id: 'age-7', label: '51–55 tahun', min: 51, max: 55 },
  { id: 'age-8', label: '56–60 tahun', min: 56, max: 60 },
  { id: 'age-9', label: '> 60 tahun', min: 61, max: null },
]

export let TENURE_TIERS: TierItem[] = [...DEFAULT_TENURE_TIERS]
export let AGE_TIERS: TierItem[] = [...DEFAULT_AGE_TIERS]

/**
 * Validasi urutan rentang tier:
 * 1. Tidak tumpang tindih (min tier berikutnya harus > max tier sebelumnya)
 * 2. Tidak berlubang (min tier berikutnya harus tepat max tier sebelumnya + 1)
 */
export function validateTiers(tiers: { min: number; max: number | null }[]): { valid: boolean; error?: string } {
  if (tiers.length === 0) return { valid: false, error: 'Minimal harus ada 1 rentang' }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]
    if (t.max !== null && t.max < t.min) {
      return { valid: false, error: `Batas atas (${t.max}) tidak boleh lebih kecil dari batas bawah (${t.min}) pada baris ke-${i + 1}` }
    }
    if (i > 0) {
      const prev = tiers[i - 1]
      if (prev.max === null) {
        return { valid: false, error: `Rentang tak terbatas hanya boleh berada di baris terakhir` }
      }
      if (t.min <= prev.max) {
        return { valid: false, error: `Rentang tumpang tindih antara batas ${prev.min}–${prev.max} dan batas mulai ${t.min}` }
      }
      if (t.min > prev.max + 1) {
        return { valid: false, error: `Terdapat celah/lubang antara ${prev.max} dan ${t.min} (seharusnya ${prev.max + 1})` }
      }
    }
  }
  return { valid: true }
}

export function formatTierLabel(t: { min: number; max: number | null }, unit = 'tahun'): string {
  if (t.min === 0 && t.max === 0) return `< 1 ${unit}`
  if (t.min === 0 && t.max !== null) return `< ${t.max + 1} ${unit}`
  if (t.max === null) return `≥ ${t.min} ${unit}`
  if (t.min === t.max) return `${t.min} ${unit}`
  return `${t.min}–${t.max} ${unit}`
}

export function saveTenureTiers(newTiers: TierItem[]) {
  TENURE_TIERS = newTiers
  addAudit({
    group: 'Dashboard',
    entitas: 'Rentang Masa Kerja',
    perubahan: `Memperbarui rentang masa kerja (${newTiers.map((t) => t.label).join(', ')})`,
    berlaku: DEMO_TODAY,
  })
  bump()
}

export function saveAgeTiers(newTiers: TierItem[]) {
  AGE_TIERS = newTiers
  addAudit({
    group: 'Dashboard',
    entitas: 'Rentang Usia',
    perubahan: `Memperbarui rentang usia (${newTiers.map((t) => t.label).join(', ')})`,
    berlaku: DEMO_TODAY,
  })
  bump()
}

