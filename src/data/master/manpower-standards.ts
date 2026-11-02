import { DEMO_TODAY } from '@/lib/today'
import { addAudit } from '@/data/master/audit-log'
import { bump } from '@/data/master/store'

export type ManpowerStandard = {
  id: string
  department: string
  section: string
  posisi: string
  standar: number
  berlakuMulai: string
  status: 'Aktif' | 'Nonaktif'
  history: { standar: number; berlakuMulai: string; at: string; by: string }[]
}

const std = (
  id: string,
  department: string,
  section: string,
  posisi: string,
  standar: number,
  berlakuMulai = '2026-01-01',
): ManpowerStandard => ({
  id,
  department,
  section,
  posisi,
  standar,
  berlakuMulai,
  status: 'Aktif',
  history: [{ standar, berlakuMulai, at: '2026-01-01, 08.00 WIB', by: 'Teddy Syahputra' }],
})

/**
 * Standar Tenaga Kerja Produksi:
 * Injection:
 * - Operator Injection: 24 (existing 20 + 4, LWG-2026-018)
 * - Leader Injection: 2 (existing 2)
 * - Supervisor Produksi: 1 (existing 1)
 * - Manager Produksi: 1 (existing 1)
 * Total Injection: 28
 *
 * Blow Molding:
 * - Operator Blow Molding: 19 (existing 17 + 2, LWG-2026-024)
 * - Supervisor Produksi: 1 (existing 1)
 * Total Blow Molding: 20
 *
 * Extrusion:
 * - Operator Extrusion: 13 (existing 13)
 * - Supervisor Produksi: 1 (existing 1)
 * Total Extrusion: 14
 *
 * Printing:
 * - Operator Printing: 10 (existing 11 - 1, kelebihan 1 orang)
 * - Supervisor Produksi: 1 (existing 1)
 * Total Printing: 11
 *
 * Total Produksi: 28 + 20 + 14 + 11 = 73 (existing 68)
 */
export const MANPOWER_STANDARDS: ManpowerStandard[] = [
  // Produksi - Injection
  std('STD-PROD-INJ-OP', 'Produksi', 'Injection', 'Operator Injection', 24),
  std('STD-PROD-INJ-LDR', 'Produksi', 'Injection', 'Leader Injection', 2),
  std('STD-PROD-INJ-SPV', 'Produksi', 'Injection', 'Supervisor Produksi', 1),
  std('STD-PROD-INJ-MGR', 'Produksi', 'Injection', 'Manager Produksi', 1),

  // Produksi - Blow Molding
  std('STD-PROD-BLW-OP', 'Produksi', 'Blow Molding', 'Operator Blow Molding', 19),
  std('STD-PROD-BLW-SPV', 'Produksi', 'Blow Molding', 'Supervisor Produksi', 1),

  // Produksi - Extrusion
  std('STD-PROD-EXT-OP', 'Produksi', 'Extrusion', 'Operator Extrusion', 13),
  std('STD-PROD-EXT-SPV', 'Produksi', 'Extrusion', 'Supervisor Produksi', 1),

  // Produksi - Printing
  std('STD-PROD-PRT-OP', 'Produksi', 'Printing', 'Operator Printing', 10),
  std('STD-PROD-PRT-SPV', 'Produksi', 'Printing', 'Supervisor Produksi', 1),
]

export const standardsForDept = (dept: string, date: string = DEMO_TODAY) =>
  MANPOWER_STANDARDS.filter((s) => s.department === dept && s.status === 'Aktif' && s.berlakuMulai <= date)

export const standardsForSection = (dept: string, section: string, date: string = DEMO_TODAY) =>
  MANPOWER_STANDARDS.filter(
    (s) => s.department === dept && s.section === section && s.status === 'Aktif' && s.berlakuMulai <= date,
  )

export function updateManpowerStandard(
  id: string,
  newStandar: number,
  berlakuMulai: string,
  by = 'Teddy Syahputra',
) {
  const item = MANPOWER_STANDARDS.find((s) => s.id === id)
  if (!item) return
  const oldStandar = item.standar
  item.standar = newStandar
  item.berlakuMulai = berlakuMulai
  item.history.unshift({
    standar: newStandar,
    berlakuMulai,
    at: `${DEMO_TODAY}, 09.00 WIB`,
    by,
  })
  addAudit({
    group: 'Organisasi',
    entitas: `Standar ${item.department} · ${item.section} · ${item.posisi}`,
    perubahan: `Standar: ${oldStandar} → ${newStandar} orang`,
    berlaku: berlakuMulai,
  })
  bump()
}

export function addManpowerStandard(
  department: string,
  section: string,
  posisi: string,
  standar: number,
  berlakuMulai: string,
  by = 'Teddy Syahputra',
) {
  const id = `STD-${Date.now()}`
  const newItem = std(id, department, section, posisi, standar, berlakuMulai)
  MANPOWER_STANDARDS.push(newItem)
  addAudit({
    group: 'Organisasi',
    entitas: `Standar ${department} · ${section} · ${posisi}`,
    perubahan: `Menambah standar ${standar} orang`,
    berlaku: berlakuMulai,
  })
  bump()
}

