import { ROSTER } from '@/data/employees'
import { descendantSectionIds, type OrgNode } from '@/data/master/organization'
import { polaOfDept } from '@/data/master/shifts'

export const orgCount = (n: OrgNode) => {
  const ids = new Set(descendantSectionIds(n.id))
  return ROSTER.filter((e) => ids.has(e.sec)).length
}
export const usedByPosisi = (nama: string) => ROSTER.filter((e) => e.posisi === nama).length
export const usedByLevel = (nama: string) => ROSTER.filter((e) => e.level === nama).length
export const usedByGrade = (kode: string) => ROSTER.filter((e) => e.grade === kode).length
export const usedByShift = (id: string) => ROSTER.filter((e) => e.shift === id).length
export const usedByPola = (hari: 5 | 6) => ROSTER.filter((e) => polaOfDept(e.department) === hari).length
export const nameOf = (nik: string) => ROSTER.find((e) => e.nik === nik)?.nama ?? '—'
