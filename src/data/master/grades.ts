export type GradeDef = { kode: string; min: number; max: number; level: string; status: 'Aktif' | 'Nonaktif' }

export const UMK = { value: 5_100_000 }

export const GRADES: GradeDef[] = [
  { kode: 'G1', min: 5_100_000, max: 5_800_000, level: 'Operator', status: 'Aktif' },
  { kode: 'G2', min: 5_600_000, max: 6_500_000, level: 'Operator senior', status: 'Aktif' },
  { kode: 'G3', min: 6_200_000, max: 7_500_000, level: 'Leader, Staff', status: 'Aktif' },
  { kode: 'G4', min: 7_000_000, max: 8_500_000, level: 'Staff senior', status: 'Aktif' },
  { kode: 'G5', min: 8_000_000, max: 10_500_000, level: 'Supervisor', status: 'Aktif' },
  { kode: 'G6', min: 12_000_000, max: 20_000_000, level: 'Manager', status: 'Aktif' },
]
