import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'

export type PayAuditGroup = 'Komponen' | 'Gaji Pegawai' | 'BPJS & PPh 21'
export const PAY_AUDIT_GROUPS: PayAuditGroup[] = ['Komponen', 'Gaji Pegawai', 'BPJS & PPh 21']

export type PayAuditEntry = {
  id: string
  at: string
  by: string
  group: PayAuditGroup
  entitas: string
  perubahan: string
  berlaku: string
  alasan?: string
}

export const PAY_AUDIT: PayAuditEntry[] = [
  { id: 'p1', at: '2026-03-02T09:40', by: 'Payroll Officer', group: 'BPJS & PPh 21', entitas: 'BPJS Ketenagakerjaan', perubahan: 'Batas upah JP Rp 10.547.400 → Rp 11.086.300', berlaku: '2026-03-01', alasan: 'Penyesuaian batas upah JP Maret 2026' },
]

let seq = 2
export function addPayAudit(e: Omit<PayAuditEntry, 'id' | 'at'>) {
  const { hh, mm } = nowTimeWIB()
  PAY_AUDIT.unshift({ ...e, id: `p${seq++}`, at: `${DEMO_TODAY}T${hh}:${mm}` })
}
