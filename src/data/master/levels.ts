/** Group Kerja (internal: golongan): Staff, Non Staff, Harian, Magang, Outsourcing. */
export type Kelompok = 'Staff' | 'Non Staff' | 'Harian' | 'Magang' | 'Outsourcing'
/** Group yang bisa menjadi default sebuah Level. */
export type LevelKelompok = 'Staff' | 'Non Staff'
export type LevelDef = {
  nama: string
  history: { from: string; value: LevelKelompok }[]
  status: 'Aktif' | 'Nonaktif'
}

const mk = (nama: string, value: LevelKelompok): LevelDef => ({
  nama,
  history: [{ from: '2020-01-01', value }],
  status: 'Aktif',
})

export const LEVEL_DEFS: LevelDef[] = [
  mk('Operator', 'Non Staff'),
  mk('Leader', 'Staff'),
  mk('Staff', 'Staff'),
  mk('Supervisor', 'Staff'),
  mk('Manager', 'Staff'),
]

export const KELOMPOK_LIST: Kelompok[] = ['Staff', 'Non Staff', 'Harian', 'Magang', 'Outsourcing']
export const PEMBAGI: Record<Kelompok, number> = { Staff: 21, 'Non Staff': 25, Harian: 25, Magang: 25, Outsourcing: 25 }
/** Dasar gaji tiap Group Kerja (tampil di tabel Group Kerja). */
export const KELOMPOK_DASAR: Record<Kelompok, { basis: 'Bulanan' | 'Harian'; ket: string }> = {
  Staff: { basis: 'Bulanan', ket: 'Bulanan ÷21' },
  'Non Staff': { basis: 'Bulanan', ket: 'Bulanan ÷25' },
  Harian: { basis: 'Harian', ket: 'Harian (upah per hari hadir)' },
  Magang: { basis: 'Bulanan', ket: 'Bulanan (pembagi mengikuti Level default)' },
  Outsourcing: { basis: 'Bulanan', ket: 'Bulanan ÷25, dibayar ke vendor' },
}

export const kelompokAt = (def: LevelDef, date: string): LevelKelompok => {
  const h = [...def.history].sort((a, b) => a.from.localeCompare(b.from))
  return [...h].reverse().find((x) => x.from <= date)?.value ?? h[0].value
}

const levelDefault = (level: string): LevelKelompok => {
  const def = LEVEL_DEFS.find((l) => l.nama === level)
  return def ? kelompokAt(def, '2026-10-26') : 'Staff'
}
/** Pembagi: Staff 21; Non Staff dan Outsourcing 25; Magang mengikuti Level default (Operator 25, lainnya 21). Harian tidak memakai pembagi. */
export const effectiveKelompok = (kelompok: string, level: string): LevelKelompok =>
  kelompok === 'Magang' || kelompok === 'Harian' ? levelDefault(level) : kelompok === 'Staff' ? 'Staff' : 'Non Staff'
export const pembagiOf = (kelompok: string, level: string) => PEMBAGI[effectiveKelompok(kelompok, level)]
