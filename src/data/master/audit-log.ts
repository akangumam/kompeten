import { DEMO_TODAY, nowTimeWIB } from '@/lib/today'

export type AuditGroup = 'Organisasi' | 'Posisi & Level' | 'Grade' | 'Shift & Pola Kerja' | 'Kalender Libur' | 'Aturan Cuti' | 'Industrial' | 'Penyetuju' | 'Rekrutmen' | 'Dashboard'
export const AUDIT_GROUPS: AuditGroup[] = ['Organisasi', 'Posisi & Level', 'Grade', 'Shift & Pola Kerja', 'Kalender Libur', 'Aturan Cuti', 'Industrial', 'Penyetuju', 'Rekrutmen', 'Dashboard']

export type AuditEntry = {
  id: string
  at: string
  by: string
  group: AuditGroup
  entitas: string
  perubahan: string
  berlaku: string
}

export const AUDIT: AuditEntry[] = [
  { id: 'a4s', at: '2026-10-28T10:00', by: 'Admin HRD', group: 'Shift & Pola Kerja', entitas: 'Periode cut-off', perubahan: 'Tanggal 21 s/d 20 → Tanggal 24 s/d 23 (Penyesuaian cut-off sesuai kebijakan Primaplast)', berlaku: '2026-11-01' },
  { id: 'a3', at: '2026-10-02T10:12', by: 'Admin HRD', group: 'Kalender Libur', entitas: 'Kalender Libur', perubahan: 'Cuti bersama 24 Des: Tidak → Diberlakukan', berlaku: '2026-10-02' },
  { id: 'a2', at: '2026-09-15T14:30', by: 'Admin HRD', group: 'Grade', entitas: 'Grade G1', perubahan: 'Rp 5.000.000 → Rp 5.100.000 (batas bawah)', berlaku: '2026-09-21' },
  { id: 'a1', at: '2026-08-03T09:05', by: 'Admin HRD', group: 'Organisasi', entitas: 'Organisasi', perubahan: 'Kepala Injection: Agus Setiadi → Hendra Gunawan', berlaku: '2026-08-21' },
]

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const atLabel = (at: string) => {
  const [d, t] = at.split('T')
  const [y, m, dd] = d.split('-').map(Number)
  return `${dd} ${MON[m - 1]} ${y}, ${t.replace(':', '.')} WIB`
}

let seq = 4
export function addAudit(e: Omit<AuditEntry, 'id' | 'at' | 'by'> & { by?: string }) {
  const { hh, mm } = nowTimeWIB()
  AUDIT.unshift({ ...e, by: e.by ?? 'Admin HRD', id: `a${seq++}`, at: `${DEMO_TODAY}T${hh}:${mm}` })
}
