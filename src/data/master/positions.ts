export type PositionDef = {
  nama: string
  department: string | null
  section: string | null
  level: string
  grade: string
  /** Group Kerja default posisi bila berbeda dari default Level (mis. posisi pelaksana). */
  kelompok?: 'Staff' | 'Non Staff'
  status: 'Aktif' | 'Nonaktif'
}

const p = (nama: string, department: string | null, section: string | null, level: string, grade: string, kelompok?: 'Staff' | 'Non Staff'): PositionDef => ({
  nama,
  department,
  section,
  level,
  grade,
  kelompok,
  status: 'Aktif',
})

export const POSITIONS: PositionDef[] = [
  p('Operator Injection', 'Produksi', 'Injection', 'Operator', 'G1–G2'),
  p('Leader Injection', 'Produksi', 'Injection', 'Leader', 'G3', 'Non Staff'),
  p('Operator Blow Molding', 'Produksi', 'Blow Molding', 'Operator', 'G1–G2'),
  p('Operator Extrusion', 'Produksi', 'Extrusion', 'Operator', 'G1–G2'),
  p('Operator Printing', 'Produksi', 'Printing', 'Operator', 'G1–G2'),
  p('Supervisor Produksi', 'Produksi', null, 'Supervisor', 'G5'),
  p('QC Inspector', 'Quality Assurance', null, 'Operator', 'G1–G2'),
  p('Leader QC', 'Quality Assurance', null, 'Leader', 'G3', 'Non Staff'),
  p('Staff Gudang', 'Warehouse', null, 'Staff', 'G3', 'Non Staff'),
  p('Teknisi Mekanik', 'Maintenance', 'Mekanik', 'Operator', 'G2'),
  p('Teknisi Elektrik', 'Maintenance', 'Elektrik', 'Operator', 'G2'),
  p('Admin PPIC', 'PPIC', null, 'Staff', 'G3', 'Non Staff'),
  p('Engineer Proses', 'Engineering', null, 'Staff', 'G4'),
  p('Staff HR', 'HR & GA', null, 'Staff', 'G3–G4'),
  p('Staff Finance', 'Finance', null, 'Staff', 'G3–G4'),
  p('IT Support', 'IT', null, 'Staff', 'G3–G4'),
  p('Staff Purchasing', 'Purchasing', null, 'Staff', 'G3–G4', 'Non Staff'),
  p('Manager Produksi', 'Produksi', null, 'Manager', 'G6'),
  p('Kepala Departemen', null, null, 'Supervisor', 'G5'),
  p('Manager HR & GA', 'HR & GA', null, 'Manager', 'G6'),
  p('Plant Manager', null, null, 'Manager', 'G6'),
  p('Cleaning Service', 'HR & GA', null, 'Operator', 'G1'),
  p('Security', 'HR & GA', null, 'Operator', 'G1'),
]

export const positionByName = (nama: string) => POSITIONS.find((x) => x.nama === nama)
export const gradeList = (range: string) => {
  const [a, b] = range.split('–')
  const lo = Number(a.slice(1))
  const hi = Number((b ?? a).slice(1))
  return Array.from({ length: hi - lo + 1 }, (_, i) => `G${lo + i}`)
}
