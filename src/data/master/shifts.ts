export type ShiftKey = 'pagi' | 'siang' | 'malam' | 'nonshift'

export type ShiftDef = {
  id: ShiftKey
  kode: string
  nama: string
  mulai: string
  selesai: string
  lintasHari: boolean
  status: 'Aktif' | 'Nonaktif'
}

export const SHIFT_DEFS: ShiftDef[] = [
  { id: 'pagi', kode: 'SH-P', nama: 'Pagi', mulai: '07.00', selesai: '15.00', lintasHari: false, status: 'Aktif' },
  { id: 'siang', kode: 'SH-S', nama: 'Siang', mulai: '15.00', selesai: '23.00', lintasHari: false, status: 'Aktif' },
  { id: 'malam', kode: 'SH-M', nama: 'Malam', mulai: '23.00', selesai: '07.00', lintasHari: true, status: 'Aktif' },
  { id: 'nonshift', kode: 'SH-N', nama: 'Non-shift', mulai: '08.00', selesai: '17.00', lintasHari: false, status: 'Aktif' },
]

export const toMinutes = (t: string) => {
  const [h, m] = t.split('.').map(Number)
  return h * 60 + m
}
export const shiftDuration = (s: ShiftDef) => {
  const a = toMinutes(s.mulai)
  const b = toMinutes(s.selesai) + (s.lintasHari ? 1440 : 0)
  return (b - a) / 60
}

export type PolaDef = {
  id: string
  nama: string
  hariKerja: string
  istirahat: string
  hari: 5 | 6
  departments: string[]
}

export const POLA_DEFS: PolaDef[] = [
  {
    id: 'pola-6',
    nama: '6 hari kerja (Sen–Sab, istirahat Minggu)',
    hariKerja: 'Senin–Sabtu',
    istirahat: 'Minggu',
    hari: 6,
    departments: ['Produksi', 'Quality Assurance', 'Warehouse', 'Maintenance'],
  },
  {
    id: 'pola-5',
    nama: '5 hari kerja (Sen–Jum, istirahat Sab–Min)',
    hariKerja: 'Senin–Jumat',
    istirahat: 'Sabtu–Minggu',
    hari: 5,
    departments: ['PPIC', 'Engineering', 'HR & GA', 'Finance', 'IT', 'Purchasing'],
  },
]

export const polaOfDept = (dept: string): 5 | 6 => POLA_DEFS.find((p) => p.departments.includes(dept))?.hari ?? 5
