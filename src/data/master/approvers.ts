import { atasanOf, ROSTER, SUPERVISORS, type RosterEmployee, type Supervisor } from '@/data/employees'
import { departmentNodes, NIK } from '@/data/master/organization'
import { LEVEL_DEFS } from '@/data/master/levels'
import { atasanKey } from '@/data/roster-gen'
import { datedAt, datedPush, type Dated } from '@/data/payroll/dated'
import { DEMO_TODAY } from '@/lib/today'

/**
 * Matriks Penyetuju (Data Master → Penyetuju): jabatan pengaju → Penyetuju 1 → Penyetuju 2 (opsional).
 * Penyetuju ditentukan sebagai jabatan lalu diterjemahkan ke orang menurut unit pegawai pengaju.
 * Verifikasi HRD (Sakit, Dinas) adalah langkah terpisah setelah penyetuju terakhir.
 */
export const APPROVER_POSITIONS = ['Supervisor / Kepala Section', 'Kepala Department', 'Manager Department', 'HR & GA Manager', 'Plant Manager'] as const
export type ApproverPosition = (typeof APPROVER_POSITIONS)[number]
export const POSITION_NOTE: Record<ApproverPosition, string> = {
  'Supervisor / Kepala Section': 'Atasan langsung di section pengaju',
  'Kepala Department': 'Kepala department pengaju',
  'Manager Department': 'Manager yang memimpin department pengaju',
  'HR & GA Manager': 'Lestari Wulandari',
  'Plant Manager': 'Wahyudi Santoso',
}

export type ApproverSetting = { p1: ApproverPosition; p2: ApproverPosition | null }
export type ApproverRule = { pengaju: string; status: 'Aktif' | 'Nonaktif'; history: Dated<ApproverSetting>[] }

const rule = (pengaju: string, p1: ApproverPosition, p2: ApproverPosition | null = null): ApproverRule => ({
  pengaju,
  status: 'Aktif',
  history: [{ berlakuMulai: '2026-01-01', value: { p1, p2 }, oleh: 'Admin HRD', alasan: 'Data awal' }],
})
export const APPROVER_RULES: ApproverRule[] = [
  rule('Operator', 'Supervisor / Kepala Section'),
  rule('Leader', 'Supervisor / Kepala Section'),
  rule('Staff', 'Kepala Department'),
  rule('Supervisor', 'Manager Department', 'HR & GA Manager'),
  rule('Manager', 'Plant Manager'),
]
export const ruleFor = (pengaju: string) => APPROVER_RULES.find((r) => r.pengaju === pengaju)
export const settingAt = (r: ApproverRule, date: string = DEMO_TODAY) => datedAt(r.history, date).value
export const PENGAJU_OPTIONS = () => LEVEL_DEFS.filter((l) => l.status === 'Aktif').map((l) => l.nama)

export function saveApprover(r: ApproverRule, value: ApproverSetting, berlakuMulai: string, alasan: string, oleh = 'Admin HRD') {
  datedPush(r.history, { berlakuMulai, value, oleh, alasan })
}

const person = (id: string) => SUPERVISORS.find((s) => s.id === id)
const deptHead = (e: RosterEmployee): Supervisor | undefined => {
  const dep = departmentNodes().find((d) => d.nama === e.department)
  return dep ? person(atasanKey(dep.kepalaNik)) : undefined
}

/** Orang yang menjabat sebuah posisi penyetuju untuk pengaju tertentu. */
export function resolvePosition(pos: ApproverPosition, e: RosterEmployee): Supervisor | undefined {
  switch (pos) {
    case 'Supervisor / Kepala Section':
      return atasanOf(e) ?? deptHead(e)
    case 'Kepala Department':
    case 'Manager Department':
      return deptHead(e)
    case 'HR & GA Manager':
      return person('manager')
    case 'Plant Manager':
      return person(NIK.wahyudi)
  }
}

export type ApprovalStep = { step: 1 | 2; label: 'Penyetuju 1' | 'Penyetuju 2'; posisi: ApproverPosition; person: Supervisor }
/** Rantai penyetuju untuk pegawai; pengaju tidak pernah menyetujui dirinya sendiri (langkah itu dilewati). */
export function chainFor(e: RosterEmployee, date: string = DEMO_TODAY): ApprovalStep[] {
  const rule = ruleFor(e.level)
  if (!rule) return []
  const s = settingAt(rule, date)
  const out: ApprovalStep[] = []
  for (const pos of [s.p1, s.p2]) {
    if (!pos) continue
    const p = resolvePosition(pos, e)
    if (!p || p.id === e.nik || out.some((x) => x.person.id === p.id)) continue
    out.push({ step: (out.length + 1) as 1 | 2, label: out.length === 0 ? 'Penyetuju 1' : 'Penyetuju 2', posisi: pos, person: p })
  }
  return out.length ? out : [{ step: 1, label: 'Penyetuju 1', posisi: 'HR & GA Manager', person: person('manager')! }]
}
export const chainOf = (nik: string, date?: string) => chainFor(ROSTER.find((e) => e.nik === nik)!, date)
