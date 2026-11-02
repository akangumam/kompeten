import { logSecurity } from '@/data/audit-log'
import { getSession } from '@/lib/session'

/** Aksi bisnis yang dijalankan saat Mode Presentasi tercatat di audit sebagai "Presentasi (sebagai …)". */
export function auditPresentasi(detail: string) {
  const s = getSession()
  if (!s?.presentasi?.viewing) return
  logSecurity({ event: 'aksi-presentasi', email: s.presentasi.host.emailKantor, nip: s.presentasi.host.nip, peran: s.role, detail })
}
